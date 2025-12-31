/**
 * Player form page for creating and editing players.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createPlayer, getPlayer, updatePlayer } from '../../services/players';
import type { Player, PlayerCreate } from '../../types/player';

/**
 * Position options for the dropdown.
 */
const POSITION_OPTIONS = [
  { value: '', label: 'Select Position' },
  { value: 'C', label: 'Catcher (C)' },
  { value: '1B', label: 'First Base (1B)' },
  { value: '2B', label: 'Second Base (2B)' },
  { value: '3B', label: 'Third Base (3B)' },
  { value: 'SS', label: 'Shortstop (SS)' },
  { value: 'LF', label: 'Left Field (LF)' },
  { value: 'CF', label: 'Center Field (CF)' },
  { value: 'RF', label: 'Right Field (RF)' },
  { value: 'DH', label: 'Designated Hitter (DH)' },
  { value: 'P', label: 'Pitcher (P)' },
];

/**
 * Initial form state for creating a new player.
 */
const initialFormData: PlayerCreate = {
  player_name: '',
  position: '',
  games: undefined,
  at_bats: undefined,
  runs: undefined,
  hits: undefined,
  doubles: undefined,
  triples: undefined,
  home_runs: undefined,
  rbis: undefined,
  walks: undefined,
  strikeouts: undefined,
  stolen_bases: undefined,
  caught_stealing: undefined,
  batting_average: '',
  on_base_percentage: '',
  slugging_percentage: '',
  ops: '',
};

