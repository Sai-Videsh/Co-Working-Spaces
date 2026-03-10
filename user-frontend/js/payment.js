// payment.js – Payment gateway page with form validation

let bookingData  = null;
let activeMethod = null;
let appliedCoupon = null; // { code, discount_percentage }

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    bookingData = getSession('pendingBooking');
    if (!bookingData) { window.location.href = 'search-hubs.html'; return; }

    document.getElementById('payment-amount').textContent = formatCurrency(bookingData.total_price);

    // Show pricing breakdown from booking form
    const bd = document.getElementById('payment-breakdown');
    if (bookingData.pricing_html) {
        bd.innerHTML = `<div style="padding:1rem;background:var(--light);border-radius:8px;font-size:.9rem;">
            ${bookingData.pricing_html}
        </div>`;
    } else {
        bd.innerHTML = `<div style="padding:1rem;background:var(--light);border-radius:8px;">
            <div style="display:flex;justify-content:space-between;">
                <span>${bookingData.workspace_name}</span>
                <strong>${formatCurrency(bookingData.total_price)}</strong>
            </div>
            <div style="font-size:.85rem;color:var(--text-light);margin-top:.4rem;">
                ${formatDateTime(bookingData.start_time)} → ${formatDateTime(bookingData.end_time)}
            </div>
        </div>`;
    }
});

// ── Coupon ─────────────────────────────────────

