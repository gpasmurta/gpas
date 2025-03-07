# Time Audit App with Supabase Authentication

This project is a time tracking and productivity analysis application built with React, TypeScript, and Supabase for authentication and data storage.

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your environment variables in `.env`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key  # Optional - for AI features
```

⚠️ SECURITY NOTICE:
- Never commit the `.env` file
- Never share your API keys
- The `.env` file is listed in `.gitignore` to prevent accidental commits
- Use environment variables for all sensitive credentials
- For testing scripts, use the template in `scripts/supabase-config.template.js`

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Building for Production

```bash
npm run build
```

## Features

- **Authentication**
  - Email/password signup and login
  - Password reset functionality
  - Protected routes

- **Database Integration**
  - Tasks stored in Supabase
  - Row-level security for data protection
  - Real-time data synchronization

## Project Structure

- `/src/components/auth` - Authentication components
- `/src/context` - React context for auth state
- `/src/lib` - Utility functions and Supabase client
- `/src/services` - Data services for interacting with Supabase
- `/src/types` - TypeScript type definitions
- `/supabase/migrations` - SQL migrations for database setup

## Security Best Practices

- Row-level security ensures users can only access their own data
- Authentication state is managed securely through Supabase
- Environment variables protect sensitive API keys
- Password reset flows follow security best practices

## Development Notes

- The Supabase client is initialized in `src/lib/supabase.ts`
- Authentication state is managed in `src/context/AuthContext.tsx`
- Protected routes are implemented using `src/components/auth/ProtectedRoute.tsx`