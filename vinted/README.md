# Vinted Clone

This is a full-stack MERN application (MongoDB, Express, React, Node.js).

## Project Structure

- `backend/`: Express server with MVC architecture
- `frontend/`: React application (Vite)

## Installation

1. Navigate to the root directory
2. Install dependencies for both backend and frontend:
   ```bash
   npm install concurrently
   cd backend && npm install
   cd ../frontend && npm install
   ```
   (Note: Dependencies are already installed if you followed the setup agent)

## Running the App

To run both backend and frontend concurrently:

```bash
npm start
```

- Backend runs on: http://localhost:5000
- Frontend runs on: http://localhost:5173

## API Endpoints

- `GET /api/items`: Get all items
- `POST /api/items`: Create a new item (Body: `{ "name": "...", "description": "...", "price": ... }`)
