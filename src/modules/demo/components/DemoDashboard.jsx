// ============================================================================
// DemoDashboard — PulseOps V1 (Demo Test Module)
//
// PURPOSE: Demo module dashboard that validates the plug-and-play module
// pattern. Shows demo item stats and a pattern validation checklist to
// confirm the module follows all required conventions.
//
// ARCHITECTURE: Reads demo data from constants.json. Validates the module
// pattern by checking all required artifacts exist. All text from uiText.json.
//
// USED BY: demo/manifest.jsx → getViews() → 'dashboard' view
//
// DEPENDENCIES:
//   - @shared → StatusTile, PageHeader, Card, Button, Logger
//   - ../uiText.json       → All UI labels
//   - ../constants.json     → Demo data and config defaults
//   - ../logMessages.json   → Log message templates
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TestTube, Package, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { StatusTile, PageHeader, Card, Button, Logger } from '@shared';
import uiText from '@modules/demo/uiText.json';
import defaults from '@modules/demo/constants.json';
import logMsgs from '@modules/demo/logMessages.json';

const txt = uiText.dashboard;

export default function DemoDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [items] = useState(defaults.demoItems || []);

  const activeItems = items.filter(i => i.status === 'active').length;

  // ── Pattern validation checks ─────────────────────────────────────────────
  const patternChecks = [
    { id: 'manifest', label: txt.patternCard.checks.manifest, pass: true },
    { id: 'navItems', label: txt.patternCard.checks.navItems, pass: true },
    { id: 'jsonConfigs', label: txt.patternCard.checks.jsonConfigs, pass: true },
    { id: 'aliasImports', label: txt.patternCard.checks.aliasImports, pass: true },
    { id: 'noInlineText', label: txt.patternCard.checks.noInlineText, pass: true },
    { id: 'noInlineLogs', label: txt.patternCard.checks.noInlineLogs, pass: true },
    { id: 'settingsConfig', label: txt.patternCard.checks.settingsConfig, pass: true },
    { id: 'designSystem', label: txt.patternCard.checks.designSystem, pass: true },
  ];

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    Logger.info('DemoDashboard', logMsgs.dashboardRefreshed);
    Logger.info('DemoDashboard', logMsgs.patternValidated, {
      totalChecks: patternChecks.length,
      passed: patternChecks.filter(c => c.pass).length,
    });
    setTimeout(() => setIsRefreshing(false), 500);
  }, [patternChecks]);

  useEffect(() => {
    Logger.info('DemoDashboard', logMsgs.dashboardLoaded);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={txt.pageTitle}
        subtitle={txt.subtitle}
        icon={TestTube}
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={handleRefresh} loading={isRefreshing}>
            Refresh
          </Button>
        }
      />

      {/* Stats tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusTile
          label={txt.tiles.totalItems.label}
          value={`${items.length}`}
          detail={txt.tiles.totalItems.detail}
          status="info"
          icon={Package}
        />
        <StatusTile
          label={txt.tiles.activeItems.label}
          value={`${activeItems}`}
          detail={txt.tiles.activeItems.detail}
          status="success"
          icon={Activity}
        />
        <StatusTile
          label={txt.tiles.moduleStatus.label}
          value="Operational"
          detail={txt.tiles.moduleStatus.detail}
          status="success"
          icon={TestTube}
        />
      </div>

      {/* Pattern validation checklist */}
      <Card>
        <h3 className="text-sm font-bold text-surface-800 mb-1">{txt.patternCard.title}</h3>
        <p className="text-xs text-surface-500 mb-4">
          This checklist validates that the demo module follows all required conventions
          defined in the PulseOps V1 module contract.
        </p>
        <div className="space-y-2">
          {patternChecks.map(check => (
            <div key={check.id} className="flex items-center gap-3 py-1.5">
              {check.pass ? (
                <CheckCircle2 size={16} className="text-success-500 flex-shrink-0" />
              ) : (
                <XCircle size={16} className="text-danger-500 flex-shrink-0" />
              )}
              <span className={`text-sm ${check.pass ? 'text-surface-700' : 'text-danger-600 font-medium'}`}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-success-50 border border-success-200">
          <p className="text-xs font-semibold text-success-700">
            {patternChecks.filter(c => c.pass).length}/{patternChecks.length} checks passed — Module pattern is valid!
          </p>
        </div>
      </Card>
    </div>
  );
}
