// ============================================================================
// Shared Module — Barrel Export (PulseOps V1)
//
// PURPOSE: SINGLE entry point for all shared components, layouts, hooks,
// services, and utilities. Every module imports from '@shared' — never
// from deep relative paths.
//
// WHY: If you move a component file, you update ONE line here instead of
// updating every import across the entire codebase.
//
// USAGE:
//   import { Button, Card, Logger, ApiClient } from '@shared';
// ============================================================================

// --- Components (Design System) ---
export { default as Button } from '@shared/components/Button';
export { default as Card } from '@shared/components/Card';
export { default as PageHeader } from '@shared/components/PageHeader';
export { default as Modal } from '@shared/components/Modal';
export { default as StatusTile } from '@shared/components/StatusTile';
export { default as ConfirmDialog } from '@shared/components/ConfirmDialog';
export { default as EmptyState } from '@shared/components/EmptyState';
export { default as LoadingSpinner } from '@shared/components/LoadingSpinner';
export { default as LoginForm } from '@shared/components/LoginForm';
export { default as SettingsConfig } from '@shared/components/SettingsConfig';

// --- Layouts ---
export { default as TopNav } from '@shared/components/layouts/TopNav';
export { default as SideNav } from '@shared/components/layouts/SideNav';
export { default as RightPanel } from '@shared/components/layouts/RightPanel';
export { default as AppShell } from '@shared/components/layouts/AppShell';

// --- Services ---
export { default as Logger } from '@shared/services/logger';
export { default as ApiClient } from '@shared/services/apiClient';
export { default as CoreAuthService } from '@shared/services/coreAuthService';
export { default as ModuleService } from '@shared/services/moduleService';
