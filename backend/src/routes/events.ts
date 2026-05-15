import { Router } from 'express';

const router = Router();

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

export default router;
