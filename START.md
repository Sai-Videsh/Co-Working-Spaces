# Quick Start Guide

## Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation & Setup

### Step 1: Install Backend Dependencies
```powershell
cd backend
npm install
cd ..
```

### Step 2: Start Backend Server
```powershell
cd backend
npm start
```
Backend will run on: `http://localhost:3001`

### Step 3: Start User Frontend (New Terminal)
```powershell
cd user-frontend
npm start
```
User frontend will open at: `http://localhost:8080`

### Step 4: Start Admin Frontend (New Terminal)
```powershell
cd admin-frontend
npm start
```
Admin frontend will open at: `http://localhost:8081`

## Quick Start - All Services at Once

From the root directory:
```powershell
# Install dependencies
npm install

# Start all services
npm run start-all
```

This will start:
- Backend API on port 3001
- User Frontend on port 8080
- Admin Frontend on port 8081

## Individual Commands

### Backend Only
```powershell
npm run backend
```

### User Frontend Only
```powershell
npm run user-frontend
```

### Admin Frontend Only
```powershell
npm run admin-frontend
```

## Stopping Services

Press `Ctrl+C` in each terminal window to stop the services.

## URLs

- **Backend API:** http://localhost:3001
- **User Frontend:** http://localhost:8080
- **Admin Frontend:** http://localhost:8081

## Notes

- No Python installation required
- All servers use Node.js
- Frontend uses `http-server` package (installed automatically via npx)
- Make sure all three services are running for full functionality
