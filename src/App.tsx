import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveConfig,
  ChatMessage,
  QueuedComment,
  CommentSourceId,
  ResponseVariation,
  ResponseValidationStatus,
  PipelineDebugInfo,
  AuthSession,
} from './types';
import { Header } from './components/Header';
import { LiveMonitoringArea } from './components/LiveMonitoringArea';
import { CommentInputPanel } from './components/CommentInputPanel';
import { AIResponseCard } from './components/AIResponseCard';
import { ConversationHistory } from './components/ConversationHistory';
import { SetupView } from './components/SetupView';
import { LoginView } from './components/LoginView';
import { MasterDashboard } from './components/MasterDashboard';
import { SettingsModal } from './components/SettingsModal';
import { ResetModal } from './components/ResetModal';
import { NewLiveModal, EndLiveModal } from './components/LiveActionModals';
import { E2ETestModal } from './components/E2ETestModal';
import { ttsService, TTSState } from './utils/tts';
import {
  commentPipelineService,
  RateLimitState,
} from './services/commentPipeline';
import { commentSourceManager } from './services/commentSource';
import { authService } from './services/authService';

const CONFIG_STORAGE_KEY = 'livemate_config_v2';
const HISTORY_STORAGE_KEY = 'livemate_history_v2';

const DEFAULT_CONFIG: LiveConfig = {
  hostName: 'Kak Rian',
  coHostName: 'Luna AI',
  persona: 'ramah',
  language: 'id',
  topic: 'Fashion & OOTD Casual Santai',
  isLive: false,
  startedAt: null,
  autoSpeakAnswers: true,
  isAiPaused: false,
  maxAnswersPerMinute: 10,
  activeSourceId: 'manual',
};

