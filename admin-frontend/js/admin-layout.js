// admin-layout.js – Injects consistent admin sidebar & marks active nav link

(function injectAdminLayout() {
    const sidebarHTML = `
<aside class="admin-sidebar" id="admin-sidebar">
    <div class="sidebar-brand">
        <i class="fas fa-building"></i>
        <span>WorkSpace Admin</span>
    </div>
    <nav class="sidebar-nav">
        <a href="admin-dashboard.html" data-page="admin-dashboard">
            <i class="fas fa-tachometer-alt"></i> Dashboard
        </a>

        <div class="sidebar-section">Hub Management</div>
        <a href="hubs-list.html" data-page="hubs-list">
            <i class="fas fa-building"></i> Hubs
        </a>
        <a href="hub-form.html" data-page="hub-form">
            <i class="fas fa-plus-circle"></i> Add Hub
        </a>

        <div class="sidebar-section">Workspace Management</div>
        <a href="workspaces-list.html" data-page="workspaces-list">
            <i class="fas fa-couch"></i> Workspaces
        </a>
        <a href="workspace-form.html" data-page="workspace-form">
            <i class="fas fa-plus-circle"></i> Add Workspace
        </a>

        <div class="sidebar-section">Resource Management</div>
        <a href="resources-list.html" data-page="resources-list">
            <i class="fas fa-boxes"></i> Resources
        </a>
        <a href="resource-form.html" data-page="resource-form">
            <i class="fas fa-plus-circle"></i> Add Resource
        </a>

        <div class="sidebar-section">Booking Management</div>
        <a href="bookings-list.html" data-page="bookings-list">
            <i class="fas fa-calendar-check"></i> Bookings
        </a>

        <div class="sidebar-section">Pricing Management</div>
        <a href="pricing-rules-list.html" data-page="pricing-rules-list">
            <i class="fas fa-tags"></i> Pricing Rules
        </a>
        <a href="pricing-rule-form.html" data-page="pricing-rule-form">
            <i class="fas fa-plus-circle"></i> Add Rule
        </a>

        <div class="sidebar-section">Financial</div>
        <a href="transactions-list.html" data-page="transactions-list">
            <i class="fas fa-receipt"></i> Transactions
        </a>
        <a href="financial-reports.html" data-page="financial-reports">
            <i class="fas fa-chart-bar"></i> Reports
        </a>
    </nav>
</aside>`;

    // Insert sidebar before first child of body
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    // Mark active link based on file name
    const page = location.pathname.split('/').pop().replace('.html', '');
    const link = document.querySelector(`.sidebar-nav [data-page="${page}"]`);
    if (link) link.classList.add('active');
})();
