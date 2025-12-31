/**
 * Player types for the Baseball Stats application.
 */

/**
 * Player object from API
 */
export interface Player {
  id: string;
  player_name: string;
  position: string | null;
  games: number | null;
  at_bats: number | null;
  runs: number | null;
  hits: number | null;
  doubles: number | null;
  triples: number | null;
  home_runs: number | null;
  rbis: number | null;
  walks: number | null;
  strikeouts: number | null;
  stolen_bases: number | null;
  caught_stealing: number | null;
  batting_average: string | null;
  on_base_percentage: string | null;
  slugging_percentage: string | null;
  ops: string | null;
  created_at: string;
  updated_at: string;
  descriptions: PlayerDescription[];
}

/**
 * AI-generated player description
 */
export interface PlayerDescription {
  id: string;
  content: string;
  model_used: string | null;
  tokens_used: number | null;
  cost_usd: string | null;
  created_at: string;
}

/**
 * Paginated player list response
 */
export interface PlayerListResponse {
  items: Player[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/**
 * Player list query parameters
 */
export interface PlayerListParams {
  page?: number;
  page_size?: number;
  search?: string;
  position?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Player creation data
 */
export interface PlayerCreate {
  player_name: string;
  position?: string;
  games?: number;
  at_bats?: number;
  runs?: number;
  hits?: number;
  doubles?: number;
  triples?: number;
  home_runs?: number;
  rbis?: number;
  walks?: number;
  strikeouts?: number;
  stolen_bases?: number;
  caught_stealing?: number;
  batting_average?: string;
  on_base_percentage?: string;
  slugging_percentage?: string;
  ops?: string;
}

/**
 * Player update data (all fields optional)
 */
export type PlayerUpdate = Partial<PlayerCreate>;
