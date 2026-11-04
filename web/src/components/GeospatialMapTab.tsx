import React, { useEffect, useState, useRef } from 'react';
import type { RouteData, RideSummary } from '../types';
import { ApiService } from '../services/api';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Download,
  Compass,
  Activity,
  Navigation,
  Mountain,
  Clock,
  Upload,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Check,
  SlidersHorizontal,
  LayoutGrid,
  Loader2
} from 'lucide-react';

// Custom Map Marker Icons using Leaflet divIcon
const createCustomIcon = (type: string) => {
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

// Smooth Map Viewport Transition Component
const MapUpdater: React.FC<{ points: { lat: number; lon: number }[] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 13, animate: true });
    }
  }, [points, map]);
  return null;
};

interface GeospatialMapTabProps {
  workspaceMode?: 'portfolio' | 'personal';
  userName?: string;
}

const PERSONAL_SAMPLE_RIDE: RideSummary = {
  id: 'sample-demo-route',
  title: 'Hill Country Loop (Sample)',
  distanceKm: 83.9,
  elevationGainM: 723,
  durationMinutes: 274,
  date: 'Starter Route'
};

export const GeospatialMapTab: React.FC<GeospatialMapTabProps> = ({
  workspaceMode = 'portfolio',
  userName = 'My'
}) => {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [rides, setRides] = useState<RideSummary[]>([]);
  const [customRoutesMap, setCustomRoutesMap] = useState<Record<string, RouteData>>({});
  const [selectedRideId, setSelectedRideId] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [switchingRide, setSwitchingRide] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [useDropdown, setUseDropdown] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close route dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Load available rides based on workspaceMode
  useEffect(() => {
    let mounted = true;
    if (workspaceMode === 'personal') {
      ApiService.getSampleRoute().then((sample) => {
        if (!mounted) return;
        const sampleRouteData: RouteData = {
          ...sample,
          activityName: 'Sample Route (Upload Your Own .FIT or .GPX Above)',
          recordedDevice: 'Sample GPS Telemetry Stream'
        };
        setRides([PERSONAL_SAMPLE_RIDE]);
        setSelectedRideId(PERSONAL_SAMPLE_RIDE.id);
        setRoute(sampleRouteData);
        setInitialLoading(false);
      });
      return () => { mounted = false; };
    }

    ApiService.getRides().then(async (ridesList) => {
      if (!mounted) return;
      setRides(ridesList);
      if (ridesList.length > 0) {
        const firstRide = ridesList[0];
        setSelectedRideId(firstRide.id);
        try {
          const firstRoute = await ApiService.getRideById(firstRide.id);
          if (mounted) {
            setRoute(firstRoute);
            setInitialLoading(false);
          }
        } catch {
          const sample = await ApiService.getSampleRoute();
          if (mounted) {
            setRoute(sample);
            setInitialLoading(false);
          }
        }
      } else {
        const sample = await ApiService.getSampleRoute();
        if (mounted) {
          setRoute(sample);
          setInitialLoading(false);
        }
      }
    });
    return () => { mounted = false; };
  }, [workspaceMode]);

  const handleSelectRide = async (ride: RideSummary) => {
    if (selectedRideId === ride.id && !switchingRide) return;
    setSelectedRideId(ride.id);
    setSwitchingRide(true);
    setUploadMessage(null);
    try {
      if (customRoutesMap[ride.id]) {
        setRoute(customRoutesMap[ride.id]);
      } else if (ride.id === PERSONAL_SAMPLE_RIDE.id) {
        const sample = await ApiService.getSampleRoute();
        setRoute({
          ...sample,
          activityName: 'Sample Route (Upload Your Own .FIT or .GPX Above)',
          recordedDevice: 'Sample GPS Telemetry Stream'
        });
      } else {
        const data = await ApiService.getRideById(ride.id);
        setRoute(data);
      }
    } catch (e) {
      console.error('Failed to load ride', e);
    } finally {
      setSwitchingRide(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.fit') && !lowerName.endsWith('.gpx')) {
      alert('Please upload a valid Garmin binary .fit or .gpx file.');
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    try {
      const parsedRoute = await ApiService.uploadFitFile(file);
      const customId = `custom-${Date.now()}`;
      const newSummary: RideSummary = {
        id: customId,
        title: parsedRoute.activityName || file.name,
        distanceKm: parsedRoute.distanceKm,
        elevationGainM: parsedRoute.elevationGainM,
        durationMinutes: parsedRoute.durationMinutes,
        date: 'Uploaded Just Now'
      };
      setCustomRoutesMap(prev => ({ ...prev, [customId]: parsedRoute }));
      setRides(prev => [newSummary, ...prev]);
      setRoute(parsedRoute);
      setSelectedRideId(customId);
      setUploadMessage(`Successfully parsed ${file.name} (${parsedRoute.distanceKm} km, +${parsedRoute.elevationGainM}m)!`);
    } catch (e: any) {
      alert(`Error parsing telemetry file: ${e.message || 'Unknown error'}`);
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
    <desc>Garmin Forerunner 255 Music Telemetry Export - John Bendfeldt</desc>
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

  if (initialLoading || !route) {
    return (
      <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
        <Activity size={32} color="var(--accent-cyan)" className="animate-spin" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Parsing Garmin Forerunner 255 Music Binary Telemetry (.FIT)...</p>
      </div>
    );
  }

  const polylinePositions: [number, number][] = route.points.map(p => [p.lat, p.lon]);
  const centerLat = route.points.length > 0 ? route.points[Math.floor(route.points.length / 2)].lat : 30.5;
  const centerLon = route.points.length > 0 ? route.points[Math.floor(route.points.length / 2)].lon : -97.5;

  const hours = Math.floor(route.durationMinutes / 60);
  const minutes = route.durationMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const activeRide = rides.find(r => r.id === selectedRideId);

  return (
    <div style={{ marginBottom: '36px' }}>
      {/* Hidden File Input for .FIT and .GPX uploads */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".fit,.gpx"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Activity size={24} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.45rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {workspaceMode === 'personal'
                ? `${userName}'s GPS Telemetry Visualizer`
                : 'Garmin Telemetry Visualizer & Binary FIT Parser'}
            </h2>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              Garmin.FIT.Sdk
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {workspaceMode === 'personal'
              ? 'Click "Upload .FIT / .GPX" on the right to plot your own GPS activity files onto the interactive map, or export the sample route below to test.'
              : <>Binary telemetry decoded directly from John's <strong>Garmin Forerunner 255 Music</strong> into Leaflet vector polylines, elevation profiles, and GPX streams.</>}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary"
            id="btn-upload-fit"
            style={{ padding: '9px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={15} />
            <span>{uploading ? 'Parsing Telemetry...' : 'Upload .FIT / .GPX'}</span>
          </button>

          <button
            onClick={handleExportGpx}
            className="btn-primary"
            id="btn-export-gpx"
            style={{ padding: '9px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} />
            <span>Export .GPX</span>
          </button>
        </div>
      </div>

      {/* Favorite Rides Selector Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', position: 'relative' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--accent-crimson)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {workspaceMode === 'personal'
                ? `${userName}'s Uploaded Routes & Starter Sample`
                : "John's Favorite Central Texas Rides"}
            </span>
            <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
              {workspaceMode === 'personal'
                ? `${rides.length} ${rides.length === 1 ? 'Sample Route' : 'Routes'}`
                : `${rides.length} Preloaded Rides`}
            </span>
            {switchingRide && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                color: 'var(--accent-crimson)'
              }}>
                <Loader2 size={12} className="animate-spin" />
                <span>Loading route...</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Select a route to view interactive GPS splits & elevation
            </span>
            <button
              onClick={() => setUseDropdown(!useDropdown)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              {useDropdown ? (
                <>
                  <LayoutGrid size={12} />
                  <span>Grid View</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={12} />
                  <span>Dropdown View</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 1. DROPDOWN SELECTOR MODE */}
        {useDropdown ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-primary)',
                border: `1.5px solid ${isDropdownOpen ? 'var(--accent-crimson)' : 'var(--border-subtle)'}`,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.2rem' }}>🚴</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {activeRide?.title || route.activityName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <span>{route.distanceKm} km</span>
                    <span>•</span>
                    <span>+{route.elevationGainM}m ascent</span>
                    <span>•</span>
                    <span>{durationText}</span>
                  </div>
                </div>
              </div>
              <ChevronDown
                size={18}
                style={{
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.25s ease',
                  color: isDropdownOpen ? 'var(--accent-crimson)' : 'var(--text-muted)'
                }}
              />
            </button>

            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 1000,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '6px',
                maxHeight: '340px',
                overflowY: 'auto'
              }}>
                {rides.map(r => {
                  const isSelected = selectedRideId === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        handleSelectRide(r);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'var(--bg-primary)' : 'transparent',
                        border: isSelected ? '1px solid var(--accent-crimson)' : '1px solid transparent',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginBottom: '3px',
                        transition: 'all 0.18s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--bg-primary)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          🚴 {r.title}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>{r.distanceKm} km</span>
                          <span>•</span>
                          <span>+{r.elevationGainM}m</span>
                          <span>•</span>
                          <span>{r.durationMinutes} min</span>
                          <span>•</span>
                          <span>{r.date}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'var(--accent-crimson)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* 2. RESPONSIVE GRID / TABS MODE: Wraps cleanly into 2 rows, no awkward overflow or horizontal scrollbar */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: '10px'
          }}>
            {rides.map((r) => {
              const isSelected = selectedRideId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleSelectRide(r)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-primary)' : 'var(--bg-card)',
                    border: isSelected ? '1.5px solid var(--accent-crimson)' : '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '0.86rem',
                    fontWeight: isSelected ? 700 : 600,
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                    lineHeight: 1.3
                  }}>
                    🚴 {r.title}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '4px',
                    fontSize: '0.69rem',
                    color: isSelected ? 'var(--accent-crimson)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap'
                  }}>
                    <span style={{ fontWeight: 600 }}>{r.distanceKm} km</span>
                    <span>•</span>
                    <span>+{r.elevationGainM}m</span>
                    <span>•</span>
                    <span>{r.date}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Notification Message */}
      {uploadMessage && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--accent-emerald)',
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
        marginBottom: '20px',
        transition: 'opacity 0.2s',
        opacity: switchingRide ? 0.65 : 1
      }}>
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Navigation size={16} color="var(--accent-crimson)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Distance</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {route.distanceKm} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>km</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Mountain size={16} color="var(--text-primary)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Ascent</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            +{route.elevationGainM} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>m</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Clock size={16} color="var(--text-primary)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duration</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {durationText}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Compass size={16} color="var(--accent-emerald)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recording Device</span>
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
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
          {switchingRide && (
            <div style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              zIndex: 1000,
              background: 'var(--bg-card)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-crimson)',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Loader2 size={13} className="animate-spin" />
              <span>Panning route...</span>
            </div>
          )}

          <MapContainer
            center={[centerLat, centerLon]}
            zoom={11}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Smooth Map Viewport Transition on Route Selection */}
            <MapUpdater points={route.points} />

            {/* Uniqlo Crimson / High-Contrast Polyline Trace */}
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: '#E60012',
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
                      color: 'var(--accent-crimson)',
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}>
                      {ann.type === 'start' && 'Route Departure'}
                      {ann.type === 'checkpoint' && 'Halfway Split'}
                      {ann.type === 'highlight' && 'Peak Elevation Segment'}
                      {ann.type === 'finish' && 'Ride Finish'}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {ann.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {ann.text}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
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
          bottom: '22px',
          left: '22px',
          right: '22px',
          width: 'fit-content',
          maxWidth: 'calc(100% - 44px)',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          zIndex: 1000,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-md)'
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
