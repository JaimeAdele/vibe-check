import { useState } from 'react';

interface Room {
  id: string;
  name: string;
  roomCode: string;
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  startTime: string;
  createdAt: string;
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

function CreateRoomForm({ onRoomCreated }: CreateRoomFormProps) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState(getDefaultStartTime);
  const [loading, setLoading] = useState(false);

  const startTimeIsValid = startTime && new Date(startTime) > new Date();

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, startTime: new Date(startTime).toISOString() }),
      credentials: 'include',
    });

    const room = await res.json();
    setLoading(false);
    setName('');
    setStartTime(getDefaultStartTime());
    onRoomCreated(room);
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
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
            // keep 'w-full' out of the class list to prevent it from stretching on mobile devices
            className='min-w-0 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors text-base sm:text-sm'
          />
        </div>
      </div>
      <button
        type='submit'
        disabled={loading || !name || !startTimeIsValid}
        className='w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold px-5 py-3 rounded-xl transition-colors cursor-pointer text-sm'
      >
        {loading ? 'Creating...' : 'Create Room'}
      </button>
    </form>
  );
}

export default CreateRoomForm;
