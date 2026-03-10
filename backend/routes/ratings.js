const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { validate, rules } = require('../middleware/validate');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all ratings (Admin)
router.get('/', async (req, res) => {
  try {
    const { data: ratings, error } = await supabase
      .from('ratings')
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

    if (error) throw error;

    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add rating to a workspace
router.post('/:workspace_id', async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { user_name, user_email, rating, review, booking_id } = req.body;

    // Validate all inputs
    const err = validate(req.body, {
      user_name: [rules.required, rules.string, rules.maxLen(100), rules.noScript],
      rating:    [rules.required, rules.oneOf(['1','2','3','4','5',1,2,3,4,5])],
      review:    [rules.maxLen(1000), rules.noScript],
      user_email:[rules.email, rules.maxLen(255)],
    });
    if (err) return res.status(400).json({ success: false, error: err });

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    // Check if workspace exists
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // If booking_id provided, verify user has a completed booking
    if (booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', booking_id)
        .eq('workspace_id', workspace_id)
        .eq('status', 'completed')
        .single();

      if (!booking) {
        return res.status(400).json({
          success: false,
          error: 'Only completed bookings can be rated'
        });
      }

      // Check if already rated
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('booking_id', booking_id)
        .single();

      if (existingRating) {
        return res.status(400).json({
          success: false,
          error: 'This booking has already been rated'
        });
      }
    }

    // Insert rating – build payload progressively so we gracefully handle
    // columns that may not exist yet (user_email, booking_id) before migration.
    const ratingPayload = { workspace_id, user_name, rating, review };
    // Only include optional columns if values are provided (PostgREST ignores
    // unknown columns in some versions but errors in strict mode – be safe).
    if (user_email) ratingPayload.user_email = user_email;
    if (booking_id) ratingPayload.booking_id = booking_id;

    let insertData, insertError;

    // First attempt with all fields
    ({ data: insertData, error: insertError } = await supabase
      .from('ratings')
      .insert([ratingPayload])
      .select());

    if (insertError) {
      // If the error is about unknown columns (migration not yet applied),
      // retry with only the base columns that are guaranteed to exist.
      const isColumnError = insertError.message?.includes('column') ||
                            insertError.code === '42703';
      if (isColumnError) {
        const basePayload = { workspace_id, user_name, rating, review };
        ({ data: insertData, error: insertError } = await supabase
          .from('ratings')
          .insert([basePayload])
          .select());
      }
    }

    if (insertError) throw insertError;

    res.json({ success: true, data: insertData[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ratings for a workspace
router.get('/workspace/:workspace_id', async (req, res) => {
  try {
    const { workspace_id } = req.params;

    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate average rating
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    // Rating distribution
    const distribution = {
      5: ratings.filter(r => r.rating === 5).length,
      4: ratings.filter(r => r.rating === 4).length,
      3: ratings.filter(r => r.rating === 3).length,
      2: ratings.filter(r => r.rating === 2).length,
      1: ratings.filter(r => r.rating === 1).length
    };

    res.json({
      success: true,
      data: {
        ratings,
        average: Math.round(avgRating * 10) / 10,
        count: ratings.length,
        total: ratings.length,
        distribution
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update rating
router.put('/:rating_id', async (req, res) => {
  try {
    const { rating_id } = req.params;
    const { rating, review } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    const { data, error } = await supabase
      .from('ratings')
      .update({ rating, review })
      .eq('id', rating_id)
      .select();

    if (error) throw error;

    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete rating (Admin)
router.delete('/:rating_id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('id', req.params.rating_id);

    if (error) throw error;

    res.json({ success: true, message: 'Rating deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
