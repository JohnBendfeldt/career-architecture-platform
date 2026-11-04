import React, { useState, useRef, useEffect } from 'react';
import { Briefcase, Layers, Sparkles, Activity, ChevronDown, Check, SlidersHorizontal, LayoutGrid } from 'lucide-react';

export type TabType = 'experience' | 'dashboard' | 'ai' | 'map';

interface FeatureTabsProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  goalsCount: number;
  workspaceMode?: 'portfolio' | 'personal';
}

interface TabConfig {
  id: TabType;
  label: string;
  shortLabel: string;
  badge: string;
  badgeClass: string;
  icon: React.ReactNode;
  accent: string;
  description: string;
}

export const FeatureTabs: React.FC<FeatureTabsProps> = ({ activeTab, onChangeTab, goalsCount, workspaceMode = 'portfolio' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [forceDropdown, setForceDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tabs: TabConfig[] = [
    {
      id: 'experience',
      label: 'Professional Experience & Resume',
      shortLabel: 'Experience & Resume',
      badge: workspaceMode === 'personal' ? 'My Roles' : '4 Roles',
      badgeClass: 'badge-emerald',
      icon: <Briefcase size={16} />,
      accent: 'var(--accent-emerald)',
      description: 'Enterprise roles, contracts, .NET 10 microservices, and verified credentials'
    },
    {
      id: 'dashboard',
      label: 'Engineering Goals & Milestones',
      shortLabel: 'Goals & Milestones',
      badge: `${goalsCount} Goals`,
      badgeClass: 'badge-indigo',
      icon: <Layers size={16} />,
      accent: 'var(--accent-indigo)',
      description: 'Active technical initiatives, enterprise SaaS features, and personal milestones'
    },
    {
      id: 'ai',
      label: 'AI Skill Extraction Pipeline',
      shortLabel: 'AI Skill Pipeline',
      badge: 'Gemini',
      badgeClass: 'badge-cyan',
      icon: <Sparkles size={16} />,
      accent: 'var(--accent-violet)',
      description: 'Automated skill extraction from job postings & curated learning playlists'
    },
    {
      id: 'map',
      label: 'Garmin Geospatial Visualizer',
      shortLabel: 'Garmin Geospatial',
      badge: 'FIT & GPS',
      badgeClass: 'badge-emerald',
      icon: <Activity size={16} />,
      accent: 'var(--accent-cyan)',
      description: 'Garmin binary FIT telemetry decoded into interactive GPS polylines and elevation splits'
    }
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (id: TabType) => {
    onChangeTab(id);
    setIsOpen(false);
  };

  return (
    <div
      id="feature-tabs-navigation"
      style={{
        scrollMarginTop: '90px',
        marginBottom: '28px',
        position: 'relative'
      }}
    >
      {/* 1. DESKTOP VIEW: Tactile, clearly clickable editorial tab cards */}
      {!forceDropdown && (
        <div
          className="feature-tabs-desktop"
          style={{
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => onChangeTab(tab.id)}
                  style={{
                    padding: '8px 12px',
                    background: isActive ? 'var(--bg-card)' : 'var(--bg-surface)',
                    border: isActive ? '1.5px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                    borderTop: isActive ? '3px solid var(--accent-crimson)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 700 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    whiteSpace: 'nowrap',
                    opacity: isActive ? 1 : 0.9
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'var(--text-primary)';
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <span style={{ color: isActive ? 'var(--accent-crimson)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    {tab.icon}
                  </span>
                  <span>{tab.shortLabel}</span>
                  <span className={`badge ${tab.badgeClass}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Dropdown Mode Toggle Pill on Desktop */}
          <button
            onClick={() => setForceDropdown(true)}
            title="Switch to Dropdown View"
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--text-primary)';
              e.currentTarget.style.color = 'var(--bg-surface)';
              e.currentTarget.style.borderColor = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <SlidersHorizontal size={13} />
            <span>Dropdown Mode</span>
          </button>
        </div>
      )}

      {/* 2. DROPDOWN VIEW: Automatically displayed on screens <= 1024px OR when toggled */}
      <div
        className={forceDropdown ? 'feature-tabs-dropdown-forced' : 'feature-tabs-mobile'}
        ref={dropdownRef}
        style={{ position: 'relative' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)'
          }}>
            Select Portfolio View
          </div>
          {forceDropdown && (
            <button
              onClick={() => setForceDropdown(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--text-primary)';
                e.currentTarget.style.color = 'var(--bg-surface)';
                e.currentTarget.style.borderColor = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <LayoutGrid size={12} />
              <span>Tabs View</span>
            </button>
          )}
        </div>

        {/* Dropdown Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          style={{
            width: '100%',
            padding: '14px 18px',
            background: 'var(--bg-card)',
            border: `1.5px solid ${isOpen ? currentTab.accent : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            boxShadow: isOpen ? `0 0 20px ${currentTab.accent}33` : 'var(--shadow-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `${currentTab.accent}22`,
              border: `1px solid ${currentTab.accent}55`,
              color: currentTab.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {currentTab.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.98rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <span>{currentTab.label}</span>
                <span className={`badge ${currentTab.badgeClass}`} style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
                  {currentTab.badge}
                </span>
              </div>
              <div style={{
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {currentTab.description}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-muted)',
            flexShrink: 0
          }}>
            <ChevronDown
              size={20}
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease',
                color: isOpen ? currentTab.accent : 'var(--text-muted)'
              }}
            />
          </div>
        </button>

        {/* Dropdown Menu Popover */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 1000,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: '8px',
              animation: 'fadeInUp 0.18s ease-out'
            }}
          >
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelect(tab.id)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1px solid var(--accent-crimson)' : '1px solid transparent',
                    background: isSelected ? 'var(--bg-primary)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-primary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(230, 0, 18, 0.1)' : 'var(--bg-primary)',
                      border: `1px solid ${isSelected ? 'var(--accent-crimson)' : 'var(--border-subtle)'}`,
                      color: isSelected ? 'var(--accent-crimson)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {tab.icon}
                    </div>
                    <div>
                      <div style={{
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-heading)',
                        fontSize: '0.92rem',
                        fontWeight: isSelected ? 700 : 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <span>{tab.label}</span>
                        <span className={`badge ${tab.badgeClass}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                          {tab.badge}
                        </span>
                      </div>
                      <div style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        marginTop: '2px'
                      }}>
                        {tab.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--accent-crimson)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

