import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, SlidersHorizontal, LayoutGrid } from 'lucide-react';

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
  description: string;
}

export const FeatureTabs: React.FC<FeatureTabsProps> = ({
  activeTab,
  onChangeTab,
  goalsCount,
  workspaceMode = 'portfolio'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [forceDropdown, setForceDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const tabs: TabConfig[] = [
    {
      id: 'experience',
      label: 'Professional Experience & Resume',
      shortLabel: 'Experience & Resume',
      badge: workspaceMode === 'personal' ? 'My Roles' : '4 Roles',
      description: 'Enterprise roles, contracts, .NET 10 microservices, and verified credentials'
    },
    {
      id: 'dashboard',
      label: 'Engineering Goals & Milestones',
      shortLabel: 'Goals & Milestones',
      badge: `${goalsCount} Goals`,
      description: 'Active technical initiatives, enterprise SaaS features, and personal milestones'
    },
    {
      id: 'ai',
      label: 'AI Skill Extraction Pipeline',
      shortLabel: 'AI Skill Pipeline',
      badge: 'Gemini',
      description: 'Automated skill extraction from job postings and curated learning playlists'
    },
    {
      id: 'map',
      label: 'Garmin Geospatial Visualizer',
      shortLabel: 'Garmin Geospatial',
      badge: 'FIT & GPS',
      description: 'Garmin binary FIT telemetry decoded into interactive GPS polylines and elevation splits'
    }
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

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

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const targetTab = tabs[nextIndex];
      onChangeTab(targetTab.id);
      tabRefs.current[nextIndex]?.focus();
    }
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
      {/* 1. DESKTOP VIEW: WAI-ARIA Editorial Tablist */}
      {!forceDropdown && (
        <div className="feature-tabs-desktop">
          <div
            role="tablist"
            aria-label="Portfolio sections"
            className="editorial-tablist"
          >
            {tabs.map((tab, index) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onChangeTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className="editorial-tab"
                >
                  <span>{tab.shortLabel}</span>
                  <span className="editorial-tab-count">
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Compact Dropdown Mode Toggle */}
          <button
            type="button"
            onClick={() => setForceDropdown(true)}
            title="Switch to Dropdown View"
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              marginBottom: '6px',
              flexShrink: 0
            }}
          >
            <SlidersHorizontal size={13} aria-hidden="true" />
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
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)'
          }}>
            Select Portfolio View
          </div>
          {forceDropdown && (
            <button
              type="button"
              onClick={() => setForceDropdown(false)}
              className="btn-secondary"
              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
            >
              <LayoutGrid size={13} aria-hidden="true" />
              <span>Tabs View</span>
            </button>
          )}
        </div>

        {/* Dropdown Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          style={{
            width: '100%',
            padding: '14px 18px',
            background: 'var(--bg-surface)',
            border: `1px solid ${isOpen ? 'var(--text-primary)' : 'var(--border-control)'}`,
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            transition: 'border-color 0.15s ease',
            textAlign: 'left'
          }}
        >
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
              <span className="badge badge-cyan">
                {currentTab.badge}
              </span>
            </div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              marginTop: '3px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {currentTab.description}
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-secondary)',
            flexShrink: 0
          }}>
            <ChevronDown
              size={18}
              aria-hidden="true"
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </div>
        </button>

        {/* Dropdown Menu Popover */}
        {isOpen && (
          <div
            role="listbox"
            aria-label="Portfolio sections"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 1000,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-control)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '6px',
              animation: 'fadeInUp 0.15s ease-out'
            }}
          >
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(tab.id)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? '1px solid var(--border-control)' : '1px solid transparent',
                    background: isSelected ? 'var(--bg-inset)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    textAlign: 'left',
                    marginBottom: '2px'
                  }}
                >
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
                      <span className="badge badge-cyan">
                        {tab.badge}
                      </span>
                    </div>
                    <div style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                      marginTop: '2px'
                    }}>
                      {tab.description}
                    </div>
                  </div>

                  {isSelected && (
                    <span style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'var(--text-primary)',
                      color: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Check size={13} strokeWidth={3} aria-hidden="true" />
                    </span>
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

