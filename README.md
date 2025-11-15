# Co-Working Space Booking Platform
## Project Overview

The Co-Working Space Booking Platform is a dynamic, real-time system that allows users to discover, book, and manage workspaces across multiple co-working hubs. The platform supports workspace filtering, resource booking, time-slot management, dynamic pricing, and QR-based check-in, all without requiring user login.

### Goal

To create a flexible workspace booking system where users can:

1) Search spaces by location, capacity, amenities, price, and rating
2) Book hourly, daily, or monthly slots
3) Reserve optional resources like projectors, parking, lockers, or snacks
4) Benefit from dynamic pricing based on workspace type, time, day, and demand/inventory
5) Check in via a QR code system (mock QR acceptable)

---

## 🚀 Project Structure

```
working_space_platform/
├── backend/                     # Node.js Express API
│   ├── routes/
│   │   ├── hubs.js             # Working hubs management
│   │   ├── workspaces.js       # Workspace management & search
│   │   ├── resources.js        # Resource/add-on management
│   │   ├── bookings.js         # Booking management
│   │   ├── pricing.js          # Dynamic pricing rules
│   │   └── qr.js               # QR code generation & scanning
│   ├── utils/
│   │   ├── pricing.js          # Pricing calculation logic
│   │   └── qrGenerator.js      # QR code generator
│   ├── server.js               # Main server file
│   └── package.json
│
├── user-frontend/              # User booking interface
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── admin-frontend/             # Admin management dashboard
│   ├── index.html
│   ├── admin.js
│   └── styles.css
│
├── .env                        # Supabase credentials
├── package.json
└── README.md
```

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Supabase account (database already configured)

### 1. Install Backend Dependencies
```powershell
cd backend
npm install
```

### 2. Configure Environment Variables
The `.env` file is already set up with Supabase credentials:
```
PROJECT_URL=https://chjyfnvwvpbhtlydtcgf.supabase.co
API_KEY=your_api_key
```

### 3. Start the Backend Server
```powershell
cd backend
npm start
```
Or for development with auto-reload:
```powershell
npm run dev
```

The server will run on `http://localhost:3001`

### 4. Start Frontend Applications

**User Frontend:**
```powershell
cd user-frontend
npm start
```
Opens automatically at `http://localhost:8080`

**Admin Frontend:**
```powershell
cd admin-frontend
npm start
```
Opens automatically at `http://localhost:8081`

**Or start everything at once:**
```powershell
# From root directory
npm install
npm run start-all
```

---

## 📱 Features Implemented

### User Frontend
✅ **Space Discovery & Search**
- Filter by location (city, state)
- Filter by workspace type (meeting room, cabin, hot desk, conference)
- Filter by capacity and price range
- Filter by amenities (Wi-Fi, AC, Coffee, Parking, etc.)

✅ **Booking Flow**
- Select date, start time, and end time
- Choose booking type (hourly, daily, monthly)
- Real-time availability checking
- Dynamic price calculation

✅ **Resource Booking**
- View available resources per workspace
- Add optional resources (projector, locker, parking, snacks)
- See resource availability and pricing

✅ **My Bookings**
- Search bookings by name (no login required)
- View booking details and status
- Cancel bookings
- View QR codes for check-in

✅ **QR Check-in**
- Unique QR code generated for each booking
- Display QR code for workspace access

### Admin Frontend
✅ **Dashboard**
- Overview stats (total hubs, workspaces, bookings, revenue)
- Recent bookings list

✅ **Hub Management**
- Create, read, update, delete working hubs
- Manage location details

✅ **Workspace Management**
- Create, read, update, delete workspaces
- Set workspace type, capacity, price
- Configure amenities

✅ **Resource Management**
- Create, read, update, delete resources
- Set resource pricing and availability

✅ **Booking Management**
- View all bookings
- Filter by status (confirmed, checked_in, cancelled)
- View booking details

✅ **Pricing Rules**
- Create dynamic pricing rules
- Configure demand-based, peak hours, weekend pricing
- Set percentage or flat modifiers

✅ **QR Code Management**
- View all generated QR codes
- Track scanned/unscanned status

### Backend API
✅ **Comprehensive REST API**
- Working Hubs endpoints
- Workspaces with advanced filtering
- Resources with availability checking
- Bookings with dynamic pricing
- Pricing rules engine
- QR code generation and scanning

---

## 🔑 API Endpoints

### Working Hubs
- `GET /api/hubs` - Get all hubs
- `GET /api/hubs/:id` - Get hub by ID
- `POST /api/hubs` - Create hub (Admin)
- `PUT /api/hubs/:id` - Update hub (Admin)
- `DELETE /api/hubs/:id` - Delete hub (Admin)
- `GET /api/hubs/filter/location` - Filter hubs by location

### Workspaces
- `GET /api/workspaces` - Get all workspaces with filters
- `GET /api/workspaces/search` - Search workspaces by amenities
- `GET /api/workspaces/:id` - Get workspace by ID
- `POST /api/workspaces` - Create workspace (Admin)
- `PUT /api/workspaces/:id` - Update workspace (Admin)
- `DELETE /api/workspaces/:id` - Delete workspace (Admin)
- `POST /api/workspaces/:id/check-availability` - Check availability

