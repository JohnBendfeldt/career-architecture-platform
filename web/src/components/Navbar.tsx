import React from 'react';
import { ShieldCheck, LogOut, Compass, Terminal } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from './Icons';
import type { User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onStartTour: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onStartTour }) => {
  return (
    <header className="glass-panel" style={{
      position: 'sticky',
      top: 12,
      zIndex: 1000,
      margin: '12px auto 24px auto',
      maxWidth: '1280px',
      width: 'calc(100% - 32px)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 'var(--radius-xl)'
    }}>
      {/* Brand & System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'var(--primary-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Terminal size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Career Architecture
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
              .NET 10 & YARP
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Interactive Portfolio & Geospatial Engine
          </p>
        </div>
      </div>

      {/* Outbound Social Links & User Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Outbound GitHub Link */}
        <a
          href="https://github.com/johnbendfeldt"
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
          id="btn-nav-github"
          title="Visit John Bendfeldt on GitHub"
        >
          <GithubIcon size={16} />
          <span style={{ display: 'inline-block' }}>GitHub</span>
        </a>

        {/* Outbound LinkedIn Link */}
        <a
          href="https://linkedin.com/in/johnbendfeldt"
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
          id="btn-nav-linkedin"
          title="Connect with John Bendfeldt on LinkedIn"
        >
          <LinkedinIcon size={16} />
          <span style={{ display: 'inline-block' }}>LinkedIn</span>
        </a>

        {/* Tour Guide Button */}
        <button
          onClick={onStartTour}
          className="btn-secondary"
          id="btn-start-tour"
          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          title="Restart interactive walkthrough"
        >
          <Compass size={15} color="var(--accent-cyan)" />
          <span>Guide</span>
        </button>

        {/* User Badge / Guest Mode Indicator */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 12px 4px 6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)'
          }}>
            <img
              src={user.avatarUrl}
              alt={user.name}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--accent-indigo)'
              }}
            />
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <ShieldCheck size={10} />
                <span>Guest Demo Mode (Read-Only)</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                marginLeft: '6px',
                display: 'flex',
                alignItems: 'center'
              }}
              id="btn-logout"
              title="Sign Out / Switch Account"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
