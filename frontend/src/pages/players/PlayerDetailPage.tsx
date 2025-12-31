/**
 * Player detail page showing full stats and AI descriptions.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { deletePlayer, generateDescription, getPlayer } from '../../services/players';
import type { Player } from '../../types/player';

/**
 * Format stat value for display.
 */
function formatStat(value: number | string | null, suffix = ''): string {
  if (value === null) return '-';
  return `${value}${suffix}`;
}

/**
 * Format date for display.
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchPlayer = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getPlayer(id);
      setPlayer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load player');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  const handleGenerateDescription = async () => {
    if (!id) return;

    setGenerating(true);
    try {
      const updated = await generateDescription(id);
      setPlayer(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate description');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);
    try {
      await deletePlayer(id);
      navigate('/players');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete player');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <Link to="/players" className="text-primary-600 hover:text-primary-700">
          ← Back to players
        </Link>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="space-y-4">
        <p className="text-gray-600">Player not found.</p>
        <Link to="/players" className="text-primary-600 hover:text-primary-700">
          ← Back to players
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/players" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to players
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{player.player_name}</h1>
          {player.position && (
            <p className="mt-1 text-lg text-gray-600">{player.position}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/players/${id}/edit`} className="btn-primary">
            Edit Player
          </Link>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="card max-w-md">
            <h3 className="text-lg font-semibold text-gray-900">Delete Player</h3>
            <p className="mt-2 text-gray-600">
              Are you sure you want to delete {player.player_name}? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900">Statistics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Games</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.games)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">At Bats</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.at_bats)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Runs</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.runs)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Hits</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.hits)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Doubles</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.doubles)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Triples</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.triples)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Home Runs</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.home_runs)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">RBIs</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.rbis)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Walks</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.walks)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Strikeouts</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.strikeouts)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Stolen Bases</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.stolen_bases)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Caught Stealing</dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900">
              {formatStat(player.caught_stealing)}
            </dd>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900">Batting Averages</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Batting Average</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {formatStat(player.batting_average)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">On-Base Percentage</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {formatStat(player.on_base_percentage)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Slugging Percentage</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {formatStat(player.slugging_percentage)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">OPS</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {formatStat(player.ops)}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* AI Descriptions */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">AI Descriptions</h2>
          <button
            type="button"
            onClick={handleGenerateDescription}
            disabled={generating}
            className="btn-primary disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate New Description'}
          </button>
        </div>

        {player.descriptions.length === 0 ? (
          <p className="mt-4 text-gray-600">
            No AI descriptions yet. Click the button above to generate one.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {player.descriptions.map((desc) => (
              <div key={desc.id} className="rounded-lg border border-gray-200 p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{desc.content}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>Model: {desc.model_used || 'Unknown'}</span>
                  {desc.tokens_used && <span>Tokens: {desc.tokens_used}</span>}
                  {desc.cost_usd && <span>Cost: ${desc.cost_usd}</span>}
                  <span>Generated: {formatDate(desc.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="text-sm text-gray-500">
        <p>Created: {formatDate(player.created_at)}</p>
        <p>Last updated: {formatDate(player.updated_at)}</p>
      </div>
    </div>
  );
}
