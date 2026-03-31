/* admin-frontend/js/workspace-form.js */
const workspaceId = getParam('workspace_id');
const isEdit = !!workspaceId;
let allHubs = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('form-heading').textContent = isEdit ? 'Edit Workspace' : 'Add New Workspace';
    document.getElementById('page-title').textContent = isEdit ? 'Edit Workspace' : 'Add Workspace';
    document.getElementById('submit-btn').textContent = isEdit ? 'Update Workspace' : 'Save Workspace';

    await loadHubs();
    if (isEdit) await loadWorkspace();

    // Add event listener for hub selection change
    document.getElementById('hub_id').addEventListener('change', updateHubPreview);
    
    // Show initial map if hub is selected
    if (document.getElementById('hub_id').value) {
        updateHubPreview();
    }

    document.getElementById('workspace-form').addEventListener('submit', handleSubmit);
});

async function loadHubs() {
    try {
        const json = await fetch(`${API_URL}/hubs`).then(r => r.json());
        allHubs = json.data || json;
        const sel = document.getElementById('hub_id');
        allHubs.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.id; opt.textContent = h.name;
            sel.appendChild(opt);
        });
    } catch {
        showToast('Failed to load hubs', 'error');
    }
}

// Update hub preview map when hub is selected
function updateHubPreview() {
    const hubId = document.getElementById('hub_id').value;
    const hub = allHubs.find(h => h.id == hubId);
    
    if (!hub) return;
    
    const mapContainer = document.getElementById('hub-map-preview');
    if (!mapContainer) return;
    
    const fullAddress = `${hub.address}, ${hub.city}, ${hub.state || ''}, India`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
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
                <p style="margin:0;font-size:0.9rem;"><i class="fas fa-map-marker-alt" style="color:#3b82f6;margin-right:.5rem;"></i><strong>${hub.name}</strong></p>
                <p style="margin:0.25rem 0 0 0;font-size:0.85rem;color:#666;">${fullAddress}</p>
            </div>
        </div>
    `;
}

async function loadWorkspace() {
    try {
        const res = await fetch(`${API_URL}/workspaces/${workspaceId}`);
        const json = await res.json();
        const w = json.data || json;
        const f = document.getElementById('workspace-form');
        f.elements['hub_id'].value = w.hub_id || '';
        f.elements['name'].value = w.name || '';
        f.elements['type'].value = w.type || '';
        f.elements['capacity'].value = w.capacity || '';
        f.elements['base_price'].value = w.base_price || w.price_per_hour || '';
        f.elements['amenities'].value = Array.isArray(w.amenities) ? w.amenities.join(', ') : (w.amenities || '');
        f.elements['description'].value = w.description || '';
        f.elements['is_available'].value = w.is_available === false ? 'false' : 'true';
    } catch {
        showToast('Failed to load workspace data', 'error');
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById('form-error');
    errEl.style.display = 'none';

    if (!validateForm(e.target)) return;

    const data = Object.fromEntries(new FormData(e.target).entries());
    const body = {
        hub_id: parseInt(data.hub_id),
        name: data.name,
        type: data.type,
        capacity: parseInt(data.capacity),
        base_price: parseFloat(data.base_price),
        amenities: data.amenities ? data.amenities.split(',').map(s => s.trim()).filter(Boolean) : [],
        description: data.description,
        is_available: data.is_available === 'true',
    };

    const url = isEdit ? `${API_URL}/workspaces/${workspaceId}` : `${API_URL}/workspaces`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: getAdminHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || 'Failed to save workspace');
        }
        showToast(isEdit ? 'Workspace updated!' : 'Workspace created!', 'success');
        setTimeout(() => { window.location.href = 'workspaces-list.html'; }, 800);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    }
}
