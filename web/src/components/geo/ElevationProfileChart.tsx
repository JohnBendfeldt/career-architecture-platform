import React, { useMemo, useState } from 'react';
import { Mountain } from 'lucide-react';
import type { RoutePoint } from '../../types';

interface ElevationProfileChartProps {
  points: RoutePoint[];
  distanceKm: number;
}

const WIDTH = 800;
const HEIGHT = 150;
const PAD_X = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 16;

export const ElevationProfileChart: React.FC<ElevationProfileChartProps> = ({
  points,
  distanceKm
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sampled = useMemo(() => {
    if (!points || points.length < 2) return [];
    const maxSamples = 160;
    if (points.length <= maxSamples) return points;
    const step = (points.length - 1) / (maxSamples - 1);
    const out: RoutePoint[] = [];
    for (let i = 0; i < maxSamples; i++) {
      out.push(points[Math.round(i * step)]);
    }
    return out;
  }, [points]);

  if (sampled.length < 2) return null;

  const elevations = sampled.map(p => p.elevation);
  const minEle = Math.min(...elevations);
  const maxEle = Math.max(...elevations);
  const eleRange = Math.max(10, maxEle - minEle);
  const plotW = WIDTH - PAD_X * 2;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const coords = sampled.map((pt, idx) => {
    const x = PAD_X + (idx / (sampled.length - 1)) * plotW;
    const y = PAD_TOP + plotH - ((pt.elevation - minEle) / eleRange) * plotH;
    return { x, y, pt };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} Z`;

  const hovered = hoverIdx !== null ? coords[hoverIdx] : null;
  const hoveredKm = hoverIdx !== null
    ? ((hoverIdx / (coords.length - 1)) * distanceKm).toFixed(1)
    : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const clamped = Math.max(PAD_X, Math.min(WIDTH - PAD_X, relX));
    const ratio = (clamped - PAD_X) / plotW;
    const idx = Math.round(ratio * (coords.length - 1));
    setHoverIdx(Math.max(0, Math.min(coords.length - 1, idx)));
  };

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', marginTop: '18px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mountain size={16} color="var(--accent-crimson)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Elevation Profile
          </span>
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {Math.round(minEle)}m – {Math.round(maxEle)}m
          </span>
        </div>

        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {hovered ? (
            <span>
              <strong style={{ color: 'var(--accent-crimson)' }}>{hovered.pt.elevation.toFixed(1)} m</strong> @ {hoveredKm} km
            </span>
          ) : (
            <span>Hover chart to inspect split elevation</span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: '140px', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        aria-label="Route elevation profile chart"
      >
        <defs>
          <linearGradient id="cap-elevation-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E60012" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#E60012" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line x1={PAD_X} y1={PAD_TOP} x2={WIDTH - PAD_X} y2={PAD_TOP} stroke="var(--border-subtle)" strokeDasharray="4 4" />
        <line x1={PAD_X} y1={PAD_TOP + plotH / 2} x2={WIDTH - PAD_X} y2={PAD_TOP + plotH / 2} stroke="var(--border-subtle)" strokeDasharray="4 4" />
        <line x1={PAD_X} y1={PAD_TOP + plotH} x2={WIDTH - PAD_X} y2={PAD_TOP + plotH} stroke="var(--border-subtle)" />

        <path d={areaPath} fill="url(#cap-elevation-fill)" />
        <path d={linePath} fill="none" stroke="#E60012" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

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
            <circle cx={hovered.x} cy={hovered.y} r="5" fill="#E60012" stroke="#ffffff" strokeWidth="2" />
          </>
        )}
      </svg>
    </div>
  );
};
