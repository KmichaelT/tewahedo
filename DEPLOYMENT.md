# Deploying Tewahedo Answers to Render.com

This guide provides step-by-step instructions for deploying your Tewahedo Answers Q&A platform to Render.com.

## Step 1: Prepare Your Account

1. Create an account on [Render.com](https://render.com) if you don't have one
2. Log in to your Render dashboard

## Step 2: Set Up PostgreSQL Database

1. From your Render dashboard, click "New" and select "PostgreSQL"
2. Configure your database:
   - Name: `tewahedo-db` (or your preferred name)
   - Database: `tewahedo_answers` 
   - User: `tewahedo_user`
   - Plan: Free (or choose a paid plan for production)
3. Click "Create Database"
4. Once created, note your database's **Internal Database URL** for the next step

## Step 3: Deploy Web Service

1. From your Render dashboard, click "New" and select "Web Service"
2. Connect your GitHub repository or upload your code directly
3. Configure your web service:
   - Name: `tewahedo-answers` (or your preferred name)
   - Environment: `Node`
   - Region: Choose the closest to your users
   - Branch: `main` (or your default branch)
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Set the following environment variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your PostgreSQL Internal Database URL (from Step 2)
   - `FIREBASE_API_KEY`: Your Firebase API key
   - `FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID
   - `FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
   - `FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
   - `FIREBASE_APP_ID`: Your Firebase app ID
   - `SESSION_SECRET`: A secure random string for session encryption
5. Click "Create Web Service"

## Step 4: Run Database Migrations

After deployment, you'll need to run database migrations:

1. From your Web Service page in the Render dashboard, click "Shell"
2. Run: `npm run db:push`

## Step 5: Verify Deployment

1. Once the deployment is complete, click the URL provided by Render
2. Verify that your application is running correctly
3. Test basic functionality like viewing questions, logging in, etc.

## Troubleshooting

If you encounter issues:

1. Check the "Logs" tab in your Render dashboard
2. Verify all environment variables are correctly set
3. Check that your database connection is working properly
4. Ensure your Firebase credentials are correct

For ongoing issues, refer to Render's documentation or support.