import React from 'react';
import { Sparkles, ChevronRight, X, Layers, Activity } from 'lucide-react';

interface MicroTourProps {
  step: number;
  onNext: () => void;
  onClose: () => void;
  onSelectTab: (tab: 'dashboard' | 'ai' | 'map') => void;
}

export const MicroTour: React.FC<MicroTourProps> = ({ step, onNext, onClose, onSelectTab }) => {
  const steps = [
    {
      title: "Step 1: The 'Aha' Pre-Seeded Architecture Dashboard",
      subtitle: "Zero Empty State for Recruiters",
      icon: <Layers size={24} color="#2563eb" />,
      content: "Welcome! As a guest recruiter, you have full read-only access to John Bendfeldt's pre-populated engineering portfolio. Explore enterprise technical goals (.NET 10 Minimal APIs, React performance) and personal passions (language learning, the Cyrillic & Hangul alphabets, elementary French & Russian, and 100km cycling).",
      actionText: "Next: Explore AI Skill Extraction",
      tab: 'dashboard' as const,
    },
    {
      title: "Step 2: AI Skill Extraction & Learning Engine",
      subtitle: "Unstructured Text to Structured JSON & Video Recommendations",
      icon: <Sparkles size={24} color="#06b6d4" />,
      content: "Upload or paste any job description, resume, or engineering ambition. The AI agent extracts structured skill tokens and asynchronously queries learning APIs (YouTube Data API v3 & Udemy) to curate actionable tutorial playlists.",
      actionText: "Next: Explore Geospatial Telemetry",
      tab: 'ai' as const,
    },
    {
      title: "Step 3: Geospatial Garmin FIT Microservice",
      subtitle: "Binary Telemetry Parsing & Interactive Leaflet Maps",
      icon: <Activity size={24} color="#06b6d4" />,
      content: "Powered by a dedicated C# Minimal API, parse binary Garmin Forerunner .fit files directly into interactive GPS polylines. Inspect coordinate annotations (coffee stops, steep elevation segments) and export standard .gpx files.",
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
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      right: 16,
      margin: '0 auto',
      zIndex: 2000,
      maxWidth: '460px',
      width: 'calc(100% - 32px)',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1.5px solid var(--accent-crimson)',
      borderRadius: 'var(--radius-xl)',
      padding: '20px',
      boxShadow: 'var(--shadow-lg)',
      animation: 'fadeInUp 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-subtle)'
          }}>
            {current.icon}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-crimson)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
              Feature Walkthrough ({step + 1} of 3)
            </div>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
              {current.title}
            </h4>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
          title="Dismiss tour"
        >
          <X size={18} />
        </button>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
        {current.content}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {steps.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === step ? '20px' : '6px',
                height: '6px',
                borderRadius: 'var(--radius-full)',
                background: idx === step ? 'var(--accent-crimson)' : 'var(--border-subtle)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.78rem' }}
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            id="btn-tour-next"
          >
            <span>{current.actionText}</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
