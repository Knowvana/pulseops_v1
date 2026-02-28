// ============================================================================
// Card — PulseOps V1 Design System
//
// PURPOSE: Reusable card container with consistent border, shadow, and
// padding. Used throughout the platform for content sections, tiles,
// and panel groupings.
//
// USAGE:
//   import { Card } from '@shared';
//   <Card>Content here</Card>
//   <Card className="p-0" hover>Clickable card</Card>
//
// PROPS:
//   hover     — boolean, adds hover lift effect
//   className — Additional Tailwind classes (overrides default padding)
//   children  — Card content
//   ...rest   — Forwarded to <div>
// ============================================================================
import React from 'react';
import clsx from 'clsx';

export default function Card({ hover = false, className, children, ...rest }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border border-surface-200 shadow-sm',
        hover && 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
        !className?.includes('p-') && 'p-6',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
