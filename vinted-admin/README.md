# Vinted Admin - Standalone

This is the standalone admin panel for Vinted. It has been separated from the main application to run on its own ports and have independent dependencies.

## Structure

- `/backend`: Node.js Express server running on port **5001**
- `/frontend`: React/Vite application running on port **5174** (or next available)

## Quick Start

### 1. Setup Backend
```bash
cd backend
npm install
npm start
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

## Admin Access
The standalone admin portal now uses clean URLs:
- **Login**: `/login`
- **Dashboard**: `/dashboard`
- **Users**: `/users`
- **Listings**: `/listings`

## Configuration
- Backend configurations reside in `backend/.env`
- Frontend API endpoint is configured in `frontend/.env`
