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
      icon: <Layers size={24} color="#6366f1" />,
      content: "Welcome! As a guest recruiter, you have full read-only access to John Bendfeldt's pre-populated engineering portfolio. Explore enterprise technical goals (.NET 10 Minimal APIs, React performance) and personal disciplines (Hangul language fluency, 100km cycling).",
      actionText: "Next: Explore AI Skill Extraction",
      tab: 'dashboard' as const,
    },
    {
      title: "Step 2: AI Skill Extraction & Learning Engine",
      subtitle: "Unstructured Text to Structured JSON & Video Recommendations",
      icon: <Sparkles size={24} color="#a855f7" />,
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
      bottom: 24,
      right: 24,
      zIndex: 2000,
      maxWidth: '480px',
      width: 'calc(100% - 48px)',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1.5px solid rgba(99, 102, 241, 0.5)',
      borderRadius: 'var(--radius-xl)',
      padding: '24px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.25)',
      animation: 'fadeInUp 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-subtle)'
          }}>
            {current.icon}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Feature Walkthrough ({step + 1} of 3)
            </div>
            <h4 style={{ fontSize: '1rem', color: '#ffffff', margin: 0 }}>
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {steps.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === step ? '20px' : '6px',
                height: '6px',
                borderRadius: 'var(--radius-full)',
                background: idx === step ? 'var(--accent-indigo)' : 'rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            id="btn-tour-next"
          >
            <span>{current.actionText}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
