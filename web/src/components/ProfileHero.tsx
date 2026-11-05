import React, { useState, useEffect } from 'react';
import type { Profile, User } from '../types';
import { ApiService } from '../services/api';
import { GithubIcon, LinkedinIcon } from './Icons';
import { MapPin, CheckCircle, ExternalLink, ChevronDown, UserCheck, Edit3, X, Briefcase, Link2, Check, LogIn, Globe } from 'lucide-react';

interface ProfileHeroProps {
  profile: Profile;
  user?: User | null;
  workspaceMode?: 'portfolio' | 'personal';
  onToggleWorkspaceMode?: (mode: 'portfolio' | 'personal') => void;
  onSaveCustomProfile?: (updated: Profile) => void;
  onOpenLogin?: () => void;
  activeTab?: 'experience' | 'dashboard' | 'ai' | 'map';
  onExploreTech: () => void;
  onExploreMap: () => void;
  onExploreAi: () => void;
  onExploreResume?: () => void;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  profile,
  user,
  workspaceMode = 'portfolio',
  onToggleWorkspaceMode,
  onSaveCustomProfile,
  onOpenLogin,
  activeTab,
  onExploreTech,
  onExploreMap,
  onExploreAi,
  onExploreResume
}) => {
  const [imgError, setImgError] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [copiedVanity, setCopiedVanity] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editSlug, setEditSlug] = useState(profile.vanitySlug || '');
  const [editHeadline, setEditHeadline] = useState(profile.headline);
  const [editLocation, setEditLocation] = useState(profile.location);
  const [editYears, setEditYears] = useState(profile.experienceYears);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editAvatar, setEditAvatar] = useState(profile.avatarUrl);
  const [editGithub, setEditGithub] = useState(profile.githubUrl);

  const currentSlug = profile.vanitySlug || (profile.name || 'professional').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  useEffect(() => {
    setImgError(false);
    setEditName(profile.name);
    setEditSlug(profile.vanitySlug || (profile.name || 'professional').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    setEditHeadline(profile.headline);
    setEditLocation(profile.location);
    setEditYears(profile.experienceYears);
    setEditBio(profile.bio);
    setEditAvatar(profile.avatarUrl);
    setEditGithub(profile.githubUrl);
  }, [profile]);

  const isOwner = ApiService.isPortfolioOwner(user);

  const initials = profile.name
    ? profile.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : 'CA';

  const handleCopyVanityUrl = () => {
    const shareUrl = isOwner && workspaceMode === 'portfolio'
      ? window.location.origin
      : `${window.location.origin}/profile/${currentSlug}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedVanity(true);
    setTimeout(() => setCopiedVanity(false), 2000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedSlug = editSlug.trim().replace(/[^a-zA-Z0-9_-]/g, '') || currentSlug;
    if (onSaveCustomProfile) {
      onSaveCustomProfile({
        ...profile,
        name: editName.trim() || profile.name,
        vanitySlug: sanitizedSlug,
        headline: editHeadline.trim() || profile.headline,
        location: editLocation.trim() || profile.location,
        experienceYears: Number(editYears) || 1,
        bio: editBio.trim() || profile.bio,
        avatarUrl: editAvatar.trim(),
        githubUrl: editGithub.trim() || profile.githubUrl
      });
    }
    setIsEditingProfile(false);
  };

  return (
    <div className="glass-panel profile-hero-panel">
      {/* Workspace Bar: Shown when signed in OR when viewing a custom /profile/:slug URL */}
      {user && user.role === 'admin' && onToggleWorkspaceMode ? (
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
                  onClick={handleCopyVanityUrl}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.73rem', fontFamily: 'var(--font-mono)' }}
                  title="Copy portfolio link"
                >
                  {copiedVanity ? <Check size={13} color="var(--accent-crimson)" /> : <Link2 size={13} color="var(--accent-crimson)" />}
                  <span>
                    {copiedVanity ? 'Copied Link!' : 'johnbendfeldt.com'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
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
                      onClick={() => setIsEditingProfile(true)}
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
      ) : workspaceMode === 'personal' ? (
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
            <span>
              Public Workspace Preview
            </span>
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
              <span>
                {copiedVanity ? 'Copied Link!' : `johnbendfeldt.com/profile/${currentSlug}`}
              </span>
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
      ) : null}

      <div className="profile-hero-grid">
        {/* Editorial Portrait & Status */}
        <div className="profile-hero-avatar-col" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            position: 'relative',
            width: '124px',
            height: '124px',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
            background: 'var(--text-primary)',
            flexShrink: 0
          }}>
            {profile.avatarUrl && !imgError ? (
              <img
                ref={(img) => {
                  if (img && img.complete && img.naturalWidth === 0) {
                    setImgError(true);
                  }
                }}
                src={profile.avatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 'calc(var(--radius-md) - 2px)',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            ) : (
              <div
                aria-label={profile.name}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 'calc(var(--radius-md) - 2px)',
                  background: 'var(--accent-crimson)',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '2.4rem',
                  letterSpacing: '-0.04em',
                  userSelect: 'none'
                }}
              >
                <span>{initials}</span>
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: -6,
              right: -6,
              background: 'var(--accent-crimson)',
              color: '#ffffff',
              borderRadius: '50%',
              padding: '4px',
              border: '2px solid var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} title="Verified Professional Profile">
              <CheckCircle size={16} />
            </div>
          </div>

          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
              VERIFIED PROFESSIONAL
            </span>
          </div>
        </div>

        {/* Editorial Typography & Index */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h1
              className="profile-hero-title"
              style={{
                fontSize: '2.75rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.05,
                letterSpacing: '-0.04em'
              }}
            >
              {profile.name}
            </h1>
            <span className="badge badge-cyan" style={{ fontSize: '0.72rem', padding: '4px 12px' }}>
              {profile.experienceYears}+ YRS PRODUCTION
            </span>
          </div>

          <h2 style={{
            fontSize: '1rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            color: 'var(--accent-crimson)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '14px',
            lineHeight: 1.35
          }}>
            {profile.headline}
          </h2>

          <p style={{
            fontSize: '0.98rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            maxWidth: '820px',
            marginBottom: '20px'
          }}>
            {profile.bio}
          </p>

          {/* Location and Editorial Action Links */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              marginRight: '8px'
            }}>
              <MapPin size={14} color="var(--accent-crimson)" />
              <span>{profile.location.toUpperCase()}</span>
            </div>

            {workspaceMode === 'personal' ? (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                <GithubIcon size={15} />
                <span style={{ fontWeight: 600 }}>
                  {profile.githubUrl.replace(/^https?:\/\/(www\.)?/, '') || 'github.com'}
                </span>
                <ExternalLink size={12} style={{ opacity: 0.7 }} />
              </a>
            ) : (
              <>
                {/* Primary Editorial Contact Button */}
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  id="hero-linkedin-link"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.84rem',
                    textDecoration: 'none'
                  }}
                >
                  <LinkedinIcon size={15} />
                  <span>Message on LinkedIn</span>
                  <ExternalLink size={12} style={{ opacity: 0.8 }} />
                </a>

                {/* Outbound GitHub Link */}
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  id="hero-github-link"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <GithubIcon size={15} />
                  <span style={{ fontWeight: 600 }}>github.com/JohnBendfeldt</span>
                  <ExternalLink size={12} style={{ opacity: 0.7 }} />
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Architectural Index Grid (Full Width Across Hero Card on All Screen Sizes) */}
      <div className="hero-metrics-grid" style={{ marginTop: '20px' }}>
            {/* 01 / Career History */}
            <div
              id="hero-jump-experience"
              role="button"
              tabIndex={0}
              aria-label="Jump to Professional Experience and Resume section"
              onClick={onExploreResume || onExploreTech}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  (onExploreResume || onExploreTech)();
                }
              }}
              className={`hero-metric-card ${activeTab === 'experience' ? 'active-experience' : ''}`}
              title="Click to jump to Professional Experience & Resume"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: activeTab === 'experience' ? 'var(--accent-crimson)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  01 / Experience
                </span>
                {activeTab === 'experience' ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', background: 'var(--accent-crimson)', color: '#ffffff', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    ACTIVE <ChevronDown size={11} />
                  </span>
                ) : (
                  <span className="hero-card-cta" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-primary)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s ease' }}>
                    OPEN <ChevronDown size={11} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {workspaceMode === 'personal' ? 'My Career Builder' : '4 Roles • Certs'}
              </div>
            </div>

            {/* 02 / Active Goals */}
            <div
              id="hero-jump-goals"
              role="button"
              tabIndex={0}
              aria-label="Jump to Engineering Goals and Milestones section"
              onClick={onExploreTech}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onExploreTech();
                }
              }}
              className={`hero-metric-card ${activeTab === 'dashboard' ? 'active-dashboard' : ''}`}
              title="Click to jump to Engineering Goals & Milestones"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: activeTab === 'dashboard' ? 'var(--accent-crimson)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  02 / Architecture
                </span>
                {activeTab === 'dashboard' ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', background: 'var(--accent-crimson)', color: '#ffffff', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    ACTIVE <ChevronDown size={11} />
                  </span>
                ) : (
                  <span className="hero-card-cta" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-primary)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s ease' }}>
                    OPEN <ChevronDown size={11} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {workspaceMode === 'personal' ? 'My Active Goals' : '6 Core Milestones'}
              </div>
            </div>

            {/* 03 / AI Pipeline */}
            <div
              id="hero-jump-ai"
              role="button"
              tabIndex={0}
              aria-label="Jump to AI Skill Extraction Pipeline section"
              onClick={onExploreAi}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onExploreAi();
                }
              }}
              className={`hero-metric-card ${activeTab === 'ai' ? 'active-ai' : ''}`}
              title="Click to jump to AI Skill Extraction Pipeline"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: activeTab === 'ai' ? 'var(--accent-crimson)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  03 / AI Pipeline
                </span>
                {activeTab === 'ai' ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', background: 'var(--accent-crimson)', color: '#ffffff', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    ACTIVE <ChevronDown size={11} />
                  </span>
                ) : (
                  <span className="hero-card-cta" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-primary)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s ease' }}>
                    OPEN <ChevronDown size={11} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {workspaceMode === 'personal' ? 'Paste Your Resume' : 'Skill Extractor'}
              </div>
            </div>

            {/* 04 / Garmin FIT */}
            <div
              id="hero-jump-garmin"
              role="button"
              tabIndex={0}
              aria-label="Jump to Garmin FIT Geospatial Telemetry section"
              onClick={onExploreMap}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onExploreMap();
                }
              }}
              className={`hero-metric-card ${activeTab === 'map' ? 'active-map' : ''}`}
              title="Click to jump to Garmin FIT Telemetry Visualizer"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: activeTab === 'map' ? 'var(--accent-crimson)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  04 / Telemetry
                </span>
                {activeTab === 'map' ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', background: 'var(--accent-crimson)', color: '#ffffff', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    ACTIVE <ChevronDown size={11} />
                  </span>
                ) : (
                  <span className="hero-card-cta" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-primary)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s ease' }}>
                    OPEN <ChevronDown size={11} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {workspaceMode === 'personal' ? 'Upload .FIT / .GPX' : 'Garmin Geospatial'}
              </div>
            </div>
      </div>

      {/* Edit Personal Workspace Profile Modal */}
      {isEditingProfile && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '540px',
            width: '100%',
            background: 'var(--bg-card)',
            padding: '28px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={20} color="var(--accent-crimson)" />
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Customize My Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Headline / Role</label>
                  <input
                    type="text"
                    value={editHeadline}
                    onChange={(e) => setEditHeadline(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Years Exp.</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={editYears}
                    onChange={(e) => setEditYears(Number(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Vanity Profile URL
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <span style={{ padding: '9px 10px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRight: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                    johnbendfeldt.com/profile/
                  </span>
                  <input
                    type="text"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    placeholder="basic-english"
                    style={{ flex: 1, padding: '9px 12px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 700, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Avatar Image URL (Blank = Initials)
                  </label>
                  <input
                    type="text"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    placeholder="https://... or leave blank"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    GitHub URL
                  </label>
                  <input
                    type="text"
                    value={editGithub}
                    onChange={(e) => setEditGithub(e.target.value)}
                    placeholder="https://github.com/yourname"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Architectural Bio</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsEditingProfile(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save My Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
