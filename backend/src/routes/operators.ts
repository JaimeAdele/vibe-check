import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/operators — public; list all operators with active event count
router.get('/', async (_req, res) => {
  const operators = await prisma.user.findMany({
    where: { role: 'OPERATOR' },
    select: {
      id: true,
      name: true,
      slug: true,
      events: {
        where: { rooms: { some: { status: { in: ['ACTIVE', 'UPCOMING'] } } } },
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const result = operators.map((op) => ({
    id: op.id,
    name: op.name,
    slug: op.slug,
    activeEventCount: op.events.length,
  }));

  res.json({ operators: result });
});

// GET /api/operators/:slug — public; operator info + their events with rooms
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  const operator = await prisma.user.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      events: {
        orderBy: { startTime: 'desc' },
        select: {
          id: true,
          name: true,
          startTime: true,
          venueId: true,
          venue: { select: { id: true, name: true, address: true } },
          rooms: {
            select: {
              id: true,
              name: true,
              roomCode: true,
              status: true,
              djs: {
                select: { user: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!operator) {
    res.status(404).json({ error: 'Operator not found' });
    return;
  }

  res.json({ operator });
});

export default router;
