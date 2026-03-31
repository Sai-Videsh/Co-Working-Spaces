// user-frontend/js/map-utils.js
// Utility functions for Google Maps embeds across the application

/**
 * Generate a Google Maps embed iframe for a given hub/address
 * @param {Object} hub - Hub object with address, city, state properties
 * @param {number} height - Height in pixels for the map container (default: 300)
 * @param {boolean} showDetails - Whether to show address details below map (default: true)
 * @returns {string} HTML string for the map embed
 */
function generateMapEmbed(hub, height = 300, showDetails = true) {
    if (!hub || !hub.address || !hub.city) {
        return '';
    }

    const fullAddress = `${hub.address}, ${hub.city}, ${hub.state || ''}, India`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    const mapHTML = `
        <div style="background:white;border-radius:8px;box-shadow:0 2px 10px var(--shadow);margin-bottom:1.5rem;overflow:hidden;">
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
            ${showDetails ? `
            <div style="padding:1rem;background:#f8f9fa;border-top:1px solid #e0e0e0;">
                <p style="margin:0;font-size:0.9rem;color:var(--text-light);"><i class="fas fa-map-marker-alt" style="color:var(--accent);margin-right:.5rem;"></i>${fullAddress}</p>
            </div>
            ` : ''}
        </div>
    `;

    return mapHTML;
}

/**
 * Generate a Google Maps embed iframe with hub name and details
 * @param {Object} hub - Hub object with id, name, address, city, state properties
 * @param {number} height - Height in pixels for the map container (default: 350)
 * @returns {string} HTML string for the map embed with hub details
 */
function generateMapEmbedWithHubDetails(hub, height = 350) {
    if (!hub || !hub.address || !hub.city) {
        return '';
    }

    const fullAddress = `${hub.address}, ${hub.city}, ${hub.state || ''}, India`;
    const encodedAddress = encodeURIComponent(fullAddress);
    
    const mapHTML = `
        <div style="background:white;border-radius:8px;box-shadow:0 2px 10px var(--shadow);margin-bottom:2rem;overflow:hidden;">
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
                <p style="margin:0;font-size:0.9rem;color:var(--text-light);"><i class="fas fa-map-marker-alt" style="color:var(--accent);margin-right:.5rem;"></i><strong>${hub.name}</strong></p>
                <p style="margin:0.25rem 0 0 0;font-size:0.85rem;color:var(--text-light);">${fullAddress}</p>
            </div>
        </div>
    `;

    return mapHTML;
}

/**
 * Format full address from components
 * @param {string} address - Street address
 * @param {string} city - City name
 * @param {string} state - State name
 * @param {string} country - Country (default: 'India')
 * @returns {string} Formatted full address
 */
function formatFullAddress(address, city, state, country = 'India') {
    if (!address || !city) return '';
    const parts = [address, city, state, country].filter(Boolean);
    return parts.join(', ');
}

/**
 * Encode address for Google Maps URL
 * @param {string} address - Full address string
 * @returns {string} URL-encoded address
 */
function encodeAddressForMap(address) {
    return encodeURIComponent(address);
}

/**
 * Create a Google Maps link (opens in new tab)
 * @param {string} address - Full address
 * @param {string} text - Link text (default: 'View on Google Maps')
 * @returns {string} HTML link element
 */
function createMapLink(address, text = 'View on Google Maps') {
    const encodedAddress = encodeURIComponent(address);
    return `<a href="https://www.google.com/maps/search/${encodedAddress}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> ${text}</a>`;
}

/**
 * Insert map into container after form fields update
 * @param {string} containerId - ID of container div
 * @param {Object} hub - Hub object with address details
 * @param {number} height - Map height in pixels
 */
function updateMapInContainer(containerId, hub, height = 300) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!hub || !hub.address || !hub.city) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = generateMapEmbed(hub, height, true);
}
