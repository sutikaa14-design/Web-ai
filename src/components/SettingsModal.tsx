import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Check,
  Volume2,
  Volume1,
  VolumeX,
  Radio,
  Play,
  Square,
  Zap,
} from 'lucide-react';
import { CommentSourceId, LiveConfig, PersonaType } from '../types';
import { PERSONAS, TOPIC_PRESETS } from '../data/personas';
import { ttsService, TTSState } from '../utils/tts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LiveConfig;
  onUpdateConfig: (updated: Partial<LiveConfig>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  const [topic, setTopic] = useState(config.topic);
  const [persona, setPersona] = useState<PersonaType>(config.persona);
  const [autoSpeakAnswers, setAutoSpeakAnswers] = useState<boolean>(
    !!config.autoSpeakAnswers
  );
  const [maxAnswersPerMinute, setMaxAnswersPerMinute] = useState<number>(
    config.maxAnswersPerMinute || 10
  );
  const [activeSourceId, setActiveSourceId] = useState<CommentSourceId>(
    config.activeSourceId || 'manual'
  );
  const [speechRate, setSpeechRate] = useState(ttsService.getRate());
  const [speechVolume, setSpeechVolume] = useState(ttsService.getVolume());
  const [ttsState, setTtsState] = useState<TTSState>(ttsService.getState());

  useEffect(() => {
    setTopic(config.topic);
    setPersona(config.persona);
    setAutoSpeakAnswers(!!config.autoSpeakAnswers);
    setMaxAnswersPerMinute(config.maxAnswersPerMinute || 10);
    setActiveSourceId(config.activeSourceId || 'manual');
    setSpeechRate(ttsService.getRate());
    setSpeechVolume(ttsService.getVolume());
    const unsub = ttsService.subscribe((state) => {
      setTtsState(state);
    });
    return unsub;
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSave = () => {
    ttsService.setRate(speechRate);
    ttsService.setVolume(speechVolume);
    onUpdateConfig({
      topic,
      persona,
      autoSpeakAnswers,
      maxAnswersPerMinute,
      activeSourceId,
    });
    onClose();
  };

  const handleTestSpeech = () => {
    if (ttsState.isSpeaking) {
      ttsService.stop();
    } else {
      const sampleGreeting = `Halo semuanya! Saya ${config.coHostName}, siap mendampingi live siaran bersama host ${config.hostName}!`;
      ttsService.speak(sampleGreeting);
    }
  };

  return (
    <div
      id="modal-livemate-settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pengaturan Live Siaran</h3>
              <p className="text-xs text-slate-400">
                Sesuaikan karakter Co-Host & Suara (Text-to-Speech)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pengaturan "AUTO RESPONSE: ON/OFF" */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  autoSpeakAnswers
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <label
                  htmlFor="toggle-autospeak-switch"
                  className="text-sm font-bold text-white cursor-pointer block"
                >
                  AUTO RESPONSE ({autoSpeakAnswers ? 'ON' : 'OFF'})
                </label>
                <p className="text-xs text-slate-400">
                  {autoSpeakAnswers
                    ? 'ON: Komentar eligible diproses otomatis oleh AI & disuarakan'
                    : 'OFF: Komentar tetap masuk antrean, AI tidak menjawab otomatis (host menjawab on-demand)'}
                </p>
              </div>
            </div>

            {/* Custom Toggle Switch */}
            <button
              id="toggle-autospeak-switch"
              type="button"
              role="switch"
              aria-checked={autoSpeakAnswers}
              onClick={() => setAutoSpeakAnswers(!autoSpeakAnswers)}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                autoSpeakAnswers ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-200 ${
                  autoSpeakAnswers ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Pengaturan Rate Limit: Batas Jawaban per Menit */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <label className="text-sm font-bold text-white">
                Batas Jawaban per Menit (Rate Limit)
              </label>
            </div>
            <span className="text-xs font-mono text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/60">
              {maxAnswersPerMinute} jawaban/menit
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Membatasi laju AI agar siaran tetap tenang, teratur, dan komentar tidak saling tumpuk. Jika batas tercapai, komentar tetap masuk antrean Menunggu.
          </p>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[5, 10, 15, 20].map((limit) => (
              <button
                key={limit}
                type="button"
                onClick={() => setMaxAnswersPerMinute(limit)}
                className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  maxAnswersPerMinute === limit
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {limit} / min {limit === 10 ? '(Default)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Pengaturan Sumber Komentar */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
          <label className="text-sm font-bold text-white block">
            Comment Source (Sumber Komentar)
          </label>
          <p className="text-xs text-slate-400">
            Pilih CommentSource yang aktif untuk siaran ini:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveSourceId('manual')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                activeSourceId === 'manual'
                  ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-200">Manual</span>
                {activeSourceId === 'manual' && <Check className="w-4 h-4 text-indigo-400" />}
              </div>
              <span className="text-[11px] text-slate-400">
                Input manual dari UI tablet untuk testing terarah.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSourceId('simulation')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                activeSourceId === 'simulation'
                  ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-200">Simulation</span>
                {activeSourceId === 'simulation' && <Check className="w-4 h-4 text-indigo-400" />}
              </div>
              <span className="text-[11px] text-slate-400">
                Aliran komentar pengujian otomatis melalui pipeline yang sama.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSourceId('external')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                activeSourceId === 'external'
                  ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-200">External</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                    Not connected
                  </span>
                </div>
                {activeSourceId === 'external' && <Check className="w-4 h-4 text-indigo-400" />}
              </div>
              <span className="text-[11px] text-slate-400">
                Abstraksi untuk provider resmi masa depan (tanpa scraping).
              </span>
            </button>
          </div>
        </div>

        {/* Kontrol Kecepatan Suara & Volume */}
        <div className="space-y-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              Pengaturan Suara (Text-to-Speech)
            </span>
            <button
              type="button"
              onClick={handleTestSpeech}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ttsState.isSpeaking
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
              }`}
            >
              {ttsState.isSpeaking ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Tes</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Tes Suara</span>
                </>
              )}
            </button>
          </div>

          {/* Kecepatan Suara (Rate) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                Kecepatan Suara (Speech Rate)
              </label>
              <span className="font-mono text-indigo-300 font-bold">{speechRate}x</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0.85, 1.0, 1.2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setSpeechRate(rate)}
                  className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    speechRate === rate
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rate === 0.85 ? 'Santai (0.85x)' : rate === 1.0 ? 'Normal (1.0x)' : 'Cepat (1.2x)'}
                </button>
              ))}
            </div>
          </div>

          {/* Volume Suara */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                {speechVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : speechVolume < 0.6 ? (
                  <Volume1 className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                Volume Suara Tablet
              </label>
              <span className="font-mono text-emerald-300 font-bold">
                {Math.round(speechVolume * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Senyap (0%)', val: 0.0 },
                { label: 'Sedang (50%)', val: 0.5 },
                { label: 'Penuh (100%)', val: 1.0 },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setSpeechVolume(item.val)}
                  className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    speechVolume === item.val
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Device Voice Status */}
          <div className="pt-2 border-t border-slate-800 text-xs flex items-center justify-between text-slate-400">
            <span>Voice Aktif: {ttsState.selectedVoiceName || 'Default Browser'}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                ttsState.hasIndonesianVoice
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {ttsState.hasIndonesianVoice ? 'Bahasa Indonesia (id-ID)' : 'Browser Fallback'}
            </span>
          </div>
        </div>

        {/* Persona Selector */}
        <div className="space-y-2.5">
          <label className="block text-sm font-semibold text-slate-200">
            Persona AI Co-Host
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(PERSONAS) as PersonaType[]).map((key) => {
              const item = PERSONAS[key];
              const isSelected = persona === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPersona(key)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">{item.emoji}</span>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <span className="text-xs font-bold text-slate-200">{item.label}</span>
                  <span className="text-[10px] text-slate-400">{item.tagline}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topik Live */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Topik Siaran Saat Ini
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {TOPIC_PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer ${
                  topic === t
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-save-settings"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
};
