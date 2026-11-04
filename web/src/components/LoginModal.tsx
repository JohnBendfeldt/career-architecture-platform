import React, { useEffect, useState } from 'react';
import { Shield, ArrowRight, Sparkles, KeyRound, AlertCircle, X } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from './Icons';
import { ApiService } from '../services/api';
import {
  getOrInitSupabaseClient,
  setSupabaseAnonKey,
  signInWithProvider,
  type SupportedOAuthProvider
} from '../services/supabase';
import type { User } from '../types';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
  onClose?: () => void;
  onOpenLegal?: (tab: 'privacy' | 'terms') => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onClose, onOpenLegal }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<SupportedOAuthProvider | null>(null);
  const [anonKeyInput, setAnonKeyInput] = useState('');

  // Reset loading state when returning via browser Back button (bfcache / pageshow / focus)
  useEffect(() => {
    const resetLoading = () => {
      setIsLoading(false);
    };
    window.addEventListener('pageshow', resetLoading);
    window.addEventListener('focus', resetLoading);
    document.addEventListener('visibilitychange', resetLoading);
    return () => {
      window.removeEventListener('pageshow', resetLoading);
      window.removeEventListener('focus', resetLoading);
      document.removeEventListener('visibilitychange', resetLoading);
    };
  }, []);

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setOauthError(null);
    try {
      const response = await ApiService.loginAsGuest();
      onLoginSuccess(response.user);
      if (onClose) onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: SupportedOAuthProvider) => {
    setIsLoading(true);
    setOauthError(null);
    setPendingProvider(provider);

    // Ensure buttons re-enable if the user cancels navigation or uses the browser Back button
    const safetyTimer = window.setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    try {
      const client = getOrInitSupabaseClient();
      if (client) {
        const { error } = await signInWithProvider(provider);
        if (error) {
          window.clearTimeout(safetyTimer);
          setOauthError(`Supabase OAuth (${provider}): ${error.message}`);
          setIsLoading(false);
        }
      } else {
        window.clearTimeout(safetyTimer);
        setOauthError(
          `Live OAuth requires your Supabase Anon/Publishable Key (VITE_SUPABASE_ANON_KEY) for project xudbpjhloclfrirzexhu. Paste it below to launch live ${provider === 'azure' ? 'Microsoft' : provider} OAuth, or use the simulated session.`
        );
        setIsLoading(false);
      }
    } catch (err: any) {
      window.clearTimeout(safetyTimer);
      setOauthError(err?.message || 'Unexpected OAuth initialization error');
      setIsLoading(false);
    }
  };

  const handleSaveKeyAndRetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anonKeyInput.trim()) return;
    setSupabaseAnonKey(anonKeyInput.trim());
    setOauthError(null);
    if (pendingProvider) {
      await handleOAuthSignIn(pendingProvider);
    }
  };

  const runDemoOAuth = (provider: SupportedOAuthProvider) => {
    setIsLoading(true);
    setTimeout(() => {
      const providerNames: Record<SupportedOAuthProvider, string> = {
        github: 'GitHub',
        google: 'Google',
        azure: 'Microsoft'
      };
      const name = providerNames[provider];
      const demoUser: User = {
        id: `${provider}-verified-user`,
        name: `${name} Authenticated Recruiter`,
        email: `recruiter@${provider === 'azure' ? 'microsoft.com' : `${provider}.com`}`,
        role: 'guest',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };
      ApiService.setSession('oauth_demo_jwt_token', demoUser);
      onLoginSuccess(demoUser);
      if (onClose) onClose();
      setIsLoading(false);
    }, 350);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      style={{
        position: onClose ? 'fixed' : 'relative',
        inset: onClose ? 0 : undefined,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: onClose ? 'rgba(0, 0, 0, 0.72)' : 'var(--bg-primary)',
        backdropFilter: onClose ? 'blur(8px)' : undefined,
        zIndex: 4000
      }}
    >
      <div className="glass-panel" style={{
        maxWidth: '540px',
        width: '100%',
        padding: '44px 36px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
        background: 'var(--bg-card)',
        position: 'relative',
        zIndex: 10
      }}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            title="Close and continue browsing"
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        )}
        {/* Header & Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/capbjb-logo.svg"
            alt="Career Architecture Platform by John Bendfeldt (CAP/BJB)"
            title="CAP / BJB — Career Architecture Platform • By John Bendfeldt"
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '0px',
              boxShadow: '0 4px 14px rgba(230, 0, 18, 0.25)',
              margin: '0 auto 10px',
              display: 'block',
              cursor: 'help'
            }}
          />
          <div style={{
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            marginBottom: '12px'
          }}>
            CAP / BJB • CAREER ARCHITECTURE PLATFORM BY JOHN BENDFELDT
          </div>

          <span className="badge badge-indigo" style={{ marginBottom: '10px' }}>
            Multi-Scheme JWT Architecture
          </span>

          <h1 style={{
            fontSize: '2rem',
            color: 'var(--text-primary)',
            fontWeight: 800,
            marginBottom: '8px',
            lineHeight: 1.2
          }}>
            Career Architecture Platform
          </h1>

          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Sign in with GitHub, Google, or Microsoft to claim your own vanity URL (<code style={{ fontSize: '0.82rem' }}>/profile/your-name</code>), track personal goals, and upload GPS routes — or continue exploring in public mode.
          </p>
        </div>

        {/* 1-Click Guest Demo Bypass Button */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={handleGuestLogin}
            disabled={isLoading}
            className="btn-primary"
            id="btn-guest-login"
            style={{
              width: '100%',
              padding: '16px 24px',
              fontSize: '1.05rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sparkles size={20} />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 700 }}>Continue Browsing in Public / Guest Mode</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 400 }}>
                  No account required • Explore full portfolio & interactive demos
                </div>
              </div>
            </div>
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          margin: '24px 0',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>Or Sign In with Identity Provider</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Multi-Scheme OAuth Providers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: oauthError ? '16px' : '28px' }}>
          <button
            onClick={() => handleOAuthSignIn('github')}
            disabled={isLoading}
            className="btn-secondary"
            id="btn-login-github"
            style={{ padding: '12px 8px', justifyContent: 'center', borderRadius: 'var(--radius-md)', gap: '6px' }}
          >
            <GithubIcon size={16} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>GitHub</span>
          </button>

          <button
            onClick={() => handleOAuthSignIn('google')}
            disabled={isLoading}
            className="btn-secondary"
            id="btn-login-google"
            style={{ padding: '12px 8px', justifyContent: 'center', borderRadius: 'var(--radius-md)', gap: '6px' }}
          >
            <span style={{ fontWeight: 800, color: '#ea4335', fontSize: '0.9rem' }}>G</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Google</span>
          </button>

          <button
            onClick={() => handleOAuthSignIn('azure')}
            disabled={isLoading}
            className="btn-secondary"
            id="btn-login-entra"
            style={{ padding: '12px 8px', justifyContent: 'center', borderRadius: 'var(--radius-md)', gap: '6px' }}
          >
            <Shield size={16} color="#00a4ef" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Microsoft</span>
          </button>
        </div>

        {/* OAuth Configuration / Diagnostic Notice */}
        {oauthError && (
          <div style={{
            padding: '16px',
            marginBottom: '24px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-primary)',
            border: '1.5px solid var(--accent-crimson)',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <AlertCircle size={18} color="var(--accent-crimson)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                {oauthError}
              </div>
            </div>

            <form onSubmit={handleSaveKeyAndRetry} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={anonKeyInput}
                  onChange={(e) => setAnonKeyInput(e.target.value)}
                  placeholder="Paste Supabase anon/publishable key (eyJ... or sb_...)"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem'
                  }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                >
                  <KeyRound size={13} />
                  <span>Launch Live OAuth</span>
                </button>
              </div>
            </form>

            {pendingProvider && (
              <button
                type="button"
                onClick={() => runDemoOAuth(pendingProvider)}
                className="btn-secondary"
                style={{ width: '100%', padding: '7px 12px', fontSize: '0.76rem' }}
              >
                Or continue with Simulated {pendingProvider === 'azure' ? 'Microsoft' : pendingProvider} Session
              </button>
            )}
          </div>
        )}

        {/* Technical Stack Pills */}
        <div style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            System Architecture
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>C# .NET 10 Minimal APIs</span>
            <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>YARP Gateway</span>
            <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Garmin FIT Engine</span>
            <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>React 19 & Leaflet</span>
          </div>
        </div>

        {/* Outbound Profiles */}
        <div style={{
          marginTop: '24px',
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <a
            href="https://github.com/johnbendfeldt"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
          >
            <GithubIcon size={15} />
            <span>GitHub Profile</span>
          </a>
          <a
            href="https://linkedin.com/in/johnbendfeldt"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link"
          >
            <LinkedinIcon size={15} />
            <span>LinkedIn Profile</span>
          </a>
        </div>

        {/* Privacy & Terms Links for OAuth Consent Verification */}
        <div style={{
          marginTop: '16px',
          textAlign: 'center',
          fontSize: '0.74rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'center',
          gap: '14px'
        }}>
          <a
            href="/privacy"
            onClick={(e) => {
              if (onOpenLegal) {
                e.preventDefault();
                onOpenLegal('privacy');
              }
            }}
            style={{ color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            Privacy Policy
          </a>
          <span>•</span>
          <a
            href="/terms"
            onClick={(e) => {
              if (onOpenLegal) {
                e.preventDefault();
                onOpenLegal('terms');
              }
            }}
            style={{ color: 'var(--text-secondary)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
};
