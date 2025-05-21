import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer } from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name for proper path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamic imports to handle Vercel's serverless environment
const importRoutes = async () => {
  try {
    // Try to import using relative path first (for local development)
    return await import('../server/routes');
  } catch (error) {
    // If that fails, try to import using the path relative to the current file
    console.log('Trying alternative import path for routes');
    return await import(path.join(__dirname, '../server/routes'));
  }
};

const importAuth = async () => {
  try {
    // Try to import using relative path first (for local development)
    return await import('../server/replitAuth');
  } catch (error) {
    // If that fails, try to import using the path relative to the current file
    console.log('Trying alternative import path for auth');
    return await import(path.join(__dirname, '../server/replitAuth'));
  }
};

const app = express();
const server = createServer(app);

// Setup authentication and register routes using dynamic imports
(async () => {
  try {
    // Import and setup authentication
    const { setupAuth } = await importAuth();
    await setupAuth(app);
    
    // Import and register routes
    const { registerRoutes } = await importRoutes();
    await registerRoutes(app);
  } catch (err) {
    console.error('Failed to setup application:', err);
  }
})();

// For Vercel, we'll serve static files from the dist/public directory
app.use(express.static(path.join(process.cwd(), 'dist/public')));

// Route all other requests to the SPA
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: path.join(process.cwd(), 'dist/public') });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Handle errors in production differently
if (process.env.NODE_ENV === 'production') {
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Production error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });
}

// For Vercel serverless functions
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}