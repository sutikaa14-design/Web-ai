import React from 'react';
import {
  Radio,
  RefreshCw,
  Layers,
  Cpu,
  Volume2,
  VolumeX,
  Zap,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Pause,
  Bot,
  Check,
  Sparkles,
  Clock,
} from 'lucide-react';
import {
  CommentSourceId,
  ConnectionStatus,
  QueuedComment,
  ResponseValidationStatus,
} from '../types';
import { RateLimitState } from '../services/commentPipeline';
import { TTSState } from '../utils/tts';

export interface LiveMonitoringAreaProps {
  activeSource: CommentSourceId;
  connectionStatus: ConnectionStatus;
  waitingCount: number;
  currentProcessingComment: QueuedComment | null;
  lastAnsweredComment: QueuedComment | null;
  isGenerating: boolean;
  hasAiError: boolean;
  hasAnswerReady: boolean;
  validationStatus?: ResponseValidationStatus;
  ttsState: TTSState;
  rateLimitState: RateLimitState;
  onChangeSource?: (sourceId: CommentSourceId) => void;
  onReconnect?: () => void;
  onOpenE2ETest?: () => void;
}

export const LiveMonitoringArea: React.FC<LiveMonitoringAreaProps> = ({
  activeSource,
  connectionStatus,
  waitingCount,
  currentProcessingComment,
  lastAnsweredComment,
  isGenerating,
  hasAiError,
  hasAnswerReady,
  validationStatus = 'idle',
  ttsState,
  rateLimitState,
  onChangeSource,
  onReconnect,
  onOpenE2ETest,
}) => {
  // 1. Connection Status Details
  const connectionLabelMap: Record<ConnectionStatus, string> = {
    connected: 'Connected',
    reconnecting: 'Reconnecting',
    disconnected: 'Disconnected',
    not_connected: 'Not connected',
  };
  const connectionStatusLabel = connectionLabelMap[connectionStatus] || 'Not connected';

  const connectionDotColor: Record<ConnectionStatus, string> = {
    connected: 'bg-emerald-400 shadow-emerald-400/50',
    reconnecting: 'bg-amber-400 shadow-amber-400/50 animate-pulse',
    disconnected: 'bg-rose-500 shadow-rose-500/50',
    not_connected: 'bg-slate-400 shadow-slate-400/30',
  };

  const connectionTextColor: Record<ConnectionStatus, string> = {
    connected: 'text-emerald-400',
    reconnecting: 'text-amber-400',
    disconnected: 'text-rose-400',
    not_connected: 'text-slate-400',
  };

  const sourceNameMap: Record<CommentSourceId, string> = {
    manual: 'Manual',
    simulation: 'Simulation',
    external: 'External',
  };

  // 2. AI Status
  let aiStatusText: 'AI Thinking' | 'AI Error' | 'AI Answer Ready' | 'AI Idle' = 'AI Idle';
  if (isGenerating) {
    aiStatusText = 'AI Thinking';
  } else if (hasAiError) {
    aiStatusText = 'AI Error';
  } else if (hasAnswerReady) {
    aiStatusText = 'AI Answer Ready';
  } else {
    aiStatusText = 'AI Idle';
  }

  // 3. TTS Status
  let ttsStatusText: 'Speaking' | 'Paused' | 'Waiting in Queue' | 'Idle' = 'Idle';
  if (ttsState.isSpeaking && !ttsState.isPaused) {
    ttsStatusText = 'Speaking';
  } else if (ttsState.isPaused) {
    ttsStatusText = 'Paused';
  } else if (ttsState.queueLength > 0) {
    ttsStatusText = 'Waiting in Queue';
  } else {
    ttsStatusText = 'Idle';
  }

  // 4. Response Limit reached check
  const isLimitReached =
    rateLimitState.isThrottled ||
    rateLimitState.responsesUsedThisMinute >= rateLimitState.maxPerMinute;

  return (
    <section
      id="live-assistant-monitoring-area"
      aria-label="Real-time Live Assistant Monitoring"
      className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-3 md:p-4 shadow-xl select-none shrink-0"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {/* 1. CONNECTION */}
        <div
          id="monitor-card-connection"
          className="flex flex-col justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              1. CONNECTION
            </span>
            <div className="flex items-center gap-1">
              {activeSource === 'simulation' && onOpenE2ETest && (
                <button
                  type="button"
                  id="btn-monitor-e2e-test"
                  onClick={onOpenE2ETest}
                  className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm shadow-emerald-500/10"
                  title="Buka End-to-End Pipeline Test"
                >
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  <span>E2E Test</span>
                </button>
              )}
              {(connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') &&
                onReconnect && (
                  <button
                    type="button"
                    id="btn-monitor-reconnect"
                    onClick={onReconnect}
                    className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>Reconnect</span>
                  </button>
                )}
            </div>
          </div>

          <div className="space-y-1">
            {/* Comment Source */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Source:</span>
              {onChangeSource ? (
                <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-semibold">
                  {(['manual', 'simulation', 'external'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onChangeSource(s)}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        activeSource === s
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sourceNameMap[s]}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="font-bold text-slate-200">{sourceNameMap[activeSource]}</span>
              )}
            </div>

            {/* Connection Status */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-slate-400">Status:</span>
              <div
                id="monitor-connection-status-value"
                className="flex items-center gap-1.5 font-bold"
              >
                <span
                  className={`w-2 h-2 rounded-full shadow-sm ${connectionDotColor[connectionStatus]}`}
                />
                <span className={connectionTextColor[connectionStatus]}>
                  {connectionStatusLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. COMMENT QUEUE */}
        <div
          id="monitor-card-comment-queue"
          className="flex flex-col justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              2. COMMENT QUEUE
            </span>
            <span
              id="monitor-queue-waiting-badge"
              className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] font-bold"
            >
              {waitingCount} Waiting
            </span>
          </div>

          <div className="space-y-1 text-xs">
            {/* Currently Processing */}
            <div className="flex items-center gap-1 truncate">
              <span className="text-slate-400 shrink-0">Processing:</span>
              {currentProcessingComment ? (
                <span
                  id="monitor-queue-processing-text"
                  className="font-semibold text-amber-300 truncate flex items-center gap-1"
                  title={`@${currentProcessingComment.username}: ${currentProcessingComment.text}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  @{currentProcessingComment.username}: "{currentProcessingComment.text}"
                </span>
              ) : (
                <span id="monitor-queue-processing-none" className="text-slate-500 font-medium">
                  None
                </span>
              )}
            </div>

            {/* Last Answered Comment */}
            <div className="flex items-center gap-1 truncate">
              <span className="text-slate-400 shrink-0">Last Answered:</span>
              {lastAnsweredComment ? (
                <span
                  id="monitor-queue-last-answered-text"
                  className="font-semibold text-emerald-300 truncate flex items-center gap-1"
                  title={`@${lastAnsweredComment.username}: ${lastAnsweredComment.text}`}
                >
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  @{lastAnsweredComment.username}: "{lastAnsweredComment.text}"
                </span>
              ) : (
                <span id="monitor-queue-last-answered-none" className="text-slate-500 font-medium">
                  None yet
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. AI STATUS */}
        <div
          id="monitor-card-ai-status"
          className="flex flex-col justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              3. AI STATUS
            </span>
          </div>

          <div className="flex flex-col justify-center py-1">
            <div
              id="monitor-ai-status-badge"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                aiStatusText === 'AI Thinking'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm shadow-indigo-600/20 animate-pulse'
                  : aiStatusText === 'AI Error'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  : aiStatusText === 'AI Answer Ready'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
              }`}
            >
              {aiStatusText === 'AI Thinking' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>AI Thinking</span>
                </>
              )}
              {aiStatusText === 'AI Error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>AI Error</span>
                </>
              )}
              {aiStatusText === 'AI Answer Ready' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Answer Ready</span>
                </>
              )}
              {aiStatusText === 'AI Idle' && (
                <>
                  <Bot className="w-3.5 h-3.5 text-slate-400" />
                  <span>AI Idle</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4. RESPONSE VALIDATION */}
        <div
          id="monitor-card-response-validation"
          className={`flex flex-col justify-between p-3 rounded-2xl border transition-colors relative overflow-hidden ${
            validationStatus === 'valid'
              ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm shadow-emerald-950/20'
              : validationStatus === 'retry'
              ? 'bg-amber-950/30 border-amber-500/50 shadow-sm shadow-amber-950/20 animate-pulse'
              : validationStatus === 'failed'
              ? 'bg-rose-950/30 border-rose-500/40 shadow-sm shadow-rose-950/20'
              : validationStatus === 'fallback'
              ? 'bg-purple-950/35 border-purple-500/50 shadow-sm shadow-purple-950/30'
              : 'bg-slate-950/70 border-slate-800/90'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              4. VALIDATION
            </span>
            {validationStatus === 'fallback' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-200 border border-purple-500/40 uppercase">
                Active
              </span>
            )}
          </div>

          <div className="flex flex-col justify-center py-1">
            <div
              id="monitor-validation-status-badge"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                validationStatus === 'valid'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                  : validationStatus === 'retry'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                  : validationStatus === 'failed'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/20'
                  : validationStatus === 'fallback'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/20'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
              }`}
            >
              {validationStatus === 'valid' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Valid</span>
                </>
              )}
              {validationStatus === 'retry' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Retry (Auto 1x)</span>
                </>
              )}
              {validationStatus === 'failed' && (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Failed</span>
                </>
              )}
              {validationStatus === 'fallback' && (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                  <span>Fallback</span>
                </>
              )}
              {validationStatus === 'idle' && (
                <>
                  <Bot className="w-3.5 h-3.5 text-slate-400" />
                  <span>Standby</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 5. TTS STATUS */}
        <div
          id="monitor-card-tts-status"
          className="flex flex-col justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 relative overflow-hidden"
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              5. TTS STATUS
            </span>
            {ttsState.queueLength > 0 && (
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/50">
                Queue: {ttsState.queueLength}
              </span>
            )}
          </div>

          <div className="flex flex-col justify-center py-1">
            <div
              id="monitor-tts-status-badge"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                ttsStatusText === 'Speaking'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                  : ttsStatusText === 'Paused'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : ttsStatusText === 'Waiting in Queue'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
              }`}
            >
              {ttsStatusText === 'Speaking' && (
                <>
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-2"></span>
                    <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-3"></span>
                    <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-2"></span>
                  </div>
                  <span>Speaking</span>
                </>
              )}
              {ttsStatusText === 'Paused' && (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span>Paused</span>
                </>
              )}
              {ttsStatusText === 'Waiting in Queue' && (
                <>
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Waiting in Queue</span>
                </>
              )}
              {ttsStatusText === 'Idle' && (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span>Idle</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 6. RESPONSE LIMIT */}
        <div
          id="monitor-card-response-limit"
          className={`flex flex-col justify-between p-3 rounded-2xl border transition-colors relative overflow-hidden ${
            isLimitReached
              ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/30'
              : 'bg-slate-950/70 border-slate-800/90'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span
              className={`text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5 ${
                isLimitReached ? 'text-amber-300' : 'text-slate-400'
              }`}
            >
              <Zap
                className={`w-3.5 h-3.5 ${
                  isLimitReached ? 'text-amber-400 animate-bounce' : 'text-indigo-400'
                }`}
              />
              6. RESPONSE LIMIT
            </span>
          </div>

          <div className="space-y-1">
            <div
              id="monitor-response-limit-counter"
              className="text-xs font-semibold text-slate-200"
            >
              Responses: <strong className="font-mono text-white">{rateLimitState.responsesUsedThisMinute}</strong> / {rateLimitState.maxPerMinute} this minute
            </div>
            {isLimitReached ? (
              <div
                id="badge-response-limit-reached"
                className="flex items-center justify-between px-2 py-1 rounded-lg bg-amber-500/25 border border-amber-500/50 text-[11px] font-bold text-amber-200 animate-pulse"
              >
                <span>Response limit reached</span>
                <span className="font-mono text-[10px] text-amber-300">
                  ({rateLimitState.resetInSeconds}s)
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500">
                {rateLimitState.maxPerMinute - rateLimitState.responsesUsedThisMinute} slot tersedia
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
