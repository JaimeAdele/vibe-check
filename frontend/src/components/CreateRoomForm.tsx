import { useState } from 'react';

interface Room {
  id: string;
  name: string;
  roomCode: string;
}

interface CreateRoomFormProps {
  onRoomCreated: (room: Room) => void;
}

function CreateRoomForm({ onRoomCreated }: CreateRoomFormProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    const room = await res.json();
    setLoading(false);
    setName('');
    onRoomCreated(room);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Room name (e.g. Saturday Night)"
      />
      <button type="submit" disabled={loading || !name}>
        {loading ? 'Creating...' : 'Create Room'}
      </button>
    </form>
  );
}

export default CreateRoomForm;