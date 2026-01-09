/**
 * Player list page with table display, search, and pagination.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getPlayers } from '../../services/players';
import type { Player, PlayerListParams, PlayerListResponse } from '../../types/player';

/**
 * Format stat value for display, handling null values.
 */
function formatStat(value: number | string | null): string {
  if (value === null) return '-';
  return String(value);
}

/**
 * Position filter options.
 */
const POSITION_OPTIONS = [
  { value: '', label: 'All Positions' },
  { value: 'C', label: 'Catcher' },
  { value: '1B', label: 'First Base' },
  { value: '2B', label: 'Second Base' },
  { value: '3B', label: 'Third Base' },
  { value: 'SS', label: 'Shortstop' },
  { value: 'LF', label: 'Left Field' },
  { value: 'CF', label: 'Center Field' },
  { value: 'RF', label: 'Right Field' },
  { value: 'DH', label: 'Designated Hitter' },
  { value: 'P', label: 'Pitcher' },
];

/**
 * Sort options for the table.
 */
const SORT_OPTIONS = [
  { value: 'player_name', label: 'Name' },
  { value: 'batting_average', label: 'Batting Average' },
  { value: 'home_runs', label: 'Home Runs' },
  { value: 'rbis', label: 'RBIs' },
  { value: 'hits', label: 'Hits' },
  { value: 'runs', label: 'Runs' },
  { value: 'hits_per_game', label: 'Hits/Game' },
];

export function PlayerListPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Filter and sort state
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [sortBy, setSortBy] = useState('player_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const pageSize = 10;

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: PlayerListParams = {
      page: currentPage,
      page_size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
    };

    if (search) params.search = search;
    if (position) params.position = position;

    try {
      const response: PlayerListResponse = await getPlayers(params);
      setPlayers(response.items);
      setTotalPages(response.pages);
      setTotalPlayers(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, position, sortBy, sortOrder]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handlePositionChange = (value: string) => {
    setPosition(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    if (value === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(value);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Players</h1>
        <Link to="/players/new" className="btn-primary">
          Add Player
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              id="search"
              type="text"
              className="input mt-1"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700">
              Position
            </label>
            <select
              id="position"
              className="input mt-1"
              value={position}
              onChange={(e) => handlePositionChange(e.target.value)}
            >
              {POSITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700">
              Sort By
            </label>
            <div className="mt-1 flex gap-2">
              <select
                id="sortBy"
                className="input flex-1"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      )}

      {/* Players table */}
      {!loading && !error && (
        <>
          {players.length === 0 ? (
            <div className="card text-center">
              <p className="text-gray-600">No players found.</p>
              {(search || position) && (
                <p className="mt-2 text-sm text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Position
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      G
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      AB
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      H
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      HR
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      RBI
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      AVG
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      OPS
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      H/G
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {players.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <Link
                          to={`/players/${player.id}`}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {player.player_name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {player.position || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">
                        {formatStat(player.games)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">
                        {formatStat(player.at_bats)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">
                        {formatStat(player.hits)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">
                        {formatStat(player.home_runs)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">
                        {formatStat(player.rbis)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">
                        {formatStat(player.batting_average)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">
                        {formatStat(player.ops)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-600">
                        {formatStat(player.hits_per_game)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, totalPlayers)} of {totalPlayers} players
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="flex items-center px-3 text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
