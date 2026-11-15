import React, { useEffect, useState, useRef } from 'react';
import type { RouteData, RideSummary } from '../types';
import { ApiService } from '../services/api';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import {
  Download,
  Compass,
  Activity,
  Navigation,
  Mountain,
  Clock,
  Upload,
  CheckCircle2,
  ChevronDown,
  Check,
  SlidersHorizontal,
  LayoutGrid,
  Loader2
} from 'lucide-react';
import { exportRouteToGpx } from './geo/gpxExport';
import { createCustomIcon, MapUpdater } from './geo/MapHelpers';
import { ElevationProfileChart } from './geo/ElevationProfileChart';

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

  if (initialLoading || !route) {
    return (
      <div className="glass-panel" role="status" style={{ padding: '60px', textAlign: 'center' }}>
        <Activity size={32} color="var(--text-primary)" aria-hidden="true" className="animate-spin" style={{ margin: '0 auto 16px' }} />
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
      {/* Screen-reader accessible file input for .FIT and .GPX uploads */}
      <label htmlFor="fit-gpx-upload-input" className="sr-only">
        Upload Garmin FIT or GPX telemetry file
      </label>
      <input
        id="fit-gpx-upload-input"
        type="file"
        ref={fileInputRef}
        accept=".fit,.gpx"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Header and Telemetry Actions */}
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Geospatial Telemetry • Garmin FIT &amp; GPX</div>
          <h2 className="section-title">
            {workspaceMode === 'personal'
              ? `${userName}'s GPS Telemetry Visualizer`
              : 'Garmin Telemetry Visualizer & Binary FIT Parser'}
          </h2>
          <p className="section-subtitle">
            {workspaceMode === 'personal'
              ? 'Click "Upload .FIT / .GPX" on the right to plot your own GPS activity files onto the interactive map, or export the sample route below to test.'
              : <>Binary telemetry decoded directly from John&apos;s <strong>Garmin Forerunner 255 Music</strong> into Leaflet vector polylines, elevation profiles, and GPX streams.</>}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary"
            id="btn-upload-fit"
            style={{ padding: '9px 18px', fontSize: '0.85rem' }}
          >
            <Upload size={15} aria-hidden="true" />
            <span>{uploading ? 'Parsing Telemetry...' : 'Upload .FIT / .GPX'}</span>
          </button>

          <button
            type="button"
            onClick={() => exportRouteToGpx(route)}
            className="btn-primary"
            id="btn-export-gpx"
            style={{ padding: '9px 18px', fontSize: '0.85rem' }}
          >
            <Download size={15} aria-hidden="true" />
            <span>Export .GPX</span>
          </button>
        </div>
      </div>

      {/* Favorite Rides Selector Bar */}
      <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: '20px', position: 'relative' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {workspaceMode === 'personal'
                ? `${userName}'s Uploaded Routes & Starter Sample`
                : "John's Favorite Central Texas Rides"}
            </h3>
            <span className="badge badge-indigo">
              {workspaceMode === 'personal'
                ? `${rides.length} ${rides.length === 1 ? 'Sample Route' : 'Routes'}`
                : `${rides.length} Preloaded Rides`}
            </span>
            {switchingRide && (
              <span
                role="status"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.75rem',
                  color: 'var(--accent-crimson)'
                }}
              >
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                <span>Loading route...</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Select a route to inspect GPS splits &amp; elevation
            </span>
            <button
              type="button"
              onClick={() => setUseDropdown(!useDropdown)}
              className="btn-secondary"
              style={{ padding: '5px 12px', minHeight: '32px', fontSize: '0.78rem' }}
            >
              {useDropdown ? (
                <>
                  <LayoutGrid size={13} aria-hidden="true" />
                  <span>Grid View</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={13} aria-hidden="true" />
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
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: isDropdownOpen ? '1.5px solid var(--accent-crimson)' : '1px solid var(--border-control)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
                textAlign: 'left'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {activeRide?.title || route.activityName}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <span>{route.distanceKm} km</span>
                  <span aria-hidden="true">•</span>
                  <span>+{route.elevationGainM}m ascent</span>
                  <span aria-hidden="true">•</span>
                  <span>{durationText}</span>
                </div>
              </div>
              <ChevronDown
                size={18}
                aria-hidden="true"
                style={{
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  color: isDropdownOpen ? 'var(--accent-crimson)' : 'var(--text-muted)'
                }}
              />
            </button>

            {isDropdownOpen && (
              <div
                role="listbox"
                aria-label="Available GPS routes"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-control)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  maxHeight: '340px',
                  overflowY: 'auto'
                }}
              >
                {rides.map(r => {
                  const isSelected = selectedRideId === r.id;
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      key={r.id}
                      onClick={() => {
                        handleSelectRide(r);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'var(--bg-inset)' : 'transparent',
                        border: isSelected ? '1px solid var(--accent-crimson)' : '1px solid transparent',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginBottom: '3px',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>{r.distanceKm} km</span>
                          <span aria-hidden="true">•</span>
                          <span>+{r.elevationGainM}m</span>
                          <span aria-hidden="true">•</span>
                          <span>{r.durationMinutes} min</span>
                          <span aria-hidden="true">•</span>
                          <span>{r.date}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          aria-hidden="true"
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'var(--accent-crimson-solid)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
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
          /* 2. RESPONSIVE GRID MODE */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '10px'
          }}>
            {rides.map((r) => {
              const isSelected = selectedRideId === r.id;
              return (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  key={r.id}
                  onClick={() => handleSelectRide(r)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-inset)' : 'var(--bg-surface)',
                    border: isSelected ? '1.5px solid var(--accent-crimson)' : '1px solid var(--border-control)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{
                    fontSize: '0.88rem',
                    fontWeight: isSelected ? 700 : 600,
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                    lineHeight: 1.3
                  }}>
                    {r.title}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '5px',
                    fontSize: '0.75rem',
                    color: isSelected ? 'var(--accent-crimson)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <span style={{ fontWeight: 600 }}>{r.distanceKm} km</span>
                    <span aria-hidden="true">•</span>
                    <span>+{r.elevationGainM}m</span>
                    <span aria-hidden="true">•</span>
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
        <div
          className="callout-success"
          role="status"
          style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }}
        >
          <CheckCircle2 size={18} aria-hidden="true" />
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
            <Navigation size={16} color="var(--accent-crimson)" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Active Distance</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {route.distanceKm} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>km</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Mountain size={16} color="var(--text-primary)" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Total Ascent</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            +{route.elevationGainM} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>m</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Clock size={16} color="var(--text-primary)" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Duration</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {durationText}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Compass size={16} color="var(--status-success)" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Recording Device</span>
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
            <div
              role="status"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                zIndex: 1000,
                background: 'var(--bg-card)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-crimson)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
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

            <MapUpdater points={route.points} />

            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: '#c40010',
                weight: 5,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />

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
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
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
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          zIndex: 1000,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span aria-hidden="true" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
            <span>Departure</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span aria-hidden="true" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
            <span>Halfway Split</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span aria-hidden="true" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
            <span>Peak Elevation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span aria-hidden="true" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }} />
            <span>Finish</span>
          </div>
        </div>
      </div>

      {/* Elevation Profile Chart */}
      <ElevationProfileChart points={route.points} distanceKm={route.distanceKm} />
    </div>
  );
};
