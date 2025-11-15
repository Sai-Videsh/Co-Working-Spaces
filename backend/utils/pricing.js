const { supabase } = require('../config/supabase');

async function calculateDynamicPrice(workspace_id, base_price, start_time, durationHours, booking_type) {
  try {
    // Base price calculation
    let calculatedPrice = base_price;
    
    if (booking_type === 'daily') {
      calculatedPrice *= 8; // 8 hours per day
    } else if (booking_type === 'monthly') {
      calculatedPrice *= 8 * 22; // 8 hours * 22 working days
    } else {
      calculatedPrice *= durationHours;
    }

    // Get pricing rules for this workspace
    const { data: rules, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('workspace_id', workspace_id);

    if (error) throw error;

    // Apply pricing rules
    const start = new Date(start_time);
    const bookingDay = start.toLocaleDateString('en-US', { weekday: 'short' });
    const bookingTime = start.toTimeString().slice(0, 5); // HH:MM format

    for (const rule of rules || []) {
      let applies = false;

      // Check day-based rules
      if (rule.days && rule.days.length > 0) {
        if (rule.days.includes(bookingDay)) {
          applies = true;
        }
      }

      // Check time-based rules
      if (rule.start_time && rule.end_time) {
        if (bookingTime >= rule.start_time && bookingTime <= rule.end_time) {
          applies = true;
        }
      }

      // Check demand-based rules
      if (rule.rule_type === 'demand') {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('workspace_id', workspace_id)
          .eq('status', 'confirmed')
          .gte('start_time', start.toISOString().split('T')[0])
          .lte('start_time', start.toISOString().split('T')[0] + 'T23:59:59');

        const occupancyRate = (bookings?.length || 0) / 10; // Assuming max 10 slots per day
        
        if (occupancyRate > 0.7 && rule.percentage_modifier > 0) {
          applies = true;
        } else if (occupancyRate < 0.3 && rule.percentage_modifier < 0) {
          applies = true;
        }
      }

      // Apply rule if applicable
      if (applies) {
        calculatedPrice += (calculatedPrice * (rule.percentage_modifier || 0) / 100);
        calculatedPrice += (rule.flat_modifier || 0);
      }
    }

    return Math.round(calculatedPrice * 100) / 100;
  } catch (error) {
    console.error('Error calculating dynamic price:', error);
    return base_price * durationHours;
  }
}

module.exports = { calculateDynamicPrice };
