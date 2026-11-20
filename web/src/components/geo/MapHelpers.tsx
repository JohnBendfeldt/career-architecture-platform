import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const CUSTOM_ICON_CACHE: Record<string, L.DivIcon> = {};

export const createCustomIcon = (type: string) => {
  if (CUSTOM_ICON_CACHE[type]) {
    return CUSTOM_ICON_CACHE[type];
  }

  let bg = '#2563eb';
  let label = '📍';
  if (type === 'start') { bg = '#10b981'; label = '🏁'; }
  if (type === 'checkpoint') { bg = '#f59e0b'; label = '☕'; }
  if (type === 'highlight') { bg = '#ef4444'; label = '⚡'; }
  if (type === 'finish') { bg = '#06b6d4'; label = '🎯'; }

  const icon = L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background: ${bg};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.45), 0 0 10px ${bg};
      border: 2px solid #ffffff;
      font-size: 14px;
    ">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });

  CUSTOM_ICON_CACHE[type] = icon;
  return icon;
};

export const createTelemetryCursorIcon = () => {
  return L.divIcon({
    className: 'telemetry-cursor-marker',
    html: `<div style="
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #c40010;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 4px rgba(196, 0, 16, 0.28), 0 3px 10px rgba(0, 0, 0, 0.55);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

export const MapUpdater: React.FC<{ points: { lat: number; lon: number }[] }> = ({ points }) => {
  const map = useMap();
  const lastSignatureRef = useRef<string>('');

  useEffect(() => {
    if (!points || points.length === 0) return;
    const first = points[0];
    const mid = points[Math.floor(points.length / 2)];
    const last = points[points.length - 1];
    const signature = `${points.length}:${first.lat},${first.lon}:${mid.lat},${mid.lon}:${last.lat},${last.lon}`;
    if (lastSignatureRef.current === signature) {
      return;
    }
    lastSignatureRef.current = signature;

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [52, 52], maxZoom: 13, animate: true });
  }, [points, map]);

  return null;
};
