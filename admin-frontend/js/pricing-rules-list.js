/* admin-frontend/js/pricing-rules-list.js */
let allRules = [];

document.addEventListener('DOMContentLoaded', loadRules);

async function loadRules() {
    try {
        const res = await fetch(`${API_URL}/pricing/rules`);
        allRules = await res.json();
        renderRules(allRules);
    } catch {
        document.getElementById('rules-table').innerHTML =
            '<tr><td colspan="7" style="text-align:center;">Failed to load pricing rules.</td></tr>';
    }
}

function filterRules() {
    const q    = (document.getElementById('search')?.value || '').toLowerCase();
    const type = document.getElementById('filter-type')?.value || '';
    const filtered = allRules.filter(r => {
        const matchQ    = !q    || (r.name || '').toLowerCase().includes(q);
        const matchType = !type || r.rule_type === type;
        return matchQ && matchType;
    });
    renderRules(filtered);
}

function renderRules(rules) {
    const tbody = document.getElementById('rules-table');
    if (!rules.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No pricing rules found.</td></tr>';
        return;
    }
    tbody.innerHTML = rules.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>${r.name}</td>
            <td>${formatRuleType(r.rule_type)}</td>
            <td>${r.modifier_percent != null ? r.modifier_percent + '%' : '—'}</td>
            <td>${r.start_hour != null && r.end_hour != null ? `${r.start_hour}:00 – ${r.end_hour}:00` : '—'}</td>
            <td>
                <span class="badge ${r.is_active ? 'badge-success' : 'badge-secondary'}" style="cursor:pointer;" onclick="toggleActive(${r.id}, ${r.is_active})">
                    ${r.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <a href="pricing-rule-form.html?rule_id=${r.id}" class="btn btn-sm btn-outline"><i class="fas fa-edit"></i></a>
                <button class="btn btn-sm btn-danger" onclick="deleteRule(${r.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function formatRuleType(type) {
    const map = {
        peak_hours:   'Peak Hours',
        off_peak:     'Off-Peak',
        weekend:      'Weekend',
        long_booking: 'Long Booking',
        last_minute:  'Last Minute',
    };
    return map[type] || type || '—';
}

async function toggleActive(id, current) {
    try {
        const res = await fetch(`${API_URL}/pricing/rules/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !current })
        });
        if (!res.ok) throw new Error();
        showToast('Rule status updated', 'success');
        const rule = allRules.find(r => r.id === id);
        if (rule) rule.is_active = !current;
        filterRules();
    } catch {
        showToast('Failed to update rule', 'error');
    }
}

async function deleteRule(id) {
    if (!confirm('Delete this pricing rule?')) return;
    try {
        const res = await fetch(`${API_URL}/pricing/rules/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Rule deleted', 'success');
        allRules = allRules.filter(r => r.id !== id);
        filterRules();
    } catch {
        showToast('Failed to delete rule', 'error');
    }
}
