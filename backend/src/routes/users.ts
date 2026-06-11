import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';

const SLUG_BLOCKLIST = ['admin', 'api', 'auth', 'login'];
const SLUG_PATTERN = /^[a-z0-9-]{3,40}$/;

const router = Router();

// GET /api/users/lookup?email=... — admin only; find a USER-role account by email
router.get('/lookup', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'email query parameter is required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    res.status(404).json({ error: 'No account found with that email address' });
    return;
  }

  if (user.role === 'ORGANIZER') {
    res.status(409).json({ error: 'This account is already an organizer' });
    return;
  }

  if (user.role === 'ADMIN') {
    res.status(409).json({ error: 'Cannot promote an admin account' });
    return;
  }

  res.json({ id: user.id, name: user.name, email: user.email });
});

// PATCH /api/users/:id/promote — admin only; set role=ORGANIZER + assign slug
router.patch('/:id/promote', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { slug } = req.body;

  if (!slug || typeof slug !== 'string') {
    res.status(400).json({ error: 'slug is required' });
    return;
  }

  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: 'Slug must be 3–40 characters: lowercase letters, digits, and hyphens only' });
    return;
  }

  if (SLUG_BLOCKLIST.includes(slug)) {
    res.status(400).json({ error: `'${slug}' is a reserved slug and cannot be used` });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role: 'ORGANIZER', slug },
      select: { id: true, name: true, email: true, slug: true, role: true },
    });
    res.json(user);
  } catch {
    res.status(409).json({ error: 'Slug already in use' });
  }
});

export default router;
