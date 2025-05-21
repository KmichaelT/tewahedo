# Deploying Tewahedo Answers to Vercel

This guide provides step-by-step instructions for deploying your Tewahedo Answers Q&A platform to Vercel with Neon PostgreSQL.

## Step 1: Push Your Code to GitHub

1. Clone your repository:
   ```
   git clone https://github.com/KmichaelT/tewahedo.git
   ```

2. Copy all project files to the cloned repository folder

3. Push to GitHub:
   ```
   cd tewahedo
   git add .
   git commit -m "Initial commit: Tewahedo Answers Q&A platform"
   git push origin main
   ```

## Step 2: Set Up Neon PostgreSQL Database

1. Sign up for [Neon](https://neon.tech) if you don't have an account
2. Create a new project:
   - Click "New Project"
   - Name it `tewahedo-answers`
   - Select a region close to your users
   - Click "Create Project"

3. Once created, you'll be provided with connection details
4. Copy the connection string that looks like:
   ```
   postgres://user:password@ep-xyz-123.region.aws.neon.tech/tewahedo
   ```

## Step 3: Deploy to Vercel

1. Sign up for [Vercel](https://vercel.com) if you don't have an account
2. From your Vercel dashboard:
   - Click "Add New" > "Project"
   - Connect to your GitHub account
   - Select the `tewahedo` repository
   - Vercel should automatically detect the project type

3. Configure the project:
   - Under "Build and Output Settings":
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - Under "Environment Variables", add:
     - `DATABASE_URL`: Your Neon PostgreSQL connection string
     - `NODE_ENV`: `production`
     - `FIREBASE_API_KEY`: Your Firebase API key
     - `FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
     - `FIREBASE_PROJECT_ID`: Your Firebase project ID
     - `FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
     - `FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
     - `FIREBASE_APP_ID`: Your Firebase app ID
     - `SESSION_SECRET`: Generate a random string (you can use [https://1password.com/password-generator/](https://1password.com/password-generator/))

4. Click "Deploy"

## Step 4: Set Up Your Database

After deployment, you need to run the database migrations:

1. From your local machine, set the DATABASE_URL environment variable to your Neon connection string:
   ```
   # On macOS/Linux
   export DATABASE_URL="your-neon-connection-string"
   
   # On Windows
   set DATABASE_URL=your-neon-connection-string
   ```

2. Run the database migration:
   ```
   npm run db:push
   ```

## Step 5: Verify Your Deployment

1. Once deployment is complete, Vercel will provide you with a URL (typically `https://tewahedo.vercel.app`)
2. Visit the URL to confirm your application is running correctly
3. Test key functionality:
   - Viewing questions and answers
   - User authentication
   - Creating new questions (if logged in)
   - Admin features (if applicable)

## Common Issues and Solutions

1. **Database connection errors**:
   - Double-check your Neon connection string in Vercel environment variables
   - Ensure your IP is allowed in Neon's access control settings

2. **Authentication issues**:
   - Verify all Firebase environment variables are correctly set
   - Make sure your Firebase project has Google authentication enabled

3. **Deployment failing**:
   - Check Vercel logs for specific error messages
   - Ensure all required environment variables are set

4. **Missing styles or JavaScript**:
   - Make sure the build process completed successfully
   - Check for any console errors in the browser

## Next Steps After Deployment

1. Set up a custom domain:
   - In Vercel dashboard → Your project → Settings → Domains
   - Add your domain and follow the provided instructions

2. Configure analytics:
   - Enable Vercel Analytics from the project settings
   - Or integrate Google Analytics in your frontend code

3. Set up monitoring:
   - Enable Vercel's built-in monitoring
   - Consider setting up Sentry or similar for error tracking