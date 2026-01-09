/**
 * Tests for PlayerListPage component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PlayerListPage } from '../PlayerListPage';
import { renderWithRouter } from '../../../test/utils';
import * as playersService from '../../../services/players';
import {
  mockPlayerListResponse,
  mockEmptyPlayerListResponse,
  mockPaginatedPlayerListResponse,
} from '../../../test/mockData/players';

// Mock the players service
vi.mock('../../../services/players', () => ({
  getPlayers: vi.fn(),
}));

describe('PlayerListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render page title and add player button', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    expect(screen.getByRole('heading', { name: /players/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add player/i })).toBeInTheDocument();
  });

  it('should show loading state initially', async () => {
    vi.mocked(playersService.getPlayers).mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading state
    );

    renderWithRouter(<PlayerListPage />);

    // Loading spinner should be visible (check for animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should display players table after loading', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    expect(screen.getByText('Shohei Ohtani')).toBeInTheDocument();
    expect(screen.getByText('Aaron Judge')).toBeInTheDocument();
  });

  it('should display player statistics in table', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    // Check for Mike Trout's stats
    expect(screen.getByText('CF')).toBeInTheDocument(); // Position
    expect(screen.getByText('.313')).toBeInTheDocument(); // Batting average
    expect(screen.getByText('1.004')).toBeInTheDocument(); // OPS
  });

  it('should show empty state when no players found', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockEmptyPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText(/no players found/i)).toBeInTheDocument();
    });
  });

  it('should show filter hint when empty with filters', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockEmptyPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/no players found/i)).toBeInTheDocument();
    });

    // Type in search
    const searchInput = screen.getByPlaceholderText(/search by name/i);
    await userEvent.type(searchInput, 'Nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/try adjusting your search/i)).toBeInTheDocument();
    });
  });

  it('should show error message when API fails', async () => {
    vi.mocked(playersService.getPlayers).mockRejectedValue(new Error('API Error'));

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });
  });

  it('should call API with search param when user types', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name/i);
    await userEvent.type(searchInput, 'Mike');

    await waitFor(() => {
      expect(playersService.getPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Mike' })
      );
    });
  });

  it('should call API with position filter when changed', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const positionSelect = screen.getByLabelText(/position/i);
    await userEvent.selectOptions(positionSelect, 'CF');

    await waitFor(() => {
      expect(playersService.getPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ position: 'CF' })
      );
    });
  });

  it('should call API with sort param when changed', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText(/sort by/i);
    await userEvent.selectOptions(sortSelect, 'home_runs');

    await waitFor(() => {
      expect(playersService.getPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ sort_by: 'home_runs' })
      );
    });
  });

  it('should toggle sort order when clicking sort button', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    // Find the sort order toggle button by its content (↑ or ↓)
    const sortButton = screen.getByTitle(/ascending/i);
    expect(sortButton).toHaveTextContent('↑');

    await userEvent.click(sortButton);

    await waitFor(() => {
      expect(sortButton).toHaveTextContent('↓');
      expect(playersService.getPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ sort_order: 'desc' })
      );
    });
  });

  it('should display pagination controls when multiple pages', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPaginatedPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  it('should disable previous button on first page', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPaginatedPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const prevButton = screen.getByRole('button', { name: /previous/i });
    expect(prevButton).toBeDisabled();
  });

  it('should navigate to next page when clicking next', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPaginatedPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(playersService.getPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it('should show correct showing count text', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPaginatedPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    expect(screen.getByText(/showing 1 to 10 of 25 players/i)).toBeInTheDocument();
  });

  it('should have player name link to detail page', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const playerLink = screen.getByRole('link', { name: 'Mike Trout' });
    expect(playerLink).toHaveAttribute('href', '/players/123e4567-e89b-12d3-a456-426614174000');
  });

  it('should reset to page 1 when search changes', async () => {
    // Start on page 2
    vi.mocked(playersService.getPlayers)
      .mockResolvedValueOnce({
        ...mockPaginatedPlayerListResponse,
        page: 2,
      })
      .mockResolvedValue(mockPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    // Verify initial call
    expect(playersService.getPlayers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );

    // Type in search
    const searchInput = screen.getByPlaceholderText(/search by name/i);
    await userEvent.type(searchInput, 'Test');

    await waitFor(() => {
      // Should reset to page 1 when search changes
      expect(playersService.getPlayers).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

  it('should render all filter options', async () => {
    vi.mocked(playersService.getPlayers).mockResolvedValue(mockPlayerListResponse);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    // Check position options
    const positionSelect = screen.getByLabelText(/position/i);
    expect(positionSelect).toContainHTML('All Positions');
    expect(positionSelect).toContainHTML('Catcher');
    expect(positionSelect).toContainHTML('Shortstop');

    // Check sort options
    const sortSelect = screen.getByLabelText(/sort by/i);
    expect(sortSelect).toContainHTML('Name');
    expect(sortSelect).toContainHTML('Home Runs');
    expect(sortSelect).toContainHTML('Batting Average');
  });

  it('should display dash for null stat values', async () => {
    const playerWithNulls = {
      ...mockPlayerListResponse,
      items: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          player_name: 'Mike Trout',
          position: null,
          games: null,
          at_bats: null,
          runs: null,
          hits: null,
          doubles: null,
          triples: null,
          home_runs: null,
          rbis: null,
          walks: null,
          strikeouts: null,
          stolen_bases: null,
          caught_stealing: null,
          batting_average: null,
          on_base_percentage: null,
          slugging_percentage: null,
          ops: null,
          hits_per_game: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          descriptions: [],
        },
      ],
    };
    vi.mocked(playersService.getPlayers).mockResolvedValue(playerWithNulls);

    renderWithRouter(<PlayerListPage />);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    // The table should show dashes for null values
    const dashCells = screen.getAllByText('-');
    expect(dashCells.length).toBeGreaterThan(0);
  });
});
