// ============================================================================
// LoginForm — PulseOps V1 Design System
//
// PURPOSE: Shared login form component used by the Auth module and core
// App.jsx. Displays email/password fields with branded styling. All text
// is read from uiText.json — no inline strings.
//
// USAGE:
//   import { LoginForm } from '@shared';
//   <LoginForm onLogin={handleLogin} isLoading={false} />
//
// PROPS:
//   onLogin   — async function(email, password), called on form submit
//   isLoading — boolean, disables form and shows spinner during login
//   error     — string, error message to display (optional)
//
// DEPENDENCIES:
//   - @shared/config/uiText.json  → All form labels and placeholders
//   - @shared/config/app.json     → App name for branding
// ============================================================================
import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, Loader2 } from 'lucide-react';
import uiText from '@shared/config/uiText.json';
import appConfig from '@shared/config/app.json';

const txt = uiText.login;

export default function LoginForm({ onLogin, isLoading = false, error: externalError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const displayError = externalError || error;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || txt.subtitle);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-brand-50/30 to-surface-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-200">
            <span className="text-white text-2xl font-extrabold">
              {(appConfig.appName || 'P').charAt(0)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-surface-800">{txt.title}</h1>
          <p className="text-sm text-surface-500 mt-1">{txt.subtitle}</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-xl shadow-surface-200/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {displayError && (
              <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 text-danger-700 text-sm font-medium animate-slide-down">
                {displayError}
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                {txt.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={txt.emailPlaceholder}
                required
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-surface-300 text-sm text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                {txt.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={txt.passwordPlaceholder}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-surface-300 text-sm text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-brand-200"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {txt.loadingButton}
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  {txt.submitButton}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Default credentials hint */}
        {txt.coreAdminHint && (
          <p className="text-center text-xs text-surface-500 mt-4 bg-surface-100 rounded-lg py-2 px-3 border border-surface-200">
            {txt.coreAdminHint}
          </p>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-surface-400 mt-4">{txt.poweredBy}</p>
      </div>
    </div>
  );
}
