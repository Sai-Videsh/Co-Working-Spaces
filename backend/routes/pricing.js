const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Get all pricing rules
router.get('/', async (req, res) => {
  try {
    const { workspace_id } = req.query;
    
    let query = supabase
      .from('pricing_rules')
      .select(`
        *,
        workspaces (
          id,
          name,
          type
        )
      `)
      .order('created_at', { ascending: false });

    if (workspace_id) query = query.eq('workspace_id', workspace_id);

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get pricing rule by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create pricing rule (Admin)
router.post('/', async (req, res) => {
  try {
    const {
      workspace_id,
      rule_type,
      percentage_modifier,
      flat_modifier,
      start_time,
      end_time,
      days
    } = req.body;
    
    const { data, error } = await supabase
      .from('pricing_rules')
      .insert([{
        workspace_id,
        rule_type,
        percentage_modifier: percentage_modifier || 0,
        flat_modifier: flat_modifier || 0,
        start_time,
        end_time,
        days: days || []
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update pricing rule (Admin)
router.put('/:id', async (req, res) => {
  try {
    const {
      workspace_id,
      rule_type,
      percentage_modifier,
      flat_modifier,
      start_time,
      end_time,
      days
    } = req.body;
    
    const { data, error } = await supabase
      .from('pricing_rules')
      .update({
        workspace_id,
        rule_type,
        percentage_modifier,
        flat_modifier,
        start_time,
        end_time,
        days
      })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete pricing rule (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('pricing_rules')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Pricing rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate price for a booking
router.post('/calculate', async (req, res) => {
  try {
    const { workspace_id, start_time, end_time, booking_type } = req.body;

    // Get workspace details
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspace_id)
      .single();

    if (workspaceError) throw workspaceError;

    // Calculate duration
    const start = new Date(start_time);
    const end = new Date(end_time);
    const durationHours = (end - start) / (1000 * 60 * 60);

    // Base price calculation
    let basePrice = workspace.base_price;
    if (booking_type === 'daily') {
      basePrice *= 8; // 8 hours per day
    } else if (booking_type === 'monthly') {
      basePrice *= 8 * 22; // 8 hours * 22 working days
    } else {
      basePrice *= durationHours;
    }

    // Get applicable pricing rules
    const { data: rules, error: rulesError } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('workspace_id', workspace_id);

    if (rulesError) throw rulesError;

    // Apply pricing rules
    let finalPrice = basePrice;
    const appliedRules = [];

    for (const rule of rules) {
      let applies = false;

      // Check if rule applies based on time and day
      const bookingDay = start.toLocaleDateString('en-US', { weekday: 'short' });
      
      if (rule.days && rule.days.length > 0) {
        if (rule.days.includes(bookingDay)) {
          applies = true;
        }
      } else if (rule.rule_type === 'demand') {
        // Calculate occupancy for demand-based pricing
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('workspace_id', workspace_id)
          .eq('status', 'confirmed')
          .gte('start_time', start.toISOString().split('T')[0])
          .lte('start_time', end.toISOString().split('T')[0]);

        const occupancyRate = (bookings?.length || 0) / 10; // Assuming max 10 slots per day
        
        if (occupancyRate > 0.7) {
          applies = true;
        } else if (occupancyRate < 0.3) {
          applies = true;
        }
      }

      if (applies) {
        finalPrice += (finalPrice * (rule.percentage_modifier || 0) / 100);
        finalPrice += (rule.flat_modifier || 0);
        appliedRules.push(rule);
      }
    }

    res.json({
      success: true,
      data: {
        base_price: basePrice,
        final_price: Math.round(finalPrice * 100) / 100,
        duration_hours: durationHours,
        applied_rules: appliedRules
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
