const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Supabase client
const supabase = createClient(
  process.env.PROJECT_URL,
  process.env.API_KEY
);

module.exports = { supabase };
