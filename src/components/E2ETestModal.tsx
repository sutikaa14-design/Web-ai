import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Play,
  Square,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Volume2,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  Check,
  Zap,
} from 'lucide-react';
import { E2ETestCommentItem, E2ETestSummary } from '../types';
import { e2eTestRunner } from '../services/e2eTestRunner';

interface E2ETestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const E2ETestModal: React.FC<E2ETestModalProps> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<E2ETestCommentItem[]>(() => e2eTestRunner.getItems());
  const [summary, setSummary] = useState<E2ETestSummary>(() => e2eTestRunner.getSummary());
  const [isRunning, setIsRunning] = useState<boolean>(() => e2eTestRunner.getIsRunning());
  const [activeStep, setActiveStep] = useState<number>(() => e2eTestRunner.getActiveStep());

  useEffect(() => {
    const unsub = e2eTestRunner.subscribe((newItems, newSummary, running, step) => {
      setItems(newItems);
      setSummary(newSummary);
      setIsRunning(running);
      setActiveStep(step);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleStart = () => {
    e2eTestRunner.runE2ETest();
  };

  const handleStop = () => {
    e2eTestRunner.stopTest();
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toTimeString().split(' ')[0];
  };

  return (
    <div
      id="modal-e2e-test"
      role="dialog"
      aria-modal="true"
      aria-labelledby="e2e-test-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="e2e-test-title" className="text-lg font-bold text-white leading-tight">
                  End-to-End Pipeline Test Mode
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold uppercase tracking-wider">
                  Real Engine Verification
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pengujian alur lengkap: Comment Source → Filter → Queue → AI Conversation → AI Response → TTS Queue → Device Speech
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                type="button"
                id="btn-e2e-stop"
                onClick={handleStop}
                className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Test</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-e2e-start"
                onClick={handleStart}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{summary.durationMs > 0 ? 'Run Test Again' : 'Start E2E Test'}</span>
              </button>
            )}
            <button
              type="button"
              id="btn-e2e-close"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pipeline Architecture Flow Banner */}
        <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold text-slate-400 shrink-0">
          <span className="text-slate-300 font-bold shrink-0">Verified Flow:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0">Comment Source</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0">Filter</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0">Queue</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0">AI Conversation</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0">AI Response</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0">TTS Queue</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0">Device Speech</span>
        </div>

        {/* Test Result Summary */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 shrink-0 bg-slate-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Test Result Summary
            </span>
            {isRunning && (
              <span className="flex items-center gap-1.5 text-xs text-amber-300 font-bold animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Running Step {activeStep} of {items.length}...</span>
              </span>
            )}
            {summary.isCompleted && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>E2E Test Completed ({Math.round(summary.durationMs / 1000)}s)</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* 1. Comments received */}
            <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="text-[11px] text-slate-400 mb-0.5">Comments received</div>
              <div className="text-base font-extrabold font-mono text-white">
                {summary.commentsReceived} <span className="text-xs text-slate-500 font-normal">/ {summary.totalComments}</span>
              </div>
            </div>
            {/* 2. Comments answered */}
            <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="text-[11px] text-slate-400 mb-0.5">Comments answered</div>
              <div className="text-base font-extrabold font-mono text-emerald-400">
                {summary.commentsAnswered} <span className="text-xs text-slate-500 font-normal">/ {summary.totalComments}</span>
              </div>
            </div>
            {/* 3. Comments ignored */}
            <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="text-[11px] text-slate-400 mb-0.5">Comments ignored</div>
              <div className="text-base font-extrabold font-mono text-slate-300">
                {summary.commentsIgnored}
              </div>
            </div>
            {/* 4. AI errors */}
            <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="text-[11px] text-slate-400 mb-0.5">AI errors</div>
              <div className={`text-base font-extrabold font-mono ${summary.aiErrors > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {summary.aiErrors}
              </div>
            </div>
            {/* 5. TTS completed */}
            <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-400 mb-0.5">TTS completed</div>
              <div className="text-base font-extrabold font-mono text-indigo-300">
                {summary.ttsCompleted} <span className="text-xs text-slate-500 font-normal">/ {summary.totalComments}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Context Preservation Note */}
        <div className="px-5 py-2 bg-indigo-950/25 border-b border-indigo-900/30 flex items-center justify-between text-xs text-indigo-300">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              <strong>Conversational Context Preservation:</strong> Semua komentar diproses sebagai satu kesatuan sesi LIVE bertahap, sehingga AI mengingat pertanyaan sebelumnya.
            </span>
          </div>
        </div>

        {/* Comments Detailed List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {items.map((item) => {
            const isItemActive = activeStep === item.order && isRunning;
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isItemActive
                    ? 'bg-slate-800/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                    : item.stage === 'spoken'
                    ? 'bg-slate-950/70 border-emerald-900/40'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                {/* Header: Number, User & Comment text */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-indigo-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 border border-slate-700">
                      {item.order}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-indigo-300">@{item.username}</span>
                        {isItemActive && (
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 animate-pulse">
                            Active Step
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        "{item.text}"
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {formatTime(item.receivedAt)}
                  </span>
                </div>

                {/* 6 Lifecycle Stages Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] pt-1 border-t border-slate-800/60">
                  {/* 1. Received */}
                  <div className="flex items-center gap-1.5">
                    {item.receivedAt ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span className={item.receivedAt ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                      1. Received
                    </span>
                  </div>

                  {/* 2. Filtered or Accepted */}
                  <div className="flex items-center gap-1.5 truncate">
                    {item.isFiltered ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : item.stage !== 'idle' && item.stage !== 'received' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span
                      className={
                        item.isFiltered
                          ? 'text-rose-400 font-bold truncate'
                          : item.stage !== 'idle' && item.stage !== 'received'
                          ? 'text-slate-200 font-semibold'
                          : 'text-slate-500'
                      }
                      title={item.filterReason}
                    >
                      {item.isFiltered ? `Ignored: ${item.filterReason}` : '2. Accepted'}
                    </span>
                  </div>

                  {/* 3. Queued */}
                  <div className="flex items-center gap-1.5">
                    {item.queuedAt ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span className={item.queuedAt ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                      3. Queued
                    </span>
                  </div>

                  {/* 4. Processing */}
                  <div className="flex items-center gap-1.5">
                    {item.stage === 'processing' ? (
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                    ) : item.processingAt || item.answeredAt ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span
                      className={
                        item.stage === 'processing'
                          ? 'text-amber-300 font-bold animate-pulse'
                          : item.processingAt || item.answeredAt
                          ? 'text-slate-200 font-semibold'
                          : 'text-slate-500'
                      }
                    >
                      4. Processing
                    </span>
                  </div>

                  {/* 5. Answered */}
                  <div className="flex items-center gap-1.5">
                    {item.aiError ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : item.answeredAt ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span
                      className={
                        item.aiError
                          ? 'text-rose-400 font-bold'
                          : item.answeredAt
                          ? 'text-emerald-400 font-semibold'
                          : 'text-slate-500'
                      }
                    >
                      5. Answered
                    </span>
                  </div>

                  {/* 6. Spoken */}
                  <div className="flex items-center gap-1.5">
                    {item.isSpoken ? (
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    ) : item.stage === 'answered' ? (
                      <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span
                      className={
                        item.isSpoken
                          ? 'text-indigo-300 font-bold'
                          : item.stage === 'answered'
                          ? 'text-amber-300 font-semibold'
                          : 'text-slate-500'
                      }
                    >
                      6. Spoken
                    </span>
                  </div>
                </div>

                {/* AI Answer Preview if answered */}
                {item.answerText && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Generated Response:</span>
                    </div>
                    <p className="leading-relaxed text-white italic">
                      "{item.answerText}"
                    </p>
                  </div>
                )}

                {/* AI Error if any */}
                {item.aiError && (
                  <div className="mt-2 p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                    <strong>AI Error:</strong> {item.aiError}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>Non-invasive Internal E2E Test (No external scraping / No database required)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
