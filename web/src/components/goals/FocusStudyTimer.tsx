import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Clock, CheckCircle2, Timer, X } from 'lucide-react';
import type { CareerEntryPrefill } from '../../types';

interface FocusStudyTimerProps {
  onLogSession: (prefill: CareerEntryPrefill) => void;
  onClose?: () => void;
  defaultOpen?: boolean;
}

interface StoredTimerState {
  running: boolean;
  accumulatedSec: number;
  startedAtMs: number | null;
  topic: string;
  presetMinutes: number | null;
}

const STORAGE_KEY = 'cap_focus_study_timer_v1';

function loadStoredTimer(): StoredTimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { running: false, accumulatedSec: 0, startedAtMs: null, topic: '', presetMinutes: null };
    }
    const parsed = JSON.parse(raw) as Partial<StoredTimerState>;
    return {
      running: Boolean(parsed.running),
      accumulatedSec:
        typeof parsed.accumulatedSec === 'number' && Number.isFinite(parsed.accumulatedSec) && parsed.accumulatedSec >= 0
          ? parsed.accumulatedSec
          : 0,
      startedAtMs:
        typeof parsed.startedAtMs === 'number' && Number.isFinite(parsed.startedAtMs)
          ? parsed.startedAtMs
          : null,
      topic: typeof parsed.topic === 'string' ? parsed.topic.slice(0, 140) : '',
      presetMinutes:
        typeof parsed.presetMinutes === 'number' && Number.isFinite(parsed.presetMinutes)
          ? parsed.presetMinutes
          : null,
    };
  } catch {
    return { running: false, accumulatedSec: 0, startedAtMs: null, topic: '', presetMinutes: null };
  }
}

export function formatClockDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export function secondsToRoundedHours(totalSeconds: number): number {
  if (totalSeconds <= 0) return 0.25;
  const rawHours = totalSeconds / 3600;
  return Math.max(0.1, Math.round(rawHours * 100) / 100);
}

export const FocusStudyTimer: React.FC<FocusStudyTimerProps> = ({
  onLogSession,
  onClose,
}) => {
  const [state, setState] = useState<StoredTimerState>(() => loadStoredTimer());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    if (!state.running) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.running]);

  const liveElapsedSec =
    state.accumulatedSec +
    (state.running && state.startedAtMs !== null
      ? Math.max(0, Math.floor((nowMs - state.startedAtMs) / 1000))
      : 0);

  const presetSec = state.presetMinutes ? state.presetMinutes * 60 : null;
  const presetReached = presetSec !== null && liveElapsedSec >= presetSec;
  const displaySec =
    presetSec !== null ? Math.max(0, presetSec - liveElapsedSec) : liveElapsedSec;

  const handleToggleStartPause = () => {
    const currentNow = Date.now();
    setNowMs(currentNow);
    if (state.running) {
      const added = state.startedAtMs ? Math.max(0, Math.floor((currentNow - state.startedAtMs) / 1000)) : 0;
      setState((prev) => ({
        ...prev,
        running: false,
        accumulatedSec: prev.accumulatedSec + added,
        startedAtMs: null,
      }));
    } else {
      setState((prev) => ({
        ...prev,
        running: true,
        startedAtMs: currentNow,
      }));
    }
  };

  const handleReset = () => {
    setState((prev) => ({
      ...prev,
      running: false,
      accumulatedSec: 0,
      startedAtMs: null,
    }));
  };

  const handleSelectPreset = (minutes: number | null) => {
    setState((prev) => ({
      ...prev,
      presetMinutes: minutes,
      running: false,
      accumulatedSec: 0,
      startedAtMs: null,
    }));
  };

  const handleLog = () => {
    const minutesLogged = Math.max(1, Math.round(liveElapsedSec / 60));
    const hours =
      liveElapsedSec > 0
        ? secondsToRoundedHours(liveElapsedSec)
        : state.presetMinutes
          ? Math.round((state.presetMinutes / 60) * 100) / 100
          : 0.5;

    onLogSession({
      title: state.topic.trim() || 'Focused Engineering Study Session',
      description:
        liveElapsedSec > 0
          ? `Tracked live via Focus Study Timer (${formatClockDuration(liveElapsedSec)} / ${minutesLogged} min).`
          : `Planned ${state.presetMinutes ?? 30}-minute focused study session.`,
      hours,
    });
    handleReset();
  };

  return (
    <section
      aria-label="Focus Study Session Timer"
      className="glass-panel"
      style={{
        padding: '18px 22px',
        marginBottom: '22px',
        borderLeft: state.running ? '3px solid var(--accent-crimson)' : '3px solid var(--text-primary)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Timer size={16} aria-hidden="true" style={{ color: 'var(--accent-crimson)' }} />
          <h3 style={{ fontSize: '0.98rem', margin: 0, color: 'var(--text-primary)' }}>
            Focus Study Session Timer
          </h3>
          <span className={`badge ${state.running ? 'badge-amber' : presetReached ? 'badge-emerald' : 'badge-cyan'}`}>
            {state.running ? 'RECORDING' : presetReached ? 'TARGET REACHED' : 'READY'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="segmented-control" role="group" aria-label="Timer preset mode">
            {[
              { label: 'Stopwatch', val: null },
              { label: '25m Sprint', val: 25 },
              { label: '50m Deep Work', val: 50 },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                className="segmented-btn"
                aria-pressed={state.presetMinutes === opt.val}
                onClick={() => handleSelectPreset(opt.val)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="icon-btn"
              aria-label="Hide study timer"
              title="Hide study timer"
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: '1 1 320px' }}>
          <div
            aria-live="off"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.65rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              color: state.running ? 'var(--accent-crimson)' : 'var(--text-primary)',
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 14px',
              minWidth: '132px',
              textAlign: 'center',
            }}
          >
            {formatClockDuration(displaySec)}
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label htmlFor="focus-timer-topic" className="sr-only">
              Study session topic
            </label>
            <input
              id="focus-timer-topic"
              type="text"
              value={state.topic}
              onChange={(e) => setState((prev) => ({ ...prev, topic: e.target.value.slice(0, 140) }))}
              placeholder="What are you studying? (e.g. .NET 10 YARP Caching)"
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.86rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleToggleStartPause}
            className="btn-primary"
            style={{ padding: '8px 15px', fontSize: '0.84rem' }}
          >
            {state.running ? (
              <>
                <Pause size={14} aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={14} aria-hidden="true" />
                <span>{liveElapsedSec > 0 ? 'Resume' : 'Start Timer'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={liveElapsedSec === 0 && !state.running}
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.82rem' }}
            title="Reset timer"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleLog}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            title="Open Log Career Hours pre-filled with this session"
          >
            {presetReached ? (
              <CheckCircle2 size={14} aria-hidden="true" style={{ color: 'var(--status-success)' }} />
            ) : (
              <Clock size={14} aria-hidden="true" style={{ color: 'var(--accent-crimson)' }} />
            )}
            <span>Log Session ({secondsToRoundedHours(liveElapsedSec)}h)</span>
          </button>
        </div>
      </div>
    </section>
  );
};
