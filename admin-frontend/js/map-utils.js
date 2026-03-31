// admin-frontend/js/map-utils.js
// Utility functions for Google Maps embeds in admin dashboard

/**
 * Generate a Google Maps embed iframe for admin forms
 * @param {Object} hub - Hub object with address, city, state properties
 * @param {number} height - Height in pixels for the map container (default: 300)
 * @returns {string} HTML string for the map embed
 */
function generateAdminMapEmbed(hub, height = 300) {
    if (!hub || !hub.address || !hub.city) {
        return '';
    }

    const fullAddress = `${hub.address}, ${hub.city}, ${hub.state || ''}, India`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    const mapHTML = `
        <div style="background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-top:1rem;overflow:hidden;">
            <div style="width:100%;height:${height}px;position:relative;">
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
                <p style="margin:0;font-size:0.9rem;"><i class="fas fa-map-marker-alt" style="color:#3b82f6;margin-right:.5rem;"></i><strong>${hub.name || 'Location'}</strong></p>
                <p style="margin:0.25rem 0 0 0;font-size:0.85rem;color:#666;">${fullAddress}</p>
            </div>
        </div>
    `;

    return mapHTML;
}

/**
 * Generate map from address components (for hub form preview)
 * @param {string} address - Street address
 * @param {string} city - City name
 * @param {string} state - State name
 * @param {number} height - Map height in pixels (default: 300)
 * @returns {string} HTML string for the map embed
 */
function generateAddressMapEmbed(address, city, state, height = 300) {
    if (!address || !city) {
        return '';
    }

    const fullAddress = `${address}, ${city}, ${state || ''}, India`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    const mapHTML = `
        <div style="background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-top:1rem;overflow:hidden;">
            <div style="width:100%;height:${height}px;position:relative;">
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

    return mapHTML;
}

/**
 * Update map in container for hub selection (workspace form)
 * @param {string} containerId - ID of container div
 * @param {Object} hub - Hub object with address details
 * @param {string} hubName - Name of hub (optional)
 */
function updateHubMapPreview(containerId, hub, hubName = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!hub || !hub.address || !hub.city) {
        container.innerHTML = '';
        return;
    }
    
    const displayName = hubName || hub.name || 'Location';
    const fullAddress = `${hub.address}, ${hub.city}, ${hub.state || ''}, India`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    container.innerHTML = `
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
                <p style="margin:0;font-size:0.9rem;"><i class="fas fa-map-marker-alt" style="color:#3b82f6;margin-right:.5rem;"></i><strong>${displayName}</strong></p>
                <p style="margin:0.25rem 0 0 0;font-size:0.85rem;color:#666;">${fullAddress}</p>
            </div>
        </div>
    `;
}

/**
 * Update map in container for address form (hub form)
 * @param {string} containerId - ID of container div
 * @param {string} address - Street address
 * @param {string} city - City name
 * @param {string} state - State name
 */
function updateAddressMapPreview(containerId, address, city, state) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!address || !city) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = generateAddressMapEmbed(address, city, state, 300);
}

/**
 * Check if address data is complete for map display
 * @param {Object} hub - Hub object
 * @returns {boolean} True if address data is sufficient
 */
function isAddressComplete(hub) {
    return hub && hub.address && hub.city;
}

/**
 * Create a table/list view entry with location links
 * @param {string} address - Full address
 * @param {string} city - City name
 * @returns {string} HTML with address and map link
 */
function createLocationDisplay(address, city) {
    const fullAddress = `${address}, ${city}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    return `
        <div style="display:flex;gap:1rem;align-items:center;">
            <span>${address}</span>
            <a href="https://www.google.com/maps/search/${encodedAddress}" target="_blank" title="View on Google Maps" style="color:#3b82f6;cursor:pointer;">
                <i class="fas fa-map-marker-alt"></i>
            </a>
        </div>
    `;
}
