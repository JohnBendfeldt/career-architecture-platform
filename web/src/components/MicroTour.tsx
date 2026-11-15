import React from 'react';
import { Compass, ChevronRight, X, Layers, Activity } from 'lucide-react';

interface MicroTourProps {
  step: number;
  onNext: () => void;
  onClose: () => void;
  onSelectTab: (tab: 'dashboard' | 'ai' | 'map') => void;
}

export const MicroTour: React.FC<MicroTourProps> = ({ step, onNext, onClose, onSelectTab }) => {
  const steps = [
    {
      title: "Step 1: Pre-Seeded Architecture Portfolio",
      subtitle: "Zero Empty State for Recruiters",
      icon: <Layers size={20} color="var(--text-primary)" aria-hidden="true" />,
      content: "Welcome! You have full read-only access to John Bendfeldt's engineering portfolio. Explore enterprise technical goals (.NET 10 Minimal APIs, React performance) and personal milestones (language study and 100km cycling).",
      actionText: "Next: Explore AI Skill Extraction",
      tab: 'dashboard' as const,
    },
    {
      title: "Step 2: AI Skill Extraction & Study Planner",
      subtitle: "Unstructured Text to Structured JSON & Curated Resources",
      icon: <Compass size={20} color="var(--text-primary)" aria-hidden="true" />,
      content: "Paste any job description, resume, or engineering goal. The pipeline extracts structured skill tokens, computes portfolio overlap, and links targeted YouTube & Udemy resources.",
      actionText: "Next: Explore Geospatial Telemetry",
      tab: 'ai' as const,
    },
    {
      title: "Step 3: Geospatial Garmin FIT Visualizer",
      subtitle: "Binary Telemetry Parsing & Interactive Leaflet Maps",
      icon: <Activity size={20} color="var(--text-primary)" aria-hidden="true" />,
      content: "Powered by a C# Minimal API, decode binary Garmin Forerunner .fit files directly into interactive GPS polylines, inspect split elevation profiles, and export standard .gpx files.",
      actionText: "Finish Tour & Start Exploring",
      tab: 'map' as const,
    }
  ];

  const current = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      onSelectTab(steps[step + 1].tab);
      onNext();
    } else {
      onClose();
    }
  };

  return (
    <aside
      role="region"
      aria-label="Interactive feature walkthrough"
      className="glass-panel"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        margin: '0 auto',
        zIndex: 2000,
        maxWidth: '460px',
        width: 'calc(100% - 32px)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeInUp 0.2s ease-out'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-inset)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-subtle)',
            flexShrink: 0
          }}>
            {current.icon}
          </div>
          <div>
            <div className="section-eyebrow" style={{ color: 'var(--accent-crimson)', marginBottom: '2px' }}>
              Feature Walkthrough ({step + 1} of 3)
            </div>
            <h2 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
              {current.title}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="icon-btn"
          aria-label="Dismiss tour"
          title="Dismiss tour"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '18px' }}>
        {current.content}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Step dots */}
        <div aria-hidden="true" style={{ display: 'flex', gap: '6px' }}>
          {steps.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === step ? '20px' : '6px',
                height: '6px',
                borderRadius: 'var(--radius-full)',
                background: idx === step ? 'var(--accent-crimson)' : 'var(--border-subtle)',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.8rem' }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
            id="btn-tour-next"
          >
            <span>{current.actionText}</span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
};
