// ============================================================================
// AuthConfig — PulseOps V1 (Auth Module)
//
// PURPOSE: Authentication configuration tabs for provider selection,
// password policy, session policy, lockout policy, and token settings.
// Each tab is a separate exported component for use in manifest's
// getConfigTabs(). All text from uiText.json.
//
// ARCHITECTURE: Stateful form components that read/save config via ApiClient.
// AuthProviderTab loads the current provider from the API and allows switching.
//
// USED BY: auth/manifest.jsx → getConfigTabs()
//
// DEPENDENCIES:
//   - @shared → Card, Button, Logger, ApiClient
//   - ../uiText.json       → All UI labels
//   - ../constants.json     → Default policy values
//   - ../logMessages.json   → Log message templates
//   - @shared/config/urls.json → API endpoints
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Database, Globe, Key, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, Button, Logger, ApiClient } from '@shared';
import uiText from '@modules/auth/uiText.json';
import defaults from '@modules/auth/constants.json';
import logMsgs from '@modules/auth/logMessages.json';
import urls from '@shared/config/urls.json';

const cfgTxt = uiText.config;
const prvTxt = cfgTxt.provider;

const PROVIDER_ICONS = { json_file: Shield, database: Database, social: Globe };

// ── Helper: Toggle switch row ───────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-surface-700">{label}</p>
        {description && <p className="text-xs text-surface-400">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-surface-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

// ── Helper: Number input row ────────────────────────────────────────────────
function NumberRow({ label, description, value, onChange, min = 1, max = 9999 }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-surface-700">{label}</p>
        {description && <p className="text-xs text-surface-400">{description}</p>}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-20 px-2 py-1.5 rounded-lg border border-surface-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  );
}

