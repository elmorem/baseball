/**
 * Tests for PlayerFormPage component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { PlayerFormPage } from '../PlayerFormPage';
import * as playersService from '../../../services/players';
import { mockPlayer } from '../../../test/mockData/players';

// Mock the players service
vi.mock('../../../services/players', () => ({
  getPlayer: vi.fn(),
  createPlayer: vi.fn(),
  updatePlayer: vi.fn(),
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
 * Render PlayerFormPage for creating new player.
 */
function renderCreatePage() {
  return render(
    <MemoryRouter initialEntries={['/players/new']}>
      <Routes>
        <Route path="/players/new" element={<PlayerFormPage />} />
      </Routes>
    </MemoryRouter>
  );
}

/**
 * Render PlayerFormPage for editing existing player.
 */
function renderEditPage(playerId: string) {
  return render(
    <MemoryRouter initialEntries={[`/players/${playerId}/edit`]}>
      <Routes>
        <Route path="/players/:id/edit" element={<PlayerFormPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PlayerFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Create Mode', () => {
    it('should render create form with correct title', async () => {
      renderCreatePage();

      expect(screen.getByRole('heading', { name: /add new player/i })).toBeInTheDocument();
    });

    it('should have empty form fields initially', async () => {
      renderCreatePage();

      const nameInput = screen.getByLabelText(/player name/i);
      expect(nameInput).toHaveValue('');

      const positionSelect = screen.getByLabelText(/position/i);
      expect(positionSelect).toHaveValue('');
    });

    it('should have back to players link', async () => {
      renderCreatePage();

      const backLink = screen.getByRole('link', { name: /back to players/i });
      expect(backLink).toHaveAttribute('href', '/players');
    });

    it('should show create player button', async () => {
      renderCreatePage();

      expect(screen.getByRole('button', { name: /create player/i })).toBeInTheDocument();
    });

    it('should require player name field', async () => {
      renderCreatePage();

      // The player name field should be required via HTML5 validation
      const nameInput = screen.getByLabelText(/player name/i);
      expect(nameInput).toBeRequired();
    });

    it('should call createPlayer with form data', async () => {
      const newPlayer = { ...mockPlayer, id: 'new-id' };
      vi.mocked(playersService.createPlayer).mockResolvedValue(newPlayer);

      renderCreatePage();

      // Fill in required field
      const nameInput = screen.getByLabelText(/player name/i);
      await userEvent.type(nameInput, 'New Player');

      // Select position
      const positionSelect = screen.getByLabelText(/position/i);
      await userEvent.selectOptions(positionSelect, 'SS');

      // Fill in some stats
      const gamesInput = screen.getByLabelText(/^games$/i);
      await userEvent.type(gamesInput, '100');

      // Submit
      const submitButton = screen.getByRole('button', { name: /create player/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(playersService.createPlayer).toHaveBeenCalledWith(
          expect.objectContaining({
            player_name: 'New Player',
            position: 'SS',
            games: 100,
          })
        );
      });
    });

    it('should navigate to player detail after successful create', async () => {
      const newPlayer = { ...mockPlayer, id: 'created-id' };
      vi.mocked(playersService.createPlayer).mockResolvedValue(newPlayer);

      renderCreatePage();

      const nameInput = screen.getByLabelText(/player name/i);
      await userEvent.type(nameInput, 'New Player');

      const submitButton = screen.getByRole('button', { name: /create player/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/players/created-id');
      });
    });

    it('should show saving state on button', async () => {
      vi.mocked(playersService.createPlayer).mockImplementation(
        () => new Promise(() => {})
      );

      renderCreatePage();

      const nameInput = screen.getByLabelText(/player name/i);
      await userEvent.type(nameInput, 'New Player');

      const submitButton = screen.getByRole('button', { name: /create player/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
      });
    });

    it('should show error on API failure', async () => {
      vi.mocked(playersService.createPlayer).mockRejectedValue(new Error('API Error'));

      renderCreatePage();

      const nameInput = screen.getByLabelText(/player name/i);
      await userEvent.type(nameInput, 'New Player');

      const submitButton = screen.getByRole('button', { name: /create player/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/api error/i)).toBeInTheDocument();
      });
    });

    it('should have all position options', async () => {
      renderCreatePage();

      const positionSelect = screen.getByLabelText(/position/i);
      expect(positionSelect).toContainHTML('Catcher');
      expect(positionSelect).toContainHTML('Shortstop');
      expect(positionSelect).toContainHTML('Center Field');
      expect(positionSelect).toContainHTML('Pitcher');
    });
  });

  describe('Edit Mode', () => {
    it('should show loading state initially', async () => {
      vi.mocked(playersService.getPlayer).mockImplementation(
        () => new Promise(() => {})
      );

      renderEditPage(mockPlayer.id);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render edit form with correct title', async () => {
      vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

      renderEditPage(mockPlayer.id);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit player/i })).toBeInTheDocument();
      });
    });

    it('should populate form with player data', async () => {
      vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

      renderEditPage(mockPlayer.id);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/player name/i);
        expect(nameInput).toHaveValue('Mike Trout');
      });

      const positionSelect = screen.getByLabelText(/position/i);
      expect(positionSelect).toHaveValue('CF');

      const gamesInput = screen.getByLabelText(/^games$/i);
      expect(gamesInput).toHaveValue(134);
    });

    it('should have back to player link', async () => {
      vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

      renderEditPage(mockPlayer.id);

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to player/i });
        expect(backLink).toHaveAttribute('href', `/players/${mockPlayer.id}`);
      });
    });

    it('should show save changes button', async () => {
      vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

      renderEditPage(mockPlayer.id);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });
    });

    it('should call updatePlayer with form data', async () => {
      vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);
      vi.mocked(playersService.updatePlayer).mockResolvedValue(mockPlayer);

      renderEditPage(mockPlayer.id);

      await waitFor(() => {
        expect(screen.getByLabelText(/player name/i)).toHaveValue('Mike Trout');
      });

      // Modify a field
      const homeRunsInput = screen.getByLabelText(/home runs/i);
      await userEvent.clear(homeRunsInput);
      await userEvent.type(homeRunsInput, '50');

      // Submit
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(playersService.updatePlayer).toHaveBeenCalledWith(
          mockPlayer.id,
          expect.objectContaining({
            home_runs: 50,
          })
        );
      });
    });

    it('should navigate to player detail after successful update', async () => {
      vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);
      vi.mocked(playersService.updatePlayer).mockResolvedValue(mockPlayer);

      renderEditPage(mockPlayer.id);

      await waitFor(() => {
        expect(screen.getByLabelText(/player name/i)).toHaveValue('Mike Trout');
      });

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(`/players/${mockPlayer.id}`);
      });
    });

    it('should show error when fetch fails', async () => {
      vi.mocked(playersService.getPlayer).mockRejectedValue(new Error('Fetch Error'));

      renderEditPage(mockPlayer.id);

      await waitFor(() => {
        expect(screen.getByText(/fetch error/i)).toBeInTheDocument();
      });
    });

    it('should have cancel link to player detail', async () => {
      vi.mocked(playersService.getPlayer).mockResolvedValue(mockPlayer);

      renderEditPage(mockPlayer.id);

      await waitFor(() => {
        const cancelLink = screen.getByRole('link', { name: /cancel/i });
        expect(cancelLink).toHaveAttribute('href', `/players/${mockPlayer.id}`);
      });
    });
  });

  describe('Form Sections', () => {
    it('should render basic information section', async () => {
      renderCreatePage();

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });

    it('should render game statistics section', async () => {
      renderCreatePage();

      expect(screen.getByText('Game Statistics')).toBeInTheDocument();
    });

    it('should render batting averages section', async () => {
      renderCreatePage();

      expect(screen.getByText('Batting Averages')).toBeInTheDocument();
    });

    it('should have all stat input fields', async () => {
      renderCreatePage();

      expect(screen.getByLabelText(/^games$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/at bats/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^runs$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^hits$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/doubles/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/triples/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/home runs/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rbis/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/walks/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/strikeouts/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/stolen bases/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/caught stealing/i)).toBeInTheDocument();
    });

    it('should have batting average fields', async () => {
      renderCreatePage();

      expect(screen.getByLabelText(/batting average/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/on-base percentage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/slugging percentage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^ops$/i)).toBeInTheDocument();
    });
  });
});
