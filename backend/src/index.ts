import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import domainRoutes from './routes/domains';
import recordRoutes from './routes/records';
import { authenticateJWT } from './middlewares/auth';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/users', authenticateJWT, userRoutes);
app.use('/domains', authenticateJWT, domainRoutes);
app.use('/records', authenticateJWT, recordRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