async function applyCoupon() {
    const code = document.getElementById('coupon-input').value.trim().toUpperCase();
    const statusEl = document.getElementById('coupon-status');
    const btn = document.getElementById('coupon-apply-btn');

    if (!code) { showCouponStatus('Please enter a coupon code.', false); return; }

    // If already applied, allow removing
    if (appliedCoupon) { removeCoupon(); return; }

    btn.disabled = true;
    btn.textContent = '...';

    try {
        const res = await fetch(`${API_URL}/pricing/coupons/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                workspace_id: bookingData.workspace_id,
                hub_id: bookingData.hub_id
            })
        });
        const json = await res.json();

        if (!json.success) {
            showCouponStatus(json.error || 'Invalid coupon code.', false);
            btn.disabled = false;
            btn.textContent = 'Apply';
            return;
        }

        appliedCoupon = json.data;
        const discount = appliedCoupon.discount_percentage;
        const originalPrice = bookingData.total_price;
        const discountAmount = (originalPrice * discount) / 100;
        const newPrice = originalPrice - discountAmount;

        // Update displayed price
        document.getElementById('payment-amount').textContent = formatCurrency(newPrice);

        // Show coupon details in breakdown
        const bd = document.getElementById('payment-breakdown');
        const existingCouponRow = bd.querySelector('.coupon-applied-row');
        if (!existingCouponRow) {
            const row = document.createElement('div');
            row.className = 'coupon-applied-row';
            row.style.cssText = 'margin-top:.5rem;padding:.6rem .9rem;background:#d4edda;border-radius:6px;font-size:.875rem;display:flex;justify-content:space-between;align-items:center;';
            row.innerHTML = `<span style="color:#155724;"><i class="fas fa-tag"></i> <strong>${appliedCoupon.code}</strong> — ${discount}% off applied</span><span style="color:#155724;font-weight:700;">−${formatCurrency(discountAmount)}</span>`;
            bd.appendChild(row);
        }

        showCouponStatus(
            `✓ Coupon applied — ${discount}% off! You save ${formatCurrency(discountAmount)}`,
            true
        );
        document.getElementById('coupon-input').disabled = true;
        btn.textContent = 'Remove';
        btn.style.background = 'var(--danger)';
        btn.disabled = false;
    } catch {
        showCouponStatus('Failed to validate coupon. Try again.', false);
        btn.disabled = false;
        btn.textContent = 'Apply';
    }
}

function removeCoupon() {
    appliedCoupon = null;
    document.getElementById('coupon-input').disabled = false;
    document.getElementById('coupon-input').value = '';
    document.getElementById('payment-amount').textContent = formatCurrency(bookingData.total_price);
    document.getElementById('coupon-status').style.display = 'none';
    const row = document.querySelector('.coupon-applied-row');
    if (row) row.remove();
    const btn = document.getElementById('coupon-apply-btn');
    btn.textContent = 'Apply';
    btn.style.background = 'var(--primary)';
}

function showCouponStatus(msg, success) {
    const el = document.getElementById('coupon-status');
    el.style.display = 'block';
    el.style.color = success ? 'var(--success)' : 'var(--danger)';
    el.textContent = msg;
}

// ── Payment Method Selection ───────────────────

function selectPayment(method, el) {
    activeMethod = method;
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.payment-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`${method}-form`).classList.add('active');
    document.getElementById('payment-method-error').style.display = 'none';
}

// ── Card number formatter ──────────────────────

function formatCardNumber(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 16);
    input.value = v.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input) {
    let v = input.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    input.value = v;
}

// ── Process Payment ────────────────────────────

async function processPayment(method) {
    // Guard: method must be selected
    if (!activeMethod) {
        document.getElementById('payment-method-error').style.display = 'flex';
        return;
    }

    // Validate active payment form
    const form = document.getElementById(`${method}-form`);
    if (!validateForm(form)) {
        showToast('Please fill in all required payment details.', 'error');
        return;
    }

    const btn = form.querySelector('button[onclick]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…'; }

    // Apply coupon discount to final price
    let finalPrice = bookingData.total_price;
    if (appliedCoupon) {
        const discount = (finalPrice * appliedCoupon.discount_percentage) / 100;
        finalPrice = parseFloat((finalPrice - discount).toFixed(2));
    }

    try {
        // 1. Create booking (auth token provides user identity — no need to send user fields)
        const bookRes = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                workspace_id: bookingData.workspace_id,
                start_time:   bookingData.start_time,
                end_time:     bookingData.end_time,
                total_price:  finalPrice,
                booking_type: bookingData.booking_type,
                status:       'confirmed',
                coupon_code:  appliedCoupon?.code || null,
                // Pass resources inline so the backend handles them in one transaction
                resources: (bookingData.resources || []).map(r => ({
                    resource_id: r.id,
                    quantity: r.quantity || 1
                }))
            })
        });
        const bookResult = await bookRes.json();
        if (!bookResult.success) throw new Error(bookResult.error || 'Booking failed');

        const booking = bookResult.data;

        // 2. Generate QR code
        const qrRes    = await fetch(`${API_URL}/qr/generate/${booking.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        const qrResult = await qrRes.json();

        // 3. Persist confirmation data and navigate (server is source of truth for user identity)
        const currentUser = getCurrentUser();
        saveSession('confirmedBooking', {
            booking,
            qr_image: qrResult.data?.qr_image || null,
            workspace_name: bookingData.workspace_name,
            hub_name:   bookingData.hub_name,
            hub_city:   bookingData.hub_city,
            total_price: finalPrice,
            coupon_code: appliedCoupon?.code || null,
            coupon_discount: appliedCoupon?.discount_percentage || null,
            original_price: appliedCoupon ? bookingData.total_price : null,
            user_name:  currentUser?.name  || bookingData.user_name,
            start_time: bookingData.start_time,
            end_time:   bookingData.end_time
        });

        clearSession('pendingBooking');
        window.location.href = 'booking-confirmation.html';

    } catch (err) {
        console.error('Payment error:', err);
        showToast('Payment failed: ' + err.message, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Pay'; }
    }
}

// ── Form validation helper ─────────────────────

function validateForm(formEl) {
    let valid = true;
    formEl.querySelectorAll('[data-validate]').forEach(field => {
        // clear previous errors
        field.classList.remove('input-error');
        const old = field.parentNode.querySelector('.field-error');
        if (old) old.remove();

        const rules = field.getAttribute('data-validate').split('|');
        for (const rule of rules) {
            const [r, param] = rule.split(':');
            const err = checkValidationRule(r, param, field);
            if (err) {
                field.classList.add('input-error');
                const span = document.createElement('span');
                span.className = 'field-error';
                span.textContent = err;
                field.parentNode.appendChild(span);
                valid = false;
                break;
            }
        }
    });
    return valid;
}

function checkValidationRule(rule, param, field) {
    const val   = field.value.trim();
    const label = field.getAttribute('data-label') || 'This field';
    if (rule === 'required' && !val)         return `${label} is required.`;
    if (rule === 'email'   && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email.';
    if (rule === 'minlen'  && val && val.replace(/[\s-]/g,'').length < Number(param))
        return `Minimum ${param} characters required.`;
    return null;
}
