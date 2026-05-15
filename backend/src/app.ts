import express from 'express';
import cors from 'cors';
import eventsRouter from './routes/events';

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Allow requests from the frontend dev server
app.use(cors({ origin: 'http://localhost:5173' }));

// Health check — used to verify the server is running
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Mount the events router at /api/events
app.use('/api/events', eventsRouter);

export default app;
