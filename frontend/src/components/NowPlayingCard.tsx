interface Song {
  title: string;
  artist: string;
}

function NowPlayingCard({ song }: { song: Song }) {
  return (
    <div>
      <h1>Now Playing</h1>
        <h2>{song.title}</h2>
        <p>{song.artist}</p>
    </div>
  );
}

export default NowPlayingCard;