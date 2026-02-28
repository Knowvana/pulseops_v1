// ============================================================================
// Button — PulseOps V1 Design System
//
// PURPOSE: Reusable button component with consistent styling across the
// entire platform. Supports variants (primary, secondary, danger, ghost),
// sizes (sm, md, lg), loading state, and icon placement.
//
// USAGE:
//   import { Button } from '@shared';
//   <Button variant="primary" onClick={handleSave}>Save</Button>
//   <Button variant="danger" size="sm" loading={true}>Deleting...</Button>
//   <Button variant="ghost" icon={RefreshCw}>Refresh</Button>
//
// PROPS:
//   variant   — 'primary' | 'secondary' | 'danger' | 'ghost' (default: primary)
//   size      — 'sm' | 'md' | 'lg' (default: md)
//   loading   — boolean, shows spinner and disables click
//   disabled  — boolean
//   icon      — Lucide icon component (rendered left of label)
//   className — Additional Tailwind classes
//   children  — Button label
//   ...rest   — Forwarded to <button>
// ============================================================================
import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-200 focus:ring-brand-500',
  secondary: 'bg-white text-surface-700 border border-surface-300 hover:bg-surface-50 focus:ring-surface-400',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 shadow-sm shadow-danger-200 focus:ring-danger-500',
  ghost: 'text-surface-600 hover:bg-surface-100 hover:text-surface-800 focus:ring-surface-400',
  success: 'bg-success-600 text-white hover:bg-success-700 shadow-sm shadow-success-100 focus:ring-success-500',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-base gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className,
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : 16} />
      ) : null}
      {children}
    </button>
  );
}
