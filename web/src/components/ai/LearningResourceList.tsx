import React from 'react';
import { BookOpen, ExternalLink, RefreshCw, Check, Plus, Clock, ArrowRight, LogIn, UserCheck } from 'lucide-react';
import { YoutubeIcon } from '../Icons';
import type { Goal, LearningResource } from '../../types';
import { evaluatePortfolioSkillMatch } from './RecruiterScorecard';
import { sanitizeExternalUrl } from '../../utils/security';
import { formatEntryHours } from '../../utils/advancementUtils';
import { ReadOnlyPortfolioBanner } from '../goals/ReadOnlyPortfolioBanner';

interface LearningResourceListProps {
  workspaceMode: 'portfolio' | 'personal';
  activeSkill: string;
  resources: LearningResource[];
  loadingResources: boolean;
  savedNotice: string | null;
  onSaveSkillAsGoal: () => void;
  targetHours?: number;
  onTargetHoursChange?: (hours: number) => void;
  linkedGoal?: Goal | null;
  onLogResourceHours?: (resource: LearningResource) => void;
  onNavigateToGoals?: () => void;
  canEdit?: boolean;
  onOpenLogin?: () => void;
  onSwitchToPersonal?: () => void;
}

export const LearningResourceList: React.FC<LearningResourceListProps> = ({
  workspaceMode,
  activeSkill,
  resources,
  loadingResources,
  savedNotice,
  onSaveSkillAsGoal,
  targetHours,
  onTargetHoursChange,
  linkedGoal,
  onLogResourceHours,
  onNavigateToGoals,
  canEdit = true,
  onOpenLogin,
  onSwitchToPersonal
}) => {
  const activeSkillMatch = evaluatePortfolioSkillMatch(activeSkill);

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '440px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <div className="section-eyebrow">
              2. Skill Evidence &amp; Curated Study Searches
            </div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>
              {activeSkill}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {onTargetHoursChange && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 9px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.76rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)'
              }}>
                <label htmlFor="ai-goal-target-hours" style={{ fontWeight: 600 }}>
                  Target
                </label>
                <input
                  id="ai-goal-target-hours"
                  aria-label="Target hours for skill goal"
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  value={targetHours ?? 12}
                  onChange={(e) =>
                    onTargetHoursChange(Math.max(1, Math.min(500, Number(e.target.value) || 12)))
                  }
                  style={{
                    width: '52px',
                    padding: '3px 5px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-control)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right'
                  }}
                />
                <span>hrs</span>
              </div>
            )}
            <button
              type="button"
              onClick={onSaveSkillAsGoal}
              className="btn-secondary"
              style={{ minHeight: '34px', padding: '6px 12px', fontSize: '0.78rem' }}
              title="Save this skill pathway as a tracked milestone in Goals & Milestones"
            >
              <Plus size={13} aria-hidden="true" style={{ color: 'var(--accent-crimson)' }} />
              <span>Track as Goal</span>
            </button>
          </div>
        </div>

        {!canEdit && (
          <div style={{ marginBottom: '12px' }}>
            <ReadOnlyPortfolioBanner
              context="ai"
              onOpenLogin={onOpenLogin}
              onSwitchToPersonal={onSwitchToPersonal}
            />
          </div>
        )}

        {linkedGoal && (
          <div
            className="callout-banner"
            style={{
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
              fontSize: '0.8rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: 'var(--text-primary)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Linked Tandem Goal:
              </span>
              <span style={{ fontWeight: 600 }}>{linkedGoal.title}</span>
              {typeof linkedGoal.targetHours === 'number' && linkedGoal.targetHours > 0 ? (
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {formatEntryHours(linkedGoal.loggedHours ?? 0)} / {formatEntryHours(linkedGoal.targetHours)} hrs ({linkedGoal.progress}%)
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {linkedGoal.progress}%
                </span>
              )}
            </div>
            {onNavigateToGoals && (
              <button
                type="button"
                onClick={onNavigateToGoals}
                className="btn-secondary"
                style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem' }}
              >
                <span>View in Goals</span>
                <ArrowRight size={12} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {workspaceMode === 'portfolio' && (
          <div style={{
            padding: '12px 14px',
            marginBottom: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-inset)',
            borderLeft: `3px solid ${activeSkillMatch.matched ? 'var(--status-success)' : 'var(--accent-crimson)'}`,
            borderTop: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}>
            {activeSkillMatch.evidence}
          </div>
        )}

        {savedNotice && (
          <div
            role="status"
            style={{
              padding: '10px 12px',
              marginBottom: '12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-inset)',
              border: '1px solid var(--accent-crimson-border)',
              fontSize: '0.8rem',
              color: 'var(--text-primary)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap'
            }}
          >
            <span>{savedNotice}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {!canEdit && onSwitchToPersonal && (
                <button
                  type="button"
                  onClick={onSwitchToPersonal}
                  className="btn-primary"
                  style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  <UserCheck size={12} aria-hidden="true" />
                  <span>Switch to My Profile</span>
                </button>
              )}
              {!canEdit && !onSwitchToPersonal && onOpenLogin && (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="btn-primary"
                  style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  <LogIn size={12} aria-hidden="true" />
                  <span>Sign In / Build Your Own</span>
                </button>
              )}
              {onNavigateToGoals && (
                <button
                  type="button"
                  onClick={onNavigateToGoals}
                  className="btn-secondary"
                  style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  <span>Open Goals &amp; Log</span>
                  <ArrowRight size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ position: 'relative', minHeight: '270px' }}>
          {loadingResources && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              zIndex: 2,
              gap: '8px',
              color: 'var(--text-muted)'
            }}>
              <RefreshCw size={22} aria-hidden="true" className="animate-spin" style={{ color: 'var(--accent-crimson)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Building study search links...</span>
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            opacity: loadingResources ? 0.35 : 1,
            transition: 'opacity 0.2s ease',
            pointerEvents: loadingResources ? 'none' : 'auto'
          }}>
            {resources.map((res, rIdx) => {
              const safeUrl = sanitizeExternalUrl(res.url, 'https://www.youtube.com');
              const isSearchUrl = safeUrl.includes('results?search_query=') || safeUrl.includes('/courses/search/');
              return (
                <div
                  key={rIdx}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-inset)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-md)',
                        background: res.provider === 'YouTube' ? 'var(--accent-crimson-tint)' : 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {res.provider === 'YouTube' ? (
                          <YoutubeIcon size={20} color="var(--accent-crimson)" />
                        ) : (
                          <BookOpen size={19} aria-hidden="true" style={{ color: 'var(--text-primary)' }} />
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {res.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '1px 7px',
                            borderRadius: 'var(--radius-sm)',
                            background: res.provider === 'YouTube' ? 'var(--accent-crimson-tint)' : 'var(--bg-surface)',
                            color: res.provider === 'YouTube' ? 'var(--accent-crimson)' : 'var(--text-primary)',
                            border: res.provider === 'YouTube' ? '1px solid var(--accent-crimson-border)' : '1px solid var(--border-subtle)'
                          }}>
                            {res.provider}
                          </span>
                          <span>{res.author}</span>
                          {res.duration && (
                            <>
                              <span>•</span>
                              <span>{res.duration}</span>
                            </>
                          )}
                          <span>•</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            {res.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                      <span>{isSearchUrl ? `Search ${res.provider}` : `Open ${res.provider}`}</span>
                      <ExternalLink size={14} aria-hidden="true" />
                    </div>
                  </a>

                  {onLogResourceHours && (
                    <button
                      type="button"
                      onClick={() => onLogResourceHours(res)}
                      className="btn-secondary"
                      aria-label={`Log hours for ${res.title}`}
                      title="Log study hours for this resource toward your Career Advancement & Tandem Goals"
                      style={{ minHeight: '32px', padding: '5px 11px', fontSize: '0.76rem', flexShrink: 0 }}
                    >
                      <Clock size={13} aria-hidden="true" style={{ color: 'var(--accent-crimson)' }} />
                      <span>Log Hours</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-inset)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Each card launches a targeted {activeSkill} search paired with vetted engineering instructors so links never go stale for custom skills.
        </span>
        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--status-success)', display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <span>Live Links</span>
          <Check size={13} aria-hidden="true" />
        </span>
      </div>
    </div>
  );
};
