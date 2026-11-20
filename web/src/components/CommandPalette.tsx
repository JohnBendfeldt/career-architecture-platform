import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  ArrowRight,
  Compass,
  Sun,
  Moon,
  Cpu,
  Map as MapIcon,
  Target,
  Briefcase,
  Sparkles,
  Download,
  Timer,
  Layers,
  LogIn,
  ArrowLeftRight,
  X,
} from 'lucide-react';
import { ModalDialog } from './ui/ModalDialog';
import type { TabType } from './FeatureTabs';

export interface CommandPaletteAction {
  id: string;
  label: string;
  description: string;
  category: 'Navigate' | 'Signature Tools' | 'Workspace';
  keywords: string[];
  shortcut?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  workspaceMode: 'portfolio' | 'personal';
  canSwitchWorkspace: boolean;
  isAuthenticated: boolean;
  onSelectTab: (tab: TabType) => void;
  onToggleTheme: () => void;
  onOpenArchitecture: () => void;
  onExportResume: () => void;
  onStartTour: () => void;
  onOpenFocusTimer: () => void;
  onRunRecruiterMatch: () => void;
  onToggleWorkspaceMode: () => void;
  onOpenLogin: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  theme,
  workspaceMode,
  canSwitchWorkspace,
  isAuthenticated,
  onSelectTab,
  onToggleTheme,
  onOpenArchitecture,
  onExportResume,
  onStartTour,
  onOpenFocusTimer,
  onRunRecruiterMatch,
  onToggleWorkspaceMode,
  onOpenLogin,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = useMemo<CommandPaletteAction[]>(() => {
    const items: CommandPaletteAction[] = [
      {
        id: 'nav-experience',
        label: 'Experience & Resume',
        description: 'Inspect engineering roles, credentials, and verified impact',
        category: 'Navigate',
        keywords: ['resume', 'experience', 'timeline', 'cv', 'jobs', 'history'],
        shortcut: '01',
        icon: <Briefcase size={15} aria-hidden="true" />,
        onSelect: () => onSelectTab('experience'),
      },
      {
        id: 'nav-dashboard',
        label: 'Goals, Analytics & Study Log',
        description: 'Track annual goal pace, monthly charts, and tandem hours',
        category: 'Navigate',
        keywords: ['goals', 'hours', 'analytics', 'milestones', 'dashboard', 'excel', 'csv'],
        shortcut: '02',
        icon: <Target size={15} aria-hidden="true" />,
        onSelect: () => onSelectTab('dashboard'),
      },
      {
        id: 'nav-ai',
        label: 'AI Skill Extraction Pipeline',
        description: 'Paste a job description for Gemini skill extraction & match brief',
        category: 'Navigate',
        keywords: ['ai', 'gemini', 'skills', 'recruiter', 'job', 'match', 'scorecard'],
        shortcut: '03',
        icon: <Sparkles size={15} aria-hidden="true" />,
        onSelect: () => onSelectTab('ai'),
      },
      {
        id: 'nav-map',
        label: 'Garmin Geospatial Visualizer',
        description: 'Replay GPS routes, scrub elevation profiles, and inspect splits',
        category: 'Navigate',
        keywords: ['map', 'garmin', 'fit', 'gpx', 'cycling', 'telemetry', 'replay', 'elevation'],
        shortcut: '04',
        icon: <MapIcon size={15} aria-hidden="true" />,
        onSelect: () => onSelectTab('map'),
      },
      {
        id: 'tool-architecture',
        label: 'Inspect Live System Architecture',
        description: 'Interactive topology of React 19, YARP Gateway, .NET 10, Gemini & FIT SDK',
        category: 'Signature Tools',
        keywords: ['architecture', 'diagram', 'yarp', 'dotnet', 'microservices', 'system', 'trace'],
        icon: <Layers size={15} aria-hidden="true" />,
        onSelect: onOpenArchitecture,
      },
      {
        id: 'tool-recruiter-match',
        label: 'Run Recruiter .NET / React Job Match',
        description: 'Open AI Pipeline with sample Senior Full-Stack JD & copyable match brief',
        category: 'Signature Tools',
        keywords: ['recruiter', 'jd', 'hiring', 'brief', 'match', 'score'],
        icon: <Cpu size={15} aria-hidden="true" />,
        onSelect: onRunRecruiterMatch,
      },
      {
        id: 'tool-focus-timer',
        label: 'Launch Focus Study Timer',
        description: 'Time a deep-work session and log exact hours straight to your ledger',
        category: 'Signature Tools',
        keywords: ['timer', 'pomodoro', 'study', 'focus', 'stopwatch', 'hours'],
        icon: <Timer size={15} aria-hidden="true" />,
        onSelect: onOpenFocusTimer,
      },
      {
        id: 'tool-resume-pdf',
        label: 'Export ATS-Ready PDF Resume',
        description: 'Generate a clean printable executive resume with zero inline scripts',
        category: 'Signature Tools',
        keywords: ['pdf', 'print', 'download', 'resume', 'export'],
        icon: <Download size={15} aria-hidden="true" />,
        onSelect: onExportResume,
      },
      {
        id: 'pref-theme',
        label: theme === 'light' ? 'Switch to Carbon Dark Mode' : 'Switch to Paper & Ink Light Mode',
        description: 'Toggle WCAG 2.2 AA/AAA editorial theme across UI and map tiles',
        category: 'Workspace',
        keywords: ['theme', 'dark', 'light', 'color', 'contrast'],
        icon: theme === 'light' ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />,
        onSelect: onToggleTheme,
      },
      {
        id: 'pref-tour',
        label: 'Start Interactive Platform Guide',
        description: '3-step walkthrough of goals, AI pipeline, and Garmin telemetry',
        category: 'Workspace',
        keywords: ['tour', 'guide', 'help', 'walkthrough'],
        icon: <Compass size={15} aria-hidden="true" />,
        onSelect: onStartTour,
      },
    ];

    if (canSwitchWorkspace) {
      items.push({
        id: 'pref-workspace',
        label: workspaceMode === 'portfolio' ? 'Switch to My Personal Workspace' : "Switch to John's Portfolio",
        description: 'Toggle between read-only portfolio preview and your isolated workspace',
        category: 'Workspace',
        keywords: ['workspace', 'personal', 'portfolio', 'profile', 'switch'],
        icon: <ArrowLeftRight size={15} aria-hidden="true" />,
        onSelect: onToggleWorkspaceMode,
      });
    } else if (!isAuthenticated) {
      items.push({
        id: 'pref-signin',
        label: 'Sign In / Build Your Own Workspace',
        description: 'Unlock GitHub, Google, or Microsoft OAuth with isolated personal data',
        category: 'Workspace',
        keywords: ['login', 'sign in', 'oauth', 'account', 'workspace'],
        icon: <LogIn size={15} aria-hidden="true" />,
        onSelect: onOpenLogin,
      });
    }

    return items;
  }, [
    theme,
    workspaceMode,
    canSwitchWorkspace,
    isAuthenticated,
    onSelectTab,
    onToggleTheme,
    onOpenArchitecture,
    onExportResume,
    onStartTour,
    onOpenFocusTimer,
    onRunRecruiterMatch,
    onToggleWorkspaceMode,
    onOpenLogin,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((item) => {
      const hay = `${item.label} ${item.description} ${item.category} ${item.keywords.join(' ')}`.toLowerCase();
      return q.split(/\s+/).every((part) => hay.includes(part));
    });
  }, [actions, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex((prev) => {
      if (filtered.length === 0) return 0;
      return Math.min(prev, filtered.length - 1);
    });
  }, [filtered.length]);

