import React, { useState, useRef } from 'react';
import {
  Send,
  User,
  Sparkles,
  X,
  Layers,
  MessageSquarePlus,
  Radio,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Volume2,
  Filter,
  Zap,
  Flame,
  Bot,
} from 'lucide-react';
import { SAMPLE_COMMENTS } from '../data/personas';
import {
  CommentSourceId,
  CommentStatus,
  ConnectionStatus,
  QueuedComment,
  RawComment,
} from '../types';
import {
  RateLimitState,
  runCommentSimulation,
} from '../services/commentPipeline';
import { ttsService } from '../utils/tts';

interface CommentInputPanelProps {
  queuedComments: QueuedComment[];
  activeSource: CommentSourceId;
  connectionStatus: ConnectionStatus;
  rateLimitState: RateLimitState;
  selectedCommentId: string | null;
  currentProcessingComment?: QueuedComment | null;
  autoResponse?: boolean;
  onSelectComment: (comment: QueuedComment) => void;
  onManualIngest: (username: string, text: string, simulateError?: boolean) => void;
  onAnswerComment?: (comment: QueuedComment) => void;
  onReconnect: () => void;
  onChangeSource: (sourceId: CommentSourceId) => void;
  onToggleAutoResponse?: () => void;
  isAiPaused?: boolean;
  onOpenE2ETest?: () => void;
}

