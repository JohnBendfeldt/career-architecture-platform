import React, { useEffect, useState, useRef } from 'react';
import type { RouteData, RideSummary } from '../types';
import { ApiService } from '../services/api';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Download, Compass, Activity, Navigation, Mountain, Clock, Upload, CheckCircle2, Sparkles } from 'lucide-react';

// Custom Map Marker Icons using Leaflet divIcon
const createCustomIcon = (type: string) => {
  let bg = '#6366f1';
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

export const GeospatialMapTab: React.FC = () => {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [rides, setRides] = useState<RideSummary[]>([]);
  const [selectedRideId, setSelectedRideId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available preloaded rides
  useEffect(() => {
    let mounted = true;
    Promise.all([
      ApiService.getRides(),
      ApiService.getSampleRoute()
    ]).then(([ridesList, sampleRoute]) => {
      if (mounted) {
        setRides(ridesList);
        setRoute(sampleRoute);
        if (ridesList.length > 0) {
          setSelectedRideId(ridesList[0].id);
        }
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const handleSelectRide = async (ride: RideSummary) => {
    setSelectedRideId(ride.id);
    setLoading(true);
    setUploadMessage(null);
    try {
      const data = await ApiService.getRideById(ride.id);
      setRoute(data);
    } catch (e) {
      console.error('Failed to load ride', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.fit')) {
      alert('Please upload a valid Garmin binary .fit file.');
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    try {
      const parsedRoute = await ApiService.uploadFitFile(file);
      setRoute(parsedRoute);
      setSelectedRideId('custom-upload');
      setUploadMessage(`Successfully parsed ${file.name} (${parsedRoute.distanceKm} km)!`);
    } catch (e: any) {
      alert(`Error parsing .fit file: ${e.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleExportGpx = () => {
    if (!route) return;

    // Generate standard GPX 1.1 XML string
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CareerPlatform.Geo" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${route.activityName}</name>
    <desc>Garmin Forerunner 255 Music Telemetry Export - John F. Bendfeldt</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${route.activityName}</name>
    <trkseg>
${route.points.map(p => `      <trkpt lat="${p.lat}" lon="${p.lon}">
        <ele>${p.elevation}</ele>
        <time>${p.timestamp}</time>
      </trkpt>`).join('\n')}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedTitle = route.activityName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `john-bendfeldt-${sanitizedTitle}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading || !route) {
    return (
      <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
        <Activity size={32} color="var(--accent-cyan)" className="animate-spin" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Parsing Garmin Forerunner 255 Music Binary Telemetry (.FIT)...</p>
      </div>
    );
  }

  const polylinePositions: [number, number][] = route.points.map(p => [p.lat, p.lon]);
  const centerLat = route.points[Math.floor(route.points.length / 2)].lat;
  const centerLon = route.points[Math.floor(route.points.length / 2)].lon;

  const hours = Math.floor(route.durationMinutes / 60);
  const minutes = route.durationMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div style={{ marginBottom: '36px' }}>
      {/* Hidden File Input for .FIT uploads */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".fit"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Header and Telemetry Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={24} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
              Garmin Telemetry Visualizer & Binary FIT Parser
            </h2>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              Garmin.FIT.Sdk
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Binary telemetry decoded directly from John's <strong>Garmin Forerunner 255 Music</strong> into Leaflet vector polylines, elevation profiles, and GPX streams.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary"
            id="btn-upload-fit"
            style={{ padding: '9px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={15} />
            <span>{uploading ? 'Parsing .FIT...' : 'Upload .FIT File'}</span>
          </button>

          <button
            onClick={handleExportGpx}
            className="btn-primary"
            id="btn-export-gpx"
            style={{ padding: '9px 18px', fontSize: '0.85rem' }}
          >
            <Download size={15} />
            <span>Export .GPX</span>
          </button>
        </div>
      </div>

      {/* Favorite Rides Selector Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--accent-indigo)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
              John's Favorite Central Texas Rides
            </span>
            <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
              {rides.length} Preloaded Rides
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Select a route to view interactive GPS splits & elevation
          </span>
        </div>

        <div style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '4px'
        }}>
          {rides.map((r) => {
            const isSelected = selectedRideId === r.id;
            return (
              <button
                key={r.id}
                onClick={() => handleSelectRide(r)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1.5px solid var(--accent-indigo)' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  minWidth: '180px'
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#ffffff' : '#cbd5e1', marginBottom: '4px' }}>
                  🚴 {r.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  <span>{r.distanceKm} km</span>
                  <span>•</span>
                  <span>+{r.elevationGainM}m</span>
                  <span>•</span>
                  <span>{r.date}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Notification Message */}
      {uploadMessage && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.88rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{uploadMessage}</span>
        </div>
      )}

      {/* Telemetry HUD Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Navigation size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Distance</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff' }}>
            {route.distanceKm} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>km</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Mountain size={16} color="var(--accent-indigo)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Ascent</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff' }}>
            +{route.elevationGainM} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>m</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Clock size={16} color="var(--accent-violet)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duration</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff' }}>
            {durationText}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Compass size={16} color="var(--accent-emerald)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recording Device</span>
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
            {route.recordedDevice}
          </div>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="glass-panel" style={{ padding: '14px', position: 'relative' }}>
        <div style={{
          height: '520px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <MapContainer
            key={`${route.activityName}-${route.distanceKm}`}
            center={[centerLat, centerLon]}
            zoom={11}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Glowing cyan polyline trace */}
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: '#06b6d4',
                weight: 5,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />

            {/* Interactive Coordinate Annotations */}
            {route.annotations.map((ann) => (
              <Marker
                key={ann.id}
                position={[ann.lat, ann.lon]}
                icon={createCustomIcon(ann.type)}
              >
                <Popup>
                  <div style={{ padding: '4px' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#38bdf8',
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}>
                      {ann.type === 'start' && 'Route Departure'}
                      {ann.type === 'checkpoint' && 'Halfway Split'}
                      {ann.type === 'highlight' && 'Peak Elevation Segment'}
                      {ann.type === 'finish' && 'Ride Finish'}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                      {ann.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                      {ann.text}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                      Lat: {ann.lat.toFixed(4)}, Lon: {ann.lon.toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Map Legend Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '28px',
          left: '28px',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          zIndex: 1000,
          display: 'flex',
          gap: '14px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
            <span>Departure</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
            <span>Halfway Split</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
            <span>Peak Elevation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }} />
            <span>Finish</span>
          </div>
        </div>
      </div>
    </div>
  );
};
