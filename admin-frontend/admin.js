const API_BASE_URL = 'http://localhost:3001/api';

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`a[href="#${sectionId}"]`)?.classList.add('active');

    // Load data for the section
    switch(sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'hubs':
            loadHubs();
            break;
        case 'workspaces':
            loadWorkspaces();
            break;
        case 'resources':
            loadResources();
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'pricing':
            loadPricingRules();
            break;
        case 'qr-codes':
            loadQRCodes();
            break;
        case 'transactions':
            loadTransactions();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        // Load stats
        const [hubsRes, workspacesRes, statsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/hubs`),
            fetch(`${API_BASE_URL}/workspaces`),
            fetch(`${API_BASE_URL}/bookings/stats/overview`)
        ]);

        const hubsData = await hubsRes.json();
        const workspacesData = await workspacesRes.json();
        const statsData = await statsRes.json();

        document.getElementById('totalHubs').textContent = hubsData.data?.length || 0;
        document.getElementById('totalWorkspaces').textContent = workspacesData.data?.length || 0;
        
        if (statsData.success) {
            document.getElementById('totalBookings').textContent = statsData.data.total_bookings;
            document.getElementById('totalRevenue').textContent = `₹${statsData.data.total_revenue.toFixed(2)}`;
        }

        // Load recent bookings
        const bookingsRes = await fetch(`${API_BASE_URL}/bookings`);
        const bookingsData = await bookingsRes.json();
        
        const recentDiv = document.getElementById('recentBookings');
        if (bookingsData.success && bookingsData.data.length > 0) {
            const recent = bookingsData.data.slice(0, 5);
            recentDiv.innerHTML = recent.map(booking => `
                <div class="recent-item">
                    <div>
                        <strong>${booking.user_name}</strong> - ${booking.workspaces?.name || 'N/A'}
                    </div>
                    <div class="recent-meta">
                        ${new Date(booking.start_time).toLocaleDateString()} | ₹${booking.total_price}
                    </div>
                </div>
            `).join('');
        } else {
            recentDiv.innerHTML = '<p class="info-text">No bookings yet</p>';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Working Hubs
async function loadHubs() {
    try {
        const response = await fetch(`${API_BASE_URL}/hubs`);
        const data = await response.json();

        const listDiv = document.getElementById('hubsList');
        if (data.success && data.data.length > 0) {
            listDiv.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>City</th>
                            <th>State</th>
                            <th>Address</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(hub => `
                            <tr>
                                <td>${hub.id}</td>
                                <td>${hub.name}</td>
                                <td>${hub.city}</td>
                                <td>${hub.state}</td>
                                <td>${hub.address}</td>
                                <td class="actions">
                                    <button class="btn-edit" onclick="editHub(${hub.id})">Edit</button>
                                    <button class="btn-delete" onclick="deleteHub(${hub.id})">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            listDiv.innerHTML = '<p class="info-text">No hubs found</p>';
        }
    } catch (error) {
        console.error('Error loading hubs:', error);
    }
}

function showHubModal(hubId = null) {
    document.getElementById('hubModal').style.display = 'flex';
    document.getElementById('hubForm').reset();
    document.getElementById('hubId').value = '';
    document.getElementById('hubModalTitle').textContent = hubId ? 'Edit Hub' : 'Add Hub';
}

async function editHub(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/hubs/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const hub = data.data;
            document.getElementById('hubId').value = hub.id;
            document.getElementById('hubName').value = hub.name;
            document.getElementById('hubAddress').value = hub.address;
            document.getElementById('hubCity').value = hub.city;
            document.getElementById('hubState').value = hub.state;
            document.getElementById('hubCountry').value = hub.country;
            document.getElementById('hubPincode').value = hub.pincode;
            document.getElementById('hubLatitude').value = hub.latitude || '';
            document.getElementById('hubLongitude').value = hub.longitude || '';
            showHubModal(id);
        }
    } catch (error) {
        console.error('Error loading hub:', error);
    }
}

