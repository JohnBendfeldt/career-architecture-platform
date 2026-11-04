import React, { useState } from 'react';
import { Shield, FileText, X, Trash2, CheckCircle2 } from 'lucide-react';

export type LegalTab = 'privacy' | 'terms';

interface LegalModalProps {
  initialTab: LegalTab;
  onClose: () => void;
  onSwitchTab: (tab: LegalTab) => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ initialTab, onClose, onSwitchTab }) => {
  const [clearedData, setClearedData] = useState(false);

  const handleClearLocalData = () => {
    const theme = localStorage.getItem('cap_theme');
    localStorage.clear();
    if (theme) {
      localStorage.setItem('cap_theme', theme);
    }
    setClearedData(true);
    setTimeout(() => {
      window.location.href = '/';
    }, 900);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 4500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header & Tab Switcher */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--bg-primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onSwitchTab('privacy')}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-sm)',
                border: initialTab === 'privacy' ? '1px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                background: initialTab === 'privacy' ? 'var(--text-primary)' : 'var(--bg-card)',
                color: initialTab === 'privacy' ? 'var(--bg-surface)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Shield size={14} />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchTab('terms')}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-sm)',
                border: initialTab === 'terms' ? '1px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                background: initialTab === 'terms' ? 'var(--text-primary)' : 'var(--bg-card)',
                color: initialTab === 'terms' ? 'var(--bg-surface)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileText size={14} />
              <span>Terms of Service</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal document"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Scrollable Legal Content */}
        <div style={{
          padding: '28px 24px',
          overflowY: 'auto',
          fontSize: '0.88rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.65
        }}>
          {initialTab === 'privacy' ? (
            <div>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', fontWeight: 700, marginBottom: '4px' }}>
                EFFECTIVE DATE: NOVEMBER 2026 • JOHNBENDFELDT.COM/PRIVACY
              </div>
              <h2 style={{ fontSize: '1.45rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Privacy Policy — Career Architecture Platform (CAP / BJB)
              </h2>
              <p style={{ marginBottom: '16px' }}>
                The Career Architecture Platform (<strong>johnbendfeldt.com</strong>) is an interactive engineering portfolio and personal career sandbox created by <strong>John Bendfeldt</strong>. We respect your privacy and design all interactive features around minimal data collection and client-side transparency.
              </p>

              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '18px', marginBottom: '6px' }}>
                1. OAuth Authentication (GitHub, Google, Microsoft)
              </h3>
              <p style={{ marginBottom: '14px' }}>
                When you choose to sign in via Supabase OAuth (using GitHub, Google, or Microsoft), we receive only your basic public profile metadata provided by your identity provider (display name, email address, and profile avatar URL) to initialize your personal workspace session. We never access your private repositories, emails, contacts, or cloud files, and we never sell or share your identity metadata with third parties.
              </p>

              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '18px', marginBottom: '6px' }}>
                2. Personal Workspace & Browser Storage
              </h3>
              <p style={{ marginBottom: '14px' }}>
                Customizations you make in Personal Workspace mode—such as your custom profile bio, vanity slug, custom goals, work history entries, and uploadedprojects—are stored locally in your browser&apos;s <code>localStorage</code> so you can test and customize the platform without server-side tracking. You can wipe all locally stored workspace data at any time using the button below.
              </p>

              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '18px', marginBottom: '6px' }}>
                3. AI Skill Extraction (Google Gemini API)
              </h3>
              <p style={{ marginBottom: '14px' }}>
                When you paste a job description or resume snippet into the <strong>AI Skill Pipeline</strong> and click <em>Extract Skills via AI</em>, that text is sent to our stateless serverless function (or Gemini API) solely to return an array of technical skill tags. Submitted text is processed in memory and is not logged or persisted in any database.
              </p>

              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '18px', marginBottom: '6px' }}>
                4. Garmin FIT &amp; GPX Geospatial Telemetry
              </h3>
              <p style={{ marginBottom: '14px' }}>
                Preloaded cycling routes on this platform are protected by a strict <strong>400-meter residential privacy geofence</strong> that strips start/end coordinates near private residences. When you upload your own <code>.FIT</code> or <code>.GPX</code> file in the Geospatial Visualizer, coordinate parsing happens in your browser session for visualization and is never permanently stored on our servers.
              </p>

              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '18px', marginBottom: '6px' }}>
                5. Self-Service Data Erasure &amp; Contact
              </h3>
              <p style={{ marginBottom: '16px' }}>
                You can sign out at any time or clear all local workspace state below. For any privacy questions or OAuth deletion requests, contact John Bendfeldt via <a href="https://linkedin.com/in/johnbendfeldt" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-crimson)', fontWeight: 600 }}>LinkedIn</a> or <a href="https://github.com/johnbendfeldt" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-crimson)', fontWeight: 600 }}>GitHub</a>.
              </p>

              <div style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong>Manage Local Data:</strong> Reset all custom profiles, goals, roles, and session tokens stored in this browser.
                </div>
                <button
                  type="button"
                  onClick={handleClearLocalData}
                  className="btn-secondary"
                  style={{ padding: '7px 14px', fontSize: '0.78rem', color: 'var(--accent-crimson)', borderColor: 'var(--accent-crimson)' }}
                >
                  {clearedData ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Workspace Reset! Reloading...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Clear My Local Workspace Data</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)', fontWeight: 700, marginBottom: '4px' }}>
                EFFECTIVE DATE: NOVEMBER 2026 • JOHNBENDFELDT.COM/TERMS
              </div>
              <h2 style={{ fontSize: '1.45rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Terms of Service — Career Architecture Platform (CAP / BJB)
              </h2>
              <p style={{ marginBottom: '16px' }}>
                By accessing or using the Career Architecture Platform (<strong>johnbendfeldt.com</strong>), you agree to these Terms of Service.
              </p>

              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '18px', marginBottom: '6px' }}>
                1. Purpose of the Platform
              </h3>
              <p style={{ marginBottom: '14px' }}>
                This application serves both as the official architectural portfolio of <strong>John Bendfeldt</strong> and as an interactive sandbox where visitors and engineers can explore live .NET 10, React 19, Gemini AI, and Garmin FIT geospatial features, or configure a personal career workspace.
              </p>

              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '18px', marginBottom: '6px' }}>
                2. Acceptable Use &amp; User Content
              </h3>
              <p style={{ marginBottom: '14px' }}>
                You may use the Personal Workspace, AI Skill Extractor, and GPS Telemetry Visualizer for lawful personal, educational, or recruiting evaluation purposes. Do not submit sensitive personal data, confidential corporate secrets, or malicious payloads into text or file upload fields.
              </p>

              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '18px', marginBottom: '6px' }}>
                3. Outbound Learning &amp; Third-Party Links
              </h3>
              <p style={{ marginBottom: '14px' }}>
                The AI Skill Pipeline generates curated search links to third-party educational platforms including YouTube and Udemy. We are not affiliated with those third-party course providers and are not responsible for external site content or availability.
              </p>

              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '18px', marginBottom: '6px' }}>
                4. Intellectual Property
              </h3>
              <p style={{ marginBottom: '14px' }}>
                The platform architecture, CAP/BJB brand mark, verified portfolio case studies, and source code are the work of John Bendfeldt. Any custom resume text, goals, or GPX/FIT telemetry files you input into your own personal workspace remain 100% yours.
              </p>

              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '18px', marginBottom: '6px' }}>
                5. &quot;As-Is&quot; Demonstration Warranty Disclaimer
              </h3>
              <p style={{ marginBottom: '6px' }}>
                This platform is provided &quot;as is&quot; without warranties of any kind. Local browser storage (<code>localStorage</code>) may be cleared if you clear your browser cache.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            CAP / BJB • Career Architecture Platform by John Bendfeldt
          </span>
          <button type="button" onClick={onClose} className="btn-primary" style={{ padding: '7px 18px', fontSize: '0.8rem' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

