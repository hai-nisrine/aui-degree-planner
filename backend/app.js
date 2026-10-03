require('dotenv').config({ quiet: true });

const fs = require('fs');
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const semesterRoutes = require('./routes/semesters');
const plannerRoutes = require('./routes/plannerRoutes');
const { errorHandler } = require('./middleware/errorHandler');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/courses', courseRoutes);
app.use('/semesters', semesterRoutes);
app.use('/api/planner', plannerRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Serve the frontend build (if present) for every non-API GET request
const API_PREFIXES = ['/auth', '/courses', '/semesters', '/api'];
const clientBuildPath = path.join(__dirname, '..', 'frontend', 'build');
const clientIndex = path.join(clientBuildPath, 'index.html');

app.use(express.static(clientBuildPath));
app.use((req, res, next) => {
  const isApiRequest = API_PREFIXES.some(prefix => req.path.startsWith(prefix));
  if (req.method !== 'GET' || isApiRequest || !fs.existsSync(clientIndex)) {
    return res.status(404).json({ message: 'Not found' });
  }
  return res.sendFile(clientIndex);
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

module.exports = app;