async function saveHub(event) {
    event.preventDefault();
    
    const hubData = {
        name: document.getElementById('hubName').value,
        address: document.getElementById('hubAddress').value,
        city: document.getElementById('hubCity').value,
        state: document.getElementById('hubState').value,
        country: document.getElementById('hubCountry').value,
        pincode: document.getElementById('hubPincode').value,
        latitude: parseFloat(document.getElementById('hubLatitude').value) || null,
        longitude: parseFloat(document.getElementById('hubLongitude').value) || null
    };

    const hubId = document.getElementById('hubId').value;
    const url = hubId ? `${API_BASE_URL}/hubs/${hubId}` : `${API_BASE_URL}/hubs`;
    const method = hubId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hubData)
        });

        const data = await response.json();
        if (data.success) {
            closeModal('hubModal');
            loadHubs();
            alert('Hub saved successfully!');
        }
    } catch (error) {
        alert('Error saving hub');
        console.error('Error:', error);
    }
}

async function deleteHub(id) {
    if (!confirm('Are you sure you want to delete this hub?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/hubs/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            loadHubs();
            alert('Hub deleted successfully');
        }
    } catch (error) {
        alert('Error deleting hub');
        console.error('Error:', error);
    }
}

// Workspaces
async function loadWorkspaces() {
    try {
        const response = await fetch(`${API_BASE_URL}/workspaces`);
        const data = await response.json();

        const listDiv = document.getElementById('workspacesList');
        if (data.success && data.data.length > 0) {
            listDiv.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Hub</th>
                            <th>Type</th>
                            <th>Capacity</th>
                            <th>Base Price</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(ws => `
                            <tr>
                                <td>${ws.id}</td>
                                <td>${ws.name}</td>
                                <td>${ws.working_hubs?.name || 'N/A'}</td>
                                <td>${ws.type}</td>
                                <td>${ws.capacity}</td>
                                <td>₹${ws.base_price}/hr</td>
                                <td class="actions">
                                    <button class="btn-edit" onclick="editWorkspace(${ws.id})">Edit</button>
                                    <button class="btn-delete" onclick="deleteWorkspace(${ws.id})">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            listDiv.innerHTML = '<p class="info-text">No workspaces found</p>';
        }
    } catch (error) {
        console.error('Error loading workspaces:', error);
    }
}

async function showWorkspaceModal(wsId = null) {
    // Load hubs for dropdown
    const hubsRes = await fetch(`${API_BASE_URL}/hubs`);
    const hubsData = await hubsRes.json();
    
    const hubSelect = document.getElementById('workspaceHubId');
    hubSelect.innerHTML = hubsData.data.map(hub => 
        `<option value="${hub.id}">${hub.name} - ${hub.city}</option>`
    ).join('');

    document.getElementById('workspaceModal').style.display = 'flex';
    document.getElementById('workspaceForm').reset();
    document.getElementById('workspaceId').value = '';
    document.getElementById('workspaceModalTitle').textContent = wsId ? 'Edit Workspace' : 'Add Workspace';
}

async function editWorkspace(id) {
    await showWorkspaceModal(id);
    
    try {
        const response = await fetch(`${API_BASE_URL}/workspaces/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const ws = data.data;
            document.getElementById('workspaceId').value = ws.id;
            document.getElementById('workspaceHubId').value = ws.hub_id;
            document.getElementById('workspaceName').value = ws.name;
            document.getElementById('workspaceType').value = ws.type;
            document.getElementById('workspaceCapacity').value = ws.capacity;
            document.getElementById('workspaceBasePrice').value = ws.base_price;
            document.getElementById('workspaceAmenities').value = (ws.amenities || []).join(', ');
        }
    } catch (error) {
        console.error('Error loading workspace:', error);
    }
}

async function saveWorkspace(event) {
    event.preventDefault();
    
    const amenitiesStr = document.getElementById('workspaceAmenities').value;
    const amenities = amenitiesStr ? amenitiesStr.split(',').map(a => a.trim()) : [];

    const wsData = {
        hub_id: parseInt(document.getElementById('workspaceHubId').value),
        name: document.getElementById('workspaceName').value,
        type: document.getElementById('workspaceType').value,
        capacity: parseInt(document.getElementById('workspaceCapacity').value),
        base_price: parseFloat(document.getElementById('workspaceBasePrice').value),
        amenities: amenities
    };

    const wsId = document.getElementById('workspaceId').value;
    const url = wsId ? `${API_BASE_URL}/workspaces/${wsId}` : `${API_BASE_URL}/workspaces`;
    const method = wsId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wsData)
        });

        const data = await response.json();
        if (data.success) {
            closeModal('workspaceModal');
            loadWorkspaces();
            alert('Workspace saved successfully!');
        }
    } catch (error) {
        alert('Error saving workspace');
        console.error('Error:', error);
    }
}

