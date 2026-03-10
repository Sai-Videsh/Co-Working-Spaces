'use strict';

/**
 * Real Data Migration Script
 * Clears all existing hub/workspace data and populates from data/coworking_india_v2.csv
 * Run from the workspace root: node backend/scripts/populate-real-data.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.PROJECT_URL || !process.env.API_KEY) {
  console.error('❌  Missing PROJECT_URL or API_KEY in .env');
  process.exit(1);
}

const supabase = createClient(process.env.PROJECT_URL, process.env.API_KEY);
const CSV_PATH = path.resolve(__dirname, '../../data/coworking_india_v2.csv');

// ─── Full CSV parser (handles quoted fields with embedded newlines) ────────────
function parseCSV(content) {
  const rows = [];
  let i = 0;
  const len = content.length;

  while (i < len) {
    const row = [];
    let endOfRow = false;

    while (!endOfRow) {
      let field = '';

      if (i < len && content[i] === '"') {
        i++; // skip opening "
        while (i < len) {
          if (content[i] === '"') {
            if (i + 1 < len && content[i + 1] === '"') {
              field += '"'; i += 2; // escaped quote ""
            } else {
              i++; break; // closing "
            }
          } else {
            field += content[i++];
          }
        }
      } else {
        while (i < len && content[i] !== ',' && content[i] !== '\n' && content[i] !== '\r') {
          field += content[i++];
        }
      }

      row.push(field.trim());

      if (i >= len) { endOfRow = true; break; }
      if (content[i] === ',') { i++; continue; }
      if (content[i] === '\r') i++;
      if (i < len && content[i] === '\n') i++;
      endOfRow = true;
    }

    if (row.some(f => f !== '')) rows.push(row);
  }

  return rows;
}

// ─── Parse room-info string e.g. "12 Rooms | ₹350/hr | ₹2,500/day | ₹28,000/mo" ──
function parseRoomInfo(str) {
  if (!str || !str.trim()) return null;
  // Remove rupee sign (U+20B9) and thousand-separator commas
  const clean = str.replace(/[\u20B9\u0060₹,]/g, '');
  const parts = clean.split('|').map(s => s.trim());
  const countMatch = parts[0].match(/(\d+)/);
  if (!countMatch || parseInt(countMatch[1]) === 0) return null;
  const num = s => parseFloat((s || '').match(/(\d+)/)?.[1] || '0');
  return {
    count:   parseInt(countMatch[1]),
    hourly:  num(parts[1]),
    daily:   num(parts[2]),
    monthly: num(parts[3]),
  };
}

function extractPincode(addr) {
  const m = addr.match(/\b(\d{6})\b/);
  return m ? m[1] : null;
}

// ─── City centre coordinates (approximate) ────────────────────────────────────
const CITY_BASE_COORDS = {
  Hyderabad: [17.3850, 78.4867],
  Bengaluru: [12.9716, 77.5946],
  Mumbai:    [19.0760, 72.8777],
  Chennai:   [13.0827, 80.2707],
  Pune:      [18.5204, 73.8567],
  Noida:     [28.5355, 77.3910],
  Delhi:     [28.7041, 77.1025],
  Ahmedabad: [23.0225, 72.5714],
};

// ─── Workspace type mappings ──────────────────────────────────────────────────
const WS_TYPES = [
  { csvKey: 'companyRooms',    type: 'cabin',        label: 'Private Cabin',    capacity: 4  },
  { csvKey: 'conferenceRooms', type: 'conference',   label: 'Conference Hall',  capacity: 25 },
  { csvKey: 'meetingRooms',    type: 'meeting_room', label: 'Meeting Room',     capacity: 8  },
  { csvKey: 'waitingRoom',     type: 'hotdesk',      label: 'Hot Desk Area',    capacity: 1  },
];

const WS_DESCRIPTIONS = {
  cabin:
    'Private office cabin suitable for 1–4 professionals. Includes dedicated ergonomic workstations, lockable storage, and high-speed fibre internet. Ideal for focused deep work and confidential discussions.',
  conference:
    'Fully-furnished large conference room with 4K laser projector, surround sound, video conferencing hardware, and whiteboard walls. Comfortably seats 15–25 for board meetings, town halls, and client presentations.',
  meeting_room:
    'Modern private meeting room with 65-inch 4K smart display, interactive whiteboard, built-in camera, and noise-cancelling microphone. Perfect for client pitches, interviews, and team huddles of up to 8 people.',
  hotdesk:
    'Energetic open-plan hot desk area with ergonomic seating, shared monitors on request, free refreshments, and lightning-fast Wi-Fi. Ideal for freelancers and remote professionals who thrive in a community workspace.',
};

// ─── Sample review pools (per workspace type) ─────────────────────────────────
const REVIEWS = {
  cabin: [
    { r: 5, t: 'Excellent private cabin! The ergonomic setup and blazing-fast internet made it perfect for focused deep work.' },
    { r: 4, t: 'Clean, quiet, and well-maintained. Great for concentrated sessions — loved the natural lighting and tasteful interior.' },
    { r: 5, t: 'Perfect for our small startup team. Professional environment and extremely helpful staff. Definitely coming back!' },
    { r: 4, t: 'Good value for money. Powerful air conditioning, rock-solid Wi-Fi, and the coffee in the pantry was a nice bonus.' },
    { r: 3, t: 'Decent cabin but parking can get tricky during peak morning hours. Otherwise a solid coworking experience.' },
    { r: 5, t: 'Loved the privacy. Had an important client call and the quiet cabin setup created exactly the right impression.' },
  ],
  conference: [
    { r: 5, t: 'Superb AV setup! Our quarterly client pitch went off without a hitch. The 4K laser projector was seriously impressive.' },
    { r: 5, t: 'Spacious, well-lit, and fully equipped. The video conferencing system handled our remote participants seamlessly.' },
    { r: 4, t: 'Great conference room — very smooth booking process and the space easily exceeded our team\'s expectations.' },
    { r: 4, t: 'Professional setting for our all-hands meeting. Outstanding sound system and the catering team was very cooperative.' },
    { r: 3, t: 'Good facilities overall but the room felt slightly snug with 20+ people. The AV equipment was excellent though.' },
    { r: 5, t: 'The whiteboard walls were perfect for our design sprint. Will absolutely book this space again next quarter.' },
  ],
  meeting_room: [
    { r: 5, t: 'Quick to book and the video call setup worked flawlessly for our distributed team across three time zones.' },
    { r: 4, t: 'Great meeting room — clean, modern, and the interactive whiteboard was genuinely very useful for ideation.' },
    { r: 5, t: 'Perfect for client interviews: private, quiet, and made a great impression on our recruits.' },
    { r: 4, t: 'Well-equipped room. The large display screen made sharing decks effortless and looked very polished.' },
    { r: 4, t: 'Loved the minimalist ambience — helped keep the meeting on track. Fast reliable internet throughout.' },
    { r: 3, t: 'Comfortable meeting room. Slightly noisy from the adjacent area but overall a genuinely good experience.' },
  ],
  hotdesk: [
    { r: 5, t: 'Vibrant community energy! Met some great co-founders here. The internet speed is genuinely world-class.' },
    { r: 4, t: 'Great atmosphere. Smooth check-in, comfortable ergonomic seating, and free specialty coffee — what\'s not to love?' },
    { r: 5, t: 'My go-to spot for remote work. Affordable, extremely convenient location, and the vibe is super motivating.' },
    { r: 4, t: 'Clean hot desks with excellent lighting. The free coffee machine and healthy snacks are a lovely daily bonus.' },
    { r: 3, t: 'Can get a bit noisy during peak lunch hours, but the internet and desk setup are genuinely first-rate.' },
    { r: 5, t: 'Joined a networking event here last month. The community team really goes above and beyond. Brilliant place.' },
  ],
};

const SAMPLE_USERS = [
  { name: 'Arjun Sharma',    email: 'arjun.sharma@example.com'  },
  { name: 'Priya Mehta',     email: 'priya.mehta@example.com'   },
  { name: 'Rahul Gupta',     email: 'rahul.gupta@example.com'   },
  { name: 'Kavita Nair',     email: 'kavita.nair@example.com'   },
  { name: 'Suresh Patel',    email: 'suresh.patel@example.com'  },
  { name: 'Deepa Reddy',     email: 'deepa.reddy@example.com'   },
  { name: 'Vikram Singh',    email: 'vikram.singh@example.com'  },
  { name: 'Meera Iyer',      email: 'meera.iyer@example.com'    },
  { name: 'Anil Kumar',      email: 'anil.kumar@example.com'    },
  { name: 'Santha Krishnan', email: 'santha.k@example.com'      },
  { name: 'Pooja Verma',     email: 'pooja.verma@example.com'   },
  { name: 'Ravi Teja',       email: 'ravi.teja@example.com'     },
];

// ─── Batch insert helper ──────────────────────────────────────────────────────
async function batchInsert(table, data, batchSize = 100, selectFields = '*') {
  if (!data.length) return [];
  const all = [];
  for (let i = 0; i < data.length; i += batchSize) {
    const { data: rows, error } = await supabase
      .from(table)
      .insert(data.slice(i, i + batchSize))
      .select(selectFields);
    if (error) {
      throw Object.assign(
        new Error(`Insert into "${table}" failed: ${error.message}`),
        { detail: error }
      );
    }
    all.push(...rows);
  }
  return all;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  Co-working India — Real Data Migration');
  console.log('─'.repeat(52));

  // 1. Parse CSV ───────────────────────────────────────────────────────────────
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV not found at: ${CSV_PATH}`);
  }
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const allRows    = parseCSV(csvContent);

  // First row is headers (may contain embedded newlines inside quoted cells)
  const dataRows = allRows.slice(1).map(fields => ({
    sno:             parseInt(fields[0]) || 0,
    city:            fields[1]  || '',
    state:           fields[2]  || '',
    area:            fields[3]  || '',
    name:            fields[4]  || '',
    address:         fields[5]  || '',
    approachability: fields[6]  || '',
    // fields[7] = Google Maps link (unused)
    companyRooms:    parseRoomInfo(fields[8]),
    conferenceRooms: parseRoomInfo(fields[9]),
    meetingRooms:    parseRoomInfo(fields[10]),
    waitingRoom:     parseRoomInfo(fields[11]),
    amenities:       (fields[12] || '').split('|').map(a => a.trim()).filter(Boolean),
    hasLunchRoom:    (fields[13] || '').toLowerCase().trim() === 'yes',
    hasPantry:       (fields[14] || '').toLowerCase().trim() === 'yes',
  })).filter(r => r.sno > 0 && r.name);

  console.log(`\n📄  Parsed ${dataRows.length} coworking spaces from CSV\n`);

  // 2. Clear existing data (FK-safe order) ────────────────────────────────────
  console.log('🗑️   Clearing existing data…');
  const CLEAR_ORDER = [
    'qr_codes', 'booking_resources', 'ratings',
    'bookings', 'pricing_rules', 'resources',
    'workspaces', 'working_hubs',
  ];
  for (const table of CLEAR_ORDER) {
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) {
      // If it's genuinely a permissions problem, stop here
      if (!error.message.toLowerCase().includes('row-level')) {
        console.warn(`  ⚠️  ${table}: ${error.message}`);
      } else {
        throw new Error(`RLS blocked DELETE on ${table}. Check Supabase policies.`);
      }
    } else {
      console.log(`  ✓  ${table}`);
    }
  }
  console.log('');

  // 3. Insert working hubs ─────────────────────────────────────────────────────
  console.log('📍  Inserting working hubs…');
  const hubRows = dataRows.map(row => {
    const [baseLat, baseLng] = CITY_BASE_COORDS[row.city] || [20.5937, 78.9629];
    // Deterministic spread — each hub gets a small unique offset within its city
    const latOff = ((row.sno * 13) % 21 - 10) * 0.007;
    const lngOff = ((row.sno *  7) % 15 -  7) * 0.007;
    return {
      name:      row.name,
      address:   row.address,
      city:      row.city,
      state:     row.state,
      country:   'India',
      pincode:   extractPincode(row.address),
      latitude:  parseFloat((baseLat + latOff).toFixed(6)),
      longitude: parseFloat((baseLng + lngOff).toFixed(6)),
    };
  });

  const hubs = await batchInsert('working_hubs', hubRows);
  console.log(`  ✅  ${hubs.length} hubs inserted\n`);

  // 4. Build workspace records ──────────────────────────────────────────────────
  console.log('💼  Inserting workspaces…');

  // wsMeta[i] holds metadata so we can build resources/rules/ratings
  // after we have the real workspace IDs back from the DB.
  const wsMeta = [];
  const wsRows = [];

  for (let hi = 0; hi < dataRows.length; hi++) {
    const row   = dataRows[hi];
    const hubId = hubs[hi].id;

    for (const wst of WS_TYPES) {
      const info = row[wst.csvKey];
      if (!info || info.hourly === 0) continue;

      // Build amenity list for this workspace
      const amenities = ['High-Speed Internet', 'Power Backup', 'Air Conditioning'];
      if (row.amenities.includes('24x7 Access'))        amenities.push('24/7 Access');
      if (row.amenities.includes('Modern Design'))      amenities.push('Modern Interiors');
      if (row.amenities.includes('Accessible Commute')) amenities.push('Metro / Bus Access');
      if (row.amenities.includes('24x7 Surveillance'))  amenities.push('CCTV Surveillance');
      if (row.amenities.includes('Housekeeping'))       amenities.push('Daily Housekeeping');
      if (row.amenities.includes('Events'))             amenities.push('Event Space Access');
      if (row.amenities.includes('Lounge Area'))        amenities.push('Lounge Access');
      if (wst.type === 'conference' || wst.type === 'meeting_room') {
        amenities.push('Video Conferencing');
      }

      wsRows.push({
        hub_id:       hubId,
        name:         `${row.name} – ${wst.label}`,
        type:         wst.type,
        capacity:     wst.capacity,
        base_price:   info.hourly,
        description:  WS_DESCRIPTIONS[wst.type],
        amenities,
        is_available: true,
      });
      wsMeta.push({ row, wst, info, hubId });
    }
  }

  const workspaces = await batchInsert('workspaces', wsRows);
  console.log(`  ✅  ${workspaces.length} workspaces inserted\n`);

  // Build (hub_id:type) → workspace_id for reliable lookup
  const wsLookup = {};
  for (const ws of workspaces) {
    wsLookup[`${ws.hub_id}:${ws.type}`] = ws.id;
  }
  // Attach resolved ID to each meta entry
  wsMeta.forEach(m => {
    m.wsId = wsLookup[`${m.hubId}:${m.wst.type}`];
  });

  // 5. Build & insert resources ─────────────────────────────────────────────────
  console.log('🎯  Inserting resources…');
  const resources = [];

  for (const m of wsMeta) {
    const { row, wst, wsId } = m;
    const hasProjector = row.amenities.includes('Projector');
    const hasPrinting  = row.amenities.includes('Printing');

    switch (wst.type) {
      case 'cabin':
        if (hasProjector)
          resources.push({ workspace_id: wsId, name: 'Projector', description: 'Full HD projector with HDMI & wireless casting support', price_per_slot: 150, quantity: 1 });
        resources.push({ workspace_id: wsId, name: 'Whiteboard', description: 'Large magnetic whiteboard with premium markers and duster', price_per_slot: 0, quantity: 1 });
        if (hasPrinting)
          resources.push({ workspace_id: wsId, name: 'Print Station', description: 'Black & white laser printing — up to 20 pages per booking', price_per_slot: 30, quantity: 1 });
        break;

      case 'conference':
        resources.push({ workspace_id: wsId, name: 'HD Laser Projector', description: '4K laser projector with wireless screen mirroring and remote clicker', price_per_slot: 200, quantity: 2 });
        resources.push({ workspace_id: wsId, name: 'Video Conferencing System', description: 'Full HD wide-angle camera, omnidirectional microphone and speaker bar', price_per_slot: 150, quantity: 1 });
        resources.push({ workspace_id: wsId, name: 'Whiteboard Wall', description: 'Full-length writable whiteboard wall with markers and eraser', price_per_slot: 0, quantity: 1 });
        if (hasPrinting)
          resources.push({ workspace_id: wsId, name: 'Print Station', description: 'Colour & B/W printing for conference materials', price_per_slot: 50, quantity: 1 });
        break;

      case 'meeting_room':
        resources.push({ workspace_id: wsId, name: 'Smart Display', description: '65-inch 4K smart TV with HDMI, USB-C and Chromecast support', price_per_slot: 100, quantity: 1 });
        resources.push({ workspace_id: wsId, name: 'Interactive Whiteboard', description: 'Digital whiteboard with touch interface and cloud save', price_per_slot: 50, quantity: 1 });
        break;

      case 'hotdesk':
        resources.push({ workspace_id: wsId, name: 'Storage Locker', description: 'Secure personal locker for valuables during your session', price_per_slot: 50, quantity: 5 });
        resources.push({ workspace_id: wsId, name: 'External Monitor', description: '27-inch Full HD monitor with ergonomic keyboard and mouse', price_per_slot: 80, quantity: 3 });
        break;
    }

    if (row.hasLunchRoom)
      resources.push({ workspace_id: wsId, name: 'Lunch Room', description: 'Access to fully-equipped lunch room with microwave, refrigerator and dining area', price_per_slot: 80, quantity: 1 });
    if (row.hasPantry)
      resources.push({ workspace_id: wsId, name: 'Pantry & Coffee', description: 'Unlimited specialty coffee, tea and healthy light snacks from the pantry', price_per_slot: 40, quantity: 1 });
  }

  const insertedResources = await batchInsert('resources', resources, 100, 'id');
  console.log(`  ✅  ${insertedResources.length} resources inserted\n`);

  // 6. Build & insert pricing rules ─────────────────────────────────────────────
  console.log('💰  Inserting pricing rules…');
  const pricingRules = [];
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const WEEKEND  = ['Sat', 'Sun'];

  for (const { wsId } of wsMeta) {
    // Peak hours: weekday mornings +12 %
    pricingRules.push({
      workspace_id: wsId, rule_type: 'peak_hours',
      percentage_modifier: 12, flat_modifier: 0,
      start_time: '09:00', end_time: '12:00', days: WEEKDAYS,
    });
    // Weekend discount: -10 %
    pricingRules.push({
      workspace_id: wsId, rule_type: 'weekend_discount',
      percentage_modifier: -10, flat_modifier: 0,
      start_time: null, end_time: null, days: WEEKEND,
    });
    // Early-bird discount: weekday 07:00–09:00 -5 %
    pricingRules.push({
      workspace_id: wsId, rule_type: 'early_bird',
      percentage_modifier: -5, flat_modifier: 0,
      start_time: '07:00', end_time: '09:00', days: WEEKDAYS,
    });
  }

  const insertedRules = await batchInsert('pricing_rules', pricingRules, 150, 'id');
  console.log(`  ✅  ${insertedRules.length} pricing rules inserted\n`);

  // 7. Build & insert sample ratings ────────────────────────────────────────────
  console.log('⭐  Inserting ratings…');
  const ratings = [];

  for (let mi = 0; mi < wsMeta.length; mi++) {
    const { wst, wsId } = wsMeta[mi];
    const pool = REVIEWS[wst.type];
    // Alternate between 2 and 3 ratings per workspace for variety
    const numRatings = mi % 3 === 0 ? 3 : 2;

    for (let ri = 0; ri < numRatings; ri++) {
      const review = pool[(mi + ri) % pool.length];
      const user   = SAMPLE_USERS[(mi * 3 + ri) % SAMPLE_USERS.length];
      // Spread reviews over the past ~6 months deterministically
      const daysAgo = 5 + ((mi * 7 + ri * 13) % 170);
      ratings.push({
        workspace_id: wsId,
        user_name:    user.name,
        user_email:   user.email,
        rating:       review.r,
        review:       review.t,
        created_at:   new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
      });
    }
  }

  const insertedRatings = await batchInsert('ratings', ratings, 150, 'id');
  console.log(`  ✅  ${insertedRatings.length} ratings inserted\n`);

  // 8. Summary ──────────────────────────────────────────────────────────────────
  console.log('─'.repeat(52));
  console.log('🎉  Migration complete!\n');
  console.log(`  📍  ${String(hubs.length).padStart(4)}  working hubs`);
  console.log(`  💼  ${String(workspaces.length).padStart(4)}  workspaces`);
  console.log(`  🎯  ${String(insertedResources.length).padStart(4)}  resources`);
  console.log(`  💰  ${String(insertedRules.length).padStart(4)}  pricing rules`);
  console.log(`  ⭐  ${String(insertedRatings.length).padStart(4)}  ratings`);

  const cities = [...new Set(dataRows.map(r => r.city))];
  console.log(`\n  Cities: ${cities.join(', ')}`);
  console.log('─'.repeat(52) + '\n');
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err.message);
  if (err.detail) console.error('   Detail:', JSON.stringify(err.detail, null, 2));
  process.exit(1);
});
