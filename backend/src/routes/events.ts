import { Router } from 'express';

const router = Router();

// In-memory store - replaced with database in Phase 2
interface Room {
  id: string;
  name: string;
  roomCode: string;
  createdAt: string;
}

const rooms: Room[] = [];

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// GET /api/events/:id/setlist
// Returns a hardcoded song list — no database yet (Phase 1)
router.get('/:id/setlist', (req, res) => {
  const songs = [
    {
      id: '1',
      title: 'Levitating',
      artist: 'Dua Lipa',
      identifiedAt: new Date().toISOString(),
    },
  ];
  res.json({ songs });
});

// POST /api/events - create a new room
router.post('/',(req,res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }

  const room: Room = {
    id: Math.random().toString(36).substring(2),
    name, roomCode: generateRoomCode(),
    createdAt: new Date().toISOString()
  };

  rooms.push(room);
  res.status(201).json(room);
});

// GET /api/events - list all rooms
router.get('/', (_req, res) => {
  res.json({ rooms });
});

export default router;