export function App() {
  // 0. Multi-Role Authentication State
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => authService.getSession());
  const [activeView, setActiveView] = useState<'login' | 'master_dashboard' | 'livemate'>(() => {
    const sess = authService.getSession();
    if (!sess) return 'login';
    if (sess.role === 'master') return 'master_dashboard';
    if (sess.role === 'owner' && sess.status === 'active') return 'livemate';
    return 'login';
  });

  const handleLoginSuccess = useCallback((session: AuthSession) => {
    setAuthSession(session);
    if (session.role === 'master') {
      setActiveView('master_dashboard');
    } else {
      setActiveView('livemate');
    }
  }, []);

  const handleLogout = useCallback(() => {
    authService.logout();
    setAuthSession(null);
    setActiveView('login');
  }, []);

  const handleSwitchToMaster = useCallback(() => {
    if (authSession?.role === 'master') {
      setActiveView('master_dashboard');
    }
  }, [authSession?.role]);

  const handleOpenLiveMateFromMaster = useCallback(() => {
    setActiveView('livemate');
  }, []);

  // 1. Live Configuration
  const [config, setConfig] = useState<LiveConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          isLive: false, // Always start at setup view on full fresh load
        };
      }
    } catch (e) {
      console.error('Failed to load config from storage', e);
    }
    return DEFAULT_CONFIG;
  });

  // 2. Conversation History
  const [history, setHistory] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load history from storage', e);
    }
    return [];
  });

  // 3. Pipeline & TTS Reactive States
  const [queuedComments, setQueuedComments] = useState<QueuedComment[]>([]);
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    responsesUsedThisMinute: 0,
    maxPerMinute: 10,
    isThrottled: false,
    resetInSeconds: 0,
  });
  const [connectionStatus, setConnectionStatus] = useState(
    commentSourceManager.getConnectionStatus()
  );
  const [activeSourceId, setActiveSourceId] = useState<CommentSourceId>(
    config.activeSourceId || 'manual'
  );

  const [ttsState, setTtsState] = useState<TTSState>(ttsService.getState());

  // 4. Interaction & UI States
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);
  const [currentProcessingComment, setCurrentProcessingComment] = useState<QueuedComment | null>(null);
  const [lastAnsweredComment, setLastAnsweredComment] = useState<QueuedComment | null>(null);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [hasAiError, setHasAiError] = useState<boolean>(false);
  const [hasAnswerReady, setHasAnswerReady] = useState<boolean>(false);
  const [validationStatus, setValidationStatus] = useState<ResponseValidationStatus>('idle');
  const [debugInfo, setDebugInfo] = useState<PipelineDebugInfo | null>(null);

  // 5. Modals State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isNewLiveOpen, setIsNewLiveOpen] = useState(false);
  const [isEndLiveOpen, setIsEndLiveOpen] = useState(false);
  const [isE2ETestOpen, setIsE2ETestOpen] = useState(false);

  // Keep references for callbacks
  const configRef = useRef(config);
  configRef.current = config;
  const historyRef = useRef(history);
  historyRef.current = history;

  // Persist config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  // Persist history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error(e);
    }
  }, [history]);

  // Subscribe to TTS Service
  useEffect(() => {
    const unsub = ttsService.subscribe((state) => {
      setTtsState(state);
    });
    return unsub;
  }, []);

  // Update pipeline configuration when config changes
  useEffect(() => {
    commentPipelineService.updateConfig({
      hostName: config.hostName,
      coHostName: config.coHostName,
      persona: config.persona,
      topic: config.topic,
      autoResponse: config.autoSpeakAnswers,
      isAiPaused: config.isAiPaused,
      maxAnswersPerMinute: config.maxAnswersPerMinute || 10,
    });
    commentPipelineService.setConversationHistory(history);
  }, [
    config.hostName,
    config.coHostName,
    config.persona,
    config.topic,
    config.autoSpeakAnswers,
    config.isAiPaused,
    config.maxAnswersPerMinute,
    history,
  ]);

  // Subscribe to CommentPipelineService
  useEffect(() => {
    const unsub = commentPipelineService.subscribe((state) => {
      setQueuedComments(state.queue);
      setRateLimitState(state.rateLimit);
      setConnectionStatus(state.connectionStatus);
      setActiveSourceId(state.activeSource);
      setIsGenerating(state.isProcessing);
      setCurrentProcessingComment(state.currentProcessing);
      setLastAnsweredComment(state.lastAnswered);
      setValidationStatus(state.validationStatus);
      if (state.lastDebugInfo) {
        setDebugInfo(state.lastDebugInfo);
      }

      if (state.isProcessing) {
        setHasAiError(false);
        setHasAnswerReady(false);
      }
    });
    return unsub;
  }, []);

  // Handle new answered comment from pipeline
  useEffect(() => {
    if (lastAnsweredComment && lastAnsweredComment.answer) {
      const existing = historyRef.current.find((h) => h.commentId === lastAnsweredComment.id);
      if (!existing) {
        const newMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          commentId: lastAnsweredComment.id,
          viewerName: lastAnsweredComment.username,
          comment: lastAnsweredComment.text,
          answer: lastAnsweredComment.answer,
          timestamp: Date.now(),
          isFallback: !!lastAnsweredComment.isFallback,
          validationStatus: lastAnsweredComment.validationStatus || 'valid',
        };
        setHistory((prev) => [newMsg, ...prev]);
        setLatestMessage(newMsg);
        setHasAnswerReady(true);
        setHasAiError(false);
      } else {
        setLatestMessage(existing);
        setHasAnswerReady(true);
      }
    }
  }, [lastAnsweredComment]);

  // Sync selected comment with latest message
  const handleSelectComment = useCallback((comment: QueuedComment) => {
    setSelectedCommentId(comment.id);
    if (comment.answer) {
      const match = historyRef.current.find((h) => h.commentId === comment.id);
      if (match) {
        setLatestMessage(match);
      } else {
        const tempMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          commentId: comment.id,
          viewerName: comment.username,
          comment: comment.text,
          answer: comment.answer,
          timestamp: comment.processedAt || Date.now(),
          isFallback: !!comment.isFallback,
          validationStatus: comment.validationStatus || 'valid',
        };
        setLatestMessage(tempMsg);
      }
    }
  }, []);

  // Ingest manual comment
  const handleManualIngest = useCallback(
    (username: string, text: string, simulateError = false) => {
      commentPipelineService.ingestRawComment({
        id: `raw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username,
        text,
        timestamp: Date.now(),
        source: 'manual',
        simulateError,
      });
    },
    []
  );

  // Force answer a specific comment on-demand
  const handleAnswerComment = useCallback((comment: QueuedComment) => {
    commentPipelineService.processCommentOnDemand(comment.id);
  }, []);

  // Reconnect comment source
  const handleReconnect = useCallback(() => {
    commentPipelineService.reconnectSource();
  }, []);

  // Change comment source
  const handleChangeSource = useCallback((sourceId: CommentSourceId) => {
    commentPipelineService.switchSource(sourceId);
    setConfig((prev) => ({ ...prev, activeSourceId: sourceId }));
  }, []);

  // Toggle Auto-Response / Auto-Speak
  const handleToggleAutoSpeak = useCallback(() => {
    setConfig((prev) => {
      const next = !prev.autoSpeakAnswers;
      return { ...prev, autoSpeakAnswers: next };
    });
  }, []);

  // Toggle Pause AI
  const handleTogglePauseAi = useCallback(() => {
    setConfig((prev) => {
      const next = !prev.isAiPaused;
      return { ...prev, isAiPaused: next };
    });
  }, []);

  // Request variation / regenerate answer
  const handleRequestVariation = useCallback(
    (variation: ResponseVariation) => {
      if (isGenerating) return;

      const baseMessage = latestMessage;
      const viewerName = baseMessage ? baseMessage.viewerName : 'Penonton';
      const commentText = baseMessage
        ? baseMessage.comment
        : `Tolong beri interaksi gaya ${variation} untuk menyapa live`;

      setIsGenerating(true);
      setHasAiError(false);

      commentPipelineService
        .requestResponseVariation(viewerName, commentText, variation, baseMessage?.answer)
        .then((newAnswer) => {
          setIsGenerating(false);
          setHasAnswerReady(true);

          if (baseMessage) {
            const updated: ChatMessage = {
              ...baseMessage,
              answer: newAnswer,
              timestamp: Date.now(),
            };
            setHistory((prev) =>
              prev.map((msg) => (msg.id === baseMessage.id ? updated : msg))
            );
            setLatestMessage(updated);
          } else {
            const fresh: ChatMessage = {
              id: `msg-${Date.now()}`,
              viewerName,
              comment: commentText,
              answer: newAnswer,
              timestamp: Date.now(),
              isFallback: false,
              validationStatus: 'valid',
            };
            setHistory((prev) => [fresh, ...prev]);
            setLatestMessage(fresh);
          }

          // Auto speak if enabled
          if (configRef.current.autoSpeakAnswers) {
            ttsService.speak(newAnswer);
          }
        })
        .catch((err) => {
          console.error(err);
          setIsGenerating(false);
          setHasAiError(true);
        });
    },
    [isGenerating, latestMessage]
  );

  // Edit AI answer
  const handleEditAnswer = useCallback(
    (newAnswer: string) => {
      if (!latestMessage) return;
      const updated: ChatMessage = {
        ...latestMessage,
        answer: newAnswer,
        timestamp: Date.now(),
      };
      setHistory((prev) =>
        prev.map((msg) => (msg.id === latestMessage.id ? updated : msg))
      );
      setLatestMessage(updated);
    },
    [latestMessage]
  );

  // TTS Controls
  const handleSpeak = useCallback((text: string) => {
    ttsService.speak(text);
  }, []);

  const handlePauseSpeak = useCallback(() => {
    ttsService.pause();
  }, []);

  const handleResumeSpeak = useCallback(() => {
    ttsService.resume();
  }, []);

  const handleStopSpeak = useCallback(() => {
    ttsService.stop();
  }, []);

  // Clear conversation memory
  const handleClearConversation = useCallback(() => {
    setHistory([]);
    setLatestMessage(null);
    setSelectedCommentId(null);
    setCurrentProcessingComment(null);
    setLastAnsweredComment(null);
    setDebugInfo(null);
    ttsService.stop();
    commentPipelineService.clearQueue();
    setIsResetOpen(false);
  }, []);

  // Start LIVE from Setup
  const handleStartLive = useCallback((newConfig: LiveConfig) => {
    setConfig(newConfig);
    // Connect pipeline
    commentPipelineService.switchSource(newConfig.activeSourceId || 'manual');
  }, []);

  // End LIVE session
  const handleEndLive = useCallback(() => {
    ttsService.stop();
    commentPipelineService.clearQueue();
    setConfig((prev) => ({
      ...prev,
      isLive: false,
      startedAt: null,
    }));
    setIsEndLiveOpen(false);
  }, []);

  // Start New LIVE session from Header modal
  const handleConfirmNewLive = useCallback(
    (newSessionConfig: {
      hostName: string;
      coHostName: string;
      persona: LiveConfig['persona'];
      topic: string;
      clearMemory: boolean;
    }) => {
      ttsService.stop();
      if (newSessionConfig.clearMemory) {
        setHistory([]);
        setLatestMessage(null);
        setSelectedCommentId(null);
        setDebugInfo(null);
        commentPipelineService.clearQueue();
      }
      setConfig((prev) => ({
        ...prev,
        hostName: newSessionConfig.hostName,
        coHostName: newSessionConfig.coHostName,
        persona: newSessionConfig.persona,
        topic: newSessionConfig.topic,
        isLive: true,
        startedAt: Date.now(),
      }));
      setIsNewLiveOpen(false);
    },
    []
  );

  // 0. Render Login View if not authenticated or explicitly at login view
  if (!authSession || activeView === 'login') {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // 1. Render Master Dashboard for Master role
  if (activeView === 'master_dashboard') {
    if (authSession.role !== 'master') {
      // Owner trying to access master dashboard -> redirect to livemate
      return <LoginView onLoginSuccess={handleLoginSuccess} />;
    }
    return (
      <MasterDashboard
        currentSession={authSession}
        onLogout={handleLogout}
        onOpenLiveMate={handleOpenLiveMateFromMaster}
      />
    );
  }

  // 2. Render Setup View if not live yet
  if (!config.isLive) {
    return (
      <SetupView
        initialConfig={config}
        onStartLive={handleStartLive}
        preservedHistoryCount={history.length}
        preservedHistory={history}
        currentUser={authSession}
        onLogout={handleLogout}
        onSwitchToMaster={authSession.role === 'master' ? handleSwitchToMaster : undefined}
        onClearHistory={() => setHistory([])}
      />
    );
  }

  const waitingCount = queuedComments.filter((c) => c.status === 'waiting').length;

  return (
    <div
      id="livemate-app-root"
      className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100 font-sans"
    >
      {/* 1. Header with live status, stopwatch, and controls */}
      <Header
        config={config}
        conversationCount={history.length}
        isTTSActive={ttsState.isSpeaking}
        connectionStatus={connectionStatus}
        currentUser={authSession}
        onLogout={handleLogout}
        onSwitchToMaster={authSession.role === 'master' ? handleSwitchToMaster : undefined}
        onTogglePauseAi={handleTogglePauseAi}
        onOpenClearConversation={() => setIsResetOpen(true)}
        onOpenNewLive={() => setIsNewLiveOpen(true)}
        onOpenEndLive={() => setIsEndLiveOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container - Full Vertical Scrolling for Tablet & Mobile */}
      <main className="flex-1 p-3 md:p-5 flex flex-col gap-4 max-w-[1680px] w-full mx-auto">
        {/* 2. Live Monitoring Area: 6 Real-time Cards */}
        <LiveMonitoringArea
          activeSource={activeSourceId}
          connectionStatus={connectionStatus}
          waitingCount={waitingCount}
          currentProcessingComment={currentProcessingComment}
          lastAnsweredComment={lastAnsweredComment}
          isGenerating={isGenerating}
          hasAiError={hasAiError}
          hasAnswerReady={hasAnswerReady}
          validationStatus={validationStatus}
          ttsState={ttsState}
          rateLimitState={rateLimitState}
          onChangeSource={handleChangeSource}
          onReconnect={handleReconnect}
          onOpenE2ETest={() => setIsE2ETestOpen(true)}
        />

        {/* 3. Central Dual-Panel Workstation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel: Recent Comments & Ingestion Queue */}
          <div className="lg:col-span-6 flex flex-col min-h-[500px]">
            <CommentInputPanel
              queuedComments={queuedComments}
              activeSource={activeSourceId}
              connectionStatus={connectionStatus}
              rateLimitState={rateLimitState}
              selectedCommentId={selectedCommentId}
              currentProcessingComment={currentProcessingComment}
              autoResponse={config.autoSpeakAnswers}
              onSelectComment={handleSelectComment}
              onManualIngest={handleManualIngest}
              onAnswerComment={handleAnswerComment}
              onReconnect={handleReconnect}
              onChangeSource={handleChangeSource}
              onToggleAutoResponse={handleToggleAutoSpeak}
              isAiPaused={config.isAiPaused}
              onOpenE2ETest={() => setIsE2ETestOpen(true)}
            />
          </div>

          {/* Right Panel: Co-Host AI Response Deck */}
          <div className="lg:col-span-6 flex flex-col min-h-[500px]">
            <AIResponseCard
              latestMessage={latestMessage}
              config={config}
              isGenerating={isGenerating}
              ttsState={ttsState}
              debugInfo={debugInfo}
              onSpeak={handleSpeak}
              onPauseSpeak={handlePauseSpeak}
              onResumeSpeak={handleResumeSpeak}
              onStopSpeak={handleStopSpeak}
              onToggleAutoSpeak={handleToggleAutoSpeak}
              onRequestVariation={handleRequestVariation}
              onEditAnswer={handleEditAnswer}
            />
          </div>
        </div>

        {/* 4. Conversation History & Live Memory Section */}
        <ConversationHistory
          history={history}
          config={config}
          activeSpeakingText={ttsState.currentText}
          onSpeak={handleSpeak}
          onStopSpeak={handleStopSpeak}
          onOpenResetModal={() => setIsResetOpen(true)}
        />
      </main>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={(updated) => setConfig(updated)}
      />

      <ResetModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirmReset={handleClearConversation}
        conversationCount={history.length}
      />

      <NewLiveModal
        isOpen={isNewLiveOpen}
        onClose={() => setIsNewLiveOpen(false)}
        currentConfig={config}
        onConfirmNewLive={handleConfirmNewLive}
      />

      <EndLiveModal
        isOpen={isEndLiveOpen}
        onClose={() => setIsEndLiveOpen(false)}
        onConfirmEndLive={handleEndLive}
        conversationCount={history.length}
      />

      <E2ETestModal
        isOpen={isE2ETestOpen}
        onClose={() => setIsE2ETestOpen(false)}
        onSelectAnsweredMessage={(msg) => {
          setLatestMessage(msg);
          setSelectedCommentId(msg.commentId || null);
        }}
      />
    </div>
  );
}
export default App;
