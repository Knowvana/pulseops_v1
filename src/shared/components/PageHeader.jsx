// ============================================================================
// PageHeader — PulseOps V1 Design System
//
// PURPOSE: Consistent page header with title, subtitle, optional icon,
// and action buttons. Used at the top of every module view for visual
// consistency across the platform.
//
// USAGE:
//   import { PageHeader } from '@shared';
//   <PageHeader title="Dashboard" subtitle="Overview" icon={LayoutDashboard} />
//   <PageHeader title="Users" actions={<Button>Add User</Button>} />
//
// PROPS:
//   title    — Page title (required)
//   subtitle — Description text (optional)
//   icon     — Lucide icon component (optional)
//   actions  — ReactNode for action buttons (optional, rendered right-aligned)
//   children — Additional content below the header
// ============================================================================
import React from 'react';

export default function PageHeader({ title, subtitle, icon: Icon, actions, children }) {
  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Icon size={20} className="text-brand-600" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-surface-800">{title}</h1>
            {subtitle && <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
