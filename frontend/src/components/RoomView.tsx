import { useState, useEffect } from 'react';
import { useRoomSocket } from '../hooks/useRoomSocket';
import IdentifyButton from './IdentifyButton';

interface Song {
  id: string;
  title: string;
  artist: string;
  albumArt: string | null;
  spotifyId: string | null;
  identifiedAt: string;
}

interface Room {
  id: string;
  name: string;
  roomCode: string;
}

interface Props {
  room: Room;
  onBack: () => void;
}

function RoomView({ room, onBack }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  useEffect(() => {
    fetch(`/api/events/${room.id}/setlist`)
      .then((res) => res.json())
      .then((data) => setSongs(data.songs));
  }, [room.id]);

  const { isIdentifying } = useRoomSocket(room.roomCode, (song) => {
    setSongs((prev) => [song, ...prev]);
  });

  function handleAddSong(e: React.FormEvent) {
    e.preventDefault();
    fetch(`/api/events/${room.id}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, artist })
    });
    setTitle('');
    setArtist('');
  }

  return (
    <div>
      <button onClick={onBack}>← Back</button>
      <h2>
        {room.name} — {room.roomCode}
      </h2>

      <IdentifyButton eventId={room.id} roomLocked={isIdentifying} />

      <form onSubmit={handleAddSong}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Song title'
        />
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder='Artist'
        />
        <button type='submit'>Add Song</button>
      </form>

      <ul>
        {songs.map((song) => (
          <li key={song.id}>
            {song.albumArt && (
              <img src={song.albumArt} alt={song.title} width={48} height={48} />
            )}
            {song.title} — {song.artist}
            {song.spotifyId && (
              <a href={`https://open.spotify.com/track/${song.spotifyId}`} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>
                Open in Spotify
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RoomView;
