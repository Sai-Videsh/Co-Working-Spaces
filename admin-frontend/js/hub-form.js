/* admin-frontend/js/hub-form.js */
const hubId = getParam('hub_id');
const isEdit = !!hubId;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('form-heading').textContent = isEdit ? 'Edit Hub' : 'Add New Hub';
    document.getElementById('page-title').textContent = isEdit ? 'Edit Hub' : 'Add Hub';
    document.getElementById('submit-btn').textContent = isEdit ? 'Update Hub' : 'Save Hub';

    if (isEdit) await loadHub();

    // Add event listeners for map updates
    document.getElementById('address').addEventListener('change', updateMapPreview);
    document.getElementById('city').addEventListener('change', updateMapPreview);
    document.getElementById('state').addEventListener('change', updateMapPreview);

    // Initial map preview if editing
    if (isEdit) {
        updateMapPreview();
    }

    document.getElementById('hub-form').addEventListener('submit', handleSubmit);
});

async function loadHub() {
    try {
        const res = await fetch(`${API_URL}/hubs/${hubId}`);
        const json = await res.json();
        const hub = json.data || json;
        const f = document.getElementById('hub-form');
        f.elements['name'].value = hub.name || '';
        f.elements['city'].value = hub.city || '';
        f.elements['state'].value = hub.state || '';
        f.elements['country'].value = hub.country || '';
        f.elements['address'].value = hub.address || '';
        f.elements['pincode'].value = hub.pincode || '';
        f.elements['latitude'].value = hub.latitude || '';
        f.elements['longitude'].value = hub.longitude || '';
    } catch {
        showToast('Failed to load hub data', 'error');
    }
}

// Update map preview based on address fields
function updateMapPreview() {
    const address = document.getElementById('address')?.value || '';
    const city = document.getElementById('city')?.value || '';
    const state = document.getElementById('state')?.value || '';
    
    if (!address || !city) {
        document.getElementById('hub-map-preview').innerHTML = '';
        return;
    }
    
    const fullAddress = `${address}, ${city}, ${state || ''}, India`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    const mapContainer = document.getElementById('hub-map-preview');
    if (!mapContainer) return;
    
    mapContainer.innerHTML = `
        <div style="background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-top:1rem;overflow:hidden;">
            <div style="width:100%;height:300px;position:relative;">
                <iframe 
                    width="100%" 
                    height="100%" 
                    style="border:none;border-radius:8px;" 
                    loading="lazy" 
                    allowfullscreen="" 
                    referrerpolicy="no-referrer-when-downgrade"
                    src="https://www.google.com/maps?q=${encodedAddress}&output=embed">
                </iframe>
            </div>
            <div style="padding:1rem;background:#f8f9fa;border-top:1px solid #e0e0e0;">
                <p style="margin:0;font-size:0.9rem;"><i class="fas fa-map-marker-alt" style="color:#3b82f6;margin-right:.5rem;"></i><strong>${fullAddress}</strong></p>
            </div>
        </div>
    `;
}

async function handleSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById('form-error');
    errEl.style.display = 'none';

    if (!validateForm(e.target)) return;

    const body = Object.fromEntries(new FormData(e.target).entries());

    // Convert latitude/longitude to numbers if provided
    if (body.latitude && body.latitude !== '') {
        body.latitude = parseFloat(body.latitude);
    } else {
        delete body.latitude; // Don't send empty string
    }

    if (body.longitude && body.longitude !== '') {
        body.longitude = parseFloat(body.longitude);
    } else {
        delete body.longitude; // Don't send empty string
    }

    const url = isEdit ? `${API_URL}/hubs/${hubId}` : `${API_URL}/hubs`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: getAdminHeaders(),
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
