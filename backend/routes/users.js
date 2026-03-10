const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all users – Admin only
router.get('/', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, phone, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrich with booking count per user email
    const { data: bookings } = await supabase
      .from('bookings')
      .select('user_email');

    const countMap = {};
    (bookings || []).forEach(b => {
      if (b.user_email) countMap[b.user_email] = (countMap[b.user_email] || 0) + 1;
    });

    const enriched = users.map(u => ({
      ...u,
      booking_count: countMap[u.email] || 0,
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
