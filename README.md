# Vibe Coding Workshop Enrollment System

A web application for enrolling participants to a vibe coding workshop with quota-based enrollment rules.

## Features

- **Quota-based Enrollment**:
  - Total capacity: 20 participants
  - 3 spots reserved for men (quota)
  - 17 spots for women and non-binary participants
  - When women/non-binary spots are full, they are added to a waiting queue
  - After women/non-binary spots are full, remaining spots become available for men

- **Data Persistence**:
  - Real-time data persistence using Supabase PostgreSQL database
  - Cross-device sync with automatic fallback to localStorage
  - Refresh button to sync latest data from the cloud
  - Offline support with local storage backup

- **Real-time Status Display**: See enrollment statistics, available spots, and waiting queue length
- **Participant Management**: View all enrolled participants and those in the waiting queue
- **Modern UI**: Responsive design with dark mode support

## Getting Started

### Prerequisites

- Node.js 25.5.0+ and npm (or yarn/pnpm)
- Supabase account and project (free tier available)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up Supabase:
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Project Settings → API to get your URL and anon key
   - Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Set up the database:
   - Go to the SQL Editor in your Supabase dashboard
   - Run the SQL commands from `supabase-setup.sql`

4. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

### GitHub Pages Deployment

This project includes a GitHub Actions workflow that automatically deploys the application to GitHub Pages when changes are pushed to the `main` branch.

#### Setup Instructions:

1. Push your code to a GitHub repository
2. Go to your repository's **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. The workflow will automatically trigger on the next push to `main`

The deployed site will be available at: `https://<username>.github.io/<repository-name>`

**Current deployment:** https://qe-at-cgi-fi.github.io/enroll-for-vibecoding/

#### Manual Deployment:

You can also trigger deployment manually from the **Actions** tab in your GitHub repository.

## Enrollment Rules

1. **Total Capacity**: Maximum 20 participants
2. **Men Quota**: 3 spots are reserved for men
3. **Women/Non-binary Spots**: 17 spots are available for women and non-binary participants
4. **Waiting Queue**: When all 17 women/non-binary spots are filled, new women/non-binary applicants are added to a waiting queue

## Technology Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React** - UI library
- **Supabase** - Backend-as-a-Service with PostgreSQL database

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page
│   └── globals.css         # Global styles
├── components/
│   ├── EnrollmentForm.tsx  # Enrollment form component
│   ├── EnrollmentStats.tsx # Statistics display component
│   └── ParticipantList.tsx # Participant list component
├── lib/
│   ├── enrollment.ts       # Enrollment logic and service
│   └── supabase.ts         # Supabase client configuration
├── types/
│   └── index.ts            # TypeScript type definitions
├── supabase-setup.sql      # Database schema setup script
└── .env.local              # Environment variables (not in git)
```

## Notes

- **Data Persistence**: The application uses Supabase for real-time cloud data storage with localStorage as fallback
- **Cross-device Access**: Full synchronization across all devices and browsers using Supabase backend
- **Sync Feature**: Automatic sync with manual "Refresh Data" button for latest enrollment data
- **Offline Support**: Application continues to work offline using localStorage, syncs when connection is restored
- **Database**: Uses PostgreSQL via Supabase with proper indexing and Row Level Security policies
- **Free Tier**: Supabase free tier provides 50,000 API requests/month, 500MB database storage
- The project is configured with `basePath: '/enroll-for-vibecoding'` for GitHub Pages deployment
- When running locally with `npm run dev`, the app will be available at http://localhost:3000 (basePath is ignored in development)
- **Environment Variables**: Make sure to add `.env.local` to your `.gitignore` file to keep your Supabase credentials secure
