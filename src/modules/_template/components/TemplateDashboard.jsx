// ============================================================================
// TemplateDashboard — PulseOps V1 Module Template
//
// PURPOSE: Default landing page for the module.
//
// ARCHITECTURE: React component. Receives standard module props.
//
// DEPENDENCIES:
//   - @shared → Card, Layout components
//   - ../uiText.json → UI strings
// ============================================================================
import React from 'react';
import { Card } from '@shared';
import uiText from '../uiText.json';

export default function TemplateDashboard({ user }) {
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{uiText.dashboard.title}</h1>
        <p className="text-slate-500">{uiText.dashboard.subtitle}</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-medium mb-2">Welcome, {user?.name}</h3>
          <p className="text-sm text-slate-600">This is a boilerplate dashboard for your new module.</p>
        </Card>
      </div>
    </div>
  );
}