  const executeAction = (action: CommandPaletteAction) => {
    onClose();
    action.onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      }
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      executeAction(filtered[selectedIndex]);
    }
  };

  const grouped = useMemo(() => {
    const groups: Array<{ category: CommandPaletteAction['category']; items: Array<{ action: CommandPaletteAction; flatIndex: number }> }> = [];
    const order: CommandPaletteAction['category'][] = ['Navigate', 'Signature Tools', 'Workspace'];
    let flatIndex = 0;
    for (const cat of order) {
      const matching = filtered.filter((a) => a.category === cat);
      if (matching.length > 0) {
        groups.push({
          category: cat,
          items: matching.map((action) => ({ action, flatIndex: flatIndex++ })),
        });
      }
    }
    return groups;
  }, [filtered]);

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="command-palette-title"
      maxWidth="600px"
      padding="0"
    >
      <div className="command-palette-shell">
        <div className="command-palette-header">
          <h2 id="command-palette-title" className="sr-only">
            Quick Command Palette
          </h2>
          <Search size={18} aria-hidden="true" style={{ color: 'var(--accent-crimson)', flexShrink: 0 }} />
          <label htmlFor="command-palette-input" className="sr-only">
            Search commands, tabs, and tools
          </label>
          <input
            ref={inputRef}
            id="command-palette-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Jump to a section, inspect architecture, start study timer..."
            className="command-palette-input"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="Close command palette"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="command-palette-list" role="listbox" aria-label="Available commands">
          {grouped.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No matching commands for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category} style={{ marginBottom: '10px' }}>
                <div className="command-palette-group-label">{group.category}</div>
                {group.items.map(({ action, flatIndex }) => {
                  const isActive = flatIndex === selectedIndex;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      onClick={() => executeAction(action)}
                      className={`command-palette-item ${isActive ? 'is-active' : ''}`}
                    >
                      <span className="command-palette-icon">{action.icon}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {action.label}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {action.description}
                        </span>
                      </span>
                      {action.shortcut ? (
                        <span className="kbd-pill">{action.shortcut}</span>
                      ) : (
                        <ArrowRight size={14} aria-hidden="true" style={{ color: isActive ? 'var(--accent-crimson)' : 'var(--text-muted)', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <span>
            <kbd className="kbd-pill">↑</kbd> <kbd className="kbd-pill">↓</kbd> Navigate
          </span>
          <span>
            <kbd className="kbd-pill">Enter</kbd> Execute
          </span>
          <span>
            <kbd className="kbd-pill">Esc</kbd> Close
          </span>
        </div>
      </div>
    </ModalDialog>
  );
};