async function deleteWorkspace(id) {
    if (!confirm('Are you sure you want to delete this workspace?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/workspaces/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            loadWorkspaces();
            alert('Workspace deleted successfully');
        }
    } catch (error) {
        alert('Error deleting workspace');
        console.error('Error:', error);
    }
}

// Resources
async function loadResources() {
    try {
        const response = await fetch(`${API_BASE_URL}/resources`);
        const data = await response.json();

        const listDiv = document.getElementById('resourcesList');
        if (data.success && data.data.length > 0) {
            listDiv.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Workspace</th>
                            <th>Price/Slot</th>
                            <th>Quantity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(res => `
                            <tr>
                                <td>${res.id}</td>
                                <td>${res.name}</td>
                                <td>${res.workspaces?.name || 'N/A'}</td>
                                <td>₹${res.price_per_slot}</td>
                                <td>${res.quantity}</td>
                                <td class="actions">
                                    <button class="btn-edit" onclick="editResource(${res.id})">Edit</button>
                                    <button class="btn-delete" onclick="deleteResource(${res.id})">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            listDiv.innerHTML = '<p class="info-text">No resources found</p>';
        }
    } catch (error) {
        console.error('Error loading resources:', error);
    }
}

async function showResourceModal(resId = null) {
    const wsRes = await fetch(`${API_BASE_URL}/workspaces`);
    const wsData = await wsRes.json();
    
    const wsSelect = document.getElementById('resourceWorkspaceId');
    wsSelect.innerHTML = wsData.data.map(ws => 
        `<option value="${ws.id}">${ws.name} - ${ws.working_hubs?.name || ''}</option>`
    ).join('');

    document.getElementById('resourceModal').style.display = 'flex';
    document.getElementById('resourceForm').reset();
    document.getElementById('resourceId').value = '';
    document.getElementById('resourceModalTitle').textContent = resId ? 'Edit Resource' : 'Add Resource';
}

async function editResource(id) {
    await showResourceModal(id);
    
    try {
        const response = await fetch(`${API_BASE_URL}/resources/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const res = data.data;
            document.getElementById('resourceId').value = res.id;
            document.getElementById('resourceWorkspaceId').value = res.workspace_id;
            document.getElementById('resourceName').value = res.name;
            document.getElementById('resourceDescription').value = res.description || '';
            document.getElementById('resourcePrice').value = res.price_per_slot;
            document.getElementById('resourceQuantity').value = res.quantity;
        }
    } catch (error) {
        console.error('Error loading resource:', error);
    }
}

async function saveResource(event) {
    event.preventDefault();
    
    const resData = {
        workspace_id: parseInt(document.getElementById('resourceWorkspaceId').value),
        name: document.getElementById('resourceName').value,
        description: document.getElementById('resourceDescription').value,
        price_per_slot: parseFloat(document.getElementById('resourcePrice').value),
        quantity: parseInt(document.getElementById('resourceQuantity').value)
    };

    const resId = document.getElementById('resourceId').value;
    const url = resId ? `${API_BASE_URL}/resources/${resId}` : `${API_BASE_URL}/resources`;
    const method = resId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resData)
        });

        const data = await response.json();
        if (data.success) {
            closeModal('resourceModal');
            loadResources();
            alert('Resource saved successfully!');
        }
    } catch (error) {
        alert('Error saving resource');
        console.error('Error:', error);
    }
}

