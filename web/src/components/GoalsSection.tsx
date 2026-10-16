import React, { useState } from 'react';
import type { Goal } from '../types';
import { ApiService } from '../services/api';
import { Calendar, Plus, ShieldAlert, Code, Heart, X } from 'lucide-react';

interface GoalsSectionProps {
  goals: Goal[];
  onRefresh: () => void;
}

export const GoalsSection: React.FC<GoalsSectionProps> = ({ goals, onRefresh }) => {
  const [filter, setFilter] = useState<'All' | 'Technical' | 'Personal'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [readOnlyNotice, setReadOnlyNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Technical' | 'Personal'>('Technical');
  const [newDescription, setNewDescription] = useState('');

  const filteredGoals = goals.filter((g) => {
    if (filter === 'All') return true;
    return g.category === filter;
  });

  const handleCreateAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setReadOnlyNotice(null);

    const result = await ApiService.createGoal({
      title: newTitle || 'New Candidate Goal',
      description: newDescription || 'Test goal for guest write protection',
      category: newCategory,
      progress: 25,
      targetDate: '2027',
      status: 'Upcoming',
      tags: ['Demo', newCategory],
    });

    setIsSubmitting(false);

    if (result.status === 403 || !result.success) {
      setReadOnlyNotice(
        result.message || 'Guest accounts have read-only demo access. Writes are protected by ASP.NET Core authorization policies.'
      );
    } else {
      setIsModalOpen(false);
      onRefresh();
    }
  };

  return (
    <div style={{ marginBottom: '36px' }}>
      {/* Section Header & Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
              Architecture & Life Goals
            </h2>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              Pre-Seeded Active State
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Technical initiatives and personal milestones tracked with progress telemetry
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Category Filter Chips */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => setFilter('All')}
              style={{
                background: filter === 'All' ? 'var(--accent-indigo)' : 'transparent',
                color: filter === 'All' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              All ({goals.length})
            </button>
            <button
              onClick={() => setFilter('Technical')}
              style={{
                background: filter === 'Technical' ? 'var(--accent-indigo)' : 'transparent',
                color: filter === 'Technical' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s'
              }}
            >
              <Code size={13} />
              <span>Technical ({goals.filter(g => g.category === 'Technical').length})</span>
            </button>
            <button
              onClick={() => setFilter('Personal')}
              style={{
                background: filter === 'Personal' ? 'var(--accent-indigo)' : 'transparent',
                color: filter === 'Personal' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s'
              }}
            >
              <Heart size={13} />
              <span>Personal ({goals.filter(g => g.category === 'Personal').length})</span>
            </button>
          </div>

          {/* Add Goal Action Button */}
          <button
            onClick={() => {
              setReadOnlyNotice(null);
              setIsModalOpen(true);
            }}
            className="btn-primary"
            id="btn-add-goal"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Add Goal</span>
          </button>
        </div>
      </div>

      {/* Goal Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {filteredGoals.map((goal) => (
          <div
            key={goal.id}
            className="glass-panel"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span
                  className={goal.category === 'Technical' ? 'badge badge-cyan' : 'badge badge-amber'}
                  style={{ fontSize: '0.7rem' }}
                >
                  {goal.category}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Calendar size={13} />
                  <span>{goal.targetDate}</span>
                </div>
              </div>

              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>
                {goal.title}
              </h3>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                {goal.description}
              </p>
            </div>

            <div>
              {/* Progress Bar & Percentage */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Progress</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{goal.progress}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${goal.progress}%`,
                      background: goal.category === 'Technical' ? 'var(--cyan-gradient)' : 'var(--emerald-gradient)'
                    }}
                  />
                </div>
              </div>

              {/* Tag Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {goal.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-muted)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Goal Modal / Guest Write Protection Demo */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            background: 'var(--bg-surface)',
            padding: '30px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-glow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={22} color="var(--accent-indigo)" />
                <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Add New Architecture Goal</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Read-Only Notice (Triggered on 403 Forbidden) */}
            {readOnlyNotice && (
              <div style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                marginBottom: '18px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <ShieldAlert size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fca5a5' }}>
                    ASP.NET Core 403 Forbidden Policy
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#fecaca', lineHeight: 1.4, marginTop: '2px' }}>
                    {readOnlyNotice}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateAttempt}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Goal Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus in .NET 10"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as 'Technical' | 'Personal')}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#1e293b',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="Technical">Technical Architecture</option>
                  <option value="Personal">Personal Milestone</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe architectural scope or training schedule..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  id="btn-submit-goal"
                >
                  {isSubmitting ? 'Evaluating Authorization...' : 'Submit to API (Test Write Lock)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
