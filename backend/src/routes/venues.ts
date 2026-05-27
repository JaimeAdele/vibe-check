import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Returns the straight-line distance in metres between two lat/lng points.
// Flat-plane approximation — accurate to well within 1m at the distances we care about (~200m).
function flatDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((lat1 * Math.PI) / 180);
  const dy = (lat2 - lat1) * metersPerDegLat;
  const dx = (lng2 - lng1) * metersPerDegLng;
  return Math.sqrt(dx * dx + dy * dy);
}

// GET /api/venues — active venues only (used by the event-creation dropdown)
router.get('/', async (_req, res) => {
  try {
    const venues = await prisma.venue.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ venues });
  } catch {
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// GET /api/venues/all — all venues including inactive (admin management page)
router.get('/all', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const venues = await prisma.venue.findMany({ orderBy: { name: 'asc' } });
    res.json({ venues });
  } catch {
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// POST /api/venues — create a venue (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, address, lat, lng, geoFenceRadius } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ error: 'lat and lng must be numbers' });
    return;
  }

  try {
    const venue = await prisma.venue.create({
      data: {
        name,
        address: address ?? null,
        lat,
        lng,
        geoFenceRadius: geoFenceRadius ?? 150,
      },
    });
    res.status(201).json(venue);
  } catch {
    res.status(500).json({ error: 'Failed to create venue' });
  }
});

// POST /api/venues/validate-location/:eventId
// Receives the user's coordinates and returns whether they are within the venue's geofence
router.post('/validate-location/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { lat, lng } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ error: 'lat and lng must be numbers' });
    return;
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: true },
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // If the event has no venue attached, we can't geofence — allow access
    if (!event.venue) {
      res.json({ withinFence: true });
      return;
    }

    const distance = flatDistance(lat, lng, event.venue.lat, event.venue.lng);
    const withinFence = distance <= event.venue.geoFenceRadius;

    res.json({ withinFence, distance: Math.round(distance) });
  } catch {
    res.status(500).json({ error: 'Failed to validate location' });
  }
});

// PATCH /api/venues/:id — edit a venue's fields (admin only)
// Only sends what changed — any omitted field is left as-is
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, address, lat, lng, geoFenceRadius } = req.body;

  if (name !== undefined && typeof name !== 'string') {
    res.status(400).json({ error: 'name must be a string' });
    return;
  }
  if (lat !== undefined && typeof lat !== 'number') {
    res.status(400).json({ error: 'lat must be a number' });
    return;
  }
  if (lng !== undefined && typeof lng !== 'number') {
    res.status(400).json({ error: 'lng must be a number' });
    return;
  }

  try {
    const venue = await prisma.venue.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address: address || null }),
        ...(lat !== undefined && { lat }),
        ...(lng !== undefined && { lng }),
        ...(geoFenceRadius !== undefined && { geoFenceRadius }),
      },
    });
    res.json(venue);
  } catch {
    res.status(500).json({ error: 'Failed to update venue' });
  }
});

// PATCH /api/venues/:id/restore — undo a soft delete (admin only)
router.patch('/:id/restore', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const venue = await prisma.venue.update({
      where: { id },
      data: { isActive: true },
    });
    res.json(venue);
  } catch {
    res.status(500).json({ error: 'Failed to restore venue' });
  }
});

// DELETE /api/venues/:id — soft delete (sets isActive: false, keeps the row) (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const venue = await prisma.venue.update({
      where: { id },
      data: { isActive: false },
    });
    res.json(venue);
  } catch {
    res.status(500).json({ error: 'Failed to deactivate venue' });
  }
});

export default router;