export const CommentInputPanel: React.FC<CommentInputPanelProps> = ({
  queuedComments,
  activeSource,
  connectionStatus,
  rateLimitState,
  selectedCommentId,
  currentProcessingComment,
  autoResponse = false,
  onSelectComment,
  onManualIngest,
  onAnswerComment,
  onReconnect,
  onChangeSource,
  onToggleAutoResponse,
  onOpenE2ETest,
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'manual'>('feed');
  const [manualText, setManualText] = useState('');
  const [manualUser, setManualUser] = useState('Penonton');
  const [simulateErrorToggle, setSimulateErrorToggle] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | CommentStatus>('all');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStepInfo, setSimStepInfo] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const waitingCount = queuedComments.filter((c) => c.status === 'waiting').length;

  const handleManualSubmit = (e?: React.FormEvent, forceSimulateError?: boolean) => {
    if (e) e.preventDefault();
    const trimmedText = manualText.trim();
    if (!trimmedText && forceSimulateError === undefined) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      return;
    }
    const shouldError = forceSimulateError !== undefined ? forceSimulateError : simulateErrorToggle;
    onManualIngest(manualUser.trim() || 'Penonton', trimmedText || manualText, shouldError);
    setManualText('');
    setSimulateErrorToggle(false);
    setActiveTab('feed');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey || e.key === 'Enter') && !e.shiftKey) {
      e.preventDefault();
      handleManualSubmit();
    }
  };

  const selectSample = (sample: string) => {
    setManualText(sample);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleStartSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveTab('feed');
    setSimStepInfo('Memulai simulasi...');
    runCommentSimulation((step, total, comment) => {
      setSimStepInfo(`Simulasi: @${comment.username} (${step}/${total})`);
      if (step >= total) {
        setTimeout(() => {
          setIsSimulating(false);
          setSimStepInfo(null);
        }, 1800);
      }
    });
  };

  const filteredComments = queuedComments.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  const statusDotClass = {
    connected: 'bg-emerald-500 shadow-emerald-500/50',
    reconnecting: 'bg-amber-400 shadow-amber-400/50 animate-pulse',
    disconnected: 'bg-rose-500 shadow-rose-500/50',
    not_connected: 'bg-slate-400 shadow-slate-400/30',
  }[connectionStatus];

  const statusLabel = {
    connected: 'Connected',
    reconnecting: 'Reconnecting...',
    disconnected: 'Disconnected',
    not_connected: 'Not connected',
  }[connectionStatus];

  const statusTextColor = {
    connected: 'text-emerald-400',
    reconnecting: 'text-amber-400',
    disconnected: 'text-rose-400',
    not_connected: 'text-slate-400',
  }[connectionStatus];

  const activeProcessing =
    currentProcessingComment ||
    queuedComments.find((c) => c.status === 'processing') ||
    null;

  return (
    <section
      id="panel-left-comment-pipeline"
      className="flex flex-col h-full bg-slate-900/70 backdrop-blur-sm border border-slate-800 rounded-3xl p-4 md:p-5 shadow-xl relative"
    >
      {/* 1. Header: Sumber Komentar, Connection Status & Ingestion Switcher */}
      <div className="pb-3 mb-3 border-b border-slate-800/80 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  Recent Comments
                </h2>
                <div
                  id="badge-connection-status"
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-[11px] font-semibold"
                  title={`Connection Status: ${statusLabel}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${statusDotClass} shadow-sm`}
                  />
                  <span className={statusTextColor}>
                    {statusLabel}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Aliran Komentar: Ingestion → Filter → Queue → AI → TTS
              </p>
            </div>
          </div>

          {/* Reconnect button */}
          {connectionStatus !== 'connected' && connectionStatus !== 'not_connected' && (
            <button
              type="button"
              id="btn-reconnect-source"
              onClick={onReconnect}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Reconnect</span>
            </button>
          )}
        </div>

        {/* Comment Source Selector (Manual | Simulation | External) */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-slate-950/80 border border-slate-800/90">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Comment Source:</span>
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                id="btn-source-manual"
                onClick={() => onChangeSource('manual')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeSource === 'manual'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                id="btn-source-simulation"
                onClick={() => onChangeSource('simulation')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeSource === 'simulation'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Simulation
              </button>
              <button
                type="button"
                id="btn-source-external"
                onClick={() => onChangeSource('external')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  activeSource === 'external'
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="External Source Abstraction"
              >
                <span>External</span>
              </button>
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            {activeSource === 'manual' && 'Input langsung dari tablet'}
            {activeSource === 'simulation' && 'Aliran komentar pengujian'}
            {activeSource === 'external' && 'Abstraksi provider resmi'}
          </div>
        </div>

        {/* Notice for External Comment Source: Not connected */}
        {activeSource === 'external' && (
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-400" />
                External Comment Source
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-bold">
                Not connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              ExternalCommentSource disiapkan sebagai abstraksi untuk integrasi resmi di masa mendatang. Tidak ada koneksi TikTok palsu atau scraping.
            </p>
          </div>
        )}

        {/* Notice for Simulation Comment Source */}
        {activeSource === 'simulation' && (
          <div className="p-2.5 rounded-2xl bg-indigo-950/30 border border-indigo-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[11px] text-indigo-200">
                Simulasi mengirim komentar contoh bertahap ke Comment Engine pipeline.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onOpenE2ETest && (
                <button
                  type="button"
                  id="btn-open-e2e-test-banner"
                  onClick={onOpenE2ETest}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer transition-all active:scale-95 flex items-center gap-1 shadow-sm shadow-emerald-600/30"
                  title="Buka pengujian End-to-End Pipeline lengkap"
                >
                  <Sparkles className="w-3 h-3 text-emerald-200" />
                  <span>E2E Test</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleStartSimulation}
                disabled={isSimulating}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-[11px] cursor-pointer transition-all active:scale-95"
              >
                {isSimulating ? simStepInfo || 'Sedang Berjalan...' : 'Mulai Simulasi'}
              </button>
            </div>
          </div>
        )}

        {/* Metrics: Queue Count & Responses used this minute */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div
            id="metric-queue-count"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
          >
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Queue Count:</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-bold">
                {waitingCount} waiting
              </span>
              <span className="text-slate-500 text-[11px]">
                ({queuedComments.length} total)
              </span>
            </div>
          </div>

          <div
            id="metric-responses-used-minute"
            className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-colors ${
              rateLimitState.isThrottled
                ? 'bg-amber-950/40 text-amber-300 border-amber-600/50'
                : 'bg-slate-950/80 text-slate-300 border-slate-800'
            }`}
            title="Batas jawaban AI per menit (default 10) untuk mencegah spam"
          >
            <div className="flex items-center gap-2 font-medium">
              <Zap
                className={`w-4 h-4 ${
                  rateLimitState.isThrottled ? 'text-amber-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              <span>Responses this minute:</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold">
              <span
                className={`px-2 py-0.5 rounded-md ${
                  rateLimitState.isThrottled
                    ? 'bg-amber-900/60 text-amber-200 border border-amber-600/60'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                {rateLimitState.responsesUsedThisMinute} / {rateLimitState.maxPerMinute}
              </span>
              {rateLimitState.isThrottled && (
                <span className="text-[10px] text-amber-400 font-normal">
                  ({rateLimitState.resetInSeconds}s)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sub-controls: Auto Response indicator & Simulation buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-toggle-auto-response-inline"
              onClick={onToggleAutoResponse}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                autoResponse
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Klik untuk mengubah mode AUTO RESPONSE ON/OFF"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  autoResponse ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>AUTO RESPONSE: {autoResponse ? 'ON' : 'OFF'}</span>
            </button>
            <span className="text-[11px] text-slate-400 hidden lg:inline">
              {autoResponse
                ? 'AI memproses & menyuarakan otomatis'
                : 'Komentar antre; host menekan tombol Jawab'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenE2ETest && (
              <button
                type="button"
                id="btn-e2e-test-subcontrol"
                onClick={onOpenE2ETest}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-500/10"
                title="Jalankan pengujian End-to-End Pipeline lengkap (5 komentar sekuensial)"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>E2E Test</span>
              </button>
            )}
            <button
              type="button"
              id="btn-simulate-comments"
              onClick={handleStartSimulation}
              disabled={isSimulating}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs border transition-all active:scale-95 cursor-pointer ${
                isSimulating
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                  : 'bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-indigo-200 border-slate-700'
              }`}
              title="Uji coba pipeline dengan simulasi komentar bertahap"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {isSimulating ? simStepInfo || 'Simulasi Berjalan...' : 'Simulate Comments'}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: Feed Komentar vs Input Manual */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              type="button"
              id="tab-btn-feed"
              onClick={() => setActiveTab('feed')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Comment Feed</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
                {queuedComments.length}
              </span>
            </button>
            <button
              type="button"
              id="tab-btn-manual"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Manual Input</span>
            </button>
          </div>

          {/* Status Filter Tabs */}
          {activeTab === 'feed' && (
            <div className="hidden sm:flex items-center gap-1 text-[11px] overflow-x-auto">
              {(
                [
                  'all',
                  'waiting',
                  'processing',
                  'answered',
                  'ignored',
                  'failed',
                ] as const
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded-lg border transition-colors cursor-pointer capitalize whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-slate-800 text-slate-200 border-slate-600 font-bold'
                      : 'text-slate-500 hover:text-slate-300 border-transparent'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-3">
        {activeTab === 'feed' ? (
          /* TAB 1: FEED KOMENTAR & ANTREAN */
          <div ref={feedContainerRef} className="space-y-2.5 h-full">
            {/* Current Processing Comment Banner */}
            {activeProcessing && (
              <div
                id="banner-current-processing-comment"
                className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-500/60 shadow-lg shadow-indigo-950/40 space-y-2 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                    </span>
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                      Current Processing Comment
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono font-bold">
                    status: processing
                  </span>
                </div>
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-indigo-900/50 flex items-start gap-2">
                  <Bot className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-300 font-medium">
                      <strong className="text-indigo-200">@{activeProcessing.username}</strong>:{' '}
                      <span className="italic text-slate-100">"{activeProcessing.text}"</span>
                    </p>
                    <p className="text-[10px] text-indigo-400/80 mt-0.5">
                      Co-Host AI sedang merangkai jawaban yang natural...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {filteredComments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400">
                  <MessageSquarePlus className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-300">
                    Belum ada komentar dalam antrean
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Klik <strong>Simulate Comments</strong> untuk menguji alur pipeline, atau ketik komentar di tab <strong>Manual Input</strong>.
                  </p>
                </div>
              </div>
            ) : (
              filteredComments.map((item) => {
                const isSelected = selectedCommentId === item.id;
                return (
                  <div
                    key={item.id}
                    id={`comment-item-${item.id}`}
                    onClick={() => {
                      if (item.status === 'answered' || item.status === 'processing') {
                        onSelectComment(item);
                      }
                    }}
                    className={`p-3 md:p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-slate-800/95 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                        : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800/90'
                    } ${
                      item.status === 'answered' || item.status === 'processing'
                        ? 'cursor-pointer'
                        : ''
                    }`}
                  >
                    {/* Top Row: User, Time, Source & Status */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs text-indigo-300 truncate">
                          @{item.username}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatTime(item.timestamp)}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700/60 uppercase">
                          {item.source || 'manual'}
                        </span>
                        {item.isQuestion && (
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-0.5">
                            <HelpCircle className="w-2.5 h-2.5" />
                            <span>Tanya</span>
                          </span>
                        )}
                        {item.isDirectInteraction && !item.isQuestion && (
                          <span className="px-1.5 py-0.2 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px] font-bold flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" />
                            <span>Interaksi</span>
                          </span>
                        )}
                      </div>

                      {/* Status Indicator */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {item.status === 'waiting' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            <span>Waiting</span>
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/40 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-indigo-400" />
                            <span>Processing</span>
                          </span>
                        )}
                        {item.status === 'answered' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            <span>Answered</span>
                          </span>
                        )}
                        {item.status === 'ignored' && (
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[10px] font-medium border border-rose-500/30"
                            title={item.ignoreReason}
                          >
                            <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                            <span>Ignored {item.ignoreReason ? `(${item.ignoreReason})` : ''}</span>
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.isFallback
                                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                                : 'bg-rose-600/20 text-rose-300 border-rose-500/40'
                            }`}
                            title={item.error || 'Gagal merespon'}
                          >
                            {item.isFallback ? (
                              <>
                                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                <span>Fallback</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-2.5 h-2.5 text-rose-400" />
                                <span>Failed</span>
                              </>
                            )}
                          </span>
                        )}
                        {item.status === 'waiting' && onAnswerComment && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnswerComment(item);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-transform active:scale-95 shadow-sm"
                            title="Proses komentar ini sekarang dengan AI"
                          >
                            <Zap className="w-3 h-3 fill-current" />
                            <span>Jawab</span>
                          </button>
                        )}
                        {item.status === 'failed' && onAnswerComment && (
                          <button
                            type="button"
                            id={`btn-retry-comment-${item.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnswerComment(item);
                            }}
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer transition-transform active:scale-95 shadow-sm"
                            title="Coba proses ulang komentar ini dengan AI"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Comment Content */}
                    <p className="text-sm text-slate-200 leading-relaxed font-sans">
                      {item.text}
                    </p>

                    {/* AI Answer Preview if Answered */}
                    {item.answer && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1 text-indigo-300">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            Jawaban Co-Host:
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              ttsService.speak(item.answer!);
                            }}
                            className="flex items-center gap-1 text-slate-400 hover:text-emerald-300 cursor-pointer"
                            title="Bacakan ke speaker tablet (speech queue)"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Baca</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 bg-slate-900/90 p-2 rounded-xl border border-slate-800/90 italic line-clamp-2">
                          "{item.answer}"
                        </p>
                      </div>
                    )}

                    {/* Error message if Failed */}
                    {item.status === 'failed' && item.error && (
                      <div className="mt-1.5 text-[11px] text-rose-400/90 bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-800/40">
                        {item.error}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* TAB 2: MANUAL INPUT FORM */
          <form onSubmit={handleManualSubmit} className="flex flex-col h-full gap-3">
            {/* Viewer Name */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-400 font-medium shrink-0">Dari:</span>
              <input
                id="input-manual-viewer-name"
                type="text"
                value={manualUser}
                onChange={(e) => setManualUser(e.target.value)}
                placeholder="Username penonton"
                className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none font-medium"
              />
            </div>

            {/* Comment Textarea */}
            <div className="relative flex-1 min-h-[140px] flex flex-col">
              <textarea
                id="textarea-manual-comment"
                ref={textareaRef}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik komentar penonton... Komentar akan mengalir melalui Comment Filter -> Queue -> AI -> TTS."
                className="w-full flex-1 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm md:text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none leading-relaxed transition-all"
              />
              {manualText && (
                <button
                  type="button"
                  onClick={() => setManualText('')}
                  className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Sample Chips & Testing Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">
                  Contoh Komentar Biasa:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {SAMPLE_COMMENTS.slice(0, 4).map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectSample(sample)}
                    className="text-xs px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 cursor-pointer active:scale-95"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              {/* Spam Filter & AI Error Testing Presets */}
              <div className="pt-1.5 border-t border-slate-800/60 space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wide flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Pengujian Filter & Error Handling (Instan):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    id="btn-test-empty-comment"
                    onClick={() => {
                      onManualIngest(manualUser, '', false);
                      setActiveTab('feed');
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 cursor-pointer"
                    title="Uji: komentar kosong harus diabaikan (Ignored)"
                  >
                    1. Empty Comment
                  </button>
                  <button
                    type="button"
                    id="btn-test-emoji-comment"
                    onClick={() => {
                      onManualIngest(manualUser, '👍🔥', false);
                      setActiveTab('feed');
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 cursor-pointer"
                    title="Uji: komentar emoji-only harus diabaikan (Ignored)"
                  >
                    2. Emoji Only
                  </button>
                  <button
                    type="button"
                    id="btn-test-spam-comment"
                    onClick={() => {
                      onManualIngest(manualUser, 'spam spam spam spam spam', false);
                      setActiveTab('feed');
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 cursor-pointer"
                    title="Uji: spam berulang harus diabaikan (Ignored)"
                  >
                    3. Repeated Spam
                  </button>
                  <button
                    type="button"
                    id="btn-test-ai-error"
                    onClick={() => {
                      onManualIngest(manualUser, 'Halo co-host, tolong jawab pertanyaan ini', true);
                      setActiveTab('feed');
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-800/50 cursor-pointer font-semibold"
                    title="Uji: AI gagal -> komentar berstatus Failed -> tombol Retry tersedia"
                  >
                    4. Simulate AI Error & Retry
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox simulate error */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="checkbox-simulate-ai-error"
                type="checkbox"
                checked={simulateErrorToggle}
                onChange={(e) => setSimulateErrorToggle(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500/20 bg-slate-950 w-4 h-4"
              />
              <label htmlFor="checkbox-simulate-ai-error" className="text-xs text-slate-300 cursor-pointer">
                Simulasikan kegagalan AI untuk komentar ini (Uji status <span className="text-rose-400 font-bold">Failed</span> & tombol <span className="text-rose-400 font-bold">Retry</span>)
              </label>
            </div>

            {/* Submit to Pipeline Button */}
            <button
              id="btn-submit-manual-to-pipeline"
              type="submit"
              className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.99] bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
            >
              <Send className="w-4 h-4" />
              <span>Kirim ke Comment Engine</span>
            </button>
          </form>
        )}
      </div>

      {/* Quick bottom 1-line input when on Feed tab */}
      {activeTab === 'feed' && (
        <form
          onSubmit={(e) => handleManualSubmit(e, false)}
          className="pt-2 mt-2 border-t border-slate-800/80 flex items-center gap-2"
        >
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Ketik komentar cepat... (Enter)"
            className="flex-1 h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="h-10 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
            title="Kirim ke pipeline"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </section>
  );
};
