# Duty Register

A daily activity log for police officers — built as a full-stack web app with a React frontend and a Node.js/Express backend.

Officers record what they did and where, throughout the day (investigations, patrols, complaint follow-ups, court duty, and more), and can generate official PDF reports for any date range whenever they need them.

## Features

- **Multi-officer support** — each officer has their own profile, PIN, and completely separate register of entries.
- **Secure sessions** — login is backed by signed, `httpOnly` session cookies (not just client-side state), with rate-limiting on login attempts to guard against brute-forcing PINs.
- **Duty entries** — log date, time, activity type, location, status (Ongoing / Pending / Completed), and notes for every task.
- **Ledger-style dashboard** — entries are grouped by date, with quick stats (total entries, this month, pending) and search/filter by location, type, or notes.
- **Edit & delete** — update or remove any past entry, with a confirmation step before deleting.
- **PDF reports on demand** — pick any date range (today, this month, or a custom range) and generate a printable/downloadable PDF report.
- **Backup & restore** — export all of your data as a `.json` file at any time, and restore it later.
- **Account management** — delete your own profile and all associated entries directly from the dashboard.

## Tech Stack

**Frontend**
- React (Vite)
- Tailwind CSS v4
- lucide-react (icons)

**Backend**
- Node.js + Express
- lowdb (lightweight JSON-file database)
- JSON Web Tokens for session auth
- express-rate-limit for brute-force protection

## Project Structure

```
duty-register/
├── client/     React frontend (Vite + Tailwind)
├── server/     Express API + JSON-file database
└── render.yaml Deployment config
```

## Running Locally

**Server**
```
cd server
npm install
npm run dev
```

**Client** (in a separate terminal)
```
cd client
npm install
npm run dev
```

The client talks to the server through a local proxy, so both need to be running at the same time during development.

## Design Notes

The visual style is meant to evoke a real police duty register / occurrence book: an ink-navy interface, brass accents, monospaced timestamps and register numbers, and entries laid out on a ledger spine grouped by date — rather than a generic dashboard look.

## Status

Personal/portfolio project — built end-to-end (auth, data storage, PDF export, backup, deployment config) as a practical tool for daily duty logging.
