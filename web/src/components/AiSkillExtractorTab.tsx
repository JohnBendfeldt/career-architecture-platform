import React, { useEffect, useState } from 'react';
import { Sparkles, BookOpen, ExternalLink, RefreshCw, CheckCircle, Zap, Check } from 'lucide-react';
import { YoutubeIcon } from './Icons';
import { ApiService } from '../services/api';
import type { LearningResource } from '../types';

export const AiSkillExtractorTab: React.FC = () => {
  const [inputText, setInputText] = useState(
    `Looking for a Senior Full-Stack Software Engineer with deep expertise in C# .NET (Core, 6, 10), React, TypeScript, and modernizing enterprise SaaS codebases. The candidate should have proven experience building scalable Web APIs, microservice gateways with YARP, CI/CD pipelines in Azure DevOps, Docker containerization, and robust database design.`
  );

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([
    'C# & .NET 10',
    'React & TypeScript',
    'Enterprise Codebase Modernization',
    'Azure DevOps & CI/CD',
    'Microservices & System Architecture'
  ]);

  const [activeSkill, setActiveSkill] = useState<string>('C# & .NET 10');
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Load resources when active skill changes
  useEffect(() => {
    let mounted = true;
    setLoadingResources(true);
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
      const skills = await ApiService.extractSkills(inputText);
      if (skills && skills.length > 0) {
        setExtractedSkills(skills);
        setActiveSkill(skills[0]);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={24} color="var(--accent-violet)" />
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            AI Skill Extraction & Automated Curriculum
          </h2>
          <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
            Gemini & .NET 10 Minimal API
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Extract structured skills from candidate resume text or career ambitions, then dynamically query YouTube Data API v3 and Udemy for top-tier learning resources.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px' }}>
        {/* Left Column: Text Input & Skill Chips */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <span>Resume Bio or Job Spec Description</span>
            <span style={{ color: 'var(--accent-cyan)' }}>POST /api/skills/extract</span>
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              color: '#ffffff',
              fontFamily: 'var(--font-body)',
              fontSize: '0.88rem',
              lineHeight: 1.5,
              resize: 'vertical',
              marginBottom: '16px'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Outputs strict JSON string array schema
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
                  <span>Extracting via .NET 10 API...</span>
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
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
              Extracted Skill Tokens ({extractedSkills.length}) • Click to query feed
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {extractedSkills.map((skill, sIdx) => {
                const isActive = activeSkill === skill;
                return (
                  <button
                    key={sIdx}
                    onClick={() => setActiveSkill(skill)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: isActive ? '1.5px solid var(--accent-violet)' : '1px solid var(--border-subtle)',
                      background: isActive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isActive && <CheckCircle size={13} color="var(--accent-violet)" />}
                    <span>{skill}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Curated Learning Pathways */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                  GET /api/resources
                </span>
                <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginTop: '4px' }}>
                  {activeSkill}
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Top 3 Recommended
              </span>
            </div>

            {loadingResources ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.85rem' }}>Querying YouTube Data API & Learning Catalogs...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {resources.map((res, rIdx) => (
                  <a
                    key={rIdx}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: res.provider === 'YouTube' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {res.provider === 'YouTube' ? (
                          <YoutubeIcon size={20} color="#f87171" />
                        ) : (
                          <BookOpen size={20} color="#c084fc" />
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {res.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>{res.author}</span>
                          <span>•</span>
                          <span>{res.duration}</span>
                          <span>•</span>
                          <span style={{ color: 'var(--accent-cyan)' }}>{res.badge}</span>
                        </div>
                      </div>
                    </div>

                    <ExternalLink size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div style={{
            marginTop: '20px',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              Extracted skills query YouTube Data API v3 asynchronously with 24h memory caching
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Active <Check size={13} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
