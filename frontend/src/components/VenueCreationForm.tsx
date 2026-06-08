/// <reference types="google.maps" />
import { useState, useEffect, useRef } from 'react';
import { loadMapsScript } from '../lib/maps';

export interface CreatedVenue {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  geoFenceRadius: number;
  isActive: boolean;
}

interface Props {
  onCreated: (venue: CreatedVenue) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors text-sm';

export default function VenueCreationForm({ onCreated, onCancel, submitLabel = 'Create venue' }: Props) {
  const [mapsReady, setMapsReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(50);
  const [locating, setLocating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadMapsScript().then(() => setMapsReady(true)).catch(() => {});
  }, []);

  async function handleSearch(input: string) {
    setSearchQuery(input);
    setPredictions([]);
    if (!input.trim() || !mapsReady) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }
      try {
        const { suggestions } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            sessionToken: sessionTokenRef.current,
          });
        setPredictions(suggestions ?? []);
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    }, 300);
  }

  async function handlePredictionSelect(suggestion: google.maps.places.AutocompleteSuggestion) {
    if (!suggestion.placePrediction) return;
    setPredictions([]);
    const place = suggestion.placePrediction.toPlace();
    try {
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      const displayName = place.displayName ?? '';
      setSearchQuery(displayName);
      setName(displayName);
      setAddress(place.formattedAddress ?? '');
      if (place.location) {
        setLat(place.location.lat());
        setLng(place.location.lng());
      }
      sessionTokenRef.current = null;
      setError('');
    } catch (err) {
      console.error('fetchFields error:', err);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setError('Could not get your location — check browser permissions');
        setLocating(false);
      },
    );
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!name.trim() || lat === null || lng === null) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), address: address || null, lat, lng, geoFenceRadius: radius }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create venue'); return; }
      setSearchQuery(''); setName(''); setAddress(''); setLat(null); setLng(null); setRadius(150);
      onCreated(data);
    } catch {
      setError('Failed to create venue. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-3'>

      {/* Location search */}
      <div>
      <label className='block text-xs text-gray-500 mb-1'>Location</label>
      <div className='relative'>
        <input
          type='text'
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          placeholder={mapsReady ? 'Search for a venue (e.g. Dance USA)' : 'Loading search…'}
          disabled={!mapsReady}
          className={inputClass + ' disabled:opacity-50'}
        />
        {predictions.length > 0 && (
          <ul className='absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl'>
            {predictions.map((s, i) => (
              <li
                key={i}
                onMouseDown={e => { e.preventDefault(); handlePredictionSelect(s); }}
                className='px-4 py-3 cursor-pointer hover:bg-gray-700 border-b border-gray-700 last:border-b-0 transition-colors'
              >
                <p className='text-sm text-white font-medium'>{s.placePrediction?.mainText?.text}</p>
                {s.placePrediction?.secondaryText?.text && (
                  <p className='text-xs text-gray-400 mt-0.5'>{s.placePrediction.secondaryText.text}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>

      {/* Use my current location */}
      <button
        type='button'
        onClick={handleUseMyLocation}
        disabled={locating}
        className='flex items-center gap-2 text-sm text-accent hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer w-fit'
      >
        <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
          <circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M2 12h3M19 12h3'/>
        </svg>
        {locating ? 'Getting location…' : 'Use my current location'}
      </button>

      {/* Resolved location confirmation */}
      {lat !== null && lng !== null && (
        <p className='text-xs text-gray-500'>
          📍 {address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
        </p>
      )}

      {/* Venue name — auto-filled by search, always editable */}
      <div>
        <label className='block text-xs text-gray-500 mb-1'>Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder='Venue name'
          className={inputClass}
        />
      </div>

      {/* Geofence radius */}
      <div className='flex items-center gap-3'>
        <label className='text-xs text-gray-400 shrink-0'>Geofence radius</label>
        <input
          type='number'
          value={radius}
          min={50}
          max={1000}
          onChange={e => setRadius(Number(e.target.value))}
          className='w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent transition-colors text-sm'
        />
        <span className='text-xs text-gray-500'>metres</span>
      </div>

      {error && <p className='text-red-400 text-sm'>{error}</p>}

      <div className='flex gap-2'>
        <button
          type='submit'
          disabled={!name.trim() || lat === null || lng === null || creating}
          className={`${onCancel ? 'flex-1' : 'w-full'} bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer`}
        >
          {creating ? 'Creating…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type='button'
            onClick={onCancel}
            className='flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer'
          >
            Cancel
          </button>
        )}
      </div>

    </form>
  );
}
