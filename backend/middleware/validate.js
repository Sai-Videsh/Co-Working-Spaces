/**
 * middleware/validate.js
 *
 * Reusable server-side input validation helpers.
 * Call validate() at the top of any route handler before touching the DB.
 *
 * Usage:
 *   const { validate, rules } = require('../middleware/validate');
 *   const err = validate(req.body, { email: [rules.required, rules.email], ... });
 *   if (err) return res.status(400).json({ success: false, error: err });
 */

'use strict';

// ── Primitive sanitisers ──────────────────────────────────────────────────────

/** Trim a string and collapse internal whitespace. Never returns null. */
function str(v) {
  return String(v ?? '').trim().replace(/\s+/g, ' ');
}

/** Return v as a finite number, or NaN. */
function num(v) {
  return Number(v);
}

// ── Individual rules ──────────────────────────────────────────────────────────
// Each rule is a function(value, fieldName) => errorString | null

const rules = {
  required: (v, f) =>
    (v === undefined || v === null || String(v).trim() === '')
      ? `${f} is required`
      : null,

  string: (v, f) =>
    typeof v !== 'string' ? `${f} must be a string` : null,

  email: (v, f) => {
    if (!v) return null; // let required handle emptiness
    return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(String(v).trim())
      ? null
      : `${f} must be a valid email address`;
  },

  /** minLen(n) – minimum string length after trim */
  minLen: (n) => (v, f) =>
    String(v ?? '').trim().length < n ? `${f} must be at least ${n} characters` : null,

  /** maxLen(n) – maximum string length after trim (prevents payload bloat) */
  maxLen: (n) => (v, f) =>
    String(v ?? '').trim().length > n ? `${f} must be at most ${n} characters` : null,

  /** integer – must be a whole positive number */
  positiveInt: (v, f) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? null : `${f} must be a positive integer`;
  },

  /** Whitelist of allowed string values */
  oneOf: (allowed) => (v, f) =>
    allowed.includes(String(v ?? '').trim())
      ? null
      : `${f} must be one of: ${allowed.join(', ')}`,

  /** ISO 8601 datetime string */
  isoDate: (v, f) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? `${f} must be a valid date/time` : null;
  },

  /** Date must be in the future (relative to now at time of request) */
  futureDate: (v, f) => {
    if (!v) return null;
    return new Date(v) > new Date() ? null : `${f} must be a future date/time`;
  },

  /** v must be strictly after another value already in the object */
  after: (otherKey) => (v, f, obj) => {
    if (!v || !obj[otherKey]) return null;
    return new Date(v) > new Date(obj[otherKey])
      ? null
      : `${f} must be after ${otherKey.replace(/_/g, ' ')}`;
  },

  /** Booking duration sanity: start → end ≤ maxHours */
  maxDuration: (maxHours) => (v, f, obj) => {
    if (!v || !obj.start_time) return null;
    const hours = (new Date(v) - new Date(obj.start_time)) / 3600000;
    return hours <= maxHours
      ? null
      : `Booking duration cannot exceed ${maxHours} hours`;
  },

  /** Booking start cannot be more than N days in the future */
  maxFutureDays: (days) => (v, f) => {
    if (!v) return null;
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    return new Date(v) <= limit
      ? null
      : `${f} cannot be more than ${days} days in the future`;
  },

  /** Positive finite number */
  positiveNumber: (v, f) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? null : `${f} must be a positive number`;
  },

  /** Array with optional item constraints */
  isArray: (v, f) =>
    Array.isArray(v) ? null : `${f} must be an array`,

  /** Phone – digits, spaces, +, -, () only; len 7-20 */
  phone: (v, f) => {
    if (!v || String(v).trim() === '') return null; // optional field
    const clean = String(v).trim();
    if (!/^[+\d\s\-().]{7,20}$/.test(clean)) return `${f} must be a valid phone number`;
    return null;
  },

  /** Prevent script injection in free-text fields */
  noScript: (v, f) => {
    if (!v) return null;
    const dangerous = /<script|javascript:|on\w+\s*=/i;
    return dangerous.test(String(v)) ? `${f} contains invalid characters` : null;
  },
};

// ── Core validator ────────────────────────────────────────────────────────────

/**
 * Validate an object against a schema.
 *
 * @param {object} body   - Request body (or any plain object)
 * @param {object} schema - { fieldName: [rule, rule, ...] }
 * @returns {string|null}  First error message found, or null if all pass.
 */
function validate(body, schema) {
  for (const [field, fieldRules] of Object.entries(schema)) {
    const value = body[field];
    for (const rule of fieldRules) {
      const err = rule(value, field.replace(/_/g, ' '), body);
      if (err) return err;
    }
  }
  return null;
}

module.exports = { validate, rules, str, num };
