/* admin-frontend/js/pricing-rule-form.js */
const ruleId = getParam('rule_id');
const isEdit = !!ruleId;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('form-heading').textContent = isEdit ? 'Edit Pricing Rule' : 'Add Pricing Rule';
    document.getElementById('page-title').textContent   = isEdit ? 'Edit Pricing Rule' : 'Add Pricing Rule';
    document.getElementById('submit-btn').textContent   = isEdit ? 'Update Rule' : 'Save Rule';

    toggleHourFields();
    document.getElementById('rule_type').addEventListener('change', toggleHourFields);

    if (isEdit) await loadRule();

    document.getElementById('pricing-rule-form').addEventListener('submit', handleSubmit);
});

function toggleHourFields() {
    const type = document.getElementById('rule_type')?.value;
    const wrap = document.getElementById('hour-fields');
    if (!wrap) return;
    const showHours = type === 'peak_hours' || type === 'off_peak';
    wrap.style.display = showHours ? '' : 'none';
}

async function loadRule() {
    try {
        const res = await fetch(`${API_URL}/pricing/rules/${ruleId}`);
        const r = await res.json();
        const f = document.getElementById('pricing-rule-form');
        f.elements['name'].value             = r.name             || '';
        f.elements['rule_type'].value        = r.rule_type        || '';
        f.elements['modifier_percent'].value = r.modifier_percent || '';
        f.elements['is_active'].value        = r.is_active === false ? 'false' : 'true';
        f.elements['description'].value      = r.description      || '';
        if (r.start_hour != null) f.elements['start_hour'].value = r.start_hour;
        if (r.end_hour   != null) f.elements['end_hour'].value   = r.end_hour;
        toggleHourFields();
    } catch {
        showToast('Failed to load rule data', 'error');
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById('form-error');
    errEl.style.display = 'none';

    if (!validateForm(e.target)) return;

    const data = Object.fromEntries(new FormData(e.target).entries());
    const body = {
        name:             data.name,
        rule_type:        data.rule_type,
        modifier_percent: parseFloat(data.modifier_percent),
        is_active:        data.is_active === 'true',
        description:      data.description || '',
    };
    if (data.start_hour !== '') body.start_hour = parseInt(data.start_hour);
    if (data.end_hour   !== '') body.end_hour   = parseInt(data.end_hour);

    const url    = isEdit ? `${API_URL}/pricing/rules/${ruleId}` : `${API_URL}/pricing/rules`;
    const method = isEdit ? 'PATCH' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || 'Failed to save rule');
        }
        showToast(isEdit ? 'Rule updated!' : 'Rule created!', 'success');
        setTimeout(() => { window.location.href = 'pricing-rules-list.html'; }, 800);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    }
}
