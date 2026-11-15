import React, { useState } from 'react';
import type { Profile, User } from '../../types';
import { UserCheck, Edit3, Briefcase, Link2, Check, LogIn, Globe } from 'lucide-react';

interface ProfileWorkspaceBarProps {
  profile: Profile;
  user?: User | null;
  isOwner: boolean;
  workspaceMode: 'portfolio' | 'personal';
  currentSlug: string;
  onToggleWorkspaceMode?: (mode: 'portfolio' | 'personal') => void;
  onOpenEdit: () => void;
  onOpenLogin?: () => void;
}

export const ProfileWorkspaceBar: React.FC<ProfileWorkspaceBarProps> = ({
  user,
  isOwner,
  workspaceMode,
  currentSlug,
  onToggleWorkspaceMode,
  onOpenEdit,
  onOpenLogin
}) => {
  const [copiedVanity, setCopiedVanity] = useState(false);

  const handleCopyVanityUrl = () => {
    const shareUrl = isOwner && workspaceMode === 'portfolio'
      ? window.location.origin
      : `${window.location.origin}/profile/${currentSlug}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedVanity(true);
    setTimeout(() => setCopiedVanity(false), 2000);
  };

  if (user && user.role === 'admin' && onToggleWorkspaceMode) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '14px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          <UserCheck size={14} aria-hidden="true" color="var(--accent-crimson)" />
          <span>
            {isOwner
              ? (workspaceMode === 'personal' ? 'Owner Personal Sandbox' : 'Portfolio Owner Controls')
              : (workspaceMode === 'personal' ? 'Personal Workspace' : "Viewing John's Portfolio")}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isOwner ? (
            <>
              {workspaceMode === 'personal' && (
                <button
                  type="button"
                  onClick={() => onToggleWorkspaceMode('portfolio')}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
                >
                  <Briefcase size={13} aria-hidden="true" />
                  <span>Return to My Portfolio</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyVanityUrl}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
                title="Copy portfolio link"
              >
                {copiedVanity ? <Check size={13} aria-hidden="true" color="var(--accent-crimson)" /> : <Link2 size={13} aria-hidden="true" />}
                <span>{copiedVanity ? 'Copied Link!' : 'johnbendfeldt.com'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenEdit}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                <Edit3 size={13} aria-hidden="true" />
                <span>Edit Profile</span>
              </button>
            </>
          ) : (
            <>
              <div className="segmented-control" role="group" aria-label="Workspace mode">
                <button
                  type="button"
                  aria-pressed={workspaceMode === 'portfolio'}
                  onClick={() => onToggleWorkspaceMode('portfolio')}
                  className="segmented-btn"
                >
                  <Briefcase size={13} aria-hidden="true" />
                  <span>John's Portfolio</span>
                </button>
                <button
                  type="button"
                  aria-pressed={workspaceMode === 'personal'}
                  onClick={() => onToggleWorkspaceMode('personal')}
                  className="segmented-btn"
                >
                  <UserCheck size={13} aria-hidden="true" />
                  <span>My Profile</span>
                </button>
              </div>

              {workspaceMode === 'personal' && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyVanityUrl}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
                    title="Copy shareable profile link"
                  >
                    {copiedVanity ? <Check size={13} aria-hidden="true" color="var(--accent-crimson)" /> : <Link2 size={13} aria-hidden="true" />}
                    <span>
                      {copiedVanity ? 'Copied Link!' : `johnbendfeldt.com/profile/${currentSlug}`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenEdit}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  >
                    <Edit3 size={13} aria-hidden="true" />
                    <span>Edit Profile</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (workspaceMode === 'personal') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '18px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          <Globe size={15} aria-hidden="true" color="var(--accent-crimson)" />
          <span>Public Workspace Preview</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onToggleWorkspaceMode && (
            <button
              type="button"
              onClick={() => onToggleWorkspaceMode('portfolio')}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
            >
              <Briefcase size={13} aria-hidden="true" />
              <span>John's Portfolio</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyVanityUrl}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
            title="Copy shareable profile link"
          >
            {copiedVanity ? <Check size={13} aria-hidden="true" color="var(--accent-crimson)" /> : <Link2 size={13} aria-hidden="true" />}
            <span>{copiedVanity ? 'Copied Link!' : `johnbendfeldt.com/profile/${currentSlug}`}</span>
          </button>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              <LogIn size={13} aria-hidden="true" />
              <span>Sign In to Edit</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