export function PlayerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<PlayerCreate>(initialFormData);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayer = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const player: Player = await getPlayer(id);
      setFormData({
        player_name: player.player_name,
        position: player.position || '',
        games: player.games ?? undefined,
        at_bats: player.at_bats ?? undefined,
        runs: player.runs ?? undefined,
        hits: player.hits ?? undefined,
        doubles: player.doubles ?? undefined,
        triples: player.triples ?? undefined,
        home_runs: player.home_runs ?? undefined,
        rbis: player.rbis ?? undefined,
        walks: player.walks ?? undefined,
        strikeouts: player.strikeouts ?? undefined,
        stolen_bases: player.stolen_bases ?? undefined,
        caught_stealing: player.caught_stealing ?? undefined,
        batting_average: player.batting_average || '',
        on_base_percentage: player.on_base_percentage || '',
        slugging_percentage: player.slugging_percentage || '',
        ops: player.ops || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load player');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditing) {
      fetchPlayer();
    }
  }, [isEditing, fetchPlayer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : Number(value)) : value,
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.player_name.trim()) {
      setError('Player name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setError(null);

    try {
      // Clean up empty strings to undefined
      const cleanedData: PlayerCreate = {
        ...formData,
        position: formData.position || undefined,
        batting_average: formData.batting_average || undefined,
        on_base_percentage: formData.on_base_percentage || undefined,
        slugging_percentage: formData.slugging_percentage || undefined,
        ops: formData.ops || undefined,
      };

      if (isEditing && id) {
        await updatePlayer(id, cleanedData);
        navigate(`/players/${id}`);
      } else {
        const created = await createPlayer(cleanedData);
        navigate(`/players/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save player');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to={isEditing ? `/players/${id}` : '/players'}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {isEditing ? 'Back to player' : 'Back to players'}
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          {isEditing ? 'Edit Player' : 'Add New Player'}
        </h1>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="player_name" className="block text-sm font-medium text-gray-700">
                Player Name *
              </label>
              <input
                id="player_name"
                name="player_name"
                type="text"
                required
                value={formData.player_name}
                onChange={handleChange}
                className="input mt-1"
                placeholder="Mike Trout"
              />
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                Position
              </label>
              <select
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="input mt-1"
              >
                {POSITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Game Stats */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">Game Statistics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="games" className="block text-sm font-medium text-gray-700">
                Games
              </label>
              <input
                id="games"
                name="games"
                type="number"
                min="0"
                value={formData.games ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="at_bats" className="block text-sm font-medium text-gray-700">
                At Bats
              </label>
              <input
                id="at_bats"
                name="at_bats"
                type="number"
                min="0"
                value={formData.at_bats ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="runs" className="block text-sm font-medium text-gray-700">
                Runs
              </label>
              <input
                id="runs"
                name="runs"
                type="number"
                min="0"
                value={formData.runs ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="hits" className="block text-sm font-medium text-gray-700">
                Hits
              </label>
              <input
                id="hits"
                name="hits"
                type="number"
                min="0"
                value={formData.hits ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="doubles" className="block text-sm font-medium text-gray-700">
                Doubles
              </label>
              <input
                id="doubles"
                name="doubles"
                type="number"
                min="0"
                value={formData.doubles ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="triples" className="block text-sm font-medium text-gray-700">
                Triples
              </label>
              <input
                id="triples"
                name="triples"
                type="number"
                min="0"
                value={formData.triples ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="home_runs" className="block text-sm font-medium text-gray-700">
                Home Runs
              </label>
              <input
                id="home_runs"
                name="home_runs"
                type="number"
                min="0"
                value={formData.home_runs ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="rbis" className="block text-sm font-medium text-gray-700">
                RBIs
              </label>
              <input
                id="rbis"
                name="rbis"
                type="number"
                min="0"
                value={formData.rbis ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="walks" className="block text-sm font-medium text-gray-700">
                Walks
              </label>
              <input
                id="walks"
                name="walks"
                type="number"
                min="0"
                value={formData.walks ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="strikeouts" className="block text-sm font-medium text-gray-700">
                Strikeouts
              </label>
              <input
                id="strikeouts"
                name="strikeouts"
                type="number"
                min="0"
                value={formData.strikeouts ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="stolen_bases" className="block text-sm font-medium text-gray-700">
                Stolen Bases
              </label>
              <input
                id="stolen_bases"
                name="stolen_bases"
                type="number"
                min="0"
                value={formData.stolen_bases ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>

            <div>
              <label htmlFor="caught_stealing" className="block text-sm font-medium text-gray-700">
                Caught Stealing
              </label>
              <input
                id="caught_stealing"
                name="caught_stealing"
                type="number"
                min="0"
                value={formData.caught_stealing ?? ''}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Batting Averages */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">Batting Averages</h2>
          <p className="mt-1 text-sm text-gray-500">
            Enter as decimal (e.g., .300 for 30%)
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="batting_average" className="block text-sm font-medium text-gray-700">
                Batting Average
              </label>
              <input
                id="batting_average"
                name="batting_average"
                type="text"
                value={formData.batting_average}
                onChange={handleChange}
                className="input mt-1"
                placeholder=".300"
              />
            </div>

            <div>
              <label htmlFor="on_base_percentage" className="block text-sm font-medium text-gray-700">
                On-Base Percentage
              </label>
              <input
                id="on_base_percentage"
                name="on_base_percentage"
                type="text"
                value={formData.on_base_percentage}
                onChange={handleChange}
                className="input mt-1"
                placeholder=".400"
              />
            </div>

            <div>
              <label htmlFor="slugging_percentage" className="block text-sm font-medium text-gray-700">
                Slugging Percentage
              </label>
              <input
                id="slugging_percentage"
                name="slugging_percentage"
                type="text"
                value={formData.slugging_percentage}
                onChange={handleChange}
                className="input mt-1"
                placeholder=".500"
              />
            </div>

            <div>
              <label htmlFor="ops" className="block text-sm font-medium text-gray-700">
                OPS
              </label>
              <input
                id="ops"
                name="ops"
                type="text"
                value={formData.ops}
                onChange={handleChange}
                className="input mt-1"
                placeholder=".900"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            to={isEditing ? `/players/${id}` : '/players'}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Player'}
          </button>
        </div>
      </form>
    </div>
  );
}
