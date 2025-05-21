# Deploying Tewahedo Answers to Vercel

This guide provides step-by-step instructions for deploying the Tewahedo Answers application to Vercel.

## Prerequisites

1. A [Vercel](https://vercel.com) account
2. A [GitHub](https://github.com) account with your project repository
3. A [PostgreSQL](https://neon.tech) database (Neon, Vercel Postgres, or any PostgreSQL provider)
4. A [Firebase](https://firebase.google.com) project for authentication

## Step 1: Prepare Your Environment Variables

Before deploying, make sure you have the following environment variables ready:

- `DATABASE_URL`: Your PostgreSQL connection string
- `DATABASE_URL_UNPOOLED`: Your PostgreSQL connection string without pgbouncer (for migrations)
- `FIREBASE_API_KEY`: Your Firebase API key
- `FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
- `FIREBASE_APP_ID`: Your Firebase app ID
- `FIREBASE_MEASUREMENT_ID`: Your Firebase measurement ID
- `SESSION_SECRET`: A secure random string for session encryption
- `NODE_ENV`: Set to `production`

You can find these values in your Firebase project settings and database provider dashboard.

## Step 2: Deploy to Vercel

1. Push your code to GitHub if you haven't already

2. Log in to your Vercel account and click "Add New" > "Project"

3. Import your GitHub repository

4. Configure the project:
   - **Framework Preset**: Select "Other"
   - **Build Command**: Keep the default `npm run build`
   - **Output Directory**: Keep the default `dist`
   - **Install Command**: Keep the default `npm install`

5. Add all environment variables from Step 1 to the "Environment Variables" section

6. Click "Deploy"

## Step 3: Verify Deployment

1. Once deployment is complete, Vercel will provide you with a URL to access your application

2. Visit the URL to ensure your application is working correctly

3. Test the following functionality:
   - User authentication with Firebase
   - Creating and viewing questions
   - Posting answers and comments
   - Admin functionality (if applicable)

## Recent Fixes

We've addressed the module import error that was occurring in the Vercel deployment:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/routes' imported from /var/task/api/index.js
```

The following changes were made to fix this issue:

1. **Dynamic Imports in API Entry Point**: Modified `api/index.ts` to use dynamic imports with fallback paths to handle Vercel's serverless environment.

2. **Updated Vercel Configuration**: Added `includeFiles` configuration in `vercel.json` to ensure server and shared directories are included in the deployment.

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify your `DATABASE_URL` is correct
2. Ensure your database allows connections from Vercel's IP addresses
3. Check that your database is running and accessible

### Authentication Issues

If authentication is not working:

1. Verify all Firebase environment variables are correct
2. Ensure your Firebase project has the Authentication service enabled
3. Check that the authorized domains in Firebase include your Vercel deployment URL

### API Routes Not Working

If API routes return 404 errors:

1. Check the Vercel deployment logs for any errors
2. Verify that the `vercel.json` file is correctly configured
3. Ensure your API routes are properly defined in the server code

### Module Not Found Errors

If you encounter module not found errors:

1. Check that the `includeFiles` configuration in `vercel.json` includes all necessary directories
2. Verify that import paths in your code are using the dynamic import pattern for server files
3. Check the Vercel build logs to see which files are being included in the deployment

## Custom Domain Setup

To use a custom domain with your Vercel deployment:

1. Go to your project settings in Vercel
2. Navigate to the "Domains" section
3. Add your custom domain and follow the verification steps
4. Update your Firebase authorized domains to include your custom domain

## Continuous Deployment

Vercel automatically sets up continuous deployment from your GitHub repository. Any changes pushed to your main branch will trigger a new deployment.

To change this behavior:

1. Go to your project settings in Vercel
2. Navigate to the "Git" section
3. Modify the production branch or deployment settings as needed

## Conclusion

Your Tewahedo Answers application should now be successfully deployed to Vercel. If you encounter any issues not covered in this guide, refer to the [Vercel documentation](https://vercel.com/docs) or open an issue in the project repository.