# Database Population Guide

## Dummy Data Overview

The dummy data includes:
- **5 Working Hubs** across major Indian cities
- **12 Workspaces** (meeting rooms, cabins, hot desks, conference halls)
- **10 Resources** (projectors, catering, parking, etc.)
- **5 Pricing Rules** (peak hours, weekend discounts)
- **5 Sample Bookings** with different statuses

## How to Use

### 1. Populate Database with Dummy Data

From the `backend` directory:

```powershell
cd backend
npm run populate-db
```

This will:
✅ Insert 5 working hubs  
✅ Insert 12 workspaces  
✅ Insert 10 resources  
✅ Insert 5 pricing rules  
✅ Insert 5 sample bookings  
✅ Generate QR codes for bookings  

### 2. Clear All Data (Optional)

To remove all data from the database:

```powershell
cd backend
npm run clear-db
```

**Warning:** This will delete ALL data from your Supabase tables!

## Dummy Data Details

### Working Hubs
1. **Tech Hub Downtown** - Mumbai
2. **Creative Workspace Bangalore** - Bangalore
3. **Business Center Delhi** - Delhi
4. **Innovation Hub Pune** - Pune
5. **Startup Space Hyderabad** - Hyderabad

### Workspace Types
- **Meeting Rooms** - 10-12 people, ₹400-₹600/hr
- **Conference Halls** - 25-40 people, ₹1200-₹2000/hr
- **Private Cabins** - 1-3 people, ₹200-₹350/hr
- **Hot Desks** - 20-30 people, ₹120-₹150/hr

### Resources Available
- HD Projectors
- Wireless Microphones
- Video Conference Kits
- Catering Services
- Parking Passes
- Lockers
- Power Banks
- Snack Packages
- Sound Systems
- Flip Charts

### Sample Users
- Rahul Sharma
- Priya Patel
- Amit Kumar
- Sneha Reddy
- Vikram Singh

### Pricing Rules
- Peak hours pricing (9 AM - 5 PM weekdays): +20-25%
- Weekend discounts: -15 to -20%
- Demand-based pricing for hot desks

## Testing the Application

After populating the database:

1. **Start the backend:**
   ```powershell
   npm start
   ```

2. **Start the user frontend:**
   ```powershell
   cd ../user-frontend
   npm start
   ```

3. **Try these actions:**
   - Browse workspaces by location (Mumbai, Bangalore, Delhi, etc.)
   - Filter by workspace type
   - Book "Conference Room A" in Mumbai
   - Search bookings by name: "Rahul Sharma" or "Priya Patel"
   - View pricing differences during peak hours

4. **Start the admin frontend:**
   ```powershell
   cd ../admin-frontend
   npm start
   ```

5. **Admin features to test:**
   - View dashboard statistics
   - Browse all hubs and workspaces
   - Check booking status
   - View pricing rules
   - Monitor QR code scans

## Customizing Dummy Data

Edit `dummy-data.json` to add more:
- Hubs in different cities
- Workspaces with custom amenities
- Resources with different pricing
- Pricing rules for special occasions
- More sample bookings

Then run `npm run populate-db` again after clearing the database.

## Troubleshooting

**Error: Duplicate entries**
- Run `npm run clear-db` first, then `npm run populate-db`

**Error: Tables don't exist**
- Make sure you've created all tables in Supabase (see SETUP_GUIDE.md)

**Error: Environment variables not found**
- Check that `.env` file exists in the root directory
- Verify PROJECT_URL and API_KEY are correct

## Quick Commands

```powershell
# Clear and repopulate database
npm run clear-db && npm run populate-db

# Just populate (if database is empty)
npm run populate-db

# Just clear (remove all data)
npm run clear-db
```
