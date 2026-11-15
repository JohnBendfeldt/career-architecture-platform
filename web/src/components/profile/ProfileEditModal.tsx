import React, { useState, useEffect } from 'react';
import type { Profile } from '../../types';
import { X } from 'lucide-react';
import { ModalDialog } from '../ui/ModalDialog';
import { isSafeImageUrl, sanitizeExternalUrl } from '../../utils/security';

interface ProfileEditModalProps {
  isOpen: boolean;
  profile: Profile;
  currentSlug: string;
  onClose: () => void;
  onSave?: (updated: Profile) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  profile,
  currentSlug,
  onClose,
  onSave
}) => {
  const [editName, setEditName] = useState(profile.name);
  const [editSlug, setEditSlug] = useState(profile.vanitySlug || currentSlug);
  const [editHeadline, setEditHeadline] = useState(profile.headline);
  const [editLocation, setEditLocation] = useState(profile.location);
  const [editYears, setEditYears] = useState(profile.experienceYears);
  const [editAnnualGoalHours, setEditAnnualGoalHours] = useState(profile.annualGoalHours ?? 45);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editAvatar, setEditAvatar] = useState(profile.avatarUrl);
  const [editGithub, setEditGithub] = useState(profile.githubUrl);

  useEffect(() => {
    setEditName(profile.name);
    setEditSlug(profile.vanitySlug || currentSlug);
    setEditHeadline(profile.headline);
    setEditLocation(profile.location);
    setEditYears(profile.experienceYears);
    setEditAnnualGoalHours(profile.annualGoalHours ?? 45);
    setEditBio(profile.bio);
    setEditAvatar(profile.avatarUrl);
    setEditGithub(profile.githubUrl);
  }, [profile, currentSlug]);

  if (!isOpen) return null;

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedSlug = editSlug.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || currentSlug;
    const rawAvatar = editAvatar.trim();
    const safeAvatar = isSafeImageUrl(rawAvatar) ? rawAvatar : '';
    const safeGithub = sanitizeExternalUrl(editGithub, sanitizeExternalUrl(profile.githubUrl, 'https://github.com'));
    if (onSave) {
      onSave({
        ...profile,
        name: editName.trim().slice(0, 120) || profile.name,
        vanitySlug: sanitizedSlug,
        headline: editHeadline.trim().slice(0, 200) || profile.headline,
        location: editLocation.trim().slice(0, 120) || profile.location,
        experienceYears: Math.max(0, Math.min(80, Number(editYears) || 1)),
        annualGoalHours: Math.max(1, Math.min(2000, Number(editAnnualGoalHours) || 45)),
        bio: editBio.trim().slice(0, 2000) || profile.bio,
        avatarUrl: safeAvatar,
        githubUrl: safeGithub
      });
    }
    onClose();
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="profile-edit-modal-title"
      maxWidth="560px"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 id="profile-edit-modal-title" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
          Customize My Profile
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="icon-btn"
          aria-label="Close profile editor"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSaveEdit}>
        <div className="modal-two-col-grid">
          <div>
            <label htmlFor="profile-display-name" className="form-label">Display Name</label>
            <input
              id="profile-display-name"
              type="text"
              maxLength={120}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div>
            <label htmlFor="profile-headline" className="form-label">Headline / Role</label>
            <input
              id="profile-headline"
              type="text"
              maxLength={200}
              value={editHeadline}
              onChange={(e) => setEditHeadline(e.target.value)}
              className="form-input"
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 135px', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label htmlFor="profile-location" className="form-label">Location</label>
            <input
              id="profile-location"
              type="text"
              maxLength={120}
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="profile-years-exp" className="form-label">Years Exp.</label>
            <input
              id="profile-years-exp"
              type="number"
              min={0}
              max={80}
              value={editYears}
              onChange={(e) => setEditYears(Number(e.target.value))}
              className="form-input"
            />
          </div>
          <div>
            <label htmlFor="profile-annual-goal-hours" className="form-label">
              Annual Goal (hrs)
            </label>
            <input
              id="profile-annual-goal-hours"
              type="number"
              min={1}
              max={2000}
              step={0.5}
              value={editAnnualGoalHours}
              onChange={(e) => setEditAnnualGoalHours(Number(e.target.value))}
              className="form-input"
            />
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label htmlFor="profile-vanity-slug" className="form-label">
            Vanity Profile URL
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-control)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden'
          }}>
            <span style={{
              padding: '9px 10px',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              background: 'var(--bg-inset)',
              borderRight: '1px solid var(--border-subtle)',
              whiteSpace: 'nowrap'
            }}>
              johnbendfeldt.com/profile/
            </span>
            <input
              id="profile-vanity-slug"
              type="text"
              maxLength={80}
              value={editSlug}
              onChange={(e) => setEditSlug(e.target.value)}
              placeholder="basic-english"
              style={{
                flex: 1,
                padding: '9px 12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600
              }}
            />
          </div>
        </div>

        <div className="modal-two-col-grid">
          <div>
            <label htmlFor="profile-avatar-url" className="form-label">
              Avatar Image URL (Blank = Initials)
            </label>
            <input
              id="profile-avatar-url"
              type="text"
              maxLength={2048}
              value={editAvatar}
              onChange={(e) => setEditAvatar(e.target.value)}
              placeholder="https://... or leave blank"
              className="form-input"
              style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <div>
            <label htmlFor="profile-github-url" className="form-label">
              GitHub URL
            </label>
            <input
              id="profile-github-url"
              type="text"
              maxLength={2048}
              value={editGithub}
              onChange={(e) => setEditGithub(e.target.value)}
              placeholder="https://github.com/yourname"
              className="form-input"
              style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="profile-bio" className="form-label">Architectural Bio</label>
          <textarea
            id="profile-bio"
            rows={3}
            maxLength={2000}
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            className="form-textarea"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save My Profile
          </button>
        </div>
      </form>
    </ModalDialog>
  );
};
