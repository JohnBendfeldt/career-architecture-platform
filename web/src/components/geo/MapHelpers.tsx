import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export const createCustomIcon = (type: string) => {
  let bg = '#2563eb';
  let label = '📍';
  if (type === 'start') { bg = '#10b981'; label = '🏁'; }
  if (type === 'checkpoint') { bg = '#f59e0b'; label = '☕'; }
  if (type === 'highlight') { bg = '#ef4444'; label = '⚡'; }
  if (type === 'finish') { bg = '#06b6d4'; label = '🎯'; }

  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background: ${bg};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.6), 0 0 12px ${bg};
      border: 2px solid #ffffff;
      font-size: 14px;
    ">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};

export const MapUpdater: React.FC<{ points: { lat: number; lon: number }[] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 13, animate: true });
    }
  }, [points, map]);
  return null;
};
