import React, { useEffect, useState } from 'react';
import { Sparkles, BookOpen, ExternalLink, RefreshCw, CheckCircle, Zap, Check, Plus } from 'lucide-react';
import { YoutubeIcon } from './Icons';
import { ApiService } from '../services/api';
import type { LearningResource } from '../types';

interface AiSkillExtractorTabProps {
  workspaceMode?: 'portfolio' | 'personal';
  userName?: string;
  onGoalCreated?: () => void;
}

const PORTFOLIO_BIO = `Software Engineer with a track record of building out features and maintaining large scale SaaS applications. Adept at working with diverse cross-functional teams to drive projects from architecture to deployment. Brings 9 years of expertise in full-stack web development, CI/CD pipelines, and modernizing legacy codebases into scalable .NET and React environments.`;

const PERSONAL_SAMPLE_BIO = `We are looking for a Cloud & AI Systems Engineer to design distributed microservices using TypeScript, Node.js, Python, and FastAPI. Ideal candidates have experience with Docker, Kubernetes, PostgreSQL, AWS Cloud Architecture, and building AI Agent & LLM pipelines.`;

const PORTFOLIO_SKILLS = [
  'C# & .NET 10',
  'React & TypeScript',
  'CI/CD Pipelines & Azure DevOps',
  'Legacy Codebase Modernization',
  'AI-Assisted Development'
];

const PERSONAL_SAMPLE_SKILLS = [
  'TypeScript & Node.js',
  'Python & FastAPI',
  'Docker & Kubernetes',
  'AWS Cloud Architecture',
  'AI Agents & LLM Pipelines'
];

export const AiSkillExtractorTab: React.FC<AiSkillExtractorTabProps> = ({
  workspaceMode = 'portfolio',
  userName = 'My',
  onGoalCreated
}) => {
  const [inputText, setInputText] = useState(
    workspaceMode === 'personal' ? PERSONAL_SAMPLE_BIO : PORTFOLIO_BIO
  );

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>(
    workspaceMode === 'personal' ? PERSONAL_SAMPLE_SKILLS : PORTFOLIO_SKILLS
  );

  const [activeSkill, setActiveSkill] = useState<string>(
    workspaceMode === 'personal' ? PERSONAL_SAMPLE_SKILLS[0] : PORTFOLIO_SKILLS[0]
  );
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [extractionMeta, setExtractionMeta] = useState<{ source?: string; model?: string } | null>(null);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Switch sample text and skills when workspaceMode changes
  useEffect(() => {
    if (workspaceMode === 'personal') {
      setInputText(PERSONAL_SAMPLE_BIO);
      setExtractedSkills(PERSONAL_SAMPLE_SKILLS);
      setActiveSkill(PERSONAL_SAMPLE_SKILLS[0]);
    } else {
      setInputText(PORTFOLIO_BIO);
      setExtractedSkills(PORTFOLIO_SKILLS);
      setActiveSkill(PORTFOLIO_SKILLS[0]);
    }
  }, [workspaceMode]);

  // Load resources when active skill changes
  useEffect(() => {
    let mounted = true;
    setLoadingResources(true);
    setSavedNotice(null);
    ApiService.getLearningResources(activeSkill).then((data) => {
      if (mounted) {
        setResources(data);
        setLoadingResources(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [activeSkill]);

  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      const res = await ApiService.extractSkills(inputText);
      if (res.skills && res.skills.length > 0) {
        setExtractedSkills(res.skills);
        setActiveSkill(res.skills[0]);
        setExtractionMeta({ source: res.source, model: res.model });
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    if (!extractedSkills.includes(trimmed)) {
      setExtractedSkills(prev => [trimmed, ...prev]);
    }
    setActiveSkill(trimmed);
    setCustomSkillInput('');
  };

  const handleSaveSkillAsGoal = async () => {
    const res = await ApiService.createGoal({
      title: `Master ${activeSkill}`,
      description: `Curated learning pathway for ${activeSkill} via YouTube architecture deep-dives and Udemy enterprise courses.`,
      category: 'Technical',
      progress: 15,
      targetDate: 'Q4 2026',
      status: 'InProgress',
      tags: [activeSkill, 'AI Curriculum', 'Skill Pipeline']
    });
    setSavedNotice(res.message);
    if (res.success && onGoalCreated) {
      onGoalCreated();
    }
  };

  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Sparkles size={24} color="var(--accent-violet)" />
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            {workspaceMode === 'personal'
              ? `${userName}'s AI Skill Extractor & Study Planner`
              : 'AI Skill Extraction & Automated Curriculum'}
          </h2>
          <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
            SKILL GAP & STUDY PLANNER
          </span>
        </div>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Paste a job description or resume to extract required skills, launch targeted instructor searches, or save skills to your Goals board.
        </p>
      </div>

      <div className="ai-extractor-grid">
        {/* Left Column: Text Input & Skill Chips */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
            <span>1. Job Description or Resume Bio</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>Step 1 of 2</span>
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.88rem',
              lineHeight: 1.5,
              resize: 'vertical',
              marginBottom: '16px'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Identifies languages, frameworks, cloud tools &amp; architecture patterns
            </span>
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="btn-primary"
              id="btn-ai-extract"
              style={{ padding: '10px 20px', fontSize: '0.85rem' }}
            >
              {isExtracting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Extracting Skills...</span>
                </>
              ) : (
                <>
                  <Zap size={15} />
                  <span>Extract Skills via AI</span>
                </>
              )}
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Extracted Skill Tokens ({extractedSkills.length}) • Click a skill to view study searches
              </div>
              {extractionMeta?.source === 'gemini' && (
                <span className="badge badge-emerald" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={11} /> Live Gemini AI ({extractionMeta.model || 'gemini-3.5-flash-lite'})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {extractedSkills.map((skill, sIdx) => {
                const isActive = activeSkill === skill;
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setActiveSkill(skill)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${isActive ? 'var(--accent-crimson)' : 'var(--border-subtle)'}`,
                      background: isActive ? 'var(--bg-primary)' : 'var(--bg-card)',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{
                      width: '14px',
                      height: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isActive ? (
                        <CheckCircle size={13} color="var(--accent-crimson)" />
                      ) : (
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)' }} />
                      )}
                    </span>
                    <span>{skill}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Custom Skill Builder */}
            <form onSubmit={handleAddCustomSkill} style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                placeholder="Add any custom skill (e.g. Kubernetes, Rust, System Design)..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem'
                }}
              />
              <button type="submit" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                <Plus size={14} />
                <span>Add Skill</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Curated Learning Pathways */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '440px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px', flexWrap: 'wrap' }}>
              <div>
                <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                  2. CURATED STUDY SEARCHES FOR SELECTED SKILL
                </span>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {activeSkill}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSaveSkillAsGoal}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                  title="Save this skill pathway as a tracked milestone in Goals & Milestones"
                >
                  <Plus size={13} color="var(--accent-crimson)" />
                  <span>Track as Goal</span>
                </button>
              </div>
            </div>

            {savedNotice && (
              <div style={{
                padding: '8px 12px',
                marginBottom: '12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--accent-crimson)',
                fontSize: '0.78rem',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}>
                {savedNotice}
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
                  const isSearchUrl = res.url.includes('results?search_query=') || res.url.includes('/courses/search/');
                  return (
                    <a
                      key={rIdx}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
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
      </div>
    </div>
  );
};
