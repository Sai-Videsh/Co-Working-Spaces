const { supabase } = require('../config/supabase');

async function fetchAllTables() {
  console.log('\n=== FETCHING SUPABASE TABLES ===\n');

  try {
    // Get all table names from information_schema
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      });

    if (tablesError) {
      // If RPC doesn't work, try direct query on each known table
      console.log('Attempting to list tables by querying...\n');
      
      const knownTables = [
        'users',
        'working_hubs',
        'workspaces',
        'bookings',
        'booking_resources',
        'resources',
        'pricing_rules',
        'transactions',
        'qr_codes',
        'ratings'
      ];

      for (const tableName of knownTables) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (!error) {
            console.log(`✅ ${tableName} (${count || 0} rows)`);
            
            // Get sample data structure
            const { data: sample } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (sample && sample.length > 0) {
              console.log('   Columns:', Object.keys(sample[0]).join(', '));
            }
            console.log('');
          }
        } catch (err) {
          // Table doesn't exist or no access
        }
      }
    } else {
      console.log('Tables found:', tables);
    }

    // List each table with row counts
    console.log('\n=== TABLE SUMMARY ===\n');
    
    const tablesToCheck = [
      'users',
      'working_hubs',
      'workspaces',
      'bookings',
      'booking_resources',
      'resources',
      'pricing_rules',
      'transactions',
      'qr_codes',
      'ratings'
    ];

    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`${table.padEnd(20)} - ${count || 0} rows`);
        }
      } catch (err) {
        console.log(`${table.padEnd(20)} - Not accessible or doesn't exist`);
      }
    }

    console.log('\n=== DETAILED TABLE STRUCTURES ===\n');

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (!error && data && data.length > 0) {
          console.log(`\n📋 ${table.toUpperCase()}`);
          console.log('─'.repeat(50));
          const columns = Object.keys(data[0]);
          columns.forEach(col => {
            const value = data[0][col];
            const type = typeof value === 'object' && value !== null
              ? 'JSONB/Array'
              : typeof value === 'number'
              ? Number.isInteger(value) ? 'INTEGER/BIGINT' : 'DECIMAL'
              : value instanceof Date
              ? 'TIMESTAMP'
              : 'VARCHAR/TEXT';
            console.log(`  ${col.padEnd(25)} ${type}`);
          });
        }
      } catch (err) {
        // Skip tables that don't exist
      }
    }

    console.log('\n=== FETCH COMPLETE ===\n');

  } catch (error) {
    console.error('Error fetching tables:', error.message);
  }
}

fetchAllTables();
