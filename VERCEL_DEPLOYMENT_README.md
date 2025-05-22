# Deploying to Vercel

## Configuration Overview

This project is configured for deployment on Vercel with both frontend and backend components:

- **Frontend**: React application built with Vite
- **Backend**: Express.js API running as a serverless function

## Deployment Configuration

### vercel.json

The `vercel.json` file is configured to:

1. Build both the frontend and backend components
2. Serve the frontend static assets from `dist/public`
3. Route API requests to the serverless function

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": null,
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["server/**", "shared/**", "package.json", "tsconfig.json"],
        "bundle": true
      }
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/public"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/dist/api/index.js"
    },
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/favicon.ico",
      "dest": "/favicon.ico"
    },
    {
      "src": "/(.*\\.(js|css|png|jpg|jpeg|gif|ico|json|svg))",
      "dest": "/dist/public/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/public/index.html"
    }
  ]
}
```

## Environment Variables

Ensure the following environment variables are set in your Vercel project settings:

- **Database Connection**:
  - `DATABASE_URL`: Your PostgreSQL connection string (Neon or other provider)

- **Firebase Authentication**:
  - `FIREBASE_API_KEY`
  - `FIREBASE_AUTH_DOMAIN`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_STORAGE_BUCKET`
  - `FIREBASE_MESSAGING_SENDER_ID`
  - `FIREBASE_APP_ID`

- **Session Configuration**:
  - `SESSION_SECRET`: A secure random string for session encryption

## Deployment Steps

1. **Connect to GitHub**:
   - Connect your GitHub repository to Vercel

2. **Configure Project**:
   - Import the repository
   - Set the framework preset to "Other"
   - Set the build command to `npm run build`
   - Set the output directory to `dist`

3. **Environment Variables**:
   - Add all required environment variables from your `.env` file

4. **Deploy**:
   - Click "Deploy" and wait for the build to complete

## Troubleshooting

### Module Not Found Errors

If you encounter module not found errors:

1. Check that the `includeFiles` configuration in `vercel.json` includes all necessary directories
2. Verify that import paths in your code are using the dynamic import pattern for server files
3. Check the Vercel build logs to see which files are being included in the deployment

### Static Asset Issues

If static assets are not loading:

1. Verify that the `distDir` in the static build configuration matches the output directory in your Vite config
2. Check that the routes in `vercel.json` correctly point to the static assets

### API Route Issues

If API routes are not working:

1. Check that the API routes in `vercel.json` are correctly configured
2. Verify that the serverless function is being built correctly
3. Check the Vercel logs for any errors in the serverless function