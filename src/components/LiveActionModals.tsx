import React, { useState } from 'react';
import { Trash2, X, Sparkles, LogOut, Radio } from 'lucide-react';
import { TOPIC_PRESETS } from '../data/personas';

// 1. Modal Konfirmasi Clear Conversation
interface ClearConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  coHostName: string;
}

export const ClearConversationModal: React.FC<ClearConversationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  coHostName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-clear-conversation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Clear Conversation?</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Tindakan ini akan mengosongkan seluruh riwayat percakapan. <strong className="text-slate-200">{coHostName}</strong> akan memulai konteks baru tanpa mengingat pertanyaan-pertanyaan sebelumnya, tetapi durasi LIVE Anda tetap berlanjut.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-sm transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-confirm-clear-conversation"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Percakapan</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Modal Konfirmasi New LIVE
interface NewLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newTopic?: string) => void;
  currentTopic: string;
}

export const NewLiveModal: React.FC<NewLiveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentTopic,
}) => {
  const [topic, setTopic] = useState(currentTopic);

  if (!isOpen) return null;

  return (
    <div
      id="modal-new-live"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Mulai New LIVE?</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Sesi baru akan dimulai: durasi stopwatch di-reset ke 00:00 dan memori percakapan dibersihkan. Anda dapat memperbarui topik siaran di bawah.
          </p>
        </div>

        {/* Edit Topic for New Live */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-slate-300">
            Topik Siaran Baru:
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            placeholder="Contoh: Q&A Santai..."
          />
          <div className="flex flex-wrap gap-1 pt-1">
            {TOPIC_PRESETS.slice(0, 3).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-confirm-new-live"
            onClick={() => {
              onConfirm(topic.trim() || currentTopic);
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Radio className="w-4 h-4" />
            <span>Mulai New LIVE</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. Modal Konfirmasi End LIVE
interface EndLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const EndLiveModal: React.FC<EndLiveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-end-live"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <LogOut className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Akhiri Siaran (End LIVE)?</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Anda akan keluar dari mode asisten siaran langsung dan kembali ke halaman <strong>Setup Siaran</strong>. Audio akan dimatikan.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
          >
            Tetap di LIVE
          </button>
          <button
            type="button"
            id="btn-confirm-end-live"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Akhiri LIVE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
