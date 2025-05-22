# Tewahedo Answers - Vercel Deployment Instructions

This guide provides step-by-step instructions for deploying the Tewahedo Answers application to Vercel.

## Prerequisites

- A [Vercel](https://vercel.com) account
- A [Neon](https://neon.tech) or other PostgreSQL database account
- A [Firebase](https://firebase.google.com) project with Authentication enabled
- Git repository with your project code

## Deployment Steps

### 1. Prepare Your Environment Variables

Make sure you have the following environment variables ready:

```
# Database Connection
DATABASE_URL=postgres://user:password@hostname/database?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@hostname/database?sslmode=require

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# Session Secret
SESSION_SECRET=generate_a_random_string_here

# Node Environment
NODE_ENV=production
```

### 2. Connect Your Repository to Vercel

1. Log in to your Vercel account
2. Click "Add New" → "Project"
3. Import your Git repository
4. Configure the project:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: dist

### 3. Configure Environment Variables

1. In the Vercel project settings, go to "Environment Variables"
2. Add all the environment variables listed above
3. Make sure to set `NODE_ENV=production`

### 4. Deploy Your Project

1. Click "Deploy"
2. Wait for the build and deployment to complete
3. Once deployed, Vercel will provide you with a URL to access your application

## Troubleshooting

### Module Resolution Issues

If you encounter module resolution issues:

1. Check that the `vercel.json` file includes all necessary files in the `includeFiles` array
2. Verify that your import paths are correct and use dynamic imports with fallbacks for Vercel's serverless environment

### Database Connection Issues

1. Ensure your database connection string is correct
2. For Neon databases, make sure you're using the correct connection string format with SSL enabled

### Authentication Issues

1. Verify that your Firebase configuration is correct
2. Check that CORS is properly configured for your Vercel domain

## Project Structure

The project is structured as follows:

- `/api` - API routes for Vercel serverless functions
- `/server` - Backend Express.js code
- `/client` - Frontend React code
- `/shared` - Shared code between frontend and backend

## Important Files

- `vercel.json` - Vercel deployment configuration
- `api/index.ts` - Main API entry point for Vercel
- `server/firebaseAuth.ts` - Firebase authentication setup
- `server/routes.ts` - API routes
- `server/storage.ts` - Database access layer

## Maintenance

After deployment, you can:

1. Set up a custom domain in Vercel project settings
2. Configure environment variables for different deployment environments (Production, Preview, Development)
3. Set up automatic deployments from your Git repository

---

For more information, refer to the [Vercel documentation](https://vercel.com/docs) and [Firebase documentation](https://firebase.google.com/docs).