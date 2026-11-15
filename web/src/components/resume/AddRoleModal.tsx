import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ExperienceItem } from './resumePdfExport';
import { ModalDialog } from '../ui/ModalDialog';

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
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="add-role-modal-title"
      maxWidth="540px"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 id="add-role-modal-title" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
          Add Role to My Timeline
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="icon-btn"
          aria-label="Close add role modal"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="modal-two-col-grid">
          <div>
            <label htmlFor="role-title-input" className="form-label">Role / Title</label>
            <input
              id="role-title-input"
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Senior Full-Stack Engineer"
              className="form-input"
              required
            />
          </div>
          <div>
            <label htmlFor="role-company-input" className="form-label">Company / Org</label>
            <input
              id="role-company-input"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Systems"
              className="form-input"
              required
            />
          </div>
        </div>

        <div className="modal-two-col-grid">
          <div>
            <label htmlFor="role-location-input" className="form-label">Location</label>
            <input
              id="role-location-input"
              type="text"
              value={roleLocation}
              onChange={(e) => setRoleLocation(e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="role-period-input" className="form-label">Dates / Period</label>
            <input
              id="role-period-input"
              type="text"
              value={rolePeriod}
              onChange={(e) => setRolePeriod(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label htmlFor="role-highlight-input" className="form-label">Key Highlight Summary</label>
          <input
            id="role-highlight-input"
            type="text"
            value={roleHighlight}
            onChange={(e) => setRoleHighlight(e.target.value)}
            placeholder="e.g. Cloud microservices, CI/CD automation & frontend modernization"
            className="form-input"
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label htmlFor="role-bullets-input" className="form-label">Bullet Points (One per line)</label>
          <textarea
            id="role-bullets-input"
            rows={3}
            value={roleBullets}
            onChange={(e) => setRoleBullets(e.target.value)}
            placeholder={'Built scalable APIs serving 50k+ daily users.\nReduced CI/CD deployment times by 40%.'}
            className="form-textarea"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="role-badges-input" className="form-label">Tech Badges (comma-separated)</label>
          <input
            id="role-badges-input"
            type="text"
            value={roleBadges}
            onChange={(e) => setRoleBadges(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Save Role</button>
        </div>
      </form>
    </ModalDialog>
  );
};
