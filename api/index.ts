import express from 'express';
import { registerRoutes } from '../server/routes';
import { setupAuth } from '../server/replitAuth';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

// Setup authentication
setupAuth(app).catch((err) => {
  console.error('Failed to setup auth', err);
});

// Register API routes
registerRoutes(app).catch((err) => {
  console.error('Failed to register routes', err);
});

// For Vercel, we'll serve static files from the dist directory
app.use(express.static('dist'));

// Route all other requests to the SPA
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// For Vercel serverless functions
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}