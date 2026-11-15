import React from 'react';
import { Eye, LogIn, UserCheck } from 'lucide-react';

interface ReadOnlyPortfolioBannerProps {
  profileName?: string;
  context?: 'section' | 'modal' | 'ai';
  onOpenLogin?: () => void;
  onSwitchToPersonal?: () => void;
}

export const ReadOnlyPortfolioBanner: React.FC<ReadOnlyPortfolioBannerProps> = ({
  profileName,
  context = 'section',
  onOpenLogin,
  onSwitchToPersonal,
}) => {
  const ownerLabel =
    !profileName || profileName === 'John F. Bendfeldt' ? 'John Bendfeldt' : profileName;

  let subtitle: string;
  if (onSwitchToPersonal) {
    if (context === 'modal') {
      subtitle =
        "You're previewing this tool on John's portfolio. Switch to your personal workspace to save goals and logged hours.";
    } else if (context === 'ai') {
      subtitle =
        "You're exploring John's portfolio curriculum. Switch to your personal workspace to save skill goals and study hours.";
    } else {
      subtitle =
        "Explore John's live milestones and logged hours below, or switch to your personal workspace to track your own.";
    }
  } else if (context === 'modal') {
    subtitle =
      'Feel free to test-drive this form in preview mode — sign in to save goals and logged hours to your own workspace.';
  } else if (context === 'ai') {
    subtitle =
      'Explore skill pathways in preview mode — sign in to track skill goals and log study hours to your own workspace.';
  } else {
    subtitle =
      "Explore John's live milestones and logged hours below, or sign in to track goals and hours in your own workspace.";
  }

  return (
    <div
      className="callout-banner"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: '1 1 280px' }}>
        <Eye size={17} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text-primary)' }} />
        <div>
          <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
            Viewing {ownerLabel}&apos;s Portfolio — Read-Only Preview
          </strong>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.45, marginTop: '2px' }}>
            {subtitle}
          </div>
        </div>
      </div>

      {onSwitchToPersonal ? (
        <button
          type="button"
          onClick={onSwitchToPersonal}
          className="btn-primary"
          style={{ padding: '7px 13px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
        >
          <UserCheck size={14} aria-hidden="true" />
          <span>Switch to My Profile</span>
        </button>
      ) : onOpenLogin ? (
        <button
          type="button"
          onClick={onOpenLogin}
          className="btn-primary"
          style={{ padding: '7px 13px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
        >
          <LogIn size={14} aria-hidden="true" />
          <span>Sign In / Build Your Own</span>
        </button>
      ) : null}
    </div>
  );
};
