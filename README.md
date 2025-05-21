# Tewahedo Answers

A modern, interactive Q&A platform designed to facilitate knowledge sharing about the Ethiopian Orthodox Tewahedo Faith with advanced community engagement features.

## Features

- **Question & Answer System**: Ask and answer questions about the Ethiopian Orthodox Tewahedo Faith
- **Rich Text Editing**: Format your questions and answers with a powerful editor
- **User Authentication**: Secure login with Google via Firebase
- **Admin Dashboard**: Manage content and users with special admin privileges
- **Responsive Design**: Fully responsive layout that works on mobile, tablet, and desktop
- **Category & Tag System**: Organize questions by topics for easy discovery
- **Voting System**: Upvote helpful questions and answers
- **Commenting**: Engage in discussions through comments

## Tech Stack

- **Frontend**: React, TypeScript, Shadcn/UI, Tailwind CSS
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase
- **Deployment**: Ready for Vercel or Render

## Getting Started

See [GITHUB_SETUP.md](GITHUB_SETUP.md) for detailed setup instructions after cloning this repository.

Quick start:

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.template .env

# Fill in your environment variables in .env

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

## Deployment

- For Vercel deployment: [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)
- For Render deployment: [DEPLOYMENT.md](DEPLOYMENT.md)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.