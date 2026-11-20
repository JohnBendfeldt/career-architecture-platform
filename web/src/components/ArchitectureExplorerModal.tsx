import React, { useEffect, useState } from 'react';
import {
  X,
  Layers,
  ShieldCheck,
  Play,
  ArrowRight,
  Cpu,
  Database,
  Globe,
  Compass,
  Server,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { ModalDialog } from './ui/ModalDialog';
import type { TabType } from './FeatureTabs';

interface ArchitectureNode {
  id: string;
  title: string;
  subtitle: string;
  runtime: string;
  role: string;
  security: string[];
  artifacts: string[];
  targetTab?: TabType;
  targetLabel?: string;
  icon: React.ReactNode;
}

interface TraceScenario {
  id: string;
  label: string;
  summary: string;
  steps: Array<{ nodeId: string; detail: string; latency: string }>;
}

const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: 'spa',
    title: 'React 19 + Vite 8 SPA',
    subtitle: 'Netlify Edge • Static Bundle',
    runtime: 'React 19.3, TypeScript 7, Vite 8, Leaflet',
    role: 'Serves the zero-latency portfolio shell, isolated Personal Workspaces, synchronized telemetry playback, and browser-native OpenXML spreadsheet codec.',
    security: [
      "Strict CSP (script-src 'self', object-src 'none', frame-ancestors 'none')",
      'WCAG 2.2 AA/AAA contrast gates + automated axe-core CI suite',
      'Safe HTTPS URL allowlisting & prototype-pollution-free storage parsing',
    ],
    artifacts: ['web/src/App.tsx', 'web/src/utils/xlsxCodec.ts', 'web/tests/wcagContrastAndCssTokens.test.ts'],
    targetTab: 'experience',
    targetLabel: 'View Experience & Resume',
    icon: <Globe size={17} aria-hidden="true" />,
  },
  {
    id: 'gemini',
    title: 'Netlify Serverless AI Function',
    subtitle: 'POST /api/skills/extract',
    runtime: 'Node 22 esbuild Function + Gemini Structured JSON',
    role: 'Extracts normalized technical skills from pasted job descriptions or resumes with deterministic keyword fallback when offline.',
    security: [
      'API keys transmitted strictly via x-goog-api-key header (never query params)',
      'Origin-restricted CORS allowlist & input length caps',
      'Schema-validated JSON output prevents prompt-injected HTML',
    ],
    artifacts: ['netlify/functions/extract-skills.ts', 'web/src/components/AiSkillExtractorTab.tsx'],
    targetTab: 'ai',
    targetLabel: 'Test AI Skill Pipeline',
    icon: <Sparkles size={17} aria-hidden="true" />,
  },
  {
    id: 'supabase',
    title: 'Supabase Auth & PostgreSQL',
    subtitle: 'OAuth + Row-Level Security',
    runtime: 'PostgreSQL 16 + Supabase OIDC (GitHub / Google / Microsoft)',
    role: 'Persists isolated user profiles, vanity slugs, goals, categories, and logged study hours so any visitor can build their own portfolio.',
    security: [
      'REVOKE ALL from anon/authenticated; strict auth.uid() = user_id RLS policies',
      'Cryptographic SHA-256 nonce verification for Google OIDC hash sessions',
      'Column-level CHECK constraints enforce numeric & length bounds',
    ],
    artifacts: ['infra/supabase-schema.sql', 'web/src/services/supabase.ts'],
    targetTab: 'dashboard',
    targetLabel: 'Open Goals & Activity Log',
    icon: <Database size={17} aria-hidden="true" />,
  },
  {
    id: 'gateway',
    title: 'YARP API Gateway',
    subtitle: '.NET 10 Minimal API Proxy',
    runtime: 'ASP.NET Core 10 + Microsoft YARP Reverse Proxy',
    role: 'Single hardened ingress routing /api/* to CareerPlatform.Api and /geo/* to CareerPlatform.Geo inside non-root Docker containers.',
    security: [
      'Uniform HSTS, COOP, X-XSS-Protection: 0, and Permissions-Policy headers',
      'Non-root container execution on port 8080 with minimal attack surface',
      'Automated xUnit routing integration tests in CI deploy gate',
    ],
    artifacts: ['src/Gateway/Program.cs', 'tests/Gateway.Tests/'],
    icon: <Server size={17} aria-hidden="true" />,
  },
  {
    id: 'api',
    title: 'CareerPlatform.Api',
    subtitle: '.NET 10 + EF Core + OpenXML',
    runtime: 'ASP.NET Core 10, Entity Framework Core, SQLite/Azure SQL',
    role: 'Powers tandem Goal-to-Entry hour rollups, server-side styled .xlsx workbook generation, YouTube learning cache, and role-based authorization.',
    security: [
      'RequireWriteAccess policy blocks guest mutations with HTTP 403',
      'OWASP formula-injection neutralization on all exported spreadsheet cells',
      'Bounded 2 MB / 10 MB streaming decompression guards against zip bombs',
    ],
    artifacts: ['src/Api/Services/AdvancementSpreadsheetService.cs', 'tests/Api.Tests/'],
    targetTab: 'dashboard',
    targetLabel: 'Explore Goals & XLSX Engine',
    icon: <Cpu size={17} aria-hidden="true" />,
  },
  {
    id: 'geo',
    title: 'CareerPlatform.Geo',
    subtitle: '.NET 10 + Garmin FIT SDK',
    runtime: 'ASP.NET Core 10 Minimal API + Official Garmin.FIT.Sdk',
    role: 'Decodes binary .FIT telemetry from a Garmin Forerunner 255 Music, converts 32-bit semicircles to WGS84 coordinates, and emits elevation splits.',
    security: [
      '400-meter residential privacy geofence enforced & verified in CI tests',
      'Binary .FIT header magic validation + coordinate count DoS caps',
      'Raw .fit files excluded from public assets & git history',
    ],
    artifacts: ['src/Geo/Program.cs', 'web/tests/deployConfigAndPrivacy.test.ts'],
    targetTab: 'map',
    targetLabel: 'Launch Garmin Map Visualizer',
    icon: <Compass size={17} aria-hidden="true" />,
  },
];

