import React, { useState } from 'react';
import { History, Trash2, Volume2, Copy, Check, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { ChatMessage, LiveConfig } from '../types';

interface ConversationHistoryProps {
  history: ChatMessage[];
  config: LiveConfig;
  activeSpeakingText: string | null;
  onSpeak: (text: string) => void;
  onStopSpeak: () => void;
  onOpenResetModal: () => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  history,
  config,
  activeSpeakingText,
  onSpeak,
  onStopSpeak,
  onOpenResetModal,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <section
      id="section-conversation-history"
      className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-4 md:p-5 shadow-lg transition-all"
    >
      {/* Header of History Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
            <History className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-white">
                Riwayat & Memori Sesi LIVE
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold">
                {history.length} Obrolan
              </span>
            </div>
            <p className="text-xs text-slate-400">
              AI mengingat percakapan ini untuk merespon pertanyaan lanjutan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              type="button"
              id="btn-clear-conversation-history"
              onClick={onOpenResetModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold transition-colors active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Percakapan</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title={isExpanded ? 'Tutup riwayat' : 'Buka riwayat'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* History Items list */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 max-h-72 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <MessageCircle className="w-6 h-6 text-slate-600" />
              <span>Belum ada riwayat percakapan. Mulai dengan menjawab komentar di atas.</span>
            </div>
          ) : (
            history.map((msg, index) => {
              const isSpeaking = activeSpeakingText === msg.answer;
              return (
                <div
                  key={msg.id}
                  id={`history-item-${index}`}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col gap-2"
                >
                  {/* Viewer row */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-indigo-400">
                        @{msg.viewerName}
                      </span>
                      <span className="text-slate-300">
                        "{msg.comment}"
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  {/* Co-Host AI row */}
                  <div className="flex items-start justify-between gap-3 bg-slate-900/60 rounded-xl p-3 border border-slate-800/50">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-slate-200 mt-0.5 shrink-0">
                        {config.coHostName}:
                      </span>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans">
                        {msg.answer}
                      </p>
                    </div>

                    {/* Action buttons on historical answer */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSpeaking) {
                            onStopSpeak();
                          } else {
                            onSpeak(msg.answer);
                          }
                        }}
                        className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                          isSpeaking
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                        }`}
                        title={isSpeaking ? 'Hentikan suara' : 'Baca jawaban ini'}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.answer)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors text-xs cursor-pointer"
                        title="Salin jawaban ini"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
};
