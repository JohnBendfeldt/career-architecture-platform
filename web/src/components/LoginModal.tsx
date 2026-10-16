import React, { useState } from 'react';
import { Terminal, Shield, ArrowRight, Sparkles } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from './Icons';
import { ApiService } from '../services/api';
import type { User } from '../types';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.loginAsGuest();
      onLoginSuccess(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthDemo = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      // Demo authentication simulating OAuth callback
      const demoUser: User = {
        id: `${provider.toLowerCase()}-verified-user`,
        name: `${provider} Authenticated Recruiter`,
        email: `recruiter@${provider.toLowerCase()}.com`,
        role: 'guest',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };
      ApiService.setSession('oauth_demo_jwt_token', demoUser);
      onLoginSuccess(demoUser);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      {/* Background ambient lighting */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%)',
        top: '20%',
        left: '25%',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.14) 0%, transparent 70%)',
        bottom: '20%',
        right: '25%',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      <div className="glass-panel" style={{
        maxWidth: '540px',
        width: '100%',
        padding: '44px 36px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.2)',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Header & Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '58px',
            height: '58px',
            borderRadius: '16px',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Terminal size={30} color="#ffffff" />
          </div>

          <span className="badge badge-indigo" style={{ marginBottom: '10px' }}>
            Multi-Scheme JWT Architecture
          </span>

          <h1 style={{
            fontSize: '2rem',
            color: '#ffffff',
            fontWeight: 800,
            marginBottom: '8px',
            lineHeight: 1.2
          }}>
            Career & Skill Architecture
          </h1>

          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Interactive portfolio, learning tracker, and Garmin FIT geospatial visualizer for <strong style={{ color: '#ffffff' }}>John Bendfeldt</strong>.
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
                <div style={{ fontWeight: 700 }}>Try Guest Demo (One-Click)</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 400 }}>
                  Instant recruiter access • Mints JWT with role: "guest"
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
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>Or Sign In with Identity Provider</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Multi-Scheme OAuth Providers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
          <button
            onClick={() => handleOAuthDemo('Microsoft')}
            disabled={isLoading}
            className="btn-secondary"
            id="btn-login-entra"
            style={{ padding: '12px', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}
          >
            <Shield size={16} color="#00a4ef" />
            <span style={{ fontSize: '0.85rem' }}>Microsoft Entra ID</span>
          </button>

          <button
            onClick={() => handleOAuthDemo('Google')}
            disabled={isLoading}
            className="btn-secondary"
            id="btn-login-google"
            style={{ padding: '12px', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}
          >
            <span style={{ fontWeight: 700, color: '#ea4335' }}>G</span>
            <span style={{ fontSize: '0.85rem' }}>Google OAuth</span>
          </button>
        </div>

        {/* Technical Stack Pills */}
        <div style={{
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
      </div>
    </div>
  );
};
