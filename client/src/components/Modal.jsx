import React from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 selection:bg-[#191919] selection:text-white">
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-serif text-lg font-normal text-[#191919] tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#191919]/50 hover:text-[#191919] p-1 rounded-sm hover:bg-[#F4F3F3] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
