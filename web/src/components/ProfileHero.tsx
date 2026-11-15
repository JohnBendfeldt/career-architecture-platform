import React, { useState, useEffect } from 'react';
import type { Profile, User } from '../types';
import { ApiService } from '../services/api';
import { exportPrintableResume } from './ResumeTimeline';
import { GithubIcon, LinkedinIcon } from './Icons';
import { MapPin, ExternalLink, Download } from 'lucide-react';
import { ProfileWorkspaceBar } from './profile/ProfileWorkspaceBar';
import { ProfileEditModal } from './profile/ProfileEditModal';
import { isSafeImageUrl, sanitizeExternalUrl } from '../utils/security';

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

  const currentSlug = profile.vanitySlug || (profile.name || 'professional').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const safeAvatarUrl = isSafeImageUrl(profile.avatarUrl) ? profile.avatarUrl : '';
  const safeGithubUrl = sanitizeExternalUrl(profile.githubUrl, 'https://github.com');
  const safeLinkedinUrl = sanitizeExternalUrl(profile.linkedinUrl, 'https://linkedin.com');

  useEffect(() => {
    setImgError(false);
  }, [profile]);

  const isOwner = ApiService.isPortfolioOwner(user);

  const initials = profile.name
    ? profile.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : 'CA';

  const indexCards = [
    {
      id: 'hero-jump-experience',
      tab: 'experience' as const,
      activeClass: 'active-experience',
      ariaLabel: 'Jump to Professional Experience and Resume section',
      title: 'Jump to Professional Experience & Resume',
      label: '01 / Experience',
      subtitle: workspaceMode === 'personal' ? 'My Career Builder' : '4 Roles • Credentials',
      onClick: onExploreResume || onExploreTech
    },
    {
      id: 'hero-jump-goals',
      tab: 'dashboard' as const,
      activeClass: 'active-dashboard',
      ariaLabel: 'Jump to Engineering Goals and Milestones section',
      title: 'Jump to Engineering Goals & Milestones',
      label: '02 / Architecture',
      subtitle: workspaceMode === 'personal' ? 'My Active Goals' : '6 Core Milestones',
      onClick: onExploreTech
    },
    {
      id: 'hero-jump-ai',
      tab: 'ai' as const,
      activeClass: 'active-ai',
      ariaLabel: 'Jump to AI Skill Extraction Pipeline section',
      title: 'Jump to AI Skill Extraction Pipeline',
      label: '03 / AI Pipeline',
      subtitle: workspaceMode === 'personal' ? 'Paste Your Resume' : 'Skill Extractor',
      onClick: onExploreAi
    },
    {
      id: 'hero-jump-garmin',
      tab: 'map' as const,
      activeClass: 'active-map',
      ariaLabel: 'Jump to Garmin FIT Geospatial Telemetry section',
      title: 'Jump to Garmin FIT Telemetry Visualizer',
      label: '04 / Telemetry',
      subtitle: workspaceMode === 'personal' ? 'Upload .FIT / .GPX' : 'Garmin Geospatial',
      onClick: onExploreMap
    }
  ];

  return (
    <section className="glass-panel profile-hero-panel" aria-label="Profile overview">
      <ProfileWorkspaceBar
        profile={profile}
        user={user}
        isOwner={isOwner}
        workspaceMode={workspaceMode}
        currentSlug={currentSlug}
        onToggleWorkspaceMode={onToggleWorkspaceMode}
        onOpenEdit={() => setIsEditingProfile(true)}
        onOpenLogin={onOpenLogin}
      />

      <div className="profile-hero-grid">
        {/* Clean Editorial Portrait */}
        <div className="profile-hero-avatar-col" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-inset)',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {safeAvatarUrl && !imgError ? (
              <img
                ref={(img) => {
                  if (img && img.complete && img.naturalWidth === 0) {
                    setImgError(true);
                  }
                }}
                src={safeAvatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            ) : (
              <div
                role="img"
                aria-label={profile.name}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'var(--accent-crimson-solid)',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '2.3rem',
                  letterSpacing: '-0.04em',
                  userSelect: 'none'
                }}
              >
                <span>{initials}</span>
              </div>
            )}
          </div>
        </div>

        {/* Editorial Typography & Primary Actions */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.76rem',
            color: 'var(--text-muted)',
            marginBottom: '6px'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={13} aria-hidden="true" />
              <span>{profile.location}</span>
            </span>
            <span aria-hidden="true">•</span>
            <span>{profile.experienceYears}+ years in software engineering</span>
          </div>

          <h1
            className="profile-hero-title"
            style={{
              fontSize: '2.65rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              marginBottom: '8px'
            }}
          >
            {profile.name}
          </h1>

          <h2 style={{
            fontSize: '1.16rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            letterSpacing: '-0.015em',
            marginBottom: '14px',
            lineHeight: 1.35
          }}>
            {profile.headline}
          </h2>

          <p style={{
            fontSize: '0.97rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            maxWidth: '78ch',
            marginBottom: '22px'
          }}>
            {profile.bio}
          </p>

          {/* Primary Action Links */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            {workspaceMode === 'personal' ? (
              <>
                <button
                  type="button"
                  onClick={() => exportPrintableResume({ workspaceMode: 'personal', profile })}
                  className="btn-primary"
                  id="hero-personal-resume-pdf-btn"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <Download size={15} aria-hidden="true" />
                  <span>Download Resume (PDF)</span>
                </button>
                <a
                  href={safeLinkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <LinkedinIcon size={15} />
                  <span style={{ fontWeight: 600 }}>LinkedIn</span>
                  <ExternalLink size={12} aria-hidden="true" style={{ opacity: 0.7 }} />
                </a>
                <a
                  href={safeGithubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <GithubIcon size={15} />
                  <span style={{ fontWeight: 600 }}>
                    {safeGithubUrl.replace(/^https?:\/\/(www\.)?/, '') || 'github.com'}
                  </span>
                  <ExternalLink size={12} aria-hidden="true" style={{ opacity: 0.7 }} />
                </a>
              </>
            ) : (
              <>
                <a
                  href={safeLinkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  id="hero-linkedin-link"
                  style={{ padding: '8px 18px', fontSize: '0.84rem', textDecoration: 'none' }}
                >
                  <LinkedinIcon size={15} />
                  <span>Message on LinkedIn</span>
                  <ExternalLink size={12} aria-hidden="true" style={{ opacity: 0.8 }} />
                </a>

                <button
                  type="button"
                  onClick={() => exportPrintableResume({ workspaceMode: 'portfolio', profile })}
                  className="btn-secondary"
                  id="hero-resume-pdf-btn"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <Download size={15} aria-hidden="true" />
                  <span>Download Resume (PDF)</span>
                </button>

                <a
                  href={safeGithubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  id="hero-github-link"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <GithubIcon size={15} />
                  <span style={{ fontWeight: 600 }}>github.com/JohnBendfeldt</span>
                  <ExternalLink size={12} aria-hidden="true" style={{ opacity: 0.7 }} />
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Flush Architectural Index Strip (Native Buttons) */}
      <nav aria-label="Portfolio section shortcuts" className="hero-metrics-grid">
        {indexCards.map((card) => {
          const isActive = activeTab === card.tab;
          return (
            <button
              key={card.id}
              type="button"
              id={card.id}
              aria-label={card.ariaLabel}
              aria-current={isActive ? 'true' : undefined}
              onClick={card.onClick}
              className={`hero-metric-card ${isActive ? card.activeClass : ''}`}
              title={card.title}
            >
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: isActive ? 'var(--accent-crimson)' : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600
              }}>
                {card.label}
              </span>
              <span style={{
                fontSize: '1.02rem',
                fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em'
              }}>
                {card.subtitle}
              </span>
            </button>
          );
        })}
      </nav>

      <ProfileEditModal
        isOpen={isEditingProfile}
        profile={profile}
        currentSlug={currentSlug}
        onClose={() => setIsEditingProfile(false)}
        onSave={onSaveCustomProfile}
      />
    </section>
  );
};
