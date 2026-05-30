import { useState, useEffect } from 'react';

const EMOJIS = ['🔥', '❤️', '🥱', '🤮'] as const;
const VOTING_WINDOW_MS = 15 * 60 * 1000;

interface Props {
  songId: string;
  identifiedAt: string;
  vibeScore: number;
  reactionCount: number;
}

function EmojiReaction({ songId, identifiedAt, vibeScore, reactionCount }: Props) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [windowOpen, setWindowOpen] = useState(
    () => Date.now() - new Date(identifiedAt).getTime() < VOTING_WINDOW_MS
  );

  useEffect(() => {
    if (!windowOpen) return;
    const remaining = VOTING_WINDOW_MS - (Date.now() - new Date(identifiedAt).getTime());
    if (remaining <= 0) { setWindowOpen(false); return; }
    const timer = setTimeout(() => setWindowOpen(false), remaining);
    return () => clearTimeout(timer);
  }, [identifiedAt]);

  async function handleReact(emoji: string) {
    if (!windowOpen) return;
    setSelectedEmoji(emoji);
    await fetch(`/api/songs/${songId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ emoji }),
    });
  }

  const vibeLabel = reactionCount > 0
    ? `${vibeScore > 0 ? '+' : ''}${vibeScore} vibe · ${reactionCount} reaction${reactionCount === 1 ? '' : 's'}`
    : null;

  if (!windowOpen) {
    return (
      <div className='flex items-center gap-2 mt-2'>
        <span className='text-xs text-gray-500'>Voting closed</span>
        {vibeLabel && <span className='text-xs text-gray-500'>· {vibeLabel}</span>}
      </div>
    );
  }

  return (
    <div className='flex items-center gap-1 mt-2 flex-wrap'>
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className={`text-lg px-2 py-1 rounded-lg transition-all cursor-pointer select-none ${
            selectedEmoji === emoji
              ? 'bg-gray-700 ring-1 ring-gray-500 scale-110'
              : 'hover:bg-gray-800'
          }`}
        >
          {emoji}
        </button>
      ))}
      {vibeLabel && (
        <span className='ml-1 text-xs text-gray-400'>{vibeLabel}</span>
      )}
    </div>
  );
}

export default EmojiReaction;
