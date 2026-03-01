// ============================================================================
// TemplateConfig — PulseOps V1 Module Template
//
// PURPOSE: Module-specific configuration using the shared SettingsConfig component.
//
// ARCHITECTURE: Demonstrates how to pass custom tabs to the vertical-tab layout.
//
// DEPENDENCIES:
//   - @shared → SettingsConfig
//   - lucide-react → Icons
//   - ../uiText.json → UI strings
// ============================================================================
import React from 'react';
import { SettingsConfig } from '@shared';
import { Settings, Shield } from 'lucide-react';
import uiText from '../uiText.json';

export default function TemplateConfig({ onModulesChanged }) {
  /**
   * Defines the tabs for the SettingsConfig component.
   * Developers should extend this array with their own module settings.
   */
  const configTabs = [
    {
      id: 'general',
      label: uiText.config.tabs.general.label,
      icon: Settings,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{uiText.config.tabs.general.label}</h3>
          <p className="text-sm text-slate-600">{uiText.config.tabs.general.description}</p>
          {/* Add module-specific form fields here */}
          <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center text-slate-400">
            Generic Preference Controls
          </div>
        </div>
      )
    },
    {
      id: 'advanced',
      label: uiText.config.tabs.advanced.label,
      icon: Shield,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{uiText.config.tabs.advanced.label}</h3>
          <p className="text-sm text-slate-600">{uiText.config.tabs.advanced.description}</p>
          <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center text-slate-400">
            Advanced Security/Performance Flags
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <SettingsConfig
        title={uiText.config.title}
        subtitle={uiText.config.subtitle}
        icon={Settings}
        tabs={configTabs}
      />
    </div>
  );
}
