import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
  coHostName: string;
}

export const ResetModal: React.FC<ResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  coHostName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-reset-conversation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
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
          <h3 className="text-xl font-bold text-white">
            Hapus Percakapan & Reset Memori?
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Tindakan ini akan menghapus seluruh memori sesi percakapan saat ini. <strong className="text-slate-200">{coHostName}</strong> akan memulai konteks baru tanpa mengingat pertanyaan-pertanyaan sebelumnya.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-sm transition-colors active:scale-95"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-confirm-reset-history"
            onClick={() => {
              onConfirmReset();
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 transition-colors active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Ya, Hapus Memori</span>
          </button>
        </div>
      </div>
    </div>
  );
};
