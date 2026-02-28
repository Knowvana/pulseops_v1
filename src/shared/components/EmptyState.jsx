// ============================================================================
// EmptyState — PulseOps V1 Design System
//
// PURPOSE: Placeholder component shown when a list or view has no data.
// Displays an icon, title, description, and optional action button.
// Used across all modules for consistent empty-state presentation.
//
// USAGE:
//   import { EmptyState } from '@shared';
//   <EmptyState icon={Inbox} title="No modules" description="Install a module to get started" />
//
// PROPS:
//   icon        — Lucide icon component (optional)
//   title       — Main empty state title
//   description — Subtitle/description text
//   action      — ReactNode for an action button (optional)
// ============================================================================
import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <Icon size={32} className="text-surface-300" />
        </div>
      )}
      {title && <h3 className="text-lg font-bold text-surface-700 mb-1">{title}</h3>}
      {description && <p className="text-sm text-surface-500 max-w-md mb-4">{description}</p>}
      {action}
    </div>
  );
}
