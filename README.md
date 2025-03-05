# Time Audit App with Supabase Authentication

This project is a time tracking and productivity analysis application built with React, TypeScript, and Supabase for authentication and data storage.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root of your project with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

You can copy the `.env.example` file as a template.

### 2. Supabase Setup

1. Create a new Supabase project at [https://supabase.com](https://supabase.com)
2. Get your project URL and anon key from the API settings
3. Run the SQL migration in `supabase/migrations/create_tables.sql` in the Supabase SQL editor
4. Configure authentication in the Supabase dashboard:
   - Enable Email/Password sign-in
   - Set up email templates for password recovery

### 3. Install Dependencies and Run

```bash
npm install
npm run dev
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