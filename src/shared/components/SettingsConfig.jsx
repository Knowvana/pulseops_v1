// ============================================================================
// SettingsConfig — PulseOps V1 Design System
//
// PURPOSE: Reusable tabbed settings/configuration panel. Renders a vertical
// tab list on the left and the active tab's content on the right. Used by
// every module for their Configuration and Settings views.
//
// USAGE:
//   import { SettingsConfig } from '@shared';
//   <SettingsConfig
//     title="Module Settings"
//     subtitle="Configure module options"
//     icon={Settings}
//     tabs={[{ id: 'general', label: 'General', icon: Settings, content: <GeneralTab /> }]}
//     defaultTab="general"
//   />
//
// PROPS:
//   title      — Page title (string)
//   subtitle   — Page subtitle (string)
//   icon       — Lucide icon for the header
//   tabs       — Array of { id, label, icon, content, separator? }
//   defaultTab — ID of the initially active tab
// ============================================================================
import React, { useState } from 'react';
import clsx from 'clsx';

export default function SettingsConfig({ title, subtitle, icon: HeaderIcon, tabs = [], defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const activeTabObj = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      {title && (
        <div className="flex items-center gap-3 mb-2">
          {HeaderIcon && (
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <HeaderIcon size={20} className="text-brand-600" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-surface-800">{title}</h1>
            {subtitle && <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}

      {/* Tab layout: vertical tabs left + content right */}
      <div className="flex gap-6">
        {/* Tab list */}
        <div className="w-56 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <React.Fragment key={tab.id}>
                {tab.separator && <div className="border-t border-surface-200 my-2" />}
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm shadow-brand-100/50'
                      : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'
                  )}
                >
                  {TabIcon && <TabIcon size={16} className={isActive ? 'text-brand-600' : 'text-surface-400'} />}
                  {tab.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Active tab content */}
        <div className="flex-1 min-w-0">
          {activeTabObj?.content}
        </div>
      </div>
    </div>
  );
}
