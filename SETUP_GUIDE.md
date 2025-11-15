# Co-Working Space Platform - Setup Guide

## Quick Start

### 1. Install Backend Dependencies
```powershell
cd backend
npm install
```

### 2. Start Backend Server
```powershell
# From backend directory
npm start

# OR for development with auto-reload
npm run dev
```

The API will be available at: `http://localhost:3001`

### 3. Start User Frontend
```powershell
# From user-frontend directory
cd user-frontend
npm start
```

The user frontend will automatically open at: `http://localhost:8080`

### 4. Start Admin Frontend
```powershell
# In a new terminal, from admin-frontend directory
cd admin-frontend
npm start
```

The admin frontend will automatically open at: `http://localhost:8081`

### Alternative: Start All Services Together
```powershell
# From root directory, install concurrently first
npm install

# Then start everything at once
npm run start-all
```

This will start the backend, user frontend, and admin frontend simultaneously.

---

## Environment Setup

The `.env` file contains your Supabase credentials:
```
PROJECT_URL=https://chjyfnvwvpbhtlydtcgf.supabase.co
API_KEY=your_api_key_here
```

**Note**: Make sure your Supabase database tables are created as per the schema in README.md

---

## Creating Supabase Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Working Hubs
CREATE TABLE working_hubs (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR NOT NULL,
  state VARCHAR NOT NULL,
  country VARCHAR NOT NULL,
  pincode VARCHAR NOT NULL,
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workspaces
CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  hub_id INTEGER NOT NULL REFERENCES working_hubs(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  capacity INTEGER NOT NULL,
  base_price FLOAT NOT NULL,
  amenities JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resources
CREATE TABLE resources (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  price_per_slot FLOAT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  user_name VARCHAR NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  total_price FLOAT NOT NULL,
  booking_type VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Booking Resources (Junction Table)
CREATE TABLE booking_resources (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES resources(id),
  quantity INTEGER NOT NULL
);

-- Pricing Rules
CREATE TABLE pricing_rules (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  rule_type VARCHAR NOT NULL,
  percentage_modifier FLOAT DEFAULT 0,
  flat_modifier FLOAT DEFAULT 0,
  start_time TIME,
  end_time TIME,
  days JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- QR Codes
CREATE TABLE qr_codes (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  qr_value VARCHAR NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  scanned_at TIMESTAMP
);

-- Time Slots (Optional)
CREATE TABLE time_slots (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE
);
```

---

## Testing the Platform

### 1. Add Sample Data (Admin Panel)

**Create a Hub:**
- Name: "Tech Hub Downtown"
- City: "Mumbai"
- State: "Maharashtra"
- Address: "123 Main Street"

**Create a Workspace:**
- Hub: Select the hub you created
- Name: "Conference Room A"
- Type: "Meeting Room"
- Capacity: 10
- Base Price: 500
- Amenities: Wi-Fi, AC, Projector

**Create Resources:**
- Name: "Projector"
- Price: 100
- Quantity: 2

**Create Pricing Rule:**
- Workspace: Select workspace
- Rule Type: "Peak Hours"
- Percentage Modifier: 20 (for +20% during peak hours)
- Start Time: 09:00
- End Time: 17:00

### 2. Test User Booking Flow

1. Open User Frontend
2. Browse workspaces
3. Click "Book Now" on a workspace
4. Fill in booking details
5. Confirm booking
6. Note the QR code

### 3. Verify in Admin Panel

1. Open Admin Frontend
2. Go to Bookings section
3. Verify your booking appears
4. Check Dashboard for updated stats

---

## Troubleshooting

### Backend not starting?
- Ensure Node.js is installed: `node --version`
- Check if port 3001 is available
- Verify `.env` file exists with correct Supabase credentials

### Frontend not connecting to backend?
- Ensure backend server is running
- Check `API_BASE_URL` in `app.js` and `admin.js` (should be `http://localhost:3001/api`)
- Check browser console for errors

### CORS errors?
- The backend has CORS enabled by default
- If issues persist, check that `cors` package is installed in backend

---

## Technology Stack

**Backend:**
- Node.js
- Express.js
- Supabase (PostgreSQL)
- QRCode library

**Frontend:**
- HTML5
- CSS3
- Vanilla JavaScript
- http-server (Node.js static server)

**Note:** No Python required! All servers run on Node.js.

---

## Next Steps

1. **Customize Styling**: Modify CSS files to match your brand
2. **Add Authentication**: Implement user authentication if needed
3. **Email Notifications**: Send booking confirmations via email
4. **Payment Integration**: Add payment gateway for booking payments
5. **Analytics**: Add charts and graphs to admin dashboard
6. **Mobile App**: Create mobile apps using the same API

---

## Support

For questions or issues:
1. Check the main README.md for detailed documentation
2. Review API endpoints documentation
3. Check Supabase console for database issues
