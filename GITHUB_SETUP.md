# Tewahedo Answers - GitHub Setup Guide

## Getting Started After Cloning

Follow these steps to set up the project locally after cloning from GitHub:

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the template file to create your `.env` file:

```bash
cp .env.template .env
```

Then edit the `.env` file with your actual values:
- Add your PostgreSQL database connection string
- Add your Firebase configuration details
- Generate a secure random string for SESSION_SECRET

### 3. Set Up the Database

Run the database migration script to create all necessary tables:

```bash
npm run db:push
```

### 4. Start the Development Server

```bash
npm run dev
```

The application should now be running at http://localhost:3000

## Project Structure

- `/client` - Frontend React application
- `/server` - Express backend
- `/shared` - Shared code (data models, etc.)
- `/api` - Serverless functions for Vercel deployment

## Deployment

For deployment instructions, see:
- `VERCEL_DEPLOYMENT.md` for deploying to Vercel
- `DEPLOYMENT.md` for alternative deployment options