### Resources
- `GET /api/resources` - Get all resources
- `GET /api/resources/workspace/:workspace_id` - Get resources by workspace
- `GET /api/resources/:id` - Get resource by ID
- `POST /api/resources` - Create resource (Admin)
- `PUT /api/resources/:id` - Update resource (Admin)
- `DELETE /api/resources/:id` - Delete resource (Admin)
- `POST /api/resources/:id/check-availability` - Check resource availability

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id/status` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking
- `GET /api/bookings/stats/overview` - Get booking statistics (Admin)

### Pricing Rules
- `GET /api/pricing` - Get all pricing rules
- `GET /api/pricing/:id` - Get pricing rule by ID
- `POST /api/pricing` - Create pricing rule (Admin)
- `PUT /api/pricing/:id` - Update pricing rule (Admin)
- `DELETE /api/pricing/:id` - Delete pricing rule (Admin)
- `POST /api/pricing/calculate` - Calculate price for booking

### QR Codes
- `POST /api/qr/generate/:booking_id` - Generate QR code
- `GET /api/qr/booking/:booking_id` - Get QR code for booking
- `POST /api/qr/scan` - Scan QR code (check-in)
- `GET /api/qr` - Get all QR codes (Admin)

---

## 💡 How to Use

### For Users:
1. **Browse Workspaces**: Use the search and filter options to find the perfect workspace
2. **Select Date & Time**: Choose your preferred date and time slot
3. **Add Resources**: Optionally add resources like projectors, parking, etc.
4. **Confirm Booking**: Review the total price and confirm your booking
5. **Get QR Code**: Receive a QR code for check-in
6. **View Bookings**: Search your name to view all your bookings

### For Admins:
1. **Manage Hubs**: Add and configure co-working hub locations
2. **Create Workspaces**: Set up different workspace types with pricing
3. **Add Resources**: Configure available resources and their pricing
4. **Set Pricing Rules**: Create dynamic pricing based on demand, time, or day
5. **Monitor Bookings**: View and manage all bookings in the system
6. **Track QR Codes**: Monitor check-ins and QR code usage

---

## 🗄️ Database Schema (Supabase)

The platform uses the following tables in Supabase:

### Core Tables
1. **working_hubs** - Co-working hub locations
2. **workspaces** - Individual workspaces within hubs
3. **resources** - Add-on resources available per workspace
4. **bookings** - User bookings
5. **booking_resources** - Many-to-many relationship for booking resources
6. **pricing_rules** - Dynamic pricing configuration
7. **time_slots** - Available time slots (optional)
8. **qr_codes** - QR codes for check-in

Detailed schema is provided in the original README sections below.

---

## Database Design (DBML)

 Working Hubs
Table working_hubs {
  id integer [primary key]
  name varchar
  address text
  city varchar
  state varchar
  country varchar
  pincode varchar
  latitude float
  longitude float
  created_at timestamp
}

Workspaces
Table workspaces {
  id integer [primary key]
  hub_id integer [not null]
  name varchar
  type varchar // meeting_room, hotdesk, cabin, conference
  capacity integer
  base_price float
  amenities json // starts empty: []
  created_at timestamp
}

Ref: workspaces.hub_id > working_hubs.id

Resources (Add-ons)
Table resources {
  id integer [primary key]
  workspace_id integer [not null]
  name varchar
  description text
  price_per_slot float
  quantity integer
  created_at timestamp
}

Ref: resources.workspace_id > workspaces.id

Bookings
```
Table bookings {
  id integer [primary key]
  workspace_id integer [not null]
  user_name varchar
  start_time datetime
  end_time datetime
  total_price float
  booking_type varchar // hourly, daily, monthly
  status varchar // confirmed, cancelled, checked_in
  created_at timestamp
}

Ref: bookings.workspace_id > workspaces.id
```

Booking → Resources
```
Table booking_resources {
  id integer [primary key]
  booking_id integer [not null]
  resource_id integer [not null]
  quantity integer
}
```

Ref: booking_resources.booking_id > bookings.id
Ref: booking_resources.resource_id > resources.id

## Dynamic Pricing Rules
```
Table pricing_rules {
  id integer [primary key]
  workspace_id integer
  rule_type varchar // demand, peak_hours, weekend, room_type
  percentage_modifier float
  flat_modifier float
  start_time time
  end_time time
  days json // ["Mon","Tue"] or ["Sat","Sun"]
}


Ref: pricing_rules.workspace_id > workspaces.id
```
## Time Slots
```
Table time_slots {
  id integer [primary key]
  workspace_id integer [not null]
  date date
  start_time time
  end_time time
  is_available boolean
}

Ref: time_slots.workspace_id > workspaces.id
```
## QR Check-In
```
Table qr_codes {
  id integer [primary key]
  booking_id integer [not null]
  qr_value varchar
  created_at timestamp
  scanned_at timestamp
}

Ref: qr_codes.booking_id > bookings.id
```

## Notes
1) Workspaces can be of any type (meeting room, hot desk, cabin, conference hall)

2) Resources are optional per booking

3) Amenities are workspace-level features (may have default)

4) Dynamic pricing is inventory-driven

5) Sample Workflow

6) System shows available workspaces

7) User selects a workspace + date/time + resources

8) System calculates total price using base price + dynamic pricing rules

9) Booking is confirmed, QR code generated

10) User checks in using QR code