const TRACE_SCENARIOS: TraceScenario[] = [
  {
    id: 'trace-fit',
    label: 'Garmin .FIT Telemetry Decode',
    summary: 'Binary upload → YARP Gateway → Garmin FIT SDK → WGS84 Map + Elevation Scrubber',
    steps: [
      { nodeId: 'spa', detail: 'User uploads .FIT binary or selects Central Texas ride', latency: '4 ms' },
      { nodeId: 'gateway', detail: 'YARP routes /geo/parse-fit with strict security headers', latency: '6 ms' },
      { nodeId: 'geo', detail: 'Garmin FIT SDK decodes semicircles, trims 400m privacy fence & computes grade', latency: '28 ms' },
      { nodeId: 'spa', detail: 'Leaflet renders polyline, elevation chart & synchronized replay HUD', latency: '12 ms' },
    ],
  },
  {
    id: 'trace-ai',
    label: 'AI Job-Match & Study Pipeline',
    summary: 'JD Paste → Netlify Gemini Function → Evidence Match → Tandem Goal Rollup',
    steps: [
      { nodeId: 'spa', detail: 'Recruiter pastes job description into AI Skill Pipeline', latency: '2 ms' },
      { nodeId: 'gemini', detail: 'Netlify Function calls Gemini structured JSON schema via x-goog-api-key', latency: '410 ms' },
      { nodeId: 'spa', detail: 'Scorecard matches skills against verified production proof & highlights resume', latency: '5 ms' },
      { nodeId: 'supabase', detail: 'Optional "Track as Goal" syncs Learning goal under auth.uid() RLS', latency: '38 ms' },
    ],
  },
  {
    id: 'trace-goals',
    label: 'Tandem Goals & OpenXML Export',
    summary: 'Log Career Hours → API / RLS Rollup → Zero-Dependency .xlsx Workbook',
    steps: [
      { nodeId: 'spa', detail: 'User logs study hours linked to a Strategic Goal', latency: '3 ms' },
      { nodeId: 'gateway', detail: 'YARP authenticates bearer token & forwards /api/career-entries', latency: '7 ms' },
      { nodeId: 'api', detail: 'RequireWriteAccess validates payload, recalculates goal % & builds .xlsx', latency: '24 ms' },
      { nodeId: 'supabase', detail: 'RLS commits row owned by auth.uid() and refreshes annual pace checkpoints', latency: '32 ms' },
    ],
  },
];

interface ArchitectureExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToTab: (tab: TabType) => void;
}

