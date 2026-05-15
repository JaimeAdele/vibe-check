import { useState, useEffect } from 'react';
import NowPlayingCard from './components/NowPlayingCard';

interface Song {
  id: string;
  title: string;
  artist: string;
  identifiedAt: string;
}

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events/test-room/setlist')
      .then(res => res.json())
      .then(data => {
        setSongs(data.songs);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;
  if (songs.length === 0) return <p>No songs found.</p>;

  return <NowPlayingCard song={songs[0]} />;
}

export default App;