import React from 'react';
import { ShieldCheck, LogOut, Compass, Sun, Moon, LogIn, Search } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from './Icons';
import type { User, Profile } from '../types';
import { isSafeImageUrl, sanitizeExternalUrl } from '../utils/security';

interface NavbarProps {
  user: User | null;
  workspaceMode?: 'portfolio' | 'personal';
  activeProfile?: Profile | null;
  onLogout: () => void;
  onOpenLogin?: () => void;
  onStartTour: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  workspaceMode = 'portfolio',
  activeProfile,
  onLogout,
  onOpenLogin,
  onStartTour,
  theme = 'light',
  onToggleTheme,
  onOpenCommandPalette
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
  const navGithubUrl = isPersonal
    ? sanitizeExternalUrl(activeProfile.githubUrl, 'https://github.com')
    : 'https://github.com/JohnBendfeldt';
  const navLinkedinUrl = isPersonal
    ? sanitizeExternalUrl(activeProfile.linkedinUrl, 'https://linkedin.com')
    : 'https://linkedin.com/in/johnbendfeldt';
  const navOwnerName = isPersonal ? activeProfile.name : 'John Bendfeldt';
  const safeAvatarUrl = isSafeImageUrl(user?.avatarUrl) ? user!.avatarUrl! : '';

  return (
    <header className="navbar-header">
      <div className="navbar-inner">
        {/* Brand & Portfolio Identity */}
        <div className="navbar-brand">
          <img
            src="/capbjb-logo.svg"
            alt="Career Architecture Platform by John Bendfeldt (CAP/BJB)"
            title="CAP / BJB — Career Architecture Platform • By John Bendfeldt"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '0px',
              flexShrink: 0,
              display: 'block'
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 750,
                fontSize: '1.06rem',
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                lineHeight: 1.2
              }}>
                Career Architecture Platform
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', margin: '2px 0 0 0', letterSpacing: '0.02em', lineHeight: 1.3 }}>
              {headerSubtitle}
            </p>
          </div>
        </div>

        {/* Outbound Social Links & User Controls */}
        <div className="navbar-actions">
          <a
            href={navGithubUrl}
            target="_blank"
            rel={isPersonal ? 'noopener noreferrer' : 'noopener noreferrer me'}
            className="social-link"
            id="btn-nav-github"
            aria-label={`Visit ${navOwnerName} on GitHub`}
            title={`Visit ${navOwnerName} on GitHub`}
            style={{ padding: '7px 9px', justifyContent: 'center' }}
          >
            <GithubIcon size={16} />
          </a>

          <a
            href={navLinkedinUrl}
            target="_blank"
            rel={isPersonal ? 'noopener noreferrer' : 'noopener noreferrer me'}
            className="social-link"
            id="btn-nav-linkedin"
            aria-label={`Connect with ${navOwnerName} on LinkedIn`}
            title={`Connect with ${navOwnerName} on LinkedIn`}
            style={{ padding: '7px 9px', justifyContent: 'center' }}
          >
            <LinkedinIcon size={16} />
          </a>

          <span
            aria-hidden="true"
            className="navbar-divider"
            style={{
              width: '1px',
              height: '18px',
              background: 'var(--border-subtle)',
              margin: '0 2px',
              flexShrink: 0
            }}
          />

          {/* Quick Command Palette Trigger (Cmd/Ctrl+K) */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="btn-secondary"
              id="btn-command-palette"
              style={{ padding: '6px 11px', fontSize: '0.8125rem', gap: '6px' }}
              title="Open Quick Command Palette (Ctrl+K or ⌘K)"
              aria-label="Open quick command palette"
            >
              <Search size={14} aria-hidden="true" />
              <span>Quick Jump</span>
              <kbd className="kbd-pill">⌘K</kbd>
            </button>
          )}

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="btn-secondary"
              id="btn-toggle-theme"
              style={{ padding: '6px 12px', fontSize: '0.8125rem', gap: '6px' }}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
              aria-label="Toggle visual theme"
            >
              {theme === 'light' ? (
                <>
                  <Moon size={15} aria-hidden="true" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun size={15} aria-hidden="true" />
                  <span>Light</span>
                </>
              )}
            </button>
          )}

          {/* Tour Guide Button */}
          <button
            type="button"
            onClick={onStartTour}
            className="btn-secondary"
            id="btn-start-tour"
            style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
            title="Restart interactive walkthrough"
          >
            <Compass size={15} aria-hidden="true" />
            <span>Guide</span>
          </button>

          {/* User Badge / Public Sign-In Trigger */}
          <div className="navbar-auth-slot">
            {user && user.role === 'admin' ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '3px 6px 3px 5px',
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                maxWidth: '100%'
              }}>
                {safeAvatarUrl && !avatarError ? (
                  <img
                    ref={(img) => {
                      if (img && img.complete && img.naturalWidth === 0) {
                        setAvatarError(true);
                      }
                    }}
                    src={safeAvatarUrl}
                    alt={user.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid var(--text-primary)'
                    }}
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={user.name}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'var(--accent-crimson-solid)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      flexShrink: 0
                    }}
                  >
                    {userInitials}
                  </div>
                )}
                <div className="navbar-user-name" style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {user.name}
                  </span>
                  <span
                    title="Verified OAuth Session"
                    style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--accent-crimson)', flexShrink: 0 }}
                  >
                    <ShieldCheck size={14} aria-hidden="true" />
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-control)',
                    borderRadius: 'var(--radius-full)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    padding: '5px 11px',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-heading)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                  id="btn-logout"
                  title="Sign Out or Switch Account"
                >
                  <LogOut size={13} aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="btn-primary navbar-signin-btn"
                id="btn-open-login"
                style={{ padding: '7px 14px', fontSize: '0.8125rem', gap: '6px' }}
                aria-label="Sign In / Build Your Own"
                title="Sign in with GitHub, Google, or Microsoft to create or edit your own profile"
              >
                <LogIn size={14} aria-hidden="true" />
                <span className="nav-signin-full">Sign In / Build Your Own</span>
                <span className="nav-signin-short" aria-hidden="true">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
