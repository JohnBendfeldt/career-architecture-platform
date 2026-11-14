import React, { useState } from 'react';
import type { Profile, User } from '../../types';
import { exportPrintableResume } from '../ResumeTimeline';
import { UserCheck, Edit3, Briefcase, Link2, Check, LogIn, Globe, Download } from 'lucide-react';

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
  profile,
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
        paddingBottom: '18px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          <UserCheck size={15} color="var(--accent-crimson)" />
          <span>
            Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>
            {isOwner ? ' • Portfolio Owner' : ''}
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
                  style={{ padding: '6px 12px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                >
                  <Briefcase size={13} />
                  <span>Return to My Portfolio</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => exportPrintableResume({ workspaceMode, profile })}
                className="btn-primary"
                id="btn-workspace-download-resume-owner"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                title="Download / Print ATS-Ready Resume PDF"
              >
                <Download size={13} />
                <span>Download Resume</span>
              </button>
              <button
                type="button"
                onClick={handleCopyVanityUrl}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.73rem', fontFamily: 'var(--font-mono)' }}
                title="Copy portfolio link"
              >
                {copiedVanity ? <Check size={13} color="var(--accent-crimson)" /> : <Link2 size={13} color="var(--accent-crimson)" />}
                <span>{copiedVanity ? 'Copied Link!' : 'johnbendfeldt.com'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenEdit}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                <Edit3 size={13} />
                <span>Edit Profile</span>
              </button>
            </>
          ) : (
            <>
              <div style={{
                display: 'inline-flex',
                background: 'var(--bg-primary)',
                padding: '3px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}>
                <button
                  type="button"
                  onClick={() => onToggleWorkspaceMode('portfolio')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    borderRadius: '2px',
                    border: 'none',
                    cursor: 'pointer',
                    background: workspaceMode === 'portfolio' ? 'var(--text-primary)' : 'transparent',
                    color: workspaceMode === 'portfolio' ? 'var(--bg-surface)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Briefcase size={12} />
                  <span>John's Portfolio</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleWorkspaceMode('personal')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    borderRadius: '2px',
                    border: 'none',
                    cursor: 'pointer',
                    background: workspaceMode === 'personal' ? 'var(--accent-crimson)' : 'transparent',
                    color: workspaceMode === 'personal' ? '#ffffff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <UserCheck size={12} />
                  <span>My Profile</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => exportPrintableResume({ workspaceMode, profile })}
                className="btn-primary"
                id="btn-workspace-download-resume"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                title="Download / Print ATS-Ready Resume PDF"
              >
                <Download size={13} />
                <span>{workspaceMode === 'personal' ? 'Download My Resume' : 'Download Resume'}</span>
              </button>

              {workspaceMode === 'personal' && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyVanityUrl}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.73rem', fontFamily: 'var(--font-mono)' }}
                    title="Copy shareable profile link"
                  >
                    {copiedVanity ? <Check size={13} color="var(--accent-crimson)" /> : <Link2 size={13} color="var(--accent-crimson)" />}
                    <span>
                      {copiedVanity ? 'Copied Link!' : `johnbendfeldt.com/profile/${currentSlug}`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenEdit}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    <Edit3 size={13} />
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
          <Globe size={15} color="var(--accent-crimson)" />
          <span>Public Workspace Preview</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onToggleWorkspaceMode && (
            <button
              type="button"
              onClick={() => onToggleWorkspaceMode('portfolio')}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}
            >
              <Briefcase size={12} />
              <span>John's Portfolio</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyVanityUrl}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.73rem', fontFamily: 'var(--font-mono)' }}
            title="Copy shareable profile link"
          >
            {copiedVanity ? <Check size={13} color="var(--accent-crimson)" /> : <Link2 size={13} color="var(--accent-crimson)" />}
            <span>{copiedVanity ? 'Copied Link!' : `johnbendfeldt.com/profile/${currentSlug}`}</span>
          </button>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.75rem' }}
            >
              <LogIn size={13} />
              <span>Sign In to Edit</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
