import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TagsScreen } from '../../../src/ui/screens/manager/TagsScreen';
import * as tagsApi from '../../../src/api/tags';

vi.mock('../../../src/api/tags', () => ({
  listTags: vi.fn(),
  listAiSuggestions: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(tagsApi.listTags).mockResolvedValue([
    { id: 't1', vendor_id: 'v1', name: 'Halal', featured: true, position: 0, product_count: 379 },
    { id: 't2', vendor_id: 'v1', name: 'Imported', featured: true, position: 1, product_count: 142 },
    { id: 't3', vendor_id: 'v1', name: 'UHT', featured: false, position: 2, product_count: 42 },
  ]);
  vi.mocked(tagsApi.listAiSuggestions).mockResolvedValue([
    { id: 'ai1', name: 'Organic', coverage_pct: 65, rationale: '65% of your products qualify for Organic.' },
  ]);
  vi.mocked(tagsApi.createTag).mockResolvedValue({ id: 't4', vendor_id: 'v1', name: 'Organic', featured: true, position: 3 });
  vi.mocked(tagsApi.updateTag).mockResolvedValue({ id: 't1', vendor_id: 'v1', name: 'Halal', featured: false, position: 0 });
});

describe('TagsScreen', () => {
  it('renders featured and all-tags sections with correct tags', async () => {
    render(<MemoryRouter><TagsScreen /></MemoryRouter>);

    await waitFor(() => {
      // Featured section heading
      expect(screen.getByRole('heading', { name: /featured tags/i })).toBeInTheDocument();
      // All tags section heading
      expect(screen.getByRole('heading', { name: /all tags/i })).toBeInTheDocument();
      // Featured tags are visible
      expect(screen.getByText('Halal')).toBeInTheDocument();
      expect(screen.getByText('Imported')).toBeInTheDocument();
      // Non-featured tag is visible in all-tags section
      expect(screen.getByText('UHT')).toBeInTheDocument();
    });
  });

  it('AI banner accept button calls createTag with featured:true then drops suggestion', async () => {
    render(<MemoryRouter><TagsScreen /></MemoryRouter>);

    const acceptBtn = await screen.findByRole('button', { name: /\+ Add tag/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(tagsApi.createTag).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Organic', featured: true }),
      );
    });
  });
});
