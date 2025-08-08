import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();

// List all users (admin only)
router.get('/', async (req: AuthRequest, res) => {
  if (!req.user?.isAdmin) return res.sendStatus(403);
  const users = await prisma.user.findMany({ select: { id: true, email: true, isAdmin: true, createdAt: true } });
  res.json(users);
});

// Get user by id (admin or self)
router.get('/:id', async (req: AuthRequest, res) => {
  if (!req.user?.isAdmin && req.user?.id !== req.params.id) return res.sendStatus(403);
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, email: true, isAdmin: true, createdAt: true } });
  if (!user) return res.sendStatus(404);
  res.json(user);
});

// Update user (admin or self)
router.put('/:id', async (req: AuthRequest, res) => {
  if (!req.user?.isAdmin && req.user?.id !== req.params.id) return res.sendStatus(403);
  const { email, isAdmin } = req.body;
  const data: any = { email };
  if (req.user?.isAdmin && typeof isAdmin === 'boolean') data.isAdmin = isAdmin;
  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  res.json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
});

// Delete user (admin only)
router.delete('/:id', async (req: AuthRequest, res) => {
  if (!req.user?.isAdmin) return res.sendStatus(403);
  await prisma.user.delete({ where: { id: req.params.id } });
  res.sendStatus(204);
});

export default router;
