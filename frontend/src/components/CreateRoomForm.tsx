import { useState, useEffect } from 'react';
import VenueCreationForm from './VenueCreationForm';

interface Room {
  id: string;
  name: string;
  roomCode: string;
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  startTime: string;
  createdAt: string;
  venueId: string | null;
  venue: { id: string; name: string; address: string | null } | null;
}

interface Venue {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  geoFenceRadius: number;
}

interface CreateRoomFormProps {
  onRoomCreated: (room: Room) => void;
}

function getDefaultStartTime() {
  const now = new Date();
  const target = new Date(now);
  if (now.getHours() >= 21) {
    target.setDate(target.getDate() + 1);
  }
  target.setHours(21, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T21:00`;
}

function getNowInput() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function CreateRoomForm({ onRoomCreated }: CreateRoomFormProps) {
  // Event fields
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState(getDefaultStartTime);
  const [loading, setLoading] = useState(false);

  // Venue selection
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [showNewVenueForm, setShowNewVenueForm] = useState(false);

  // Fetch existing venues on mount
  useEffect(() => {
    fetch('/api/venues', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setVenues(data.venues ?? []));
  }, []);

  function handleVenueDropdownChange(value: string) {
    if (value === 'new') {
      setSelectedVenueId('');
      setShowNewVenueForm(true);
    } else {
      setSelectedVenueId(value);
      setShowNewVenueForm(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          startTime: new Date(startTime).toISOString(),
          venueId: selectedVenueId || null,
        }),
        credentials: 'include',
      });
      const room = await res.json();
      onRoomCreated(room);
      setName('');
      setStartTime(getDefaultStartTime());
      setSelectedVenueId('');
    } finally {
      setLoading(false);
    }
  }

  const startTimeIsValid = startTime && new Date(startTime) > new Date();

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
      {/* Event name + start time */}
      <div className='flex flex-col gap-3 sm:flex-row'>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder='Room name (e.g. Saturday Night)'
          className='flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors text-base sm:text-sm'
        />
        <div className='flex flex-col gap-1 min-w-0 sm:w-auto'>
          <label className='text-xs text-gray-500 sm:hidden'>Start time</label>
          <input
            type='datetime-local'
            value={startTime}
            min={getNowInput()}
            onChange={e => setStartTime(e.target.value)}
            className='min-w-0 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors text-base sm:text-sm'
          />
        </div>
      </div>

      {/* Venue selector */}
      <div className='relative'>
        <select
          value={showNewVenueForm ? 'new' : selectedVenueId}
          onChange={e => handleVenueDropdownChange(e.target.value)}
          className='w-full appearance-none bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors text-base sm:text-sm'
        >
          <option value=''>No venue</option>
          {venues.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
          <option value='new'>+ Add new venue...</option>
        </select>
        <svg
          className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'
          width='16' height='16' viewBox='0 0 24 24'
          fill='none' stroke='currentColor' strokeWidth='2.5'
          strokeLinecap='round' strokeLinejoin='round'
        >
          <polyline points='6 9 12 15 18 9' />
        </svg>
      </div>

      {/* Inline new venue form */}
      {showNewVenueForm && (
        <div className='bg-gray-900 border border-gray-700 rounded-xl p-4'>
          <p className='text-xs text-gray-400 mb-3'>Search for the venue or use your current location</p>
          <VenueCreationForm
            onCreated={venue => {
              setVenues(prev => [...prev, venue]);
              setSelectedVenueId(venue.id);
              setShowNewVenueForm(false);
            }}
            onCancel={() => setShowNewVenueForm(false)}
            submitLabel='Save venue'
          />
        </div>
      )}

      <button
        type='submit'
        disabled={loading || !name || !startTimeIsValid || showNewVenueForm}
        className='w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold px-5 py-3 rounded-xl transition-colors cursor-pointer text-sm'
      >
        {loading ? 'Creating...' : 'Create Room'}
      </button>
    </form>
  );
}

export default CreateRoomForm;
