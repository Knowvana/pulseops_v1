// ============================================================================
// Modal — PulseOps V1 Design System
//
// PURPOSE: Reusable modal dialog with backdrop overlay, close button,
// and configurable size. Used for confirmations, forms, and detail views.
//
// USAGE:
//   import { Modal } from '@shared';
//   <Modal isOpen={true} onClose={handleClose} title="Confirm">
//     <p>Are you sure?</p>
//   </Modal>
//
// PROPS:
//   isOpen   — boolean, controls visibility
//   onClose  — function, called when backdrop or X is clicked
//   title    — string, modal header title
//   size     — 'sm' | 'md' | 'lg' | 'xl' (default: md)
//   children — Modal body content
// ============================================================================
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ isOpen, onClose, title, size = 'md', children }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className={clsx(
        'relative w-full mx-4 bg-white rounded-2xl shadow-2xl animate-slide-up',
        SIZES[size] || SIZES.md
      )}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <h2 className="text-lg font-bold text-surface-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {/* Body */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
