import React from 'react';
import { BookOpen, ExternalLink, RefreshCw, Check, Plus, Clock, ArrowRight } from 'lucide-react';
import { YoutubeIcon } from '../Icons';
import type { Goal, LearningResource } from '../../types';
import { evaluatePortfolioSkillMatch } from './RecruiterScorecard';
import { sanitizeExternalUrl } from '../../utils/security';
import { formatEntryHours } from '../../utils/advancementUtils';

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
  onNavigateToGoals
}) => {
  const activeSkillMatch = evaluatePortfolioSkillMatch(activeSkill);

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '440px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
          <div>
            <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
              2. SKILL EVIDENCE &amp; CURATED STUDY SEARCHES
            </span>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '4px' }}>
              {activeSkill}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {onTargetHoursChange && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.72rem',
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
                    width: '48px',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.74rem',
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
              style={{ padding: '6px 12px', fontSize: '0.76rem' }}
              title="Save this skill pathway as a tracked milestone in Goals & Milestones"
            >
              <Plus size={13} color="var(--accent-crimson)" />
              <span>Track as Goal</span>
            </button>
          </div>
        </div>

        {linkedGoal && (
          <div style={{
            padding: '10px 12px',
            marginBottom: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            fontSize: '0.78rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: 'var(--text-primary)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                Linked Tandem Goal:
              </span>
              <span style={{ fontWeight: 600 }}>{linkedGoal.title}</span>
              {typeof linkedGoal.targetHours === 'number' && linkedGoal.targetHours > 0 ? (
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                  {formatEntryHours(linkedGoal.loggedHours ?? 0)} / {formatEntryHours(linkedGoal.targetHours)} hrs ({linkedGoal.progress}%)
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                  {linkedGoal.progress}%
                </span>
              )}
            </div>
            {onNavigateToGoals && (
              <button
                type="button"
                onClick={onNavigateToGoals}
                className="btn-secondary"
                style={{ padding: '4px 9px', fontSize: '0.72rem' }}
              >
                <span>View in Goals</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}

        {workspaceMode === 'portfolio' && (
          <div style={{
            padding: '12px 14px',
            marginBottom: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-primary)',
            borderLeft: `3px solid ${activeSkillMatch.matched ? '#16a34a' : 'var(--accent-crimson)'}`,
            borderTop: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45
          }}>
            {activeSkillMatch.evidence}
          </div>
        )}

        {savedNotice && (
          <div style={{
            padding: '8px 12px',
            marginBottom: '12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--accent-crimson)',
            fontSize: '0.78rem',
            color: 'var(--text-primary)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <span>{savedNotice}</span>
            {onNavigateToGoals && (
              <button
                type="button"
                onClick={onNavigateToGoals}
                className="btn-secondary"
                style={{ padding: '4px 9px', fontSize: '0.72rem', flexShrink: 0 }}
              >
                <span>Open Goals &amp; Log</span>
                <ArrowRight size={12} />
              </button>
            )}
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
              backdropFilter: 'blur(2px)',
              borderRadius: 'var(--radius-md)',
              zIndex: 2,
              gap: '8px',
              color: 'var(--text-muted)'
            }}>
              <RefreshCw size={22} className="animate-spin" color="var(--accent-crimson)" />
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
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    transition: 'all 0.2s'
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
                        borderRadius: '10px',
                        background: res.provider === 'YouTube' ? 'rgba(230, 0, 18, 0.1)' : 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {res.provider === 'YouTube' ? (
                          <YoutubeIcon size={20} color="#E60012" />
                        ) : (
                          <BookOpen size={20} color="var(--text-primary)" />
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {res.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: '4px',
                            background: res.provider === 'YouTube' ? 'rgba(230, 0, 18, 0.1)' : 'var(--bg-card)',
                            color: res.provider === 'YouTube' ? '#E60012' : 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)'
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
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                            {res.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                      <span>{isSearchUrl ? `Search ${res.provider}` : `Open ${res.provider}`}</span>
                      <ExternalLink size={14} />
                    </div>
                  </a>

                  {onLogResourceHours && (
                    <button
                      type="button"
                      onClick={() => onLogResourceHours(res)}
                      className="btn-secondary"
                      aria-label={`Log hours for ${res.title}`}
                      title="Log study hours for this resource toward your Career Advancement & Tandem Goals"
                      style={{ padding: '6px 11px', fontSize: '0.74rem', flexShrink: 0 }}
                    >
                      <Clock size={13} color="var(--accent-crimson)" />
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
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
          Each card launches a targeted {activeSkill} search paired with vetted engineering instructors so links never go stale for custom skills.
        </span>
        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          Live Links <Check size={13} />
        </span>
      </div>
    </div>
  );
};
