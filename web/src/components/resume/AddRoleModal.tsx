import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ExperienceItem } from './resumePdfExport';

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRole: (item: ExperienceItem) => void;
}

export const AddRoleModal: React.FC<AddRoleModalProps> = ({ isOpen, onClose, onAddRole }) => {
  const [roleTitle, setRoleTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [roleLocation, setRoleLocation] = useState('Remote');
  const [rolePeriod, setRolePeriod] = useState('2024 – Present');
  const [roleHighlight, setRoleHighlight] = useState('');
  const [roleBullets, setRoleBullets] = useState('');
  const [roleBadges, setRoleBadges] = useState('TypeScript, React, .NET, Cloud');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bulletsList = roleBullets
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean);
    const created: ExperienceItem = {
      id: `exp-${Date.now()}`,
      role: roleTitle.trim() || 'Software Engineer',
      company: companyName.trim() || 'Technology Company',
      location: roleLocation.trim() || 'Remote',
      period: rolePeriod.trim() || 'Present',
      highlight: roleHighlight.trim() || 'Full-stack architecture & product delivery',
      bullets: bulletsList.length > 0 ? bulletsList : ['Architected and delivered scalable production features.'],
      badges: roleBadges.split(',').map(b => b.trim()).filter(Boolean)
    };
    onAddRole(created);
    setRoleTitle('');
    setCompanyName('');
    setRoleHighlight('');
    setRoleBullets('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '540px',
        width: '100%',
        background: 'var(--bg-card)',
        padding: '28px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Plus size={20} color="var(--accent-crimson)" />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Add Role to My Timeline</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Role / Title</label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Senior Full-Stack Engineer"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Company / Org</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Systems"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Location</label>
              <input
                type="text"
                value={roleLocation}
                onChange={(e) => setRoleLocation(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dates / Period</label>
              <input
                type="text"
                value={rolePeriod}
                onChange={(e) => setRolePeriod(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Key Highlight Summary</label>
            <input
              type="text"
              value={roleHighlight}
              onChange={(e) => setRoleHighlight(e.target.value)}
              placeholder="e.g. Cloud microservices, CI/CD automation & frontend modernization"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Bullet Points (One per line)</label>
            <textarea
              rows={3}
              value={roleBullets}
              onChange={(e) => setRoleBullets(e.target.value)}
              placeholder={'Built scalable APIs serving 50k+ daily users.\nReduced CI/CD deployment times by 40%.'}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tech Badges (comma-separated)</label>
            <input
              type="text"
              value={roleBadges}
              onChange={(e) => setRoleBadges(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.84rem', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Role</button>
          </div>
        </form>
      </div>
    </div>
  );
};
