const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get resources by workspace ID
router.get('/workspace/:workspace_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('workspace_id', req.params.workspace_id);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all resources
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        workspaces (
          id,
          name,
          type
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get resource by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create resource (Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { workspace_id, name, description, price_per_slot, quantity } = req.body;
    
    const { data, error } = await supabase
      .from('resources')
      .insert([{ workspace_id, name, description, price_per_slot, quantity }])
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update resource (Admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { workspace_id, name, description, price_per_slot, quantity } = req.body;
    
    const { data, error } = await supabase
      .from('resources')
      .update({ workspace_id, name, description, price_per_slot, quantity })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete resource (Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check resource availability
router.post('/:id/check-availability', async (req, res) => {
  try {
    const { date, quantity_needed } = req.body;
    const resource_id = req.params.id;

    // Get resource details
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resource_id)
      .single();

    if (resourceError) throw resourceError;

    // Get bookings for this resource on the specified date
    const { data: bookingResources, error: bookingError } = await supabase
      .from('booking_resources')
      .select(`
        quantity,
        bookings!inner (
          start_time,
          end_time,
          status
        )
      `)
      .eq('resource_id', resource_id);

    if (bookingError) throw bookingError;

    // Calculate used quantity for the date
    const usedQuantity = bookingResources
      .filter(br => {
        const bookingDate = new Date(br.bookings.start_time).toISOString().split('T')[0];
        return bookingDate === date && br.bookings.status === 'confirmed';
      })
      .reduce((sum, br) => sum + br.quantity, 0);

    const availableQuantity = resource.quantity - usedQuantity;

    res.json({
      success: true,
      available: availableQuantity >= quantity_needed,
      available_quantity: availableQuantity,
      total_quantity: resource.quantity
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
