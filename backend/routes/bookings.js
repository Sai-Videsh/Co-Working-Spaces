const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { calculateDynamicPrice } = require('../utils/pricing');
const { authenticateToken } = require('../middleware/auth');
const { validate, rules } = require('../middleware/validate');

// Get current user's bookings (protected)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const userEmail = req.user.email;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        workspaces (
          id,
          name,
          type,
          working_hubs (
            name,
            city
          )
        )
      `)
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all bookings (admin usage)
router.get('/', async (req, res) => {
  try {
    const { status, workspace_id } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        workspaces (
          id,
          name,
          type,
          working_hubs (
            name,
            city
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (workspace_id) query = query.eq('workspace_id', workspace_id);

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        workspaces (
          id,
          name,
          type,
          capacity,
          base_price,
          amenities,
          working_hubs (
            name,
            address,
            city,
            state,
            country
          )
        ),
        booking_resources (
          id,
          quantity,
          resources (
            id,
            name,
            description,
            price_per_slot
          )
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create booking (auth required)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Pull user identity from JWT token (trust token, not body)
    const tokenUser = req.user;
    const {
      workspace_id,
      start_time,
      end_time,
      total_price,
      booking_type,
      status,
      resources // Array of { resource_id, quantity }
    } = req.body;

    // Override user data with token data for security
    const user_name  = tokenUser.name;
    const user_email = tokenUser.email;

    // Server-side validation
    const err = validate(req.body, {
      workspace_id:  [rules.required, rules.positiveInt],
      start_time:    [rules.required, rules.isoDate, rules.futureDate, rules.maxFutureDays(90)],
      end_time:      [rules.required, rules.isoDate, rules.after('start_time'), rules.maxDuration(720)],
      booking_type:  [rules.oneOf(['hourly', 'daily', 'monthly'])],
    });
    if (err) return res.status(400).json({ success: false, error: err });

    // Validate resources array items if provided
    if (resources && !Array.isArray(resources)) {
      return res.status(400).json({ success: false, error: 'resources must be an array' });
    }
    if (Array.isArray(resources)) {
      for (const r of resources) {
        if (!Number.isInteger(Number(r.resource_id)) || Number(r.resource_id) < 1)
          return res.status(400).json({ success: false, error: 'Each resource must have a valid resource_id' });
        if (!Number.isInteger(Number(r.quantity)) || Number(r.quantity) < 1 || Number(r.quantity) > 99)
          return res.status(400).json({ success: false, error: 'Resource quantity must be between 1 and 99' });
      }
    }

    // Ignore any client-supplied total_price above a sanity ceiling (backend recalculates anyway)
    const sanitisedPrice = (total_price !== undefined && Number.isFinite(Number(total_price)) && Number(total_price) > 0)
      ? Number(total_price) : undefined;

    // Get workspace details to validate it exists
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // Use provided total_price or calculate if not provided
    let finalPrice = sanitisedPrice;

    if (!finalPrice) {
      // Calculate dynamic price (pass end_time as date string, not duration in hours)
      const dynamicPrice = await calculateDynamicPrice(
        workspace_id,
        workspace.base_price,
        start_time,
        end_time,
        booking_type
      );

      // Calculate resource costs
      let resourceCost = 0;
      if (resources && resources.length > 0) {
        for (const res of resources) {
          const { data: resourceData } = await supabase
            .from('resources')
            .select('price_per_slot')
            .eq('id', res.resource_id)
            .single();

          if (resourceData) {
            resourceCost += resourceData.price_per_slot * res.quantity;
          }
        }
      }

      finalPrice = dynamicPrice + resourceCost;
    }

    // Create booking with IST timestamp
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
    const istTime = new Date(now.getTime() + istOffset).toISOString();

    // Generate transaction ID with timestamp (YYYYMMDD-HHMMSS)
    const istDate = new Date(now.getTime() + istOffset);
    const dateStr = istDate.toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const transactionId = `TXN-${dateStr}`;

    console.log('\n=== NEW BOOKING TRANSACTION ===');
    console.log('UTC Time:', now.toISOString());
    console.log('IST Time (Stored):', istTime);
    console.log('Transaction ID:', transactionId);
    console.log('User:', user_name);
    console.log('Workspace ID:', workspace_id);
    console.log('Start Time:', start_time);
    console.log('End Time:', end_time);
    console.log('Total Price:', finalPrice);
    console.log('===============================\n');

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        workspace_id,
        user_name,
        user_email,
        start_time,
        end_time,
        total_price: finalPrice,
        booking_type: booking_type || 'hourly',
        status: status || 'confirmed',
        created_at: istTime,
        transaction_id: transactionId
      }])
      .select()
      .single();

    if (bookingError) throw bookingError;

    console.log('✅ Booking Created Successfully!');
    console.log('Booking ID:', booking.id);
    console.log('Created At (from DB):', booking.created_at);
    console.log('-----------------------------------\n');

    // Add booking resources
    if (resources && resources.length > 0) {
      const bookingResources = resources.map(res => ({
        booking_id: booking.id,
        resource_id: res.resource_id,
        quantity: res.quantity
      }));

      const { error: resourcesError } = await supabase
        .from('booking_resources')
        .insert(bookingResources);

      if (resourcesError) throw resourcesError;
    }

    console.log('📤 RESPONSE TO FRONTEND:');
    console.log(JSON.stringify({ success: true, data: booking }, null, 2));
    console.log('===================================\n');

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update booking status (auth required – only the booking owner can cancel)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const bookingId = req.params.id;

    // Verify the booking belongs to the requesting user
    const { data: existing, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, user_email, status')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (existing.user_email !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Not authorized to modify this booking' });
    }

    // Only allow cancellation of active bookings
    if (status === 'cancelled' && !['confirmed', 'checked_in'].includes(existing.status)) {
      return res.status(400).json({ success: false, error: 'Only confirmed or checked-in bookings can be cancelled' });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update booking (generic)
router.patch('/:id', async (req, res) => {
  try {
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel booking
router.delete('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json({ success: true, message: 'Booking cancelled successfully', data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get booking statistics (Admin)
router.get('/stats/overview', async (req, res) => {
  try {
    const { data: allBookings, error } = await supabase
      .from('bookings')
      .select('*');

    if (error) throw error;

    const totalBookings = allBookings.length;
    const confirmedBookings = allBookings.filter(b => b.status === 'confirmed').length;
    const cancelledBookings = allBookings.filter(b => b.status === 'cancelled').length;
    const checkedInBookings = allBookings.filter(b => b.status === 'checked_in').length;
    const totalRevenue = allBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.total_price || 0), 0);

    res.json({
      success: true,
      data: {
        total_bookings: totalBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
        checked_in: checkedInBookings,
        total_revenue: totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get complete booking details for ticket page
router.get('/ticket/:id', async (req, res) => {
  try {
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        workspaces (
          id,
          name,
          type,
          capacity,
          base_price,
          amenities,
          hub_id
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (bookingError) throw bookingError;

    // Get hub details
    const { data: hub, error: hubError } = await supabase
      .from('working_hubs')
      .select('*')
      .eq('id', booking.workspaces.hub_id)
      .single();

    if (hubError) throw hubError;

    // Get booking resources
    const { data: bookingResources, error: resourcesError } = await supabase
      .from('booking_resources')
      .select(`
        quantity,
        resources (
          id,
          name,
          description,
          price_per_slot
        )
      `)
      .eq('booking_id', req.params.id);

    const resources = bookingResources?.map(br => ({
      ...br.resources,
      quantity: br.quantity
    })) || [];

    // Get QR code image
    const { data: qrData, error: qrError } = await supabase
      .from('qr_codes')
      .select('qr_value')
      .eq('booking_id', req.params.id)
      .single();

    let qrImage = null;
    if (qrData && !qrError) {
      const { generateQRCode } = require('../utils/qrGenerator');
      // Generate QR with URL to ticket page
      const ticketUrl = `http://localhost:8080/ticket.html?qr=${qrData.qr_value}`;
      qrImage = await generateQRCode(ticketUrl);
    }

    res.json({
      success: true,
      data: {
        booking,
        workspace: booking.workspaces,
        hub,
        resources,
        qr_image: qrImage
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all booking resources (for admin database viewer)
router.get('/resources', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('booking_resources')
      .select(`
        *,
        bookings (
          id,
          user_name,
          start_time,
          end_time
        ),
        resources (
          id,
          name,
          description,
          price_per_slot
        )
      `)
      .order('id', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