async function deleteResource(id) {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/resources/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            loadResources();
            alert('Resource deleted successfully');
        }
    } catch (error) {
        alert('Error deleting resource');
        console.error('Error:', error);
    }
}

// Bookings
async function loadBookings(status = '') {
    try {
        const url = status ? `${API_BASE_URL}/bookings?status=${status}` : `${API_BASE_URL}/bookings`;
        const response = await fetch(url);
        const data = await response.json();

        const listDiv = document.getElementById('bookingsList');
        if (data.success && data.data.length > 0) {
            listDiv.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Workspace</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Price</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(booking => `
                            <tr>
                                <td>${booking.id}</td>
                                <td>${booking.user_name}</td>
                                <td>${booking.workspaces?.name || 'N/A'}</td>
                                <td>${new Date(booking.start_time).toLocaleDateString()}</td>
                                <td>${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}</td>
                                <td>₹${booking.total_price}</td>
                                <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            listDiv.innerHTML = '<p class="info-text">No bookings found</p>';
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

function filterBookings(status) {
    loadBookings(status);
}

// Pricing Rules
async function loadPricingRules() {
    try {
        const response = await fetch(`${API_BASE_URL}/pricing`);
        const data = await response.json();

        const listDiv = document.getElementById('pricingList');
        if (data.success && data.data.length > 0) {
            listDiv.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Workspace</th>
                            <th>Rule Type</th>
                            <th>% Modifier</th>
                            <th>Flat Modifier</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(rule => `
                            <tr>
                                <td>${rule.id}</td>
                                <td>${rule.workspaces?.name || 'All'}</td>
                                <td>${rule.rule_type}</td>
                                <td>${rule.percentage_modifier}%</td>
                                <td>₹${rule.flat_modifier}</td>
                                <td class="actions">
                                    <button class="btn-edit" onclick="editPricing(${rule.id})">Edit</button>
                                    <button class="btn-delete" onclick="deletePricing(${rule.id})">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            listDiv.innerHTML = '<p class="info-text">No pricing rules found</p>';
        }
    } catch (error) {
        console.error('Error loading pricing rules:', error);
    }
}

async function showPricingModal(pricingId = null) {
    const wsRes = await fetch(`${API_BASE_URL}/workspaces`);
    const wsData = await wsRes.json();
    
    const wsSelect = document.getElementById('pricingWorkspaceId');
    wsSelect.innerHTML = wsData.data.map(ws => 
        `<option value="${ws.id}">${ws.name}</option>`
    ).join('');

    document.getElementById('pricingModal').style.display = 'flex';
    document.getElementById('pricingForm').reset();
    document.getElementById('pricingId').value = '';
    document.getElementById('pricingModalTitle').textContent = pricingId ? 'Edit Pricing Rule' : 'Add Pricing Rule';
}

async function editPricing(id) {
    await showPricingModal(id);
    
    try {
        const response = await fetch(`${API_BASE_URL}/pricing/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const rule = data.data;
            document.getElementById('pricingId').value = rule.id;
            document.getElementById('pricingWorkspaceId').value = rule.workspace_id;
            document.getElementById('pricingRuleType').value = rule.rule_type;
            document.getElementById('pricingPercentage').value = rule.percentage_modifier;
            document.getElementById('pricingFlat').value = rule.flat_modifier;
            document.getElementById('pricingStartTime').value = rule.start_time || '';
            document.getElementById('pricingEndTime').value = rule.end_time || '';
            document.getElementById('pricingDays').value = (rule.days || []).join(',');
        }
    } catch (error) {
        console.error('Error loading pricing rule:', error);
    }
}

async function savePricing(event) {
    event.preventDefault();
    
    const daysStr = document.getElementById('pricingDays').value;
    const days = daysStr ? daysStr.split(',').map(d => d.trim()) : [];

    const pricingData = {
        workspace_id: parseInt(document.getElementById('pricingWorkspaceId').value),
        rule_type: document.getElementById('pricingRuleType').value,
        percentage_modifier: parseFloat(document.getElementById('pricingPercentage').value),
        flat_modifier: parseFloat(document.getElementById('pricingFlat').value),
        start_time: document.getElementById('pricingStartTime').value || null,
        end_time: document.getElementById('pricingEndTime').value || null,
        days: days
    };

    const pricingId = document.getElementById('pricingId').value;
    const url = pricingId ? `${API_BASE_URL}/pricing/${pricingId}` : `${API_BASE_URL}/pricing`;
    const method = pricingId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pricingData)
        });

        const data = await response.json();
        if (data.success) {
            closeModal('pricingModal');
            loadPricingRules();
            alert('Pricing rule saved successfully!');
        }
    } catch (error) {
        alert('Error saving pricing rule');
        console.error('Error:', error);
    }
}

async function deletePricing(id) {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/pricing/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            loadPricingRules();
            alert('Pricing rule deleted successfully');
        }
    } catch (error) {
        alert('Error deleting pricing rule');
        console.error('Error:', error);
    }
}

// QR Codes
async function loadQRCodes() {
    try {
        const response = await fetch(`${API_BASE_URL}/qr`);
        const data = await response.json();

        const listDiv = document.getElementById('qrCodesList');
        if (data.success && data.data.length > 0) {
            listDiv.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Booking ID</th>
                            <th>User</th>
                            <th>Workspace</th>
                            <th>Created</th>
                            <th>Scanned</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(qr => `
                            <tr>
                                <td>${qr.id}</td>
                                <td>${qr.booking_id}</td>
                                <td>${qr.bookings?.user_name || 'N/A'}</td>
                                <td>${qr.bookings?.workspaces?.name || 'N/A'}</td>
                                <td>${new Date(qr.created_at).toLocaleString()}</td>
                                <td>${qr.scanned_at ? new Date(qr.scanned_at).toLocaleString() : 'Not scanned'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            listDiv.innerHTML = '<p class="info-text">No QR codes found</p>';
        }
    } catch (error) {
        console.error('Error loading QR codes:', error);
    }
}

// Transactions
async function loadTransactions(filter = 'all') {
    try {
        // Get transactions from localStorage (simulated)
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        
        let filteredTransactions = transactions;
        if (filter !== 'all') {
            filteredTransactions = transactions.filter(t => t.status === filter);
        }

        // Update stats
        const totalTransactions = transactions.length;
        const successfulTransactions = transactions.filter(t => t.status === 'success').length;
        const totalRevenue = transactions
            .filter(t => t.status === 'success')
            .reduce((sum, t) => sum + t.amount, 0);

        document.getElementById('totalTransactions').textContent = totalTransactions;
        document.getElementById('successfulTransactions').textContent = successfulTransactions;
        document.getElementById('transactionRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;

        const listDiv = document.getElementById('transactionsList');
        if (filteredTransactions.length > 0) {
            listDiv.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Booking ID</th>
                            <th>User</th>
                            <th>Amount</th>
                            <th>Payment Method</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredTransactions.reverse().map(txn => `
                            <tr>
                                <td>${txn.id}</td>
                                <td>${txn.booking_id}</td>
                                <td>${txn.user_name}</td>
                                <td>₹${txn.amount}</td>
                                <td>${txn.payment_method.toUpperCase()}</td>
                                <td><span class="status-badge status-${txn.status}">${txn.status}</span></td>
                                <td>${new Date(txn.timestamp).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            listDiv.innerHTML = '<p class="info-text">No transactions found</p>';
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        document.getElementById('transactionsList').innerHTML = '<p class="info-text">No transactions found</p>';
    }
}

function filterTransactions(filter) {
    loadTransactions(filter);
}

// Modal Functions
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});
