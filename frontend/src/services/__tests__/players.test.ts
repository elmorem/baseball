/**
 * Tests for players API service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { apiClient } from '../../lib/api';
import {
  getPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
  generateDescription,
} from '../players';
import { mockPlayer, mockPlayerListResponse } from '../../test/mockData/players';
import type { PlayerCreate, PlayerUpdate } from '../../types/player';

// Mock the API client
vi.mock('../../lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('players service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getPlayers', () => {
    it('should fetch players with default params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPlayerListResponse });

      const result = await getPlayers();

      expect(apiClient.get).toHaveBeenCalledWith('/players');
      expect(result).toEqual(mockPlayerListResponse);
    });

    it('should fetch players with search param', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPlayerListResponse });

      await getPlayers({ search: 'Mike' });

      expect(apiClient.get).toHaveBeenCalledWith('/players?search=Mike');
    });

    it('should fetch players with pagination params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPlayerListResponse });

      await getPlayers({ page: 2, page_size: 20 });

      expect(apiClient.get).toHaveBeenCalledWith('/players?page=2&page_size=20');
    });

    it('should fetch players with position filter', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPlayerListResponse });

      await getPlayers({ position: 'CF' });

      expect(apiClient.get).toHaveBeenCalledWith('/players?position=CF');
    });

    it('should fetch players with sort params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPlayerListResponse });

      await getPlayers({ sort_by: 'batting_average', sort_order: 'desc' });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/players?sort_by=batting_average&sort_order=desc'
      );
    });

    it('should fetch players with all params combined', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPlayerListResponse });

      await getPlayers({
        page: 1,
        page_size: 10,
        search: 'Trout',
        position: 'CF',
        sort_by: 'home_runs',
        sort_order: 'asc',
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/players?page=1&page_size=10&search=Trout&position=CF&sort_by=home_runs&sort_order=asc'
      );
    });
  });

  describe('getPlayer', () => {
    it('should fetch a single player by ID', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPlayer });

      const result = await getPlayer('123');

      expect(apiClient.get).toHaveBeenCalledWith('/players/123');
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('createPlayer', () => {
    it('should create a new player', async () => {
      const playerData: PlayerCreate = {
        player_name: 'New Player',
        position: 'SS',
        games: 100,
        at_bats: 350,
      };
      vi.mocked(apiClient.post).mockResolvedValue({ data: { ...mockPlayer, ...playerData } });

      const result = await createPlayer(playerData);

      expect(apiClient.post).toHaveBeenCalledWith('/players', playerData);
      expect(result.player_name).toBe('New Player');
    });
  });

  describe('updatePlayer', () => {
    it('should update an existing player', async () => {
      const updateData: PlayerUpdate = {
        home_runs: 45,
        rbis: 100,
      };
      vi.mocked(apiClient.patch).mockResolvedValue({
        data: { ...mockPlayer, ...updateData },
      });

      const result = await updatePlayer('123', updateData);

      expect(apiClient.patch).toHaveBeenCalledWith('/players/123', updateData);
      expect(result.home_runs).toBe(45);
      expect(result.rbis).toBe(100);
    });
  });

  describe('deletePlayer', () => {
    it('should delete a player', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({});

      await deletePlayer('123');

      expect(apiClient.delete).toHaveBeenCalledWith('/players/123');
    });
  });

  describe('generateDescription', () => {
    it('should generate AI description for a player', async () => {
      const playerWithDescription = {
        ...mockPlayer,
        descriptions: [
          {
            id: 'desc-1',
            content: 'Mike Trout is an excellent outfielder...',
            model_used: 'gpt-4o-mini',
            tokens_used: 150,
            cost_usd: '0.0003',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      };
      vi.mocked(apiClient.post).mockResolvedValue({ data: playerWithDescription });

      const result = await generateDescription('123');

      expect(apiClient.post).toHaveBeenCalledWith('/players/123/generate-description');
      expect(result.descriptions).toHaveLength(1);
      expect(result.descriptions[0]?.content).toContain('Mike Trout');
    });
  });
});
