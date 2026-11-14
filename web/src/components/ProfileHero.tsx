import React, { useState, useEffect } from 'react';
import type { Profile, User } from '../types';
import { ApiService } from '../services/api';
import { exportPrintableResume } from './ResumeTimeline';
import { GithubIcon, LinkedinIcon } from './Icons';
import { MapPin, CheckCircle, ExternalLink, ChevronDown, Download } from 'lucide-react';
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
      title: 'Click to jump to Professional Experience & Resume',
      label: '01 / Experience',
      subtitle: workspaceMode === 'personal' ? 'My Career Builder' : '4 Roles • Certs',
      onClick: onExploreResume || onExploreTech
    },
    {
      id: 'hero-jump-goals',
      tab: 'dashboard' as const,
      activeClass: 'active-dashboard',
      ariaLabel: 'Jump to Engineering Goals and Milestones section',
      title: 'Click to jump to Engineering Goals & Milestones',
      label: '02 / Architecture',
      subtitle: workspaceMode === 'personal' ? 'My Active Goals' : '6 Core Milestones',
      onClick: onExploreTech
    },
    {
      id: 'hero-jump-ai',
      tab: 'ai' as const,
      activeClass: 'active-ai',
      ariaLabel: 'Jump to AI Skill Extraction Pipeline section',
      title: 'Click to jump to AI Skill Extraction Pipeline',
      label: '03 / AI Pipeline',
      subtitle: workspaceMode === 'personal' ? 'Paste Your Resume' : 'Skill Extractor',
      onClick: onExploreAi
    },
    {
      id: 'hero-jump-garmin',
      tab: 'map' as const,
      activeClass: 'active-map',
      ariaLabel: 'Jump to Garmin FIT Geospatial Telemetry section',
      title: 'Click to jump to Garmin FIT Telemetry Visualizer',
      label: '04 / Telemetry',
      subtitle: workspaceMode === 'personal' ? 'Upload .FIT / .GPX' : 'Garmin Geospatial',
      onClick: onExploreMap
    }
  ];

  return (
    <div className="glass-panel profile-hero-panel">
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
              <>
                <button
                  type="button"
                  onClick={() => exportPrintableResume({ workspaceMode: 'personal', profile })}
                  className="btn-primary"
                  id="hero-personal-resume-pdf-btn"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <Download size={15} />
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
                  <ExternalLink size={12} style={{ opacity: 0.7 }} />
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
                  <ExternalLink size={12} style={{ opacity: 0.7 }} />
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
                  <ExternalLink size={12} style={{ opacity: 0.8 }} />
                </a>

                <button
                  type="button"
                  onClick={() => exportPrintableResume({ workspaceMode: 'portfolio', profile })}
                  className="btn-secondary"
                  id="hero-resume-pdf-btn"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  <Download size={15} color="var(--accent-crimson)" />
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
                  <ExternalLink size={12} style={{ opacity: 0.7 }} />
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Architectural Index Grid */}
      <div className="hero-metrics-grid" style={{ marginTop: '20px' }}>
        {indexCards.map((card) => {
          const isActive = activeTab === card.tab;
          return (
            <div
              key={card.id}
              id={card.id}
              role="button"
              tabIndex={0}
              aria-label={card.ariaLabel}
              onClick={card.onClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  card.onClick();
                }
              }}
              className={`hero-metric-card ${isActive ? card.activeClass : ''}`}
              title={card.title}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: isActive ? 'var(--accent-crimson)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  {card.label}
                </span>
                {isActive ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', background: 'var(--accent-crimson)', color: '#ffffff', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    ACTIVE <ChevronDown size={11} />
                  </span>
                ) : (
                  <span className="hero-card-cta" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-primary)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s ease' }}>
                    OPEN <ChevronDown size={11} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: card.tab === 'map' ? '1.02rem' : '1.08rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {card.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      <ProfileEditModal
        isOpen={isEditingProfile}
        profile={profile}
        currentSlug={currentSlug}
        onClose={() => setIsEditingProfile(false)}
        onSave={onSaveCustomProfile}
      />
    </div>
  );
};
