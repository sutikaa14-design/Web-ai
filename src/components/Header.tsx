import React, { useEffect, useState } from 'react';
import {
  Clock,
  Settings,
  Trash2,
  LogOut,
  Volume2,
  Pause,
  Play,
  Sparkles,
  Shield,
  User,
  Power,
} from 'lucide-react';
import { ConnectionStatus, LiveConfig, PersonaType, AuthSession } from '../types';
import { PERSONAS } from '../data/personas';

interface HeaderProps {
  config: LiveConfig;
  conversationCount: number;
  isTTSActive: boolean;
  connectionStatus?: ConnectionStatus;
  currentUser?: AuthSession | null;
  onLogout?: () => void;
  onSwitchToMaster?: () => void;
  onTogglePauseAi: () => void;
  onOpenClearConversation: () => void;
  onOpenNewLive: () => void;
  onOpenEndLive: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  conversationCount,
  isTTSActive,
  connectionStatus = 'connected',
  currentUser,
  onLogout,
  onSwitchToMaster,
  onTogglePauseAi,
  onOpenClearConversation,
  onOpenNewLive,
  onOpenEndLive,
  onOpenSettings,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!config.isLive || !config.startedAt) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - config.startedAt!) / 1000));
      setElapsedSeconds(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [config.isLive, config.startedAt]);

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${hours > 0 ? pad(hours) + ':' : ''}${pad(minutes)}:${pad(seconds)}`;
  };

  const currentPersona = PERSONAS[config.persona as PersonaType] || PERSONAS.ramah;

  return (
    <header
      id="livemate-header"
      className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 md:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0"
    >
      {/* Brand, Persona & Live Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-extrabold text-white text-base md:text-lg shrink-0">
            LM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-white tracking-tight font-serif">
                LiveMate <span className="text-indigo-400">AI</span>
              </h1>
              <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Tablet
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate max-w-[180px] sm:max-w-none">
              Co-Host: <span className="text-slate-200 font-semibold">{config.coHostName}</span> ({currentPersona.emoji} {currentPersona.label})
            </p>
          </div>
        </div>

        {/* LIVE Status Badge & Timer */}
        <div className="flex items-center gap-2 ml-1 pl-2 sm:ml-2 sm:pl-3 border-l border-slate-800">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>LIVE</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-mono font-semibold">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* AI Paused Indicator Badge */}
          {config.isAiPaused && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold animate-pulse">
              <Pause className="w-3 h-3 fill-current" />
              <span>AI Dijeda</span>
            </div>
          )}

          {/* Connection Status Badge */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs"
            title={`Status Ingestion: ${
              connectionStatus === 'not_connected' ? 'Not connected' : connectionStatus
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                  : connectionStatus === 'reconnecting'
                  ? 'bg-amber-400 animate-pulse'
                  : connectionStatus === 'disconnected'
                  ? 'bg-rose-400'
                  : 'bg-slate-400'
              }`}
            />
            <span
              className={`font-semibold text-[11px] ${
                connectionStatus === 'connected'
                  ? 'text-emerald-400'
                  : connectionStatus === 'reconnecting'
                  ? 'text-amber-400'
                  : connectionStatus === 'disconnected'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {connectionStatus === 'not_connected'
                ? 'Not connected'
                : connectionStatus === 'connected'
                ? 'Connected'
                : connectionStatus === 'reconnecting'
                ? 'Reconnecting'
                : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Audio Indicator */}
      {isTTSActive && (
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium animate-pulse">
          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Suara Aktif</span>
        </div>
      )}

      {/* Controls: Pause AI, Clear Conversation, New LIVE, End LIVE */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
        {/* 1. Pause AI Control */}
        <button
          id="btn-control-pause-ai"
          type="button"
          onClick={onTogglePauseAi}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border ${
            config.isAiPaused
              ? 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border-amber-500/60 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/70'
          }`}
          title={config.isAiPaused ? 'Lanjutkan AI agar merespon kembali' : 'Jeda AI sementara'}
        >
          {config.isAiPaused ? (
            <>
              <Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Resume AI</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span>Pause AI</span>
            </>
          )}
        </button>

        {/* 2. Clear Conversation Control */}
        <button
          id="btn-control-clear-conversation"
          type="button"
          onClick={onOpenClearConversation}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-rose-300 border border-slate-700/70 transition-colors text-xs font-semibold active:scale-95 cursor-pointer"
          title="Hapus memori percakapan saat ini"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Clear Conversation</span>
          <span className="sm:hidden">Clear</span>
          {conversationCount > 0 && (
            <span className="bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
              {conversationCount}
            </span>
          )}
        </button>

        {/* 3. New LIVE Control */}
        <button
          id="btn-control-new-live"
          type="button"
          onClick={onOpenNewLive}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/40 transition-colors text-xs font-bold active:scale-95 cursor-pointer"
          title="Mulai sesi siaran LIVE baru"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>New LIVE</span>
        </button>

        {/* 4. End LIVE Control */}
        <button
          id="btn-control-end-live"
          type="button"
          onClick={onOpenEndLive}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-colors text-xs font-bold active:scale-95 cursor-pointer"
          title="Akhiri sesi siaran LIVE dan kembali ke halaman setup"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>End LIVE</span>
        </button>

        {/* Settings button */}
        <button
          id="btn-header-settings"
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 transition-colors cursor-pointer"
          title="Pengaturan Siaran"
        >
          <Settings className="w-4 h-4 text-slate-400" />
        </button>

        {/* User Identity & Logout */}
        {currentUser && (
          <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-slate-800">
            {currentUser.role === 'master' ? (
              <>
                {onSwitchToMaster && (
                  <button
                    id="btn-header-switch-master"
                    type="button"
                    onClick={onSwitchToMaster}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[11px] font-bold cursor-pointer transition-colors"
                    title="Buka Master Portal untuk kelola Owner"
                  >
                    <Shield className="w-3 h-3 text-purple-400" />
                    <span className="hidden sm:inline">Master Portal</span>
                  </button>
                )}
                <div
                  className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-[11px]"
                  title={`Login sebagai Master: ${currentUser.email}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="font-semibold text-purple-300">Master</span>
                </div>
              </>
            ) : (
              <div
                className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 text-slate-300 text-[11px]"
                title={`Login sebagai Owner: ${currentUser.email}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-semibold text-emerald-300">{currentUser.name}</span>
              </div>
            )}

            {onLogout && (
              <button
                id="btn-header-logout"
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/30 text-xs font-semibold cursor-pointer transition-colors"
                title="Keluar / Logout dari sesi"
              >
                <Power className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
