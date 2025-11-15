const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { generateQRCode } = require('../utils/qrGenerator');

// Generate QR code for booking
router.post('/generate/:booking_id', async (req, res) => {
  try {
    const booking_id = req.params.booking_id;

    // Check if booking exists
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (bookingError) throw bookingError;

    // Generate unique QR value
    const qr_value = `BOOKING-${booking_id}-${Date.now()}`;

    // Create QR code record
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .insert([{
        booking_id,
        qr_value
      }])
      .select()
      .single();

    if (qrError) throw qrError;

    // Generate QR code image (base64)
    const qrCodeImage = await generateQRCode(qr_value);

    res.json({
      success: true,
      data: {
        qr_code: qrCode,
        qr_image: qrCodeImage
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get QR code for booking
router.get('/booking/:booking_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('booking_id', req.params.booking_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    // Generate QR code image
    const qrCodeImage = await generateQRCode(data.qr_value);

    res.json({
      success: true,
      data: {
        qr_code: data,
        qr_image: qrCodeImage
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Scan QR code (check-in)
router.post('/scan', async (req, res) => {
  try {
    const { qr_value } = req.body;

    // Find QR code
    const { data: qrCode, error: qrError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('qr_value', qr_value)
      .single();

    if (qrError) throw qrError;

    // Check if already scanned
    if (qrCode.scanned_at) {
      return res.status(400).json({
        success: false,
        error: 'QR code already scanned',
        scanned_at: qrCode.scanned_at
      });
    }

    // Update QR code as scanned
    const { error: updateQrError } = await supabase
      .from('qr_codes')
      .update({ scanned_at: new Date().toISOString() })
      .eq('id', qrCode.id);

    if (updateQrError) throw updateQrError;

    // Update booking status to checked_in
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .update({ status: 'checked_in' })
      .eq('id', qrCode.booking_id)
      .select(`
        *,
        workspaces (
          name,
          type,
          working_hubs (
            name,
            address
          )
        )
      `)
      .single();

    if (bookingError) throw bookingError;

    res.json({
      success: true,
      message: 'Check-in successful',
      data: {
        booking,
        scanned_at: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all QR codes (Admin)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('qr_codes')
      .select(`
        *,
        bookings (
          id,
          user_name,
          start_time,
          end_time,
          status,
          workspaces (
            name,
            type
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
