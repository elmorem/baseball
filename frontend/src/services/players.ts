/**
 * Players API service.
 */

import { apiClient } from '../lib/api';
import type {
  Player,
  PlayerCreate,
  PlayerListParams,
  PlayerListResponse,
  PlayerUpdate,
} from '../types/player';

const API_PREFIX = '/api/v1/players';

/**
 * Build query string from params object.
 */
function buildQueryString(params: PlayerListParams): string {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.append('page', params.page.toString());
  }
  if (params.page_size !== undefined) {
    searchParams.append('page_size', params.page_size.toString());
  }
  if (params.search) {
    searchParams.append('search', params.search);
  }
  if (params.position) {
    searchParams.append('position', params.position);
  }
  if (params.sort_by) {
    searchParams.append('sort_by', params.sort_by);
  }
  if (params.sort_order) {
    searchParams.append('sort_order', params.sort_order);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Get paginated list of players.
 */
export async function getPlayers(params: PlayerListParams = {}): Promise<PlayerListResponse> {
  const queryString = buildQueryString(params);
  const response = await apiClient.get<PlayerListResponse>(`${API_PREFIX}${queryString}`);
  return response.data;
}

/**
 * Get a single player by ID.
 */
export async function getPlayer(id: string): Promise<Player> {
  const response = await apiClient.get<Player>(`${API_PREFIX}/${id}`);
  return response.data;
}

/**
 * Create a new player.
 */
export async function createPlayer(data: PlayerCreate): Promise<Player> {
  const response = await apiClient.post<Player>(API_PREFIX, data);
  return response.data;
}

/**
 * Update an existing player.
 */
export async function updatePlayer(id: string, data: PlayerUpdate): Promise<Player> {
  const response = await apiClient.patch<Player>(`${API_PREFIX}/${id}`, data);
  return response.data;
}

/**
 * Delete a player.
 */
export async function deletePlayer(id: string): Promise<void> {
  await apiClient.delete(`${API_PREFIX}/${id}`);
}

/**
 * Generate AI description for a player.
 */
export async function generateDescription(id: string): Promise<Player> {
  const response = await apiClient.post<Player>(`${API_PREFIX}/${id}/generate-description`);
  return response.data;
}
