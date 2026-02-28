// ============================================================================
// LoadingSpinner — PulseOps V1 Design System
//
// PURPOSE: Full-screen or inline loading indicator with optional title
// and subtitle. Used during app bootstrap, data fetching, and transitions.
//
// USAGE:
//   import { LoadingSpinner } from '@shared';
//   <LoadingSpinner title="PulseOps" subtitle="Loading..." isOpen={true} />
//   <LoadingSpinner inline size="sm" />
//
// PROPS:
//   title    — Main title text (optional)
//   subtitle — Subtitle text (optional)
//   isOpen   — boolean, controls visibility (default: true)
//   inline   — boolean, renders inline instead of full-screen
//   size     — 'sm' | 'md' | 'lg' (default: md)
// ============================================================================
import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const SIZES = { sm: 16, md: 32, lg: 48 };

export default function LoadingSpinner({
  title,
  subtitle,
  isOpen = true,
  inline = false,
  size = 'md',
}) {
  if (!isOpen) return null;

  if (inline) {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <Loader2 size={SIZES[size]} className="animate-spin text-brand-500" />
        {subtitle && <span className="text-sm text-surface-500">{subtitle}</span>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center gap-4 animate-fade-in">
      <Loader2 size={SIZES[size]} className="animate-spin text-brand-500" />
      {title && <h1 className="text-2xl font-bold text-surface-800">{title}</h1>}
      {subtitle && <p className="text-sm text-surface-500">{subtitle}</p>}
    </div>
  );
}
