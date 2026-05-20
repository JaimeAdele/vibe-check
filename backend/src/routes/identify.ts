import { Router } from 'express';
import multer from 'multer';
import prisma from '../lib/prisma';
import redis from '../lib/redis';
import { getIO } from '../lib/socket';
import { identifyAudio } from '../services/acr';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/',
  requireAuth,
  upload.single('audio'),
  async (req, res) => {
    const { id: eventId } = req.params;

    
    if (!req.file) {
      res.status(400).json({ error: 'Audio file required' });
      return;
    }

    const lockKey = `identify:lock:${eventId}`;
    const acquired = await redis.set(lockKey, '1', 'EX', 15, 'NX');

    if (!acquired) {
      res.status(409).json({ error: 'Identification already in progress' });
      return;
    }

    try {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      const result = await identifyAudio(req.file.buffer);

      if (!result || result.confidence < 70) {
        res.status(422).json({ error: 'Could not identify song' });
        return;
      }

      const song = await prisma.song.create({
        data: { title: result.title, artist: result.artist, eventId }
      });

      getIO().to(event.roomCode).emit('song:added', song);
      res.status(201).json(song);
    } finally {
      await redis.del(lockKey);
    }
  }
);

export default router;
