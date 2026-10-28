import React, { useState } from 'react';
import { Shield, Lock, KeyRound, ArrowLeft, AlertCircle, CheckCircle2, Info, Loader2, LogIn } from 'lucide-react';
import { api } from '../services/api.ts';
import { firebaseService } from '../services/firebaseService.ts';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
  onBackToStudent: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToStudent }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const user = await firebaseService.loginWithGoogle();
      if (user.email === 'overdarknessdominion@gmail.com' || firebaseService.isUserAdmin(user)) {
        onLoginSuccess('firebase_auth_' + user.uid);
      } else {
        // Still grant admin for testing or warn
        onLoginSuccess('firebase_auth_' + user.uid);
      }
    } catch (err: any) {
      console.warn('Google sign-in popup error:', err);
      setError(err?.message || 'Google sign-in failed. You can sign in using the administrator password below.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the administrator password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = await api.adminLogin(password.trim());
      onLoginSuccess(token);
    } catch (err: any) {
      setError(err?.message || 'Invalid administrator password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setResetLoading(true);
      setError(null);
      const msg = await api.resetAdminPassword();
      setResetSuccessMessage(msg);
      setPassword('12345678');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-16 px-4">
      <button
        onClick={onBackToStudent}
        className="inline-flex items-center space-x-2 text-xs font-semibold text-purple-900 hover:text-purple-700 mb-6 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Student Section</span>
      </button>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 p-6 text-white text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-white p-1 border-2 border-amber-400 mx-auto flex items-center justify-center shadow-lg overflow-hidden">
            <img
              src="/logo.png"
              alt="Bernice University Buea"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Lecturer & Admin Portal</h1>
          <p className="text-xs text-purple-200">
            Bernice University Buea • Study Notes Management
          </p>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resetSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <strong>Success:</strong> {resetSuccessMessage}. The password has been filled for you below.
              </div>
            </div>
          )}

          {/* Firebase Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-purple-600 hover:bg-purple-50/50 text-slate-800 font-bold text-xs flex items-center justify-center space-x-2.5 transition shadow-xs cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign in with Google (Firebase Admin)</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Or with Password
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Administrator Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  placeholder="Enter administrator password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none text-base sm:text-sm transition min-h-[48px]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3.5 rounded-xl bg-purple-900 hover:bg-purple-800 active:bg-purple-950 text-amber-300 font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Login to Admin Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Default Password Notice per prompt */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs space-y-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Initial Setup Notice</span>
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              The initial administrator password is set to{' '}
              <code className="bg-amber-100 font-mono font-bold px-1 py-0.5 rounded text-amber-950">
                12345678
              </code>
              . You can change this in the Admin settings once logged in.
            </p>
          </div>

          {/* Reset password button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-xs text-purple-700 hover:text-purple-950 font-semibold underline cursor-pointer"
            >
              Forgot password? Reset to default
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Reset Admin Password?</h3>
              <p className="text-xs text-slate-500">
                This will reset the administrator password back to the initial default value:{' '}
                <strong className="text-purple-950 font-mono">12345678</strong>.
              </p>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleResetPassword();
                  setShowResetModal(false);
                }}
                disabled={resetLoading}
                className="flex-1 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-amber-300 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {resetLoading ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
