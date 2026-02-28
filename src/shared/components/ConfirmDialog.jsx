// ============================================================================
// ConfirmDialog — PulseOps V1 Design System
//
// PURPOSE: Reusable confirmation dialog for destructive or important actions.
// Renders a Modal with confirm/cancel buttons and configurable variant
// (danger for deletes, warning for disables, info for general confirms).
//
// USAGE:
//   import { ConfirmDialog } from '@shared';
//   <ConfirmDialog
//     isOpen={showConfirm}
//     onClose={() => setShowConfirm(false)}
//     onConfirm={handleDelete}
//     title="Delete Module?"
//     message="This action cannot be undone."
//     variant="danger"
//     confirmLabel="Delete"
//     loading={isDeleting}
//   />
//
// PROPS:
//   isOpen       — boolean, controls visibility
//   onClose      — function, called on cancel/backdrop click
//   onConfirm    — function, called when confirm button is clicked
//   title        — Dialog title
//   message      — Dialog body message
//   variant      — 'danger' | 'warning' | 'info' (default: danger)
//   confirmLabel — Custom confirm button text (default: from uiText)
//   cancelLabel  — Custom cancel button text (default: from uiText)
//   loading      — boolean, shows loading state on confirm button
// ============================================================================
import React from 'react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import uiText from '@shared/config/uiText.json';

const VARIANTS = {
  danger: { icon: AlertTriangle, iconColor: 'text-danger-600', iconBg: 'bg-danger-50', buttonVariant: 'danger' },
  warning: { icon: AlertCircle, iconColor: 'text-warning-600', iconBg: 'bg-warning-50', buttonVariant: 'primary' },
  info: { icon: Info, iconColor: 'text-brand-600', iconBg: 'bg-brand-50', buttonVariant: 'primary' },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'danger',
  confirmLabel,
  cancelLabel,
  loading = false,
}) {
  const config = VARIANTS[variant] || VARIANTS.danger;
  const IconComponent = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center py-4">
        <div className={`w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center mb-4`}>
          <IconComponent size={24} className={config.iconColor} />
        </div>
        <p className="text-sm text-surface-600 mb-6 max-w-sm">{message}</p>
        <div className="flex items-center gap-3 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            {cancelLabel || uiText.common.cancel}
          </Button>
          <Button variant={config.buttonVariant} className="flex-1" onClick={onConfirm} loading={loading}>
            {confirmLabel || uiText.common.confirm}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