// ── Auth Provider Tab ───────────────────────────────────────────────────────
export function AuthProviderTab() {
  const [currentProvider, setCurrentProvider] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [error, setError] = useState(null);

  const loadProviderConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get(urls.authConfig);
      if (response?.success && response?.data) {
        setCurrentProvider(response.data.provider);
        setSelectedProvider(response.data.provider);
        setAvailableProviders(response.data.availableProviders || ['json_file', 'database', 'social']);
        Logger.info('AuthConfig', logMsgs.providerLoaded);
      } else {
        setError(response?.error?.message || prvTxt.loadingMessage);
      }
    } catch (err) {
      setError(err.message);
      Logger.error('AuthConfig', logMsgs.providerLoadFailed, { error: err.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadProviderConfig(); }, [loadProviderConfig]);

  const handleSave = useCallback(async () => {
    if (!selectedProvider || selectedProvider === currentProvider) return;
    setIsSaving(true);
    setSaveStatus(null);
    setError(null);
    try {
      const response = await ApiClient.post(urls.authConfig, { provider: selectedProvider });
      if (response?.success) {
        setCurrentProvider(selectedProvider);
        setSaveStatus('success');
        Logger.info('AuthConfig', logMsgs.providerSaved, { provider: selectedProvider });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const msg = response?.error?.message || 'Failed to save provider.';
        setError(msg);
        setSelectedProvider(currentProvider);
      }
    } catch (err) {
      setError(err.message);
      setSelectedProvider(currentProvider);
    } finally {
      setIsSaving(false);
    }
  }, [selectedProvider, currentProvider]);

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-sm text-surface-500 py-8 justify-center">
          <RefreshCw size={14} className="animate-spin" />
          <span>{prvTxt.loadingMessage}</span>
        </div>
      </Card>
    );
  }

  const providerIds = availableProviders;
  const hasChange = selectedProvider !== currentProvider;

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-bold text-surface-800 mb-1">{prvTxt.title}</h3>
        <p className="text-xs text-surface-500 mb-4">{prvTxt.description}</p>

        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
            <Check size={13} />
            <span>{prvTxt.savedMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          {providerIds.map(providerId => {
            const provTxt = prvTxt.providers?.[providerId] || {};
            const Icon = PROVIDER_ICONS[providerId] || Shield;
            const isActive = providerId === currentProvider;
            const isSelected = providerId === selectedProvider;
            const isSocial = providerId === 'social';

            return (
              <button
                key={providerId}
                onClick={() => !isSocial && setSelectedProvider(providerId)}
                disabled={isSocial}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSocial
                    ? 'border-surface-100 bg-surface-50 cursor-not-allowed opacity-60'
                    : isSelected
                      ? 'border-brand-500 bg-brand-50/50'
                      : 'border-surface-200 hover:border-surface-300 cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Icon
                      size={18}
                      className={`mt-0.5 shrink-0 ${isSelected && !isSocial ? 'text-brand-600' : 'text-surface-400'}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-surface-800">{provTxt.label || providerId}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{provTxt.description}</p>
                      <p className="text-[11px] text-surface-400 mt-1">{provTxt.detail}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isActive && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-brand-100 text-brand-700">
                        {prvTxt.activeBadge}
                      </span>
                    )}
                    {isSocial && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-surface-200 text-surface-500">
                        {prvTxt.comingSoonBadge}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {hasChange && selectedProvider === 'database' && (
          <div className="flex items-start gap-2 p-3 mt-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{prvTxt.dbNotReadyWarning}</p>
              <p className="mt-0.5 text-amber-700">{prvTxt.dbRequiredNote}</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={isSaving}
            disabled={!hasChange || isSaving}
            icon={saveStatus === 'success' ? Check : undefined}
          >
            {isSaving ? prvTxt.savingMessage : prvTxt.switchButton}
          </Button>
          {hasChange && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedProvider(currentProvider)}>
              Cancel
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Password Policy Tab ─────────────────────────────────────────────────────
export function PasswordPolicyTab() {
  const [policy, setPolicy] = useState(defaults.passwordPolicy);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      await ApiClient.post('/auth/config/password-policy', policy);
      Logger.info('AuthConfig', logMsgs.passwordPolicySaved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Logger.error('AuthConfig', 'Password policy save failed', { error: err.message });
    }
  }, [policy]);

  const update = (key, val) => setPolicy(prev => ({ ...prev, [key]: val }));

  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{cfgTxt.password.title}</h3>
      <p className="text-xs text-surface-500 mb-4">{cfgTxt.password.description}</p>
      <div className="divide-y divide-surface-100">
        <NumberRow label={cfgTxt.password.minLength} value={policy.minLength} onChange={(v) => update('minLength', v)} min={6} max={128} />
        <ToggleRow label={cfgTxt.password.requireUppercase} checked={policy.requireUppercase} onChange={(v) => update('requireUppercase', v)} />
        <ToggleRow label={cfgTxt.password.requireLowercase} checked={policy.requireLowercase} onChange={(v) => update('requireLowercase', v)} />
        <ToggleRow label={cfgTxt.password.requireNumber} checked={policy.requireNumber} onChange={(v) => update('requireNumber', v)} />
        <ToggleRow label={cfgTxt.password.requireSpecial} checked={policy.requireSpecial} onChange={(v) => update('requireSpecial', v)} />
        <NumberRow label={cfgTxt.password.maxAge} value={policy.maxAge} onChange={(v) => update('maxAge', v)} min={0} max={365} />
        <NumberRow label={cfgTxt.password.historyCount} value={policy.historyCount} onChange={(v) => update('historyCount', v)} min={0} max={24} />
      </div>
      <div className="mt-4">
        <Button variant="primary" size="sm" onClick={handleSave} icon={saved ? Check : undefined}>
          {saved ? cfgTxt.saved : cfgTxt.saveButton}
        </Button>
      </div>
    </Card>
  );
}

// ── Session Policy Tab ──────────────────────────────────────────────────────
export function SessionPolicyTab() {
  const [policy, setPolicy] = useState(defaults.sessionPolicy);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      await ApiClient.post('/auth/config/session-policy', policy);
      Logger.info('AuthConfig', logMsgs.sessionPolicySaved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Logger.error('AuthConfig', 'Session policy save failed', { error: err.message });
    }
  }, [policy]);

  const update = (key, val) => setPolicy(prev => ({ ...prev, [key]: val }));

  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{cfgTxt.session.title}</h3>
      <p className="text-xs text-surface-500 mb-4">{cfgTxt.session.description}</p>
      <div className="divide-y divide-surface-100">
        <NumberRow label={cfgTxt.session.maxConcurrent} value={policy.maxConcurrentSessions} onChange={(v) => update('maxConcurrentSessions', v)} min={1} max={10} />
        <NumberRow label={cfgTxt.session.sessionTimeout} value={policy.sessionTimeoutMinutes} onChange={(v) => update('sessionTimeoutMinutes', v)} min={5} max={1440} />
        <NumberRow label={cfgTxt.session.idleTimeout} value={policy.idleTimeoutMinutes} onChange={(v) => update('idleTimeoutMinutes', v)} min={5} max={480} />
        <NumberRow label={cfgTxt.session.rememberMe} value={policy.rememberMeDays} onChange={(v) => update('rememberMeDays', v)} min={1} max={90} />
      </div>
      <div className="mt-4">
        <Button variant="primary" size="sm" onClick={handleSave} icon={saved ? Check : undefined}>
          {saved ? cfgTxt.saved : cfgTxt.saveButton}
        </Button>
      </div>
    </Card>
  );
}

// ── Lockout Policy Tab ──────────────────────────────────────────────────────
export function LockoutPolicyTab() {
  const [policy, setPolicy] = useState(defaults.lockoutPolicy);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      await ApiClient.post('/auth/config/lockout-policy', policy);
      Logger.info('AuthConfig', logMsgs.lockoutPolicySaved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Logger.error('AuthConfig', 'Lockout policy save failed', { error: err.message });
    }
  }, [policy]);

  const update = (key, val) => setPolicy(prev => ({ ...prev, [key]: val }));

  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{cfgTxt.lockout.title}</h3>
      <p className="text-xs text-surface-500 mb-4">{cfgTxt.lockout.description}</p>
      <div className="divide-y divide-surface-100">
        <NumberRow label={cfgTxt.lockout.maxAttempts} value={policy.maxAttempts} onChange={(v) => update('maxAttempts', v)} min={3} max={20} />
        <NumberRow label={cfgTxt.lockout.lockoutDuration} value={policy.lockoutDurationMinutes} onChange={(v) => update('lockoutDurationMinutes', v)} min={1} max={1440} />
        <NumberRow label={cfgTxt.lockout.resetCounter} value={policy.resetCounterMinutes} onChange={(v) => update('resetCounterMinutes', v)} min={1} max={1440} />
      </div>
      <div className="mt-4">
        <Button variant="primary" size="sm" onClick={handleSave} icon={saved ? Check : undefined}>
          {saved ? cfgTxt.saved : cfgTxt.saveButton}
        </Button>
      </div>
    </Card>
  );
}

// ── Token Settings Tab ──────────────────────────────────────────────────────
export function TokenSettingsTab() {
  const [settings, setSettings] = useState(defaults.tokenPolicy);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    try {
      await ApiClient.post('/auth/config/token-settings', settings);
      Logger.info('AuthConfig', logMsgs.tokenSettingsSaved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Logger.error('AuthConfig', 'Token settings save failed', { error: err.message });
    }
  }, [settings]);

  const update = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{cfgTxt.tokens.title}</h3>
      <p className="text-xs text-surface-500 mb-4">{cfgTxt.tokens.description}</p>
      <div className="divide-y divide-surface-100">
        <NumberRow label={cfgTxt.tokens.accessExpiry} value={settings.accessTokenExpiryMinutes} onChange={(v) => update('accessTokenExpiryMinutes', v)} min={5} max={1440} />
        <NumberRow label={cfgTxt.tokens.refreshExpiry} value={settings.refreshTokenExpiryDays} onChange={(v) => update('refreshTokenExpiryDays', v)} min={1} max={90} />
        <ToggleRow label={cfgTxt.tokens.rotateRefresh} checked={settings.rotateRefreshTokens} onChange={(v) => update('rotateRefreshTokens', v)} />
      </div>
      <div className="mt-4">
        <Button variant="primary" size="sm" onClick={handleSave} icon={saved ? Check : undefined}>
          {saved ? cfgTxt.saved : cfgTxt.saveButton}
        </Button>
      </div>
    </Card>
  );
}
