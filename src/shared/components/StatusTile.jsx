// ============================================================================
// StatusTile — PulseOps V1 Design System
//
// PURPOSE: Dashboard metric tile showing a label, value, status indicator,
// and optional detail text. Used across all module dashboards for KPI
// display with consistent styling.
//
// USAGE:
//   import { StatusTile } from '@shared';
//   <StatusTile label="API Health" value="Healthy" status="success" />
//   <StatusTile label="Users" value="42" detail="Active accounts" icon={Users} />
//
// PROPS:
//   label   — Tile label (required)
//   value   — Display value (required)
//   detail  — Secondary text below value (optional)
//   status  — 'success' | 'warning' | 'danger' | 'info' | 'neutral' (default: neutral)
//   icon    — Lucide icon component (optional)
//   onClick — Click handler (optional, adds hover effect)
// ============================================================================
import React from 'react';
import clsx from 'clsx';

const STATUS_COLORS = {
  success: { bg: 'bg-success-50', text: 'text-success-700', dot: 'bg-success-500', icon: 'text-success-600' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-700', dot: 'bg-warning-500', icon: 'text-warning-600' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-700', dot: 'bg-danger-500', icon: 'text-danger-600' },
  info: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500', icon: 'text-brand-600' },
  neutral: { bg: 'bg-surface-50', text: 'text-surface-700', dot: 'bg-surface-400', icon: 'text-surface-500' },
};

export default function StatusTile({ label, value, detail, status = 'neutral', icon: Icon, onClick }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.neutral;
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl border border-surface-200 shadow-sm p-5 text-left w-full',
        onClick && 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">{label}</span>
        {Icon && (
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
            <Icon size={16} className={colors.icon} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className={clsx('w-2 h-2 rounded-full', colors.dot)} />
        <span className={clsx('text-lg font-bold', colors.text)}>{value}</span>
      </div>
      {detail && <p className="text-xs text-surface-500 mt-1.5 ml-4">{detail}</p>}
    </Component>
  );
}
