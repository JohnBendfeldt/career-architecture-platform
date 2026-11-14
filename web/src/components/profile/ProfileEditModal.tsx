import React, { useState, useEffect } from 'react';
import type { Profile } from '../../types';
import { Edit3, X } from 'lucide-react';
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
  const [editBio, setEditBio] = useState(profile.bio);
  const [editAvatar, setEditAvatar] = useState(profile.avatarUrl);
  const [editGithub, setEditGithub] = useState(profile.githubUrl);

  useEffect(() => {
    setEditName(profile.name);
    setEditSlug(profile.vanitySlug || currentSlug);
    setEditHeadline(profile.headline);
    setEditLocation(profile.location);
    setEditYears(profile.experienceYears);
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
        bio: editBio.trim().slice(0, 2000) || profile.bio,
        avatarUrl: safeAvatar,
        githubUrl: safeGithub
      });
    }
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
            <Edit3 size={20} color="var(--accent-crimson)" />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Customize My Profile</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSaveEdit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Display Name</label>
              <input
                type="text"
                maxLength={120}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Headline / Role</label>
              <input
                type="text"
                maxLength={200}
                value={editHeadline}
                onChange={(e) => setEditHeadline(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Location</label>
              <input
                type="text"
                maxLength={120}
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Years Exp.</label>
              <input
                type="number"
                min={0}
                max={80}
                value={editYears}
                onChange={(e) => setEditYears(Number(e.target.value))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Vanity Profile URL
            </label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <span style={{ padding: '9px 10px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRight: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                johnbendfeldt.com/profile/
              </span>
              <input
                type="text"
                maxLength={80}
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                placeholder="basic-english"
                style={{ flex: 1, padding: '9px 12px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 700, outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Avatar Image URL (Blank = Initials)
              </label>
              <input
                type="text"
                maxLength={2048}
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                placeholder="https://... or leave blank"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                GitHub URL
              </label>
              <input
                type="text"
                maxLength={2048}
                value={editGithub}
                onChange={(e) => setEditGithub(e.target.value)}
                placeholder="https://github.com/yourname"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Architectural Bio</label>
            <textarea
              rows={3}
              maxLength={2000}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem', resize: 'vertical' }}
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
      </div>
    </div>
  );
};
