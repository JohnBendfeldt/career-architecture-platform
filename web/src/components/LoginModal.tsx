import React, { useEffect, useState } from 'react';
import { Shield, ArrowRight, KeyRound, AlertCircle, X } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from './Icons';
import { ModalDialog } from './ui/ModalDialog';
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

  const cardContent = (
    <>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="icon-btn"
          aria-label="Close sign in dialog"
          title="Close and continue browsing"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px'
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}

      {/* Header & Logo */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img
          src="/capbjb-logo.svg"
          alt="Career Architecture Platform logo"
          style={{
            width: '52px',
            height: '52px',
            margin: '0 auto 12px',
            display: 'block'
          }}
        />
        <div className="section-eyebrow" style={{ marginBottom: '8px' }}>
          CAP / BJB • Career Architecture Platform
        </div>

        <h2
          id="login-modal-title"
          style={{
            fontSize: '1.75rem',
            color: 'var(--text-primary)',
            fontWeight: 750,
            marginBottom: '8px',
            lineHeight: 1.2
          }}
        >
          Career Architecture Platform
        </h2>

        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Sign in with GitHub, Google, or Microsoft to claim your own vanity URL (<code style={{ fontSize: '0.82rem' }}>/profile/your-name</code>), track personal goals, and upload GPS routes — or continue exploring in public mode.
        </p>
      </div>

      {/* 1-Click Guest Demo Bypass Button */}
      <div style={{ marginBottom: '22px' }}>
        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={isLoading}
          className="btn-primary"
          id="btn-guest-login"
          style={{
            width: '100%',
            padding: '15px 20px',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
            <div style={{ fontWeight: 700 }}>Continue Browsing in Public / Guest Mode</div>
            <div style={{ fontSize: '0.78rem', opacity: 0.92, fontWeight: 400, marginTop: '2px' }}>
              No account required • Explore full portfolio &amp; interactive tools
            </div>
          </div>
          <ArrowRight size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
        </button>
      </div>

      {/* Divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        margin: '22px 0',
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: oauthError ? '16px' : '24px' }}>
        <button
          type="button"
          onClick={() => handleOAuthSignIn('github')}
          disabled={isLoading}
          className="btn-secondary"
          id="btn-login-github"
          style={{ padding: '11px 8px', justifyContent: 'center', borderRadius: 'var(--radius-md)', gap: '6px' }}
        >
          <GithubIcon size={16} />
          <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>GitHub</span>
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSignIn('google')}
          disabled={isLoading}
          className="btn-secondary"
          id="btn-login-google"
          style={{ padding: '11px 8px', justifyContent: 'center', borderRadius: 'var(--radius-md)', gap: '6px' }}
        >
          <span aria-hidden="true" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>G</span>
          <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Google</span>
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSignIn('azure')}
          disabled={isLoading}
          className="btn-secondary"
          id="btn-login-entra"
          style={{ padding: '11px 8px', justifyContent: 'center', borderRadius: 'var(--radius-md)', gap: '6px' }}
        >
          <Shield size={16} color="var(--text-primary)" aria-hidden="true" />
          <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Microsoft</span>
        </button>
      </div>

      {/* OAuth Configuration / Diagnostic Notice */}
      {oauthError && (
        <div
          role="alert"
          className="callout-danger"
          style={{
            padding: '16px',
            marginBottom: '22px',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <AlertCircle size={18} color="var(--accent-crimson)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
              {oauthError}
            </div>
          </div>

          <form onSubmit={handleSaveKeyAndRetry} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            <label htmlFor="supabase-anon-key-input" className="sr-only">
              Supabase anon or publishable key
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                id="supabase-anon-key-input"
                type="text"
                value={anonKeyInput}
                onChange={(e) => setAnonKeyInput(e.target.value)}
                placeholder="Paste Supabase anon/publishable key (eyJ... or sb_...)"
                className="form-input"
                style={{
                  flex: '1 1 220px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem'
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '8px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                <KeyRound size={14} aria-hidden="true" />
                <span>Launch Live OAuth</span>
              </button>
            </div>
          </form>

          {pendingProvider && (
            <button
              type="button"
              onClick={() => runDemoOAuth(pendingProvider)}
              className="btn-secondary"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem' }}
            >
              Or continue with Simulated {pendingProvider === 'azure' ? 'Microsoft' : pendingProvider} Session
            </button>
          )}
        </div>
      )}

      {/* Outbound Profiles */}
      <div style={{
        paddingTop: '18px',
        borderTop: '1px solid var(--border-subtle)',
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
        fontSize: '0.75rem',
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
        <span aria-hidden="true">•</span>
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
    </>
  );

  if (onClose) {
    return (
      <ModalDialog
        isOpen={true}
        onClose={onClose}
        labelledBy="login-modal-title"
        maxWidth="520px"
        padding="36px 32px"
        zIndex={4000}
      >
        {cardContent}
      </ModalDialog>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-primary)'
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '36px 32px',
          position: 'relative'
        }}
      >
        {cardContent}
      </div>
    </div>
  );
};
