const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { calculateDynamicPrice } = require('../utils/pricing');

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
      .order('id', { ascending: false });

    if (workspace_id) query = query.eq('workspace_id', workspace_id);

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create pricing rule
router.post('/', async (req, res) => {
  try {
    const { workspace_id, rule_type, percentage_modifier, flat_modifier, start_time, end_time, days } = req.body;

    if (!workspace_id || !rule_type) {
      return res.status(400).json({ success: false, error: 'workspace_id and rule_type are required' });
    }

    const { data, error } = await supabase
      .from('pricing_rules')
      .insert([{
        workspace_id,
        rule_type,
        percentage_modifier: percentage_modifier || 0,
        flat_modifier: flat_modifier || 0,
        start_time: start_time || null,
        end_time: end_time || null,
        days: days || []
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate price for a booking — MUST be before /:id
router.post('/calculate', async (req, res) => {
  try {
    const { workspace_id, start_time, end_time, booking_type } = req.body;

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspace_id)
      .single();

    if (workspaceError) throw workspaceError;

    const pricingResult = await calculateDynamicPrice(
      workspace_id,
      workspace.base_price,
      start_time,
      end_time,
      booking_type
    );

    res.json({
      success: true,
      data: {
        workspace_name: workspace.name,
        base_price: workspace.base_price,
        final_price: pricingResult.finalPrice,
        breakdown: pricingResult.breakdown,
        occupancy_rate: pricingResult.occupancyRate,
        is_workday: pricingResult.isWorkday,
        average_rating: pricingResult.average_rating,
        hours: pricingResult.hours,
        total_workspaces: pricingResult.totalWorkspaces,
        booked_workspaces: pricingResult.bookedWorkspaces,
        booking_type
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Coupon Routes — ALL must be before /:id ────────────────────────────────

// Get all coupons (Admin)
router.get('/coupons', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a coupon (Admin)
router.post('/coupons', async (req, res) => {
  try {
    const {
      code, discount_percentage, description,
      valid_from, valid_until, max_uses,
      applicable_workspace_ids, applicable_hub_ids
    } = req.body;

    if (!code || !discount_percentage) {
      return res.status(400).json({ success: false, error: 'code and discount_percentage are required' });
    }
    if (discount_percentage < 1 || discount_percentage > 100) {
      return res.status(400).json({ success: false, error: 'discount_percentage must be between 1 and 100' });
    }

    const { data: existing } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ success: false, error: 'Coupon code already exists' });
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert([{
        code: code.toUpperCase(),
        discount_percentage: Number(discount_percentage),
        description: description || null,
        valid_from: valid_from || null,
        valid_until: valid_until || null,
        max_uses: max_uses || null,
        usage_count: 0,
        applicable_workspace_ids: applicable_workspace_ids || [],
        applicable_hub_ids: applicable_hub_ids || [],
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate a coupon code (User — called at payment)
router.post('/coupons/validate', async (req, res) => {
  try {
    const { code, workspace_id, hub_id } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Coupon code is required' });

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !coupon) {
      return res.status(404).json({ success: false, error: 'Invalid coupon code' });
    }
    if (!coupon.is_active) {
      return res.status(400).json({ success: false, error: 'This coupon is no longer active' });
    }

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.status(400).json({ success: false, error: 'This coupon is not yet valid' });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.status(400).json({ success: false, error: 'This coupon has expired' });
    }
    if (coupon.max_uses && coupon.usage_count >= coupon.max_uses) {
      return res.status(400).json({ success: false, error: 'This coupon has reached its usage limit' });
    }

    // Check workspace restriction
    if (workspace_id && coupon.applicable_workspace_ids && coupon.applicable_workspace_ids.length > 0) {
      if (!coupon.applicable_workspace_ids.includes(Number(workspace_id))) {
        return res.status(400).json({ success: false, error: 'This coupon is not valid for the selected workspace' });
      }
    }

    // Check hub restriction
    if (hub_id && coupon.applicable_hub_ids && coupon.applicable_hub_ids.length > 0) {
      if (!coupon.applicable_hub_ids.includes(Number(hub_id))) {
        return res.status(400).json({ success: false, error: 'This coupon is not valid for the selected hub' });
      }
    }

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discount_percentage: coupon.discount_percentage,
        description: coupon.description
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Terminate (deactivate) coupon immediately (Admin)
router.patch('/coupons/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;

    const { data, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete coupon (Admin)
router.delete('/coupons/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Pricing Rule individual routes — keep AFTER all specific paths ─────────

// Get pricing rule by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select(`*, workspaces ( id, name, type )`)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update pricing rule
router.put('/:id', async (req, res) => {
  try {
    const { workspace_id, rule_type, percentage_modifier, flat_modifier, start_time, end_time, days } = req.body;

    const updateData = {
      rule_type,
      percentage_modifier: percentage_modifier || 0,
      flat_modifier: flat_modifier || 0,
      start_time: start_time || null,
      end_time: end_time || null,
      days: days || []
    };
    if (workspace_id) updateData.workspace_id = workspace_id;

    const { data, error } = await supabase
      .from('pricing_rules')
      .update(updateData)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete pricing rule
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

module.exports = router;


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
      .order('id', { ascending: false });

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
      .select(`
        *,
        workspaces (
          id,
          name,
          type
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

    if (!workspace_id || !rule_type) {
      return res.status(400).json({
        success: false,
        error: 'workspace_id and rule_type are required'
      });
    }

    const { data, error } = await supabase
      .from('pricing_rules')
      .insert([{
        workspace_id,
        rule_type,
        percentage_modifier: percentage_modifier || 0,
        flat_modifier: flat_modifier || 0,
        start_time: start_time || null,
        end_time: end_time || null,
        days: days || []
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
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

    const updateData = {
      rule_type,
      percentage_modifier: percentage_modifier || 0,
      flat_modifier: flat_modifier || 0,
      start_time: start_time || null,
      end_time: end_time || null,
      days: days || []
    };

    // Only update workspace_id if provided
    if (workspace_id) {
      updateData.workspace_id = workspace_id;
    }

    const { data, error } = await supabase
      .from('pricing_rules')
      .update(updateData)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
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

// Calculate price for a booking with dynamic pricing
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

    // Use enhanced dynamic pricing
    const pricingResult = await calculateDynamicPrice(
      workspace_id,
      workspace.base_price,
      start_time,
      end_time,
      booking_type
    );

    res.json({
      success: true,
      data: {
        workspace_name: workspace.name,
        base_price: workspace.base_price,
        final_price: pricingResult.finalPrice,
        breakdown: pricingResult.breakdown,
        occupancy_rate: pricingResult.occupancyRate,
        is_workday: pricingResult.isWorkday,
        average_rating: pricingResult.average_rating,
        hours: pricingResult.hours,
        total_workspaces: pricingResult.totalWorkspaces,
        booked_workspaces: pricingResult.bookedWorkspaces,
        booking_type
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Coupon Routes ──────────────────────────────────────────────────────────

// Get all coupons (Admin)
router.get('/coupons', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a coupon (Admin)
router.post('/coupons', async (req, res) => {
  try {
    const { code, discount_percentage, description, expires_at, max_uses } = req.body;

    if (!code || !discount_percentage) {
      return res.status(400).json({ success: false, error: 'code and discount_percentage are required' });
    }
    if (discount_percentage < 1 || discount_percentage > 100) {
      return res.status(400).json({ success: false, error: 'discount_percentage must be between 1 and 100' });
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();

    if (existing) {
      return res.status(400).json({ success: false, error: 'Coupon code already exists' });
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert([{
        code: code.toUpperCase(),
        discount_percentage: Number(discount_percentage),
        description: description || null,
        expires_at: expires_at || null,
        max_uses: max_uses || null,
        usage_count: 0,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate a coupon code (User)
router.post('/coupons/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Coupon code is required' });

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !coupon) {
      return res.status(404).json({ success: false, error: 'Invalid coupon code' });
    }
    if (!coupon.is_active) {
      return res.status(400).json({ success: false, error: 'This coupon is no longer active' });
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: 'This coupon has expired' });
    }
    if (coupon.max_uses && coupon.usage_count >= coupon.max_uses) {
      return res.status(400).json({ success: false, error: 'This coupon has reached its usage limit' });
    }

    res.json({
      success: true,
      data: {
        code: coupon.code,
        discount_percentage: coupon.discount_percentage,
        description: coupon.description
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete coupon (Admin)
router.delete('/coupons/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle coupon active state (Admin)
router.patch('/coupons/:id', async (req, res) => {
  try {
    const { is_active } = req.body;
    const { data, error } = await supabase
      .from('coupons')
      .update({ is_active })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
