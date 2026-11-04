import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureTabs } from '../components/FeatureTabs';

describe('FeatureTabs Component', () => {
  it('renders all 4 main feature tabs with short labels', () => {
    const handleChangeTab = vi.fn();
    render(<FeatureTabs activeTab="experience" onChangeTab={handleChangeTab} goalsCount={6} />);

    expect(screen.getAllByText(/Experience & Resume/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Goals & Milestones/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI Skill Pipeline/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Garmin Geospatial/i).length).toBeGreaterThan(0);
  });

  it('triggers onChangeTab when a tab is clicked', () => {
    const handleChangeTab = vi.fn();
    render(<FeatureTabs activeTab="experience" onChangeTab={handleChangeTab} goalsCount={6} />);

    const aiTabButtons = screen.getAllByRole('button', { name: /AI Skill Pipeline/i });
    fireEvent.click(aiTabButtons[0]);
    expect(handleChangeTab).toHaveBeenCalledWith('ai');
  });

  it('toggles dropdown mode on button click for Windows scrollbar accessibility', () => {
    const handleChangeTab = vi.fn();
    render(<FeatureTabs activeTab="experience" onChangeTab={handleChangeTab} goalsCount={6} />);

    const toggleBtn = screen.getByTitle(/Switch to Dropdown View/i);
    expect(toggleBtn).toBeDefined();

    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Tabs View/i)).toBeDefined();
    expect(screen.getByText(/Select Portfolio View/i)).toBeDefined();
  });
});
