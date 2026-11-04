import React from 'react';
import { ShieldCheck, LogOut, Compass, Sun, Moon, LogIn } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from './Icons';
import type { User, Profile } from '../types';

interface NavbarProps {
  user: User | null;
  workspaceMode?: 'portfolio' | 'personal';
  activeProfile?: Profile | null;
  onLogout: () => void;
  onOpenLogin?: () => void;
  onStartTour: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  workspaceMode = 'portfolio',
  activeProfile,
  onLogout,
  onOpenLogin,
  onStartTour,
  theme = 'light',
  onToggleTheme
}) => {
  const [avatarError, setAvatarError] = React.useState(false);

  React.useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  const userInitials = user?.name
    ? user.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
    : 'JB';

  const isPersonal = workspaceMode === 'personal' && !!activeProfile;
  const headerSubtitle = isPersonal
    ? `BY JOHN BENDFELDT // ${activeProfile.name.toUpperCase()}`
    : 'BY JOHN BENDFELDT';
  const headerBadge = isPersonal ? 'PERSONAL WORKSPACE' : '.NET 10 & YARP';
  const navGithubUrl = isPersonal
    ? (activeProfile.githubUrl || 'https://github.com')
    : 'https://github.com/johnbendfeldt';
  const navLinkedinUrl = isPersonal
    ? (activeProfile.linkedinUrl || 'https://linkedin.com')
    : 'https://linkedin.com/in/johnbendfeldt';
  const navOwnerName = isPersonal ? activeProfile.name : 'John Bendfeldt';

  return (
    <header className="glass-panel navbar-header">
      {/* Brand & System Status */}
      <div className="navbar-brand">
        <img
          src="/capbjb-logo.svg"
          alt="Career Architecture Platform by John Bendfeldt (CAP/BJB)"
          title="CAP / BJB — Career Architecture Platform • By John Bendfeldt"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '0px',
            flexShrink: 0,
            display: 'block',
            cursor: 'help'
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1.2
            }}>
              Career Architecture Platform
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.62rem', padding: '2px 7px' }}>
              {headerBadge}
            </span>
          </div>
          <p style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', margin: '2px 0 0 0', letterSpacing: '0.02em', lineHeight: 1.3 }}>
            {headerSubtitle}
          </p>
        </div>
      </div>

      {/* Outbound Social Links & User Controls */}
      <div className="navbar-actions">
        {/* Outbound GitHub Link */}
        <a
          href={navGithubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
          id="btn-nav-github"
          title={`Visit ${navOwnerName} on GitHub`}
        >
          <GithubIcon size={16} />
          <span style={{ display: 'inline-block' }}>GitHub</span>
        </a>

        {/* Outbound LinkedIn Link */}
        <a
          href={navLinkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
          id="btn-nav-linkedin"
          title={`Connect with ${navOwnerName} on LinkedIn`}
        >
          <LinkedinIcon size={16} />
          <span style={{ display: 'inline-block' }}>LinkedIn</span>
        </a>

        {/* Theme Toggle Button (Zen Light / Halo Dark) */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="btn-secondary"
            id="btn-toggle-theme"
            style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '6px' }}
            title={`Switch to ${theme === 'light' ? 'Halo Dark' : 'Zen Light'} mode`}
            aria-label="Toggle visual theme"
          >
            {theme === 'light' ? (
              <>
                <Moon size={15} color="var(--accent-indigo)" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun size={15} color="#f59e0b" />
                <span>Light</span>
              </>
            )}
          </button>
        )}

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

        {/* User Badge / Public Sign-In Trigger */}
        {user && user.role === 'admin' ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 10px 4px 6px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)'
          }}>
            {user.avatarUrl && !avatarError ? (
              <img
                ref={(img) => {
                  if (img && img.complete && img.naturalWidth === 0) {
                    setAvatarError(true);
                  }
                }}
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid var(--text-primary)'
                }}
              />
            ) : (
              <div
                aria-label={user.name}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent-crimson)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  border: '1.5px solid var(--text-primary)',
                  flexShrink: 0
                }}
              >
                {userInitials}
              </div>
            )}
            <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} color="var(--accent-crimson)" />
                <span>Verified OAuth Session</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '4px 10px',
                marginLeft: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: 600,
                fontFamily: 'var(--font-heading)',
                transition: 'all 0.15s ease'
              }}
              id="btn-logout"
              title="Sign Out or Switch Account"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="btn-primary"
            id="btn-open-login"
            style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px' }}
            title="Sign in with GitHub, Google, or Microsoft to create or edit your own profile"
          >
            <LogIn size={14} />
            <span>Sign In / Build Your Own</span>
          </button>
        )}
      </div>
    </header>
  );
};
