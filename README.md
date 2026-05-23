# School Device Member App

Maktab qo'ng'iroq qurilmalarini boshqarish uchun foydalanuvchi ilovasi (SchoolAdmin + Member).

## Tech Stack

- React 19 + TypeScript
- Vite 7
- TanStack Router (file-based routing)
- TanStack Query (server state)
- Zustand (client state)
- Tailwind CSS + shadcn/ui
- Zod (validation)
- Vitest (testing)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The app runs on `http://localhost:5174` by default.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL (with /api/v1) | `http://localhost:8000/api/v1` |

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run test      # Run tests
npm run lint      # Run ESLint
```

## User Roles

| Role | Capabilities |
|------|-------------|
| SCHOOL_ADMIN | View devices, manage schedules, ring bell, change password |
| USER (Member) | View devices and schedules (read-only) |

## Project Structure

```
src/
├── components/       # Shared UI components
├── hooks/           # Custom hooks (useScheduleEditor)
├── lib/             # API clients, utilities
├── routes/          # File-based routes (TanStack Router)
│   ├── _auth/       # Public auth pages (login, register, etc.)
│   └── _authenticated/  # Protected pages
├── stores/          # Zustand stores
└── main.tsx         # App entry point
```

## Features

- Device claiming (MAC address)
- Schedule management (entry/exit bell times)
- Schedule generator (auto-generate from lesson count)
- Real-time device status polling
- Token refresh with request queue
- Cross-tab auth sync (BroadcastChannel)
- Offline detection banner
- Change password
- Profile settings
- Forgot/reset password flow
