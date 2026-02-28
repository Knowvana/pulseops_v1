// ============================================================================
// AuthConfig — PulseOps V1 (Auth Module)
//
// PURPOSE: Authentication configuration tabs for provider selection,
// password policy, session policy, lockout policy, and token settings.
// Each tab is a separate exported component for use in manifest's
// getConfigTabs(). All text from uiText.json.
//
// ARCHITECTURE: Stateful form components that read/save config via ApiClient.
// Each component manages its own state and save operation independently.
//
// USED BY: auth/manifest.jsx → getConfigTabs()
//
// DEPENDENCIES:
//   - @shared → Card, Button, Logger, ApiClient
//   - ../uiText.json       → All UI labels
//   - ../constants.json     → Default policy values
//   - ../logMessages.json   → Log message templates
// ============================================================================
import React, { useState, useCallback } from 'react';
import { Shield, Key, Check } from 'lucide-react';
import { Card, Button, Logger, ApiClient } from '@shared';
import uiText from '@modules/auth/uiText.json';
import defaults from '@modules/auth/constants.json';
import logMsgs from '@modules/auth/logMessages.json';

const cfgTxt = uiText.config;

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
  const [provider, setProvider] = useState('local');

  return (
    <Card>
      <h3 className="text-sm font-bold text-surface-800 mb-1">{cfgTxt.provider.title}</h3>
      <p className="text-xs text-surface-500 mb-4">{cfgTxt.provider.description}</p>
      <div className="space-y-3">
        {[
          { id: 'local', label: cfgTxt.provider.local, desc: cfgTxt.provider.localDescription },
          { id: 'ldap', label: cfgTxt.provider.ldap, desc: cfgTxt.provider.ldapDescription },
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              provider === p.id
                ? 'border-brand-500 bg-brand-50/50'
                : 'border-surface-200 hover:border-surface-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield size={18} className={provider === p.id ? 'text-brand-600' : 'text-surface-400'} />
                <div>
                  <p className="text-sm font-semibold text-surface-800">{p.label}</p>
                  <p className="text-xs text-surface-500">{p.desc}</p>
                </div>
              </div>
              {provider === p.id && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-brand-100 text-brand-700">
                  {cfgTxt.provider.currentBadge}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </Card>
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
