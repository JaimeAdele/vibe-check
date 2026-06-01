import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getIO } from '../lib/socket';
import { requireAuth, requireOperator, requirePrivileged, optionalAuth } from '../middleware/auth';

const router = Router();

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// GET /api/events — operator sees their own events; admin sees all
router.get('/', requireAuth, requirePrivileged, async (req: Request, res: Response) => {
  try {
    const where = req.user!.role === 'ADMIN' ? {} : { operatorId: req.user!.userId };
    const events = await prisma.event.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        venue: { select: { id: true, name: true, address: true } },
        rooms: {
          select: {
            id: true,
            name: true,
            roomCode: true,
            status: true,
            djs: { select: { user: { select: { id: true, name: true } } } },
          },
        },
      },
    });
    res.json({ events });
  } catch {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/events — create an event (operator only)
router.post('/', requireAuth, requireOperator, async (req: Request, res: Response) => {
  const { name, startTime, venueId } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!startTime) {
    res.status(400).json({ error: 'startTime is required' });
    return;
  }

  try {
    const event = await prisma.event.create({
      data: {
        name,
        startTime: new Date(startTime),
        operatorId: req.user!.userId,
        venueId: venueId ?? null,
      },
      include: {
        venue: { select: { id: true, name: true, address: true } },
        rooms: true,
      },
    });
    res.status(201).json(event);
  } catch {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PATCH /api/events/:id/startTime
router.patch('/:id/startTime', requireAuth, requirePrivileged, async (req: Request, res: Response) => {
  const { startTime } = req.body;
  if (!startTime) {
    res.status(400).json({ error: 'startTime is required' });
    return;
  }

  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
    if (req.user!.role !== 'ADMIN' && event.operatorId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: { startTime: new Date(startTime) },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update start time' });
  }
});

// PATCH /api/events/:id/venue
router.patch('/:id/venue', requireAuth, requirePrivileged, async (req: Request, res: Response) => {
  const { venueId } = req.body;

  if (venueId !== null && venueId !== undefined && typeof venueId !== 'string') {
    res.status(400).json({ error: 'venueId must be a string or null' });
    return;
  }

  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
    if (req.user!.role !== 'ADMIN' && event.operatorId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: { venueId: venueId || null },
      include: { venue: { select: { id: true, name: true, address: true } } },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update venue' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', requireAuth, requirePrivileged, async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
    if (req.user!.role !== 'ADMIN' && event.operatorId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST /api/events/:id/rooms — create a room within an event
router.post('/:id/rooms', requireAuth, requirePrivileged, async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
    if (req.user!.role !== 'ADMIN' && event.operatorId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const room = await prisma.room.create({
      data: { eventId: req.params.id, name, roomCode: generateRoomCode() },
    });
    res.status(201).json(room);
  } catch {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PATCH /api/events/:id/rooms/:roomId/status
router.patch('/:id/rooms/:roomId/status', requireAuth, requirePrivileged, async (req: Request, res: Response) => {
  const { status } = req.body;

  if (!['UPCOMING', 'ACTIVE', 'CLOSED'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
      include: { event: { select: { operatorId: true } } },
    });
    if (!room || room.eventId !== req.params.id) {
      res.status(404).json({ error: 'Room not found' }); return;
    }
    if (req.user!.role !== 'ADMIN' && room.event.operatorId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const updated = await prisma.room.update({
      where: { id: req.params.roomId },
      data: { status },
    });
    getIO().to(room.roomCode).emit('room:status', { status: updated.status });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/events/:id/rooms/:roomId
router.delete('/:id/rooms/:roomId', requireAuth, requirePrivileged, async (req: Request, res: Response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
      include: { event: { select: { operatorId: true } } },
    });
    if (!room || room.eventId !== req.params.id) {
      res.status(404).json({ error: 'Room not found' }); return;
    }
    if (req.user!.role !== 'ADMIN' && room.event.operatorId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    await prisma.room.delete({ where: { id: req.params.roomId } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// GET /api/events/:id/rooms/:roomId/setlist
router.get('/:id/rooms/:roomId/setlist', optionalAuth, async (req: Request, res: Response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
      include: {
        songs: {
          orderBy: { identifiedAt: 'desc' },
          include: { reactions: { select: { emoji: true } } },
        },
        event: {
          select: {
            operatorId: true,
            name: true,
            startTime: true,
            venue: { select: { id: true, name: true, address: true } },
          },
        },
        djs: { select: { user: { select: { id: true, name: true } }, userId: true } },
      },
    });

    if (!room || room.eventId !== req.params.id) {
      res.status(404).json({ error: 'Room not found' }); return;
    }

    const userId = req.user?.userId;
    const isPrivileged = !!(userId && (
      req.user?.role === 'ADMIN' ||
      room.event.operatorId === userId ||
      room.djs.some(dj => dj.userId === userId)
    ));

    const songs = room.songs.map(({ reactions, ...song }) => {
      const breakdown: Record<string, number> = { '🔥': 0, '❤️': 0, '🥱': 0, '🤮': 0 };
      for (const r of reactions) {
        if (r.emoji in breakdown) breakdown[r.emoji]++;
      }
      return { ...song, breakdown };
    });

    res.json({
      room: {
        id: room.id,
        name: room.name,
        roomCode: room.roomCode,
        status: room.status,
        djs: room.djs.map(d => d.user),
        event: room.event,
      },
      isPrivileged,
      songs,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch setlist' });
  }
});

// POST /api/events/:id/rooms/:roomId/songs
router.post('/:id/rooms/:roomId/songs', requireAuth, async (req: Request, res: Response) => {
  const { title, artist, albumArt, previewUrl, spotifyId } = req.body;

  if (!title || !artist) {
    res.status(400).json({ error: 'title and artist are required' });
    return;
  }

  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
      include: {
        event: { select: { operatorId: true } },
        djs: { select: { userId: true } },
      },
    });
    if (!room || room.eventId !== req.params.id) {
      res.status(404).json({ error: 'Room not found' }); return;
    }

    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const canAdd =
      userRole === 'ADMIN' ||
      room.event.operatorId === userId ||
      room.djs.some(dj => dj.userId === userId);

    if (!canAdd) { res.status(403).json({ error: 'Not authorized' }); return; }
    if (room.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Room is not active' }); return;
    }

    const song = await prisma.song.create({
      data: {
        title,
        artist,
        roomId: req.params.roomId,
        albumArt: albumArt ?? null,
        previewUrl: previewUrl ?? null,
        spotifyId: spotifyId ?? null,
      },
    });

    getIO().to(room.roomCode).emit('song:added', song);
    res.status(201).json(song);
  } catch {
    res.status(500).json({ error: 'Failed to add song' });
  }
});

// DELETE /api/events/:id/rooms/:roomId/songs/:songId
router.delete('/:id/rooms/:roomId/songs/:songId', requireAuth, async (req: Request, res: Response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
      include: {
        event: { select: { operatorId: true } },
        djs: { select: { userId: true } },
      },
    });
    if (!room || room.eventId !== req.params.id) {
      res.status(404).json({ error: 'Room not found' }); return;
    }

    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const canDelete =
      userRole === 'ADMIN' ||
      room.event.operatorId === userId ||
      room.djs.some(dj => dj.userId === userId);

    if (!canDelete) { res.status(403).json({ error: 'Not authorized' }); return; }

    await prisma.song.delete({ where: { id: req.params.songId } });
    getIO().to(room.roomCode).emit('song:removed', { songId: req.params.songId });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to remove song' });
  }
});

// POST /api/events/:id/rooms/:roomId/djs — assign a user as DJ (by email)
router.post('/:id/rooms/:roomId/djs', requireAuth, requirePrivileged, async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
      include: { event: { select: { operatorId: true } } },
    });
    if (!room || room.eventId !== req.params.id) {
      res.status(404).json({ error: 'Room not found' }); return;
    }
    if (req.user!.role !== 'ADMIN' && room.event.operatorId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const assignment = await prisma.roomDJ.create({
      data: { roomId: req.params.roomId, userId: user.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json(assignment);
  } catch {
    res.status(409).json({ error: 'User is already a DJ for this room' });
  }
});

// DELETE /api/events/:id/rooms/:roomId/djs/:userId
router.delete('/:id/rooms/:roomId/djs/:userId', requireAuth, requirePrivileged, async (req: Request, res: Response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
      include: { event: { select: { operatorId: true } } },
    });
    if (!room || room.eventId !== req.params.id) {
      res.status(404).json({ error: 'Room not found' }); return;
    }
    if (req.user!.role !== 'ADMIN' && room.event.operatorId !== req.user!.userId) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    await prisma.roomDJ.delete({
      where: { roomId_userId: { roomId: req.params.roomId, userId: req.params.userId } },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to remove DJ' });
  }
});

export default router;
