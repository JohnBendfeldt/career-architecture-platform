import React, { useMemo, useState } from 'react';
import { Mountain } from 'lucide-react';
import type { RoutePoint } from '../../types';
import {
  formatDistance,
  formatElevation,
  type DistanceUnit,
  type EnrichedTelemetryPoint,
} from './telemetryAnalytics';

interface ElevationProfileChartProps {
  points: RoutePoint[];
  distanceKm: number;
  unit?: DistanceUnit;
  enrichedPoints?: EnrichedTelemetryPoint[];
  activePointIndex?: number | null;
  onActivePointIndexChange?: (rawPointIndex: number | null) => void;
}

const WIDTH = 800;
const HEIGHT = 150;
const PAD_X = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 16;

export const ElevationProfileChart: React.FC<ElevationProfileChartProps> = ({
  points,
  distanceKm,
  unit = 'metric',
  enrichedPoints,
  activePointIndex,
  onActivePointIndexChange,
}) => {
  const [internalHoverIdx, setInternalHoverIdx] = useState<number | null>(null);

  const sampled = useMemo(() => {
    if (!points || points.length < 2) return [];
    const maxSamples = 160;
    if (points.length <= maxSamples) {
      return points.map((pt, rawIdx) => ({ pt, rawIdx }));
    }
    const step = (points.length - 1) / (maxSamples - 1);
    const out: Array<{ pt: RoutePoint; rawIdx: number }> = [];
    for (let i = 0; i < maxSamples; i++) {
      const rawIdx = Math.round(i * step);
      out.push({ pt: points[rawIdx], rawIdx });
    }
    return out;
  }, [points]);

  if (sampled.length < 2) return null;

  const elevations = sampled.map((s) => s.pt.elevation);
  const minEle = Math.min(...elevations);
  const maxEle = Math.max(...elevations);
  const eleRange = Math.max(10, maxEle - minEle);
  const plotW = WIDTH - PAD_X * 2;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const coords = sampled.map((item, idx) => {
    const x = PAD_X + (idx / (sampled.length - 1)) * plotW;
    const y = PAD_TOP + plotH - ((item.pt.elevation - minEle) / eleRange) * plotH;
    return { x, y, pt: item.pt, rawIdx: item.rawIdx };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} Z`;

  // Resolve synced sample index if parent controls activePointIndex
  let resolvedSampleIdx = internalHoverIdx;
  if (typeof activePointIndex === 'number' && points.length > 1) {
    const ratio = Math.max(0, Math.min(1, activePointIndex / (points.length - 1)));
    resolvedSampleIdx = Math.round(ratio * (coords.length - 1));
  }

  const hovered = resolvedSampleIdx !== null ? coords[resolvedSampleIdx] : null;
  const hoveredKmNum =
    resolvedSampleIdx !== null ? (resolvedSampleIdx / (coords.length - 1)) * distanceKm : null;
  const hoveredEnriched =
    hovered && enrichedPoints && enrichedPoints[hovered.rawIdx]
      ? enrichedPoints[hovered.rawIdx]
      : null;

  const emitIndex = (sampleIdx: number | null) => {
    setInternalHoverIdx(sampleIdx);
    if (onActivePointIndexChange) {
      onActivePointIndexChange(sampleIdx === null ? null : coords[sampleIdx].rawIdx);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const clamped = Math.max(PAD_X, Math.min(WIDTH - PAD_X, relX));
    const ratio = (clamped - PAD_X) / plotW;
    const idx = Math.round(ratio * (coords.length - 1));
    emitIndex(Math.max(0, Math.min(coords.length - 1, idx)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const stepSize = Math.max(1, Math.round(coords.length / 20));
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = resolvedSampleIdx === null ? 0 : Math.min(coords.length - 1, resolvedSampleIdx + stepSize);
      emitIndex(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next =
        resolvedSampleIdx === null ? coords.length - 1 : Math.max(0, resolvedSampleIdx - stepSize);
      emitIndex(next);
    } else if (e.key === 'Home') {
      e.preventDefault();
      emitIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      emitIndex(coords.length - 1);
    } else if (e.key === 'Escape') {
      emitIndex(null);
    }
  };

  const rangeLabel =
    unit === 'imperial'
      ? `${formatElevation(minEle, 'imperial')} – ${formatElevation(maxEle, 'imperial')}`
      : `${Math.round(minEle)}m – ${Math.round(maxEle)}m`;

  const hoveredEleLabel = hovered
    ? unit === 'imperial'
      ? formatElevation(hovered.pt.elevation, 'imperial')
      : `${hovered.pt.elevation.toFixed(1)} m`
    : null;

  const hoveredDistLabel =
    hoveredKmNum !== null
      ? unit === 'imperial'
        ? formatDistance(hoveredKmNum, 'imperial')
        : `${hoveredKmNum.toFixed(1)} km`
      : null;

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', marginTop: '18px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Mountain size={16} color="var(--accent-crimson)" aria-hidden="true" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Synced Elevation Profile
          </span>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {rangeLabel}
          </span>
        </div>

        <div aria-live="polite" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {hovered ? (
            <span>
              <strong style={{ color: 'var(--accent-crimson)' }}>{hoveredEleLabel}</strong> @ {hoveredDistLabel}
              {hoveredEnriched && (
                <span>
                  {' '}• Grade:{' '}
                  <strong style={{ color: hoveredEnriched.gradePercent >= 4 ? 'var(--accent-crimson)' : 'var(--text-primary)' }}>
                    {hoveredEnriched.gradePercent > 0 ? `+${hoveredEnriched.gradePercent}%` : `${hoveredEnriched.gradePercent}%`}
                  </strong>
                </span>
              )}
            </span>
          ) : (
            <span>Hover chart to inspect split elevation</span>
          )}
        </div>
      </div>

      <svg
        role="img"
        tabIndex={0}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: '140px', display: 'block', cursor: 'crosshair', borderRadius: 'var(--radius-sm)' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => emitIndex(null)}
        onKeyDown={handleKeyDown}
        aria-label="Route elevation profile chart"
      >
        <defs>
          <linearGradient id="cap-elevation-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-crimson)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--accent-crimson)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line x1={PAD_X} y1={PAD_TOP} x2={WIDTH - PAD_X} y2={PAD_TOP} stroke="var(--border-subtle)" strokeDasharray="4 4" />
        <line x1={PAD_X} y1={PAD_TOP + plotH / 2} x2={WIDTH - PAD_X} y2={PAD_TOP + plotH / 2} stroke="var(--border-subtle)" strokeDasharray="4 4" />
        <line x1={PAD_X} y1={PAD_TOP + plotH} x2={WIDTH - PAD_X} y2={PAD_TOP + plotH} stroke="var(--border-subtle)" />

        <path d={areaPath} fill="url(#cap-elevation-fill)" />
        <path d={linePath} fill="none" stroke="var(--accent-crimson)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={PAD_TOP}
              x2={hovered.x}
              y2={PAD_TOP + plotH}
              stroke="var(--text-muted)"
              strokeDasharray="3 3"
            />
            <circle cx={hovered.x} cy={hovered.y} r="5.5" fill="var(--accent-crimson)" stroke="var(--bg-surface)" strokeWidth="2" />
          </>
        )}
      </svg>
    </div>
  );
};
