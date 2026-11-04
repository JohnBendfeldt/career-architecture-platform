import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AiSkillExtractorTab } from '../components/AiSkillExtractorTab';

describe('AiSkillExtractorTab Component', () => {
  it('renders the extraction interface and textarea', async () => {
    await act(async () => {
      render(<AiSkillExtractorTab />);
    });

    expect(screen.getByText(/AI Skill Extraction & Automated Curriculum/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Extract Skills via AI/i })).toBeDefined();
    expect(screen.getByText(/Extracted Skill Tokens/i)).toBeDefined();
  });

  it('renders initial skill tokens and allows switching the active skill', async () => {
    await act(async () => {
      render(<AiSkillExtractorTab />);
    });

    const reactToken = screen.getByRole('button', { name: /React & TypeScript/i });
    expect(reactToken).toBeDefined();

    await act(async () => {
      fireEvent.click(reactToken);
    });

    // Right column heading should update to active skill
    const heading = screen.getByRole('heading', { level: 3, name: /React & TypeScript/i });
    expect(heading).toBeDefined();
  });
});
