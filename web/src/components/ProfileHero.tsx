import React from 'react';
import type { Profile } from '../types';
import { GithubIcon, LinkedinIcon } from './Icons';
import { MapPin, CheckCircle, ExternalLink, Cpu, Compass, Activity, Briefcase, ChevronDown } from 'lucide-react';

interface ProfileHeroProps {
  profile: Profile;
  activeTab?: 'experience' | 'dashboard' | 'ai' | 'map';
  onExploreTech: () => void;
  onExploreMap: () => void;
  onExploreAi: () => void;
  onExploreResume?: () => void;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  profile,
  activeTab,
  onExploreTech,
  onExploreMap,
  onExploreAi,
  onExploreResume
}) => {
  return (
    <div className="glass-panel" style={{
      padding: '36px',
      marginBottom: '28px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative gradient orb */}
      <div style={{
        position: 'absolute',
        top: -60,
        right: -60,
        width: '260px',
        height: '260px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '32px',
        alignItems: 'center'
      }}>
        {/* Avatar & Badges */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            position: 'relative',
            width: '130px',
            height: '130px',
            borderRadius: 'var(--radius-xl)',
            padding: '4px',
            background: 'var(--primary-gradient)',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 'calc(var(--radius-xl) - 4px)',
                objectFit: 'cover'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: -6,
              right: -6,
              background: '#10b981',
              color: '#ffffff',
              borderRadius: '50%',
              padding: '4px',
              border: '2px solid #07090e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} title="Active & Open to High-Impact Architecture Roles">
              <CheckCircle size={18} />
            </div>
          </div>

          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
              Verified Profile
            </span>
          </div>
        </div>

        {/* Profile Information & Outbound Links */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h1 style={{
              fontSize: '2.4rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.1
            }}>
              {profile.name}
            </h1>
            <span className="badge badge-cyan" style={{ fontSize: '0.8rem', padding: '4px 14px' }}>
              {profile.experienceYears}+ Years Full-Stack Expertise
            </span>
          </div>

          <h2 style={{
            fontSize: '1.2rem',
            fontWeight: 500,
            color: 'var(--accent-cyan)',
            marginBottom: '14px'
          }}>
            {profile.headline}
          </h2>

          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '820px',
            marginBottom: '20px'
          }}>
            {profile.bio}
          </p>

          {/* Location and Protected Outbound Social / Messaging Links */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <MapPin size={15} color="var(--accent-indigo)" />
              <span>{profile.location}</span>
            </div>

            {/* Outbound GitHub button */}
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              id="hero-github-link"
              style={{ padding: '8px 18px', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' }}
            >
              <GithubIcon size={17} />
              <span style={{ fontWeight: 600 }}>github.com/johnbendfeldt</span>
              <ExternalLink size={13} style={{ opacity: 0.7 }} />
            </a>

            {/* Outbound LinkedIn button */}
            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
              id="hero-linkedin-link"
              style={{ padding: '8px 18px', background: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.35)' }}
            >
              <LinkedinIcon size={17} />
              <span style={{ fontWeight: 600 }}>Message on LinkedIn</span>
              <ExternalLink size={13} style={{ opacity: 0.7 }} />
            </a>
          </div>

          {/* Quick Metrics & Feature Jump Links */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            paddingTop: '18px',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            {/* Career History */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={16} color="var(--accent-emerald)" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Career History
                  </span>
                </div>
                {activeTab === 'experience' ? (
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    Active <ChevronDown size={12} />
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.7 }}>
                    View <ChevronDown size={12} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                4 Roles • 4 Certs
              </div>
            </div>

            {/* Active Goals */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={16} color="var(--accent-indigo)" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Active Goals
                  </span>
                </div>
                {activeTab === 'dashboard' ? (
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    Active <ChevronDown size={12} />
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.7 }}>
                    View <ChevronDown size={12} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                6 Core Milestones
              </div>
            </div>

            {/* AI Pipeline */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={16} color="var(--accent-violet)" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    AI Pipeline
                  </span>
                </div>
                {activeTab === 'ai' ? (
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-violet)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    Active <ChevronDown size={12} />
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.7 }}>
                    View <ChevronDown size={12} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Skill Extractor
              </div>
            </div>

            {/* Garmin FIT */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="var(--accent-cyan)" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Garmin FIT
                  </span>
                </div>
                {activeTab === 'map' ? (
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    Active <ChevronDown size={12} />
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.7 }}>
                    View <ChevronDown size={12} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Telemetry Visualizer
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
