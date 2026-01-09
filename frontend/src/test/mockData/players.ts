/**
 * Mock player data for tests.
 */

import type { Player, PlayerListResponse } from '../../types/player';

export const mockPlayer: Player = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  player_name: 'Mike Trout',
  position: 'CF',
  games: 134,
  at_bats: 470,
  runs: 85,
  hits: 147,
  doubles: 27,
  triples: 3,
  home_runs: 40,
  rbis: 90,
  walks: 78,
  strikeouts: 120,
  stolen_bases: 11,
  caught_stealing: 3,
  batting_average: '.313',
  on_base_percentage: '.419',
  slugging_percentage: '.585',
  ops: '1.004',
  hits_per_game: '1.097',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  descriptions: [],
};

export const mockPlayer2: Player = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  player_name: 'Shohei Ohtani',
  position: 'DH',
  games: 159,
  at_bats: 599,
  runs: 134,
  hits: 197,
  doubles: 38,
  triples: 8,
  home_runs: 54,
  rbis: 130,
  walks: 91,
  strikeouts: 167,
  stolen_bases: 59,
  caught_stealing: 5,
  batting_average: '.304',
  on_base_percentage: '.412',
  slugging_percentage: '.654',
  ops: '1.066',
  hits_per_game: '1.239',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  descriptions: [],
};

export const mockPlayer3: Player = {
  id: '323e4567-e89b-12d3-a456-426614174002',
  player_name: 'Aaron Judge',
  position: 'RF',
  games: 157,
  at_bats: 553,
  runs: 133,
  hits: 177,
  doubles: 28,
  triples: 0,
  home_runs: 58,
  rbis: 144,
  walks: 107,
  strikeouts: 158,
  stolen_bases: 3,
  caught_stealing: 2,
  batting_average: '.320',
  on_base_percentage: '.425',
  slugging_percentage: '.686',
  ops: '1.111',
  hits_per_game: '1.127',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  descriptions: [],
};

export const mockPlayers: Player[] = [mockPlayer, mockPlayer2, mockPlayer3];

export const mockPlayerListResponse: PlayerListResponse = {
  items: mockPlayers,
  total: 3,
  page: 1,
  page_size: 10,
  pages: 1,
};

export const mockEmptyPlayerListResponse: PlayerListResponse = {
  items: [],
  total: 0,
  page: 1,
  page_size: 10,
  pages: 0,
};

export const mockPaginatedPlayerListResponse: PlayerListResponse = {
  items: mockPlayers,
  total: 25,
  page: 1,
  page_size: 10,
  pages: 3,
};
