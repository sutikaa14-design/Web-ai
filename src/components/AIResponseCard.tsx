import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Volume1,
  VolumeX,
  Pause,
  Play,
  Square,
  Copy,
  Check,
  Bot,
  RefreshCw,
  Edit3,
  Sparkles,
  Smile,
  Heart,
  Flame,
  MessageCircle,
  Megaphone,
  Zap,
  Feather,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Radio,
  Sliders,
} from 'lucide-react';
import { ChatMessage, LiveConfig, PersonaType, ResponseVariation, PipelineDebugInfo } from '../types';
import { PERSONAS } from '../data/personas';
import { TTSState, ttsService } from '../utils/tts';

interface AIResponseCardProps {
  latestMessage: ChatMessage | null;
  config: LiveConfig;
  isGenerating: boolean;
  ttsState: TTSState;
  debugInfo?: PipelineDebugInfo | null;
  onSpeak: (text: string) => void;
  onPauseSpeak: () => void;
  onResumeSpeak: () => void;
  onStopSpeak: () => void;
  onToggleAutoSpeak: () => void;
  onRequestVariation: (variation: ResponseVariation) => void;
  onEditAnswer: (newAnswer: string) => void;
  onTriggerQuickEngagement?: (variation: ResponseVariation) => void;
}

export const AIResponseCard: React.FC<AIResponseCardProps> = ({
  latestMessage,
  config,
  isGenerating,
  ttsState,
  debugInfo,
  onSpeak,
  onPauseSpeak,
  onResumeSpeak,
  onStopSpeak,
  onToggleAutoSpeak,
  onRequestVariation,
  onEditAnswer,
}) => {
  const [copied, setCopied] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<number>(1); // 0 = normal, 1 = large, 2 = extra large
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>('');
  const [showMoreVariations, setShowMoreVariations] = useState<boolean>(false);
  const [showTtsControls, setShowTtsControls] = useState<boolean>(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const currentPersona = PERSONAS[config.persona as PersonaType] || PERSONAS.ramah;

  // Sync editText when message changes
  useEffect(() => {
    if (latestMessage?.answer) {
      setEditText(latestMessage.answer);
      setIsEditing(false);
    }
  }, [latestMessage?.id, latestMessage?.answer]);

  // Focus textarea when editing begins
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing]);

  const handleCopy = async () => {
    if (!latestMessage?.answer) return;
    try {
      await navigator.clipboard.writeText(latestMessage.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEditAnswer(editText.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(latestMessage?.answer || '');
    setIsEditing(false);
  };

  const isCurrentTextSpeaking =
    (ttsState.isSpeaking || ttsState.isPaused) &&
    ttsState.currentText === latestMessage?.answer;

  const fontSizeClasses = [
    'text-base md:text-lg leading-relaxed',
    'text-lg md:text-2xl leading-relaxed md:leading-normal font-medium',
    'text-xl md:text-3xl leading-snug md:leading-relaxed font-semibold',
  ];

  return (
    <section
      id="panel-right-ai-response"
      className="flex flex-col h-full bg-slate-900/70 backdrop-blur-sm border border-slate-800 rounded-3xl p-4 md:p-6 shadow-xl relative"
    >
      {/* Top Bar: Co-Host Identity, Font Controls & Auto-Speak Toggle */}
      <div className="flex flex-wrap items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-bold text-lg shrink-0">
            {currentPersona.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white leading-tight">
                {config.coHostName}
              </h2>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${currentPersona.bgLight} ${currentPersona.color} border border-current/20`}
              >
                {currentPersona.label}
              </span>
              {latestMessage?.isFallback ? (
                <span
                  id="badge-fallback-response"
                  className="px-2 py-0.5 rounded-full bg-purple-500/25 text-purple-200 border border-purple-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                  Fallback Response
                </span>
              ) : (
                <span
                  id="badge-current-ai-response-title"
                  className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold uppercase tracking-wider"
                >
                  {latestMessage?.validationStatus === 'valid' ? 'Valid AI Response' : 'Current AI Response'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isGenerating
                ? 'Sedang merangkai respon baru...'
                : ttsState.isSpeaking && !ttsState.isPaused
                ? 'Sedang dibacakan ke speaker tablet...'
                : latestMessage?.isFallback
                ? 'Respon fallback ramah disiapkan & dimasukkan ke antrean suara'
                : latestMessage
                ? 'Respon siap dibacakan atau disunting'
                : 'Menunggu komentar penonton untuk dijawab'}
            </p>
          </div>
        </div>

        {/* Right Header Badges: Auto-Speak Switch & Font Zoom */}
        <div className="flex items-center gap-2">
          {/* Quick AUTO RESPONSE Toggle Button */}
          <button
            type="button"
            id="btn-toggle-autospeak"
            onClick={onToggleAutoSpeak}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 ${
              config.autoSpeakAnswers
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/30'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-300 border-slate-700/60'
            }`}
            title={
              config.autoSpeakAnswers
                ? 'AUTO RESPONSE ON: Jawaban AI otomatis masuk ke antrean TTS browser/perangkat'
                : 'AUTO RESPONSE OFF: Host melihat respon di tablet dan memilih Baca secara manual'
            }
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                config.autoSpeakAnswers ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
              }`}
            />
            <span className="hidden sm:inline">AUTO RESPONSE:</span>
            <span className="font-bold">
              {config.autoSpeakAnswers ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Action badges: text zoom */}
          <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700/60">
            <button
              type="button"
              onClick={() => setFontSizeLevel((prev) => Math.max(0, prev - 1))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors cursor-pointer"
              title="Kecilkan Teks"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-1 font-semibold">
              {fontSizeLevel === 0 ? 'A' : fontSizeLevel === 1 ? 'A+' : 'A++'}
            </span>
            <button
              type="button"
              onClick={() => setFontSizeLevel((prev) => Math.min(2, prev + 1))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors cursor-pointer"
              title="Besarkan Teks untuk Tablet"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto space-y-4">
        {isGenerating ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Bot className="w-8 h-8 animate-bounce" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-200">
                {config.coHostName} sedang merangkai respon...
              </h3>
              <p className="text-xs text-slate-400">
                Memahami konteks obrolan live & karakter {currentPersona.label}
              </p>
            </div>
          </div>
        ) : latestMessage ? (
          <div className="space-y-3.5 flex-1 flex flex-col">
            {/* Header of message: Context reference & Tool buttons (Jawaban Lain & Edit) */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400">
              <div className="truncate flex-1 min-w-[180px]">
                <span>
                  Menanggapi: <strong className="text-slate-200">@{latestMessage.viewerName}</strong>{' '}
                  <span className="italic text-slate-400">"{latestMessage.comment}"</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="btn-regenerate-answer"
                  type="button"
                  onClick={() => onRequestVariation('regenerate')}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                  title="Minta AI memberikan alternatif respon lain untuk komentar ini"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Jawaban Lain</span>
                </button>
                {!isEditing && (
                  <button
                    id="btn-edit-answer"
                    type="button"
                    onClick={() => {
                      setEditText(latestMessage.answer);
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                    title="Edit teks jawaban ini sebelum dibacakan"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit Jawaban</span>
                  </button>
                )}
              </div>
            </div>

            {/* AI Response Card or Inline Editor */}
            <div
              id="ai-response-text-container"
              className="flex-1 min-h-[150px] p-4 md:p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900/90 border border-slate-800/80 flex flex-col justify-center relative shadow-inner group"
            >
              {isEditing ? (
                /* Inline Editor Mode */
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" />
                      Mode Edit Jawaban:
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Sesuaikan kata-kata agar lebih pas dibawakan saat live
                    </span>
                  </div>
                  <textarea
                    ref={editTextareaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full flex-1 min-h-[110px] p-3.5 rounded-xl bg-slate-900 border border-amber-500/50 text-white text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none font-sans leading-relaxed"
                    placeholder="Tulis atau perbaiki kalimat jawaban..."
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      id="btn-save-edited-answer"
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan Jawaban</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Display Mode */
                <>
                  <p
                    className={`text-slate-100 ${fontSizeClasses[fontSizeLevel]} tracking-normal font-sans`}
                  >
                    {latestMessage.answer}
                  </p>
                  {/* Speech Status Indicator */}
                  {(ttsState.isSpeaking || ttsState.isPaused) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2 font-medium">
                        {ttsState.isPaused ? (
                          <div className="flex items-center gap-1.5 text-amber-400">
                            <Pause className="w-3.5 h-3.5 fill-amber-400" />
                            <span>Suara dijeda (Paused)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-400">
                            <div className="flex items-end gap-1 h-3.5">
                              <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-2"></span>
                              <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-3.5"></span>
                              <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-2"></span>
                            </div>
                            <span>
                              {isCurrentTextSpeaking
                                ? 'Sedang dibacakan ke speaker tablet...'
                                : 'Membacakan jawaban sebelumnya...'}
                            </span>
                          </div>
                        )}
                      </div>
                      {ttsState.queueLength > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold text-[11px]">
                          <span>Antrean Suara: {ttsState.queueLength} pesan menunggu</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Quick Response Section */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Quick Response (Ubah Nada Jawaban):
                </span>
                <button
                  type="button"
                  onClick={() => setShowMoreVariations(!showMoreVariations)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                >
                  {showMoreVariations ? 'Sembunyikan Variasi Lain' : 'Opsi Lain (Pantun, dsb)'}
                </button>
              </div>

              {/* 5 Tombol Quick Response */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {/* 1. Lucu */}
                <button
                  type="button"
                  id="btn-quick-lucu"
                  onClick={() => onRequestVariation('lucu')}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-yellow-300 hover:text-yellow-200 border border-slate-700/70 hover:border-yellow-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                  title="Gaya celetukan lucu dan menghibur"
                >
                  <Smile className="w-4 h-4 text-yellow-400" />
                  <span>Lucu</span>
                </button>
                {/* 2. Ramah */}
                <button
                  type="button"
                  id="btn-quick-ramah"
                  onClick={() => onRequestVariation('ramah')}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-pink-300 hover:text-pink-200 border border-slate-700/70 hover:border-pink-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                  title="Gaya ramah, hangat, dan manis"
                >
                  <Heart className="w-4 h-4 text-pink-400 fill-pink-400/20" />
                  <span>Ramah</span>
                </button>
                {/* 3. Hype */}
                <button
                  type="button"
                  id="btn-quick-hype"
                  onClick={() => onRequestVariation('hype')}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-orange-300 hover:text-orange-200 border border-slate-700/70 hover:border-orange-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                  title="Gaya heboh dan membakar semangat siaran"
                >
                  <Flame className="w-4 h-4 text-orange-400 fill-orange-400/20" />
                  <span>Hype</span>
                </button>
                {/* 4. Lanjut Ngobrol */}
                <button
                  type="button"
                  id="btn-quick-lanjut-ngobrol"
                  onClick={() => onRequestVariation('lanjut_ngobrol')}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-700/70 hover:border-cyan-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                  title="Menyambung obrolan dengan pertanyaan seru berikutnya"
                >
                  <MessageCircle className="w-4 h-4 text-cyan-400" />
                  <span>Lanjut Ngobrol</span>
                </button>
                {/* 5. Ajak Penonton */}
                <button
                  type="button"
                  id="btn-quick-ajak-penonton"
                  onClick={() => onRequestVariation('ajak_penonton')}
                  disabled={isGenerating}
                  className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 border border-slate-700/70 hover:border-emerald-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                  title="Ajak seluruh penonton di kolom komentar untuk bereaksi"
                >
                  <Megaphone className="w-4 h-4 text-emerald-400" />
                  <span>Ajak Penonton</span>
                </button>
              </div>

              {/* Extra variations if toggled */}
              {showMoreVariations && (
                <div className="grid grid-cols-3 gap-1.5 pt-1 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => onRequestVariation('pantun')}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 cursor-pointer"
                  >
                    <Feather className="w-3.5 h-3.5 text-purple-400" />
                    <span>Buat Pantun</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestVariation('tebak_tebakan')}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tebak-tebakan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestVariation('shorter')}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>1 Kalimat Padat</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty Waiting State */
          <div className="flex-1 flex flex-col justify-between py-4 space-y-4">
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-500 shadow-inner">
                <Bot className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-300">
                  Menunggu Komentar Penonton
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Ketik pertanyaan dari penonton di panel kiri lalu tekan <strong>Jawab</strong>, atau gunakan <strong>Quick Response</strong> di bawah untuk memancing interaksi penonton siaran!
                </p>
              </div>
            </div>

            {/* Spontaneous Engagement Quick Response even when empty */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Pancing Interaksi Siaran (Quick Response Spontan):
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => onRequestVariation('ajak_penonton')}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-emerald-300 text-xs font-bold border border-slate-700/70 cursor-pointer"
                >
                  <Megaphone className="w-4 h-4 text-emerald-400" />
                  <span>Ajak Penonton</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRequestVariation('hype')}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-orange-300 text-xs font-bold border border-slate-700/70 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Hype</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRequestVariation('lucu')}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-yellow-300 text-xs font-bold border border-slate-700/70 cursor-pointer"
                >
                  <Smile className="w-4 h-4 text-yellow-400" />
                  <span>Lucu</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRequestVariation('ramah')}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-pink-300 text-xs font-bold border border-slate-700/70 cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span>Ramah</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRequestVariation('lanjut_ngobrol')}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-cyan-300 text-xs font-bold border border-slate-700/70 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-cyan-400" />
                  <span>Lanjut Ngobrol</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Debug Info (Dev / Test Mode) */}
      {debugInfo && (
        <div
          id="pipeline-debug-panel"
          className="p-3 rounded-2xl bg-slate-950/90 border border-indigo-500/40 text-xs space-y-1.5 shadow-md mt-2"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1">
            <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Pipeline Debug Info (Dev / Test Mode)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {new Date(debugInfo.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <div>
              <span className="text-slate-400">Original comment sent:</span>{' '}
              <span className="text-slate-200 font-semibold">"{debugInfo.originalComment}"</span>
            </div>
            <div>
              <span className="text-slate-400">AI request successfully created:</span>{' '}
              <span className={debugInfo.aiRequestCreated ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {debugInfo.aiRequestCreated ? 'yes' : 'no'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">AI response received:</span>{' '}
              <span className={debugInfo.aiResponseReceived ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {debugInfo.aiResponseReceived ? 'yes' : 'no'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Validation result:</span>{' '}
              <span
                className={
                  debugInfo.validationResult === 'valid'
                    ? 'text-emerald-400 font-bold'
                    : debugInfo.validationResult === 'fallback'
                    ? 'text-amber-400 font-bold'
                    : 'text-rose-400 font-bold'
                }
              >
                {debugInfo.validationResult}
              </span>
            </div>
            {debugInfo.validationFailureReason && (
              <div className="sm:col-span-2 text-rose-300">
                <span className="text-slate-400">Validation failure reason:</span>{' '}
                <span className="font-medium">{debugInfo.validationFailureReason}</span>
              </div>
            )}
            <div className="sm:col-span-2">
              <span className="text-slate-400">Extracted response text:</span>{' '}
              <span className="text-slate-200 font-mono italic">
                "{debugInfo.extractedText || '(kosong)'}"
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Touchscreen Tablet Text-To-Speech Controller Deck */}
      <div className="pt-3 border-t border-slate-800/80 mt-3 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Primary Action Button: Baca OR Lanjutkan */}
          {ttsState.isPaused ? (
            <button
              id="btn-tts-resume"
              type="button"
              onClick={onResumeSpeak}
              className="flex-1 h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.99] bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30"
              title="Lanjutkan pembacaan suara yang sedang dijeda"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Lanjutkan</span>
            </button>
          ) : (
            <button
              id="btn-tts-speak"
              type="button"
              disabled={!latestMessage?.answer || isGenerating}
              onClick={() => {
                if (!latestMessage?.answer) return;
                onSpeak(latestMessage.answer);
              }}
              className={`flex-1 h-14 rounded-2xl font-bold text-base md:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg active:scale-[0.99] ${
                !latestMessage?.answer || isGenerating
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : ttsState.isSpeaking
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 border border-emerald-400/20'
              }`}
              title={
                ttsState.isSpeaking
                  ? 'Masukkan jawaban ini ke antrean suara'
                  : 'Bacakan jawaban ini ke speaker tablet'
              }
            >
              <Volume2 className="w-5 h-5" />
              <span>
                {ttsState.isSpeaking ? 'Tambah ke Antrean' : 'Baca Jawaban'}
              </span>
            </button>
          )}

          {/* Button Pause */}
          {ttsState.isSpeaking && !ttsState.isPaused && (
            <button
              id="btn-tts-pause"
              type="button"
              onClick={onPauseSpeak}
              className="h-14 px-5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 active:scale-[0.98]"
              title="Jeda suara sementara"
            >
              <Pause className="w-5 h-5 fill-amber-300" />
              <span className="hidden sm:inline">Pause</span>
            </button>
          )}

          {/* Button Stop */}
          <button
            id="btn-tts-stop"
            type="button"
            disabled={!ttsState.isSpeaking && !ttsState.isPaused && ttsState.queueLength === 0}
            onClick={onStopSpeak}
            className={`h-14 px-5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer border active:scale-[0.98] ${
              !ttsState.isSpeaking && !ttsState.isPaused && ttsState.queueLength === 0
                ? 'bg-slate-800/60 text-slate-600 border-slate-800 cursor-not-allowed'
                : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 shadow-md shadow-rose-500/20'
            }`}
            title="Hentikan suara dan bersihkan seluruh antrean"
          >
            <Square className="w-4 h-4 fill-current text-rose-400" />
            <span className="hidden sm:inline">Stop</span>
          </button>

          {/* Tombol Salin (Copy) */}
          <button
            id="btn-copy-answer"
            type="button"
            disabled={!latestMessage?.answer || isGenerating}
            onClick={handleCopy}
            className={`h-14 px-4 sm:px-5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer border active:scale-[0.99] ${
              !latestMessage?.answer || isGenerating
                ? 'bg-slate-800 text-slate-500 border-slate-700/50 cursor-not-allowed'
                : copied
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700'
            }`}
            title="Salin jawaban ke clipboard"
          >
            {copied ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : (
              <Copy className="w-5 h-5 text-slate-300" />
            )}
          </button>

          {/* Toggle Audio Fine-Tuning drawer */}
          <button
            type="button"
            id="btn-toggle-tts-tuners"
            onClick={() => setShowTtsControls(!showTtsControls)}
            className={`h-14 px-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${
              showTtsControls
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border-slate-700/80'
            }`}
            title="Atur Kecepatan & Volume Suara"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </div>

        {/* Audio Quick Tuners Drawer (Speed & Volume Controls) */}
        {showTtsControls && (
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Kontrol Kecepatan Suara */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    Kecepatan Suara:
                  </span>
                  <span className="font-mono text-indigo-300 font-bold">
                    {ttsState.rate}x
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0.85, 1.0, 1.2].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => ttsService.setRate(r)}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        ttsState.rate === r
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
                          : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                      }`}
                    >
                      {r === 0.85 ? 'Santai 0.85x' : r === 1.0 ? 'Normal 1.0x' : 'Cepat 1.2x'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kontrol Volume Suara */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    {ttsState.volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    ) : ttsState.volume < 0.6 ? (
                      <Volume1 className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    Volume Suara:
                  </span>
                  <span className="font-mono text-emerald-300 font-bold">
                    {Math.round(ttsState.volume * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Mute', val: 0.0 },
                    { label: '50%', val: 0.5 },
                    { label: '100%', val: 1.0 },
                  ].map((vol) => (
                    <button
                      key={vol.label}
                      type="button"
                      onClick={() => ttsService.setVolume(vol.val)}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        ttsState.volume === vol.val
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/30'
                          : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                      }`}
                    >
                      {vol.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Voice Info */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
              <span className="truncate max-w-[280px]">
                Voice: {ttsState.selectedVoiceName || 'Default Browser Voice'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${
                  ttsState.hasIndonesianVoice
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {ttsState.hasIndonesianVoice ? 'Bahasa Indonesia (id-ID)' : 'Fallback Voice'}
              </span>
            </div>
          </div>
        )}
      </div>

      {!ttsState.isSupported && (
        <div className="mt-2 text-center text-xs text-amber-400/80 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
          Browser ini tidak mendukung pembacaan suara otomatis (Web Speech API).
        </div>
      )}
    </section>
  );
};