export const ArchitectureExplorerModal: React.FC<ArchitectureExplorerModalProps> = ({
  isOpen,
  onClose,
  onJumpToTab,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('spa');
  const [activeScenarioId, setActiveScenarioId] = useState<string>('trace-fit');
  const [traceStepIndex, setTraceStepIndex] = useState<number | null>(null);

  const selectedNode =
    ARCHITECTURE_NODES.find((n) => n.id === selectedNodeId) ?? ARCHITECTURE_NODES[0];
  const activeScenario =
    TRACE_SCENARIOS.find((s) => s.id === activeScenarioId) ?? TRACE_SCENARIOS[0];

  useEffect(() => {
    if (!isOpen) {
      setTraceStepIndex(null);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (traceStepIndex === null) return;
    const step = activeScenario.steps[traceStepIndex];
    if (step) {
      setSelectedNodeId(step.nodeId);
    }
    if (traceStepIndex >= activeScenario.steps.length - 1) {
      return;
    }
    const timer = window.setTimeout(() => {
      setTraceStepIndex((prev) => (prev === null ? null : prev + 1));
    }, 950);
    return () => window.clearTimeout(timer);
  }, [traceStepIndex, activeScenario]);

  const handleRunTrace = () => {
    setTraceStepIndex(0);
  };

  const tracedNodeIds = useMemoIds(activeScenario, traceStepIndex);

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="arch-explorer-title"
      maxWidth="920px"
      padding="26px"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="section-eyebrow" style={{ display: 'flex', alignItems: 'center', columnGap: '8px', rowGap: '2px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={13} aria-hidden="true" style={{ color: 'var(--accent-crimson)', flexShrink: 0 }} />
              <span>Interactive System Topology</span>
            </span>
            <span className="inline-meta-sep" aria-hidden="true" />
            <span>johnbendfeldt.com</span>
          </div>
          <h2 id="arch-explorer-title" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '1.78rem', lineHeight: 1.12, color: 'var(--text-primary)', margin: '2px 0 6px', overflowWrap: 'break-word' }}>
            Live Multi-Service Architecture Explorer
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
            Select any service node to inspect its runtime, security controls, and source modules — or trace a live request end-to-end.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="icon-btn"
          aria-label="Close architecture explorer"
          style={{ flexShrink: 0 }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Request Trace Simulator Bar */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-inset)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '18px',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <div className="segmented-control" role="group" aria-label="Request trace scenarios" style={{ maxWidth: '100%' }}>
            {TRACE_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                className="segmented-btn"
                aria-pressed={activeScenarioId === scenario.id}
                onClick={() => {
                  setActiveScenarioId(scenario.id);
                  setTraceStepIndex(null);
                }}
              >
                {scenario.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleRunTrace}
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
          >
            <Play size={13} aria-hidden="true" />
            <span>{traceStepIndex !== null ? 'Replay Trace' : 'Simulate Request Flow'}</span>
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
          {activeScenario.summary}
        </div>

        {traceStepIndex !== null && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
              gap: '8px',
            }}
          >
            {activeScenario.steps.map((step, idx) => {
              const isDone = idx <= traceStepIndex;
              const isCurrent = idx === traceStepIndex;
              return (
                <div
                  key={`${step.nodeId}-${idx}`}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 'var(--radius-sm)',
                    background: isCurrent ? 'var(--bg-surface)' : 'transparent',
                    border: isCurrent
                      ? '1.5px solid var(--accent-crimson)'
                      : '1px solid var(--border-subtle)',
                    opacity: isDone ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: isCurrent ? 'var(--accent-crimson)' : 'var(--text-primary)' }}>
                      0{idx + 1} / {step.nodeId.toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--status-success)' }}>
                      {step.latency}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, overflowWrap: 'break-word' }}>
                    {step.detail}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Node Grid + Architectural Dossier */}
      <div className="arch-explorer-layout">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 175px), 1fr))',
            gap: '10px',
            alignContent: 'start',
            minWidth: 0,
          }}
        >
          {ARCHITECTURE_NODES.map((node, index) => {
            const isSelected = node.id === selectedNode.id;
            const isInTrace = tracedNodeIds.has(node.id);
            return (
              <button
                key={node.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setTraceStepIndex(null);
                }}
                className={`arch-node-btn ${isSelected ? 'is-selected' : ''} ${isInTrace ? 'is-traced' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ color: isSelected ? 'var(--accent-crimson)' : 'var(--text-primary)', display: 'inline-flex' }}>
                    {node.icon}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    0{index + 1}
                  </span>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: '3px', overflowWrap: 'break-word' }}>
                  {node.title}
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
                  {node.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Node Detail Dossier */}
        <div
          style={{
            padding: '18px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--accent-crimson)', display: 'inline-flex', flexShrink: 0 }}>{selectedNode.icon}</span>
              <span className="section-eyebrow" style={{ marginBottom: 0, overflowWrap: 'anywhere' }}>
                {selectedNode.subtitle}
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '6px', overflowWrap: 'break-word' }}>
              {selectedNode.title}
            </h3>
            <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', fontWeight: 600, marginBottom: '12px', overflowWrap: 'anywhere' }}>
              {selectedNode.runtime}
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '14px' }}>
              {selectedNode.role}
            </p>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '8px' }}>
                <ShieldCheck size={14} aria-hidden="true" style={{ color: 'var(--status-success)', flexShrink: 0 }} />
                <span>Security &amp; Reliability Controls</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {selectedNode.security.map((ctrl) => (
                  <li key={ctrl} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, minWidth: 0 }}>
                    <CheckCircle2 size={14} aria-hidden="true" style={{ color: 'var(--status-success)', flexShrink: 0, marginTop: '3px' }} />
                    <span style={{ minWidth: 0, overflowWrap: 'break-word' }}>{ctrl}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Key Repository Modules
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedNode.artifacts.map((art) => (
                  <span
                    key={art}
                    className="tag-chip"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      maxWidth: '100%',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {art}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {selectedNode.targetTab && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onJumpToTab(selectedNode.targetTab!);
              }}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.84rem' }}
            >
              <span>{selectedNode.targetLabel || 'Explore Live Feature'}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </ModalDialog>
  );
};

function useMemoIds(scenario: TraceScenario, stepIndex: number | null): Set<string> {
  const set = new Set<string>();
  if (stepIndex === null) return set;
  for (let i = 0; i <= stepIndex && i < scenario.steps.length; i++) {
    set.add(scenario.steps[i].nodeId);
  }
  return set;
}
