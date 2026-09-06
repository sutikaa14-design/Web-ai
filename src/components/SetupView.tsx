import React, { useState } from 'react';
import {
  Sparkles,
  Radio,
  Check,
  Globe,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  MessageSquare,
  Bot,
  Shield,
  Power,
  UserCheck,
} from 'lucide-react';
import { LiveConfig, PersonaType, ChatMessage, AuthSession } from '../types';
import { PERSONAS, TOPIC_PRESETS } from '../data/personas';

interface SetupViewProps {
  initialConfig: LiveConfig;
  onStartLive: (config: LiveConfig) => void;
  preservedHistoryCount?: number;
  preservedHistory?: ChatMessage[];
  currentUser?: AuthSession | null;
  onLogout?: () => void;
  onSwitchToMaster?: () => void;
  onClearHistory?: () => void;
}

export const SetupView: React.FC<SetupViewProps> = ({
  initialConfig,
  onStartLive,
  preservedHistoryCount = 0,
  preservedHistory = [],
  currentUser,
  onLogout,
  onSwitchToMaster,
  onClearHistory,
}) => {
  const [hostName, setHostName] = useState(initialConfig.hostName || 'Kak Rian');
  const [coHostName, setCoHostName] = useState(initialConfig.coHostName || 'Luna AI');
  const [persona, setPersona] = useState<PersonaType>(initialConfig.persona || 'ramah');
  const [topic, setTopic] = useState(initialConfig.topic || TOPIC_PRESETS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showHistoryDetails, setShowHistoryDetails] = useState(false);

  const nameSuggestions = ['Luna AI', 'Bro Danu', 'Alya', 'Mamat Kocak', 'Riko', 'Kania'];

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) {
      setErrorMsg('Harap masukkan nama Host terlebih dahulu.');
      return;
    }
    if (!coHostName.trim()) {
      setErrorMsg('Harap masukkan nama AI / Co-Host.');
      return;
    }
    const finalTopic = customTopic.trim() || topic;
    if (!finalTopic.trim()) {
      setErrorMsg('Harap tentukan topik siaran LIVE.');
      return;
    }
    setErrorMsg('');
    onStartLive({
      ...initialConfig,
      hostName: hostName.trim(),
      coHostName: coHostName.trim(),
      persona,
      language: 'id',
      topic: finalTopic,
      isLive: true,
      startedAt: Date.now(),
      maxAnswersPerMinute: initialConfig.maxAnswersPerMinute || 10,
      activeSourceId: initialConfig.activeSourceId || 'manual',
    });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-slate-950 py-8 sm:py-12">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl shadow-black/60 relative">
        {/* Decorative ambient glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                LiveMate <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">AI</span>
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                Setup Co-Host Pintar untuk Pendamping Siaran LIVE di Tablet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {currentUser && (
              <div className="flex items-center gap-2">
                {currentUser.role === 'master' ? (
                  <>
                    {onSwitchToMaster && (
                      <button
                        id="btn-setup-switch-master"
                        type="button"
                        onClick={onSwitchToMaster}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold cursor-pointer transition-colors"
                        title="Buka Master Portal"
                      >
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        <span>Master Portal</span>
                      </button>
                    )}
                    <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span>Master</span>
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{currentUser.name}</span>
                  </span>
                )}

                {onLogout && (
                  <button
                    id="btn-setup-logout"
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold cursor-pointer transition-colors"
                    title="Keluar / Logout"
                  >
                    <Power className="w-3.5 h-3.5 text-rose-400" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Siap Digunakan
            </div>
          </div>
        </div>

        {preservedHistoryCount > 0 && (
          <div className="mb-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <strong className="text-white">Riwayat Sesi Sebelumnya Tersimpan:</strong>{' '}
                  <span>{preservedHistoryCount} percakapan dari LIVE sebelumnya tetap dapat ditinjau.</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-toggle-view-history"
                  onClick={() => setShowHistoryDetails(!showHistoryDetails)}
                  className="px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold border border-indigo-500/40 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{showHistoryDetails ? 'Sembunyikan Riwayat' : 'Lihat Riwayat Sesi'}</span>
                  {showHistoryDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {onClearHistory && (
                  <button
                    type="button"
                    id="btn-clear-preserved-history"
                    onClick={onClearHistory}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 text-xs cursor-pointer transition-colors"
                    title="Hapus riwayat sesi lama"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Expandable History Messages List */}
            {showHistoryDetails && preservedHistory.length > 0 && (
              <div className="border-t border-indigo-500/20 p-4 max-h-60 overflow-y-auto space-y-2.5 bg-slate-950/60">
                {preservedHistory.map((msg) => (
                  <div key={msg.id} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold text-indigo-300 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-400" />
                        @{msg.viewerName}
                      </span>
                      <span>{formatTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-200">"{msg.comment}"</p>
                    <div className="pt-1 border-t border-slate-800/60 flex items-start gap-1.5 text-xs text-emerald-300">
                      <Bot className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="italic">"{msg.answer}"</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleStart} className="space-y-8">
          {/* Section 1: Profil Host & AI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="input-host-name" className="block text-sm font-semibold text-slate-200">
                Nama Host (Kamu) <span className="text-rose-400">*</span>
              </label>
              <input
                id="input-host-name"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Contoh: Rian, Kak Cindy"
                className="w-full h-13 px-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
              <p className="text-xs text-slate-500">AI akan menyapa atau merujuk ke nama kamu saat berinteraksi.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="input-cohost-name" className="block text-sm font-semibold text-slate-200">
                Nama AI / Co-Host <span className="text-rose-400">*</span>
              </label>
              <input
                id="input-cohost-name"
                type="text"
                value={coHostName}
                onChange={(e) => setCoHostName(e.target.value)}
                placeholder="Contoh: Luna AI, Budi, Bro Danu"
                className="w-full h-13 px-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-slate-500 self-center mr-1">Pilihan cepat:</span>
                {nameSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCoHostName(name)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Persona AI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-200">
                Persona Karakter AI <span className="text-rose-400">*</span>
              </label>
              <span className="text-xs text-slate-400">Pilih pembawaan gaya bicara yang pas dengan tokomu / live-mu</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(Object.keys(PERSONAS) as PersonaType[]).map((key) => {
                const item = PERSONAS[key];
                const isSelected = persona === key;
                return (
                  <button
                    key={key}
                    type="button"
                    id={`persona-card-${key}`}
                    onClick={() => setPersona(key)}
                    className={`text-left p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between relative cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? `bg-slate-800/90 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10`
                        : `bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40`
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                    <div>
                      <div className="text-3xl mb-2">{item.emoji}</div>
                      <h4 className="font-bold text-base text-white">{item.label}</h4>
                      <span className={`text-xs font-semibold ${item.color} block mb-1.5`}>
                        {item.tagline}
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Bahasa & Topik LIVE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bahasa */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-200">
                Bahasa
              </label>
              <div className="h-13 px-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-slate-200">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  <span className="font-semibold text-sm">Indonesia</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  Percakapan Gaul & Santai
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Otomatis menggunakan gaya obrolan natural khas live streaming Indonesia.
              </p>
            </div>

            {/* Topik Siaran */}
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="input-topic-custom" className="block text-sm font-semibold text-slate-200">
                  Topik LIVE Hari Ini <span className="text-rose-400">*</span>
                </label>
                <span className="text-xs text-slate-400">Konteks utama siaran</span>
              </div>
              <input
                id="input-topic-custom"
                type="text"
                value={customTopic || topic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  setTopic(e.target.value);
                }}
                placeholder="Tulis topik atau pilih preset di bawah..."
                className="w-full h-13 px-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
              {/* Topic chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {TOPIC_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTopic(t);
                      setCustomTopic(t);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      topic === t
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold'
                        : 'bg-slate-800/70 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Guidelines Notice */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-200/90 leading-relaxed">
              <strong className="text-white font-semibold block mb-0.5">Dirancang Khusus untuk Tablet Saat LIVE:</strong>
              AI akan memberikan jawaban pendek hingga sedang yang natural (bukan robot atau CS) dan memahami percakapan bertahap. Kamu bisa membaca jawaban langsung atau mendengarkannya lewat speaker tablet.
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="btn-start-live-assistant"
              type="submit"
              className="w-full h-15 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-lg shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all active:scale-[0.99] cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Mulai Live Assistant</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
