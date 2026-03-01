// ============================================================================
// Module Manifest — Template Module
//
// PURPOSE: Central export for the module. Defines metadata, navigation,
// and view component references for the Microkernel registry.
//
// ARCHITECTURE:
//   - Metadata is sourced from constants.json (authoritative).
//   - getViews() returns component references (references, not instances)
//     to ensure proper React lifecycle management in the Shell.
//
// DEPENDENCIES:
//   - lucide-react → Icons
//   - ./constants.json → Module metadata
//   - ./components/* → View components
// ============================================================================
import { LayoutDashboard, FileBarChart, Settings } from 'lucide-react';
import moduleConstants from './constants.json';

// View Imports (Component References)
import TemplateDashboard from './components/TemplateDashboard';
import TemplateReports from './components/TemplateReports';
import TemplateConfig from './components/TemplateConfig';

const templateManifest = {
  // Authoritative Metadata from constants.json
  ...moduleConstants,

  // UI Components & Icons
  icon: LayoutDashboard,
  
  // Sidebar Navigation Items
  navItems: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'config', label: 'Configuration', icon: Settings },
  ],

  /**
   * Returns a map of view IDs to Component References.
   * REQUIRED: Return references, not JSX elements (e.g., Dashboard, not <Dashboard />).
   */
  getViews: () => ({
    dashboard: TemplateDashboard,
    reports: TemplateReports,
    config: TemplateConfig,
  }),

  /**
   * Optional: Returns tabs for the global settings view if this module 
   * contributes to the platform-level settings.
   */
  getSettingsTabs: () => []
};

export default templateManifest;
