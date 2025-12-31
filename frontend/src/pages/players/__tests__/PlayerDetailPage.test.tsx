/**
 * Tests for PlayerDetailPage component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { PlayerDetailPage } from '../PlayerDetailPage';
import * as playersService from '../../../services/players';
import { mockPlayer } from '../../../test/mockData/players';

// Mock the players service
vi.mock('../../../services/players', () => ({
  getPlayer: vi.fn(),
  deletePlayer: vi.fn(),
  generateDescription: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

/**
 * Render PlayerDetailPage with route params.
 */
function renderDetailPage(playerId: string) {
  return render(
    <MemoryRouter initialEntries={[`/players/${playerId}`]}>
      <Routes>
        <Route path="/players/:id" element={<PlayerDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PlayerDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should show loading state initially', async () => {
    vi.mocked(playersService.getPlayer).mockImplementation(
      () => new Promise(() => {})
    );

    renderDetailPage('123');

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should display player name and position after loading', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Mike Trout' })).toBeInTheDocument();
    });

    expect(screen.getByText('CF')).toBeInTheDocument();
  });

  it('should display all player statistics', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    // Check stats are displayed
    expect(screen.getByText('134')).toBeInTheDocument(); // Games
    expect(screen.getByText('470')).toBeInTheDocument(); // At Bats
    expect(screen.getByText('40')).toBeInTheDocument(); // Home Runs
    expect(screen.getByText('.313')).toBeInTheDocument(); // Batting Average
    expect(screen.getByText('1.004')).toBeInTheDocument(); // OPS
  });

  it('should display batting averages section', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    expect(screen.getByText('Batting Averages')).toBeInTheDocument();
    expect(screen.getByText('.419')).toBeInTheDocument(); // OBP
    expect(screen.getByText('.585')).toBeInTheDocument(); // SLG
  });

  it('should show error message when API fails', async () => {
    vi.mocked(playersService.getPlayer).mockRejectedValue(new Error('API Error'));

    renderDetailPage('123');

    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });
  });

  it('should have edit player link', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const editLink = screen.getByRole('link', { name: /edit player/i });
    expect(editLink).toHaveAttribute('href', `/players/${mockPlayer.id}/edit`);
  });

  it('should have back to players link', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const backLink = screen.getByRole('link', { name: /back to players/i });
    expect(backLink).toHaveAttribute('href', '/players');
  });

  it('should show delete confirmation modal when clicking delete', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /^delete$/i });
    await userEvent.click(deleteButton);

    expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should close delete modal when clicking cancel', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    // Open modal
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

    // Close modal
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });
  });

  it('should delete player and navigate when confirmed', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);
    vi.mocked(playersService.deletePlayer).mockResolvedValue(undefined);

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    // Open modal
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    // Find the confirm delete button within the modal (the red one)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    // The confirm button is the one inside the modal with red styling
    const confirmButton = deleteButtons.find(
      (btn) => btn.classList.contains('bg-red-600')
    );
    expect(confirmButton).toBeDefined();
    await userEvent.click(confirmButton!);

    await waitFor(() => {
      expect(playersService.deletePlayer).toHaveBeenCalledWith(mockPlayer.id);
      expect(mockNavigate).toHaveBeenCalledWith('/players');
    });
  });

  it('should show empty descriptions message when no descriptions', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue({
      ...mockPlayer,
      descriptions: [],
    });

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    expect(screen.getByText(/no ai descriptions yet/i)).toBeInTheDocument();
  });

  it('should display AI descriptions when present', async () => {
    const playerWithDescriptions = {
      ...mockPlayer,
      descriptions: [
        {
          id: 'desc-1',
          content: 'Mike Trout is an excellent center fielder.',
          model_used: 'gpt-4o-mini',
          tokens_used: 150,
          cost_usd: '0.0003',
          created_at: '2024-01-15T10:30:00Z',
        },
      ],
    };
    vi.mocked(playersService.getPlayer).mockResolvedValue(playerWithDescriptions);

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    expect(screen.getByText(/excellent center fielder/i)).toBeInTheDocument();
    expect(screen.getByText(/gpt-4o-mini/i)).toBeInTheDocument();
  });

  it('should call generateDescription when clicking generate button', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);
    vi.mocked(playersService.generateDescription).mockResolvedValue({
      ...mockPlayer,
      descriptions: [
        {
          id: 'new-desc',
          content: 'Generated description',
          model_used: 'gpt-4o-mini',
          tokens_used: 100,
          cost_usd: '0.0002',
          created_at: '2024-01-20T12:00:00Z',
        },
      ],
    });

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /generate new description/i });
    await userEvent.click(generateButton);

    await waitFor(() => {
      expect(playersService.generateDescription).toHaveBeenCalledWith(mockPlayer.id);
    });
  });

  it('should show generating state on button', async () => {
    vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);
    vi.mocked(playersService.generateDescription).mockImplementation(
      () => new Promise(() => {})
    );

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const generateButton = screen.getByRole('button', { name: /generate new description/i });
    await userEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument();
    });
  });

  it('should display dash for null stat values', async () => {
    const playerWithNulls = {
      ...mockPlayer,
      games: null,
      home_runs: null,
    };
    vi.mocked(playersService.getPlayer).mockResolvedValue(playerWithNulls);

    renderDetailPage(mockPlayer.id);

    await waitFor(() => {
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });

    const dashCells = screen.getAllByText('-');
    expect(dashCells.length).toBeGreaterThan(0);
  });
});
