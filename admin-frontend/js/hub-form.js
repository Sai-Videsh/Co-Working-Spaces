/* admin-frontend/js/hub-form.js */
const hubId = getParam('hub_id');
const isEdit = !!hubId;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('form-heading').textContent = isEdit ? 'Edit Hub' : 'Add New Hub';
    document.getElementById('page-title').textContent   = isEdit ? 'Edit Hub' : 'Add Hub';
    document.getElementById('submit-btn').textContent   = isEdit ? 'Update Hub' : 'Save Hub';

    if (isEdit) await loadHub();

    document.getElementById('hub-form').addEventListener('submit', handleSubmit);
});

async function loadHub() {
    try {
        const res = await fetch(`${API_URL}/hubs/${hubId}`);
        const hub = await res.json();
        const f = document.getElementById('hub-form');
        f.elements['name'].value    = hub.name    || '';
        f.elements['city'].value    = hub.city    || '';
        f.elements['state'].value   = hub.state   || '';
        f.elements['country'].value = hub.country || '';
        f.elements['address'].value = hub.address || '';
        f.elements['pincode'].value = hub.pincode || '';
        f.elements['lat'].value     = hub.lat     || '';
        f.elements['lng'].value     = hub.lng     || '';
    } catch {
        showToast('Failed to load hub data', 'error');
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById('form-error');
    errEl.style.display = 'none';

    if (!validateForm(e.target)) return;

    const body = Object.fromEntries(new FormData(e.target).entries());
    if (body.lat) body.lat = parseFloat(body.lat);
    if (body.lng) body.lng = parseFloat(body.lng);

    const url    = isEdit ? `${API_URL}/hubs/${hubId}` : `${API_URL}/hubs`;
    const method = isEdit ? 'PATCH' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to save hub');
        }
        showToast(isEdit ? 'Hub updated!' : 'Hub created!', 'success');
        setTimeout(() => { window.location.href = 'hubs-list.html'; }, 800);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    }
}
