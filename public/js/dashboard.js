// ===== DASHBOARD LOGIC =====

// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            document.getElementById('userName').textContent = user.email.split('@')[0];
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('userAvatar').textContent = user.email[0].toUpperCase();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Загрузка ссылок
async function loadLinks() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/urls/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const links = await response.json();
            return links;
        }
    } catch (error) {
        console.error('Error loading links:', error);
    }
    return [];
}

// Отображение Overview
function showOverview() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `
        <div class="stats-cards">
            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title" data-lang="dashboard.stats.total_links">Total Links</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                    </div>
                </div>
                <div class="stat-card-value" id="totalLinks">0</div>
                <div class="stat-card-change" id="statChange1">+0 this month</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title" data-lang="dashboard.stats.total_clicks">Total Clicks</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        </svg>
                    </div>
                </div>
                <div class="stat-card-value" id="totalClicks">0</div>
                <div class="stat-card-change" id="statChange2">+0 today</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title" data-lang="dashboard.stats.avg_clicks">Avg. Clicks per Link</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 3v18h18"/>
                            <path d="M18 17l-5-5-4 4-4-4"/>
                        </svg>
                    </div>
                </div>
                <div class="stat-card-value" id="avgClicks">0</div>
                <div class="stat-card-change" id="statChange3" data-lang="dashboard.stats.per_link">Per link</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-card-header">
                    <span class="stat-card-title" data-lang="dashboard.stats.top_link">Top Link</span>
                    <div class="stat-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </div>
                </div>
                <div class="stat-card-value" id="topLinkClicks">0</div>
                <div class="stat-card-change" id="statChange4" data-lang="dashboard.stats.no_links">No links yet</div>
            </div>
        </div>
        
        <div class="links-section">
            <div class="section-header">
                <h2 class="section-title" data-lang="dashboard.recent_links">Recent Links</h2>
                <button class="btn-create" onclick="showCreateModal()" data-lang="dashboard.create_link">+ Create Link</button>
            </div>
            <div id="recentLinksTable"></div>
        </div>
    `;

    loadOverviewData();
}

// Загрузка данных для Overview
async function loadOverviewData() {
    const links = await loadLinks();

    if (!links || links.length === 0) {
        document.getElementById('recentLinksTable').innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <h3 data-lang="dashboard.empty.title">No links yet</h3>
                <p data-lang="dashboard.empty.subtitle">Create your first short link to get started</p>
                <button class="btn-create" onclick="showCreateModal()" data-lang="dashboard.empty.button">+ Create Your First Link</button>
            </div>
        `;

        if (typeof updatePageLanguage === 'function') {
            updatePageLanguage();
        }
        return;
    }

    // Загружаем детальную статистику
    const token = localStorage.getItem('token');
    let totalClicksToday = 0;
    let totalClicksMonth = 0;

    // Получаем статистику по каждой ссылке
    for (const link of links) {
        try {
            const response = await fetch(`/api/urls/${link.id}/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const stats = await response.json();
                totalClicksToday += parseInt(stats.total.clicks_today) || 0;
                totalClicksMonth += parseInt(stats.total.clicks_month) || 0;
            }
        } catch (error) {
            console.error('Error loading stats for link:', link.id, error);
        }
    }

    // Базовая статистика
    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
    const avgClicks = totalLinks > 0 ? Math.round(totalClicks / totalLinks) : 0;
    const sortedLinks = [...links].sort((a, b) => b.clicks - a.clicks);
    const topLink = sortedLinks[0];

    // Подсчитываем новые ссылки за месяц
    const newLinksMonth = links.filter(link => {
        const created = new Date(link.created_at);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return created > monthAgo;
    }).length;

    // Обновляем карточки
    document.getElementById('totalLinks').textContent = totalLinks;
    document.getElementById('totalClicks').textContent = totalClicks.toLocaleString();
    document.getElementById('avgClicks').textContent = avgClicks;
    document.getElementById('topLinkClicks').textContent = topLink.clicks;

    // Обновляем подписи с динамическими цифрами
    const monthText = currentLang === 'ru' ? 'в этом месяце' :
        currentLang === 'de' ? 'diesen Monat' : 'this month';
    document.getElementById('statChange1').textContent = `+${newLinksMonth} ${monthText}`;

    const todayText = currentLang === 'ru' ? 'сегодня' :
        currentLang === 'de' ? 'heute' : 'today';
    document.getElementById('statChange2').textContent = `+${totalClicksToday} ${todayText}`;

    const perLinkText = currentLang === 'ru' ? 'на ссылку' :
        currentLang === 'de' ? 'pro Link' : 'per link';
    document.getElementById('statChange3').textContent = perLinkText;

    // Обновляем блок 4: Топ ссылка
    const statChange4 = document.getElementById('statChange4');
    if (statChange4 && topLink && topLink.short_code) {
        statChange4.textContent = topLink.short_code;
        statChange4.removeAttribute('data-lang'); // ВАЖНО: убираем перевод!
    } else {
        if (statChange4) {
            const noLinksText = currentLang === 'ru' ? 'Пока нет ссылок' :
                currentLang === 'de' ? 'Noch keine Links' : 'No links yet';
            statChange4.textContent = noLinksText;
        }
    }

    // Показать последние 5 ссылок
    const recentLinks = links.slice(0, 5);
    renderLinksTable(recentLinks, 'recentLinksTable');

    if (typeof updatePageLanguage === 'function') {
        updatePageLanguage();
    }
}

// Отображение всех ссылок
let allLinksData = [];
let filteredLinksData = [];
let currentSort = { field: 'created_at', order: 'desc' };

async function showLinks() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `
        <div class="links-section">
            <div class="section-header">
                <h2 class="section-title" data-lang="dashboard.all_links">All Links</h2>
                <button class="btn-create" onclick="showCreateModal()" data-lang="dashboard.create_link">+ Create Link</button>
            </div>

            <div class="links-controls">
                <div class="search-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input type="text" id="linkSearch" placeholder="Search links..." oninput="filterLinks()">
                </div>
                <div class="sort-controls">
                    <select id="sortField" onchange="sortLinks()">
                        <option value="created_at">Sort by Date</option>
                        <option value="clicks">Sort by Clicks</option>
                        <option value="short_code">Sort by Name</option>
                    </select>
                    <button class="btn-icon" onclick="toggleSortOrder()" title="Toggle sort order">
                        <svg id="sortIcon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M19 12l-7 7-7-7"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div id="allLinksTable"></div>
        </div>
    `;

    allLinksData = await loadLinks();
    filteredLinksData = [...allLinksData];

    if (!allLinksData || allLinksData.length === 0) {
        document.getElementById('allLinksTable').innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <h3 data-lang="dashboard.empty.title">No links yet</h3>
                <p data-lang="dashboard.empty.subtitle">Create your first short link to get started</p>
                <button class="btn-create" onclick="showCreateModal()" data-lang="dashboard.empty.button">+ Create Your First Link</button>
            </div>
        `;
    } else {
        sortLinks();
    }

    if (typeof updatePageLanguage === 'function') {
        updatePageLanguage();
    }
}

function filterLinks() {
    const query = document.getElementById('linkSearch').value.toLowerCase();

    if (!query) {
        filteredLinksData = [...allLinksData];
    } else {
        filteredLinksData = allLinksData.filter(link =>
            link.short_code.toLowerCase().includes(query) ||
            link.original_url.toLowerCase().includes(query)
        );
    }

    sortLinks();
}

function sortLinks() {
    const field = document.getElementById('sortField')?.value || currentSort.field;
    currentSort.field = field;

    filteredLinksData.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        if (field === 'created_at') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        } else if (field === 'clicks') {
            aVal = parseInt(aVal) || 0;
            bVal = parseInt(bVal) || 0;
        }

        if (currentSort.order === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });

    renderLinksTable(filteredLinksData, 'allLinksTable');
}

function toggleSortOrder() {
    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    const icon = document.getElementById('sortIcon');
    if (icon) {
        icon.style.transform = currentSort.order === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    sortLinks();
}

// Рендер таблицы ссылок
function renderLinksTable(links, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <table class="links-table">
            <thead>
                <tr>
                    <th data-lang="dashboard.table.short_link">Short Link</th>
                    <th data-lang="dashboard.table.original">Original URL</th>
                    <th data-lang="dashboard.table.clicks">Clicks</th>
                    <th data-lang="dashboard.table.created">Created</th>
                    <th data-lang="dashboard.table.actions">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${links.map(link => `
                    <tr>
                        <td>
                            <a href="${window.location.origin}/${link.short_code}" target="_blank" class="link-short">
                                ${window.location.host}/${link.short_code}
                            </a>
                        </td>
                        <td>
                            <div class="link-original" title="${link.original_url}">
                                ${link.original_url}
                            </div>
                        </td>
                        <td>${link.clicks}</td>
                        <td>${new Date(link.created_at).toLocaleDateString()}</td>
                        <td>
                            <div class="link-actions">
                                <button class="btn-action" onclick="copyLink('${link.short_code}', event)" title="Copy">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                                <button class="btn-action" onclick="showQR('${link.short_code}')" title="QR Code">
                                    <span style="font-size: 12px; font-weight: 700;">QR</span>
                                </button>
                                <button class="btn-action delete" onclick="deleteLink(${link.id})" title="Delete">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    if (typeof updatePageLanguage === 'function') {
        updatePageLanguage();
    }
}

// Отображение профиля
function showProfile() {
    const content = document.getElementById('dashboardContent');
    const email = document.getElementById('userEmail').textContent;

    content.innerHTML = `
        <div class="profile-section">
            <div class="profile-card">
                <h2 data-lang="dashboard.profile.title">Profile Information</h2>
                <div class="form-group">
                    <label data-lang="dashboard.profile.email">Email</label>
                    <input type="email" value="${email}" disabled>
                </div>
                <div class="form-group">
                    <label data-lang="dashboard.profile.member_since">Member Since</label>
                    <input type="text" value="${new Date().toLocaleDateString()}" disabled>
                </div>
            </div>
            
            <div class="profile-card">
                <h2 data-lang="dashboard.profile.change_password">Change Password</h2>
                <div class="form-group">
                    <label data-lang="dashboard.profile.current_password">Current Password</label>
                    <input type="password" id="currentPassword">
                </div>
                <div class="form-group">
                    <label data-lang="dashboard.profile.new_password">New Password</label>
                    <input type="password" id="newPassword">
                </div>
                <div class="form-group">
                    <label data-lang="dashboard.profile.confirm_password">Confirm New Password</label>
                    <input type="password" id="confirmPassword">
                </div>
                <button class="btn-primary" onclick="changePassword()" data-lang="dashboard.profile.save">Save Changes</button>
            </div>
        </div>
    `;

    if (typeof updatePageLanguage === 'function') {
        updatePageLanguage();
    }
}

// Analytics Page
async function showAnalytics() {
    const content = document.getElementById('dashboardContent');

    content.innerHTML = `
        <div class="analytics-section">
            <div class="section-header">
                <h2 class="section-title" data-lang="dashboard.analytics.title">Analytics</h2>
                <p data-lang="dashboard.analytics.subtitle">Detailed statistics for your links</p>
            </div>

            <div class="analytics-content">
                <div class="links-list" id="analyticsLinksList">
                    <div class="loading">Loading links...</div>
                </div>

                <div class="analytics-details" id="analyticsDetails" style="display: none;">
                    <h3 id="analyticsLinkTitle">Link Statistics</h3>
                    <div id="analyticsData"></div>
                </div>
            </div>
        </div>
    `;

    if (typeof updatePageLanguage === 'function') {
        updatePageLanguage();
    }

    // Load links for analytics
    try {
        const response = await fetch('/api/urls/user', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const links = await response.json();

        const linksListDiv = document.getElementById('analyticsLinksList');

        if (links.length === 0) {
            linksListDiv.innerHTML = `
                <div class="empty-state">
                    <p>No links yet. Create your first link to see analytics!</p>
                </div>
            `;
            return;
        }

        linksListDiv.innerHTML = `
            <div class="links-table">
                <table>
                    <thead>
                        <tr>
                            <th>Link</th>
                            <th>Clicks</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${links.map(link => `
                            <tr class="link-row">
                                <td>
                                    <div class="link-info">
                                        <a href="/${link.short_code}" target="_blank" class="short-link">
                                            ${link.short_code}
                                        </a>
                                        <div class="original-url">${link.original_url.substring(0, 50)}${link.original_url.length > 50 ? '...' : ''}</div>
                                    </div>
                                </td>
                                <td><strong>${link.clicks || 0}</strong></td>
                                <td>${new Date(link.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn-icon" onclick="viewLinkAnalytics(${link.id}, '${link.short_code}')" title="View Analytics">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M3 3v18h18" />
                                            <path d="M18 17l-5-5-4 4-4-4" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        console.error('Error loading analytics:', error);
        document.getElementById('analyticsLinksList').innerHTML = `
            <div class="error-state">
                <p>Error loading links. Please try again.</p>
            </div>
        `;
    }
}

// Global chart instances for cleanup
let analyticsCharts = {};

// View detailed analytics for a specific link
async function viewLinkAnalytics(linkId, shortCode) {
    const detailsDiv = document.getElementById('analyticsDetails');
    const dataDiv = document.getElementById('analyticsData');

    // Destroy existing charts
    Object.values(analyticsCharts).forEach(chart => chart?.destroy());
    analyticsCharts = {};

    detailsDiv.style.display = 'block';
    document.getElementById('analyticsLinkTitle').textContent = `Statistics for: ${shortCode}`;
    dataDiv.innerHTML = '<div class="loading">Loading statistics...</div>';

    try {
        const response = await fetch(`/api/urls/${linkId}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const stats = await response.json();

        dataDiv.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background: #dbeafe; color: #3b82f6;">📊</div>
                    <div class="stat-info">
                        <h4>Total Clicks</h4>
                        <p class="stat-value">${stats.total.total_clicks || 0}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #d1fae5; color: #10b981;">👥</div>
                    <div class="stat-info">
                        <h4>Unique Visitors</h4>
                        <p class="stat-value">${stats.total.unique_clicks || 0}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;">📅</div>
                    <div class="stat-info">
                        <h4>Today</h4>
                        <p class="stat-value">${stats.total.clicks_today || 0}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #e0e7ff; color: #6366f1;">📈</div>
                    <div class="stat-info">
                        <h4>This Week</h4>
                        <p class="stat-value">${stats.total.clicks_week || 0}</p>
                    </div>
                </div>
            </div>

            ${stats.daily && stats.daily.length > 0 ? `
            <div class="chart-card chart-full">
                <h4>📊 Clicks Over Time (Last 7 Days)</h4>
                <canvas id="dailyChart"></canvas>
            </div>
            ` : ''}

            <div class="analytics-charts-grid">
                ${stats.devices && stats.devices.length > 0 ? `
                <div class="chart-card">
                    <h4>💻 Devices</h4>
                    <canvas id="devicesChart"></canvas>
                </div>
                ` : ''}

                ${stats.os && stats.os.length > 0 ? `
                <div class="chart-card">
                    <h4>🖥️ Operating Systems</h4>
                    <canvas id="osChart"></canvas>
                </div>
                ` : ''}

                ${stats.browsers && stats.browsers.length > 0 ? `
                <div class="chart-card">
                    <h4>🌐 Browsers</h4>
                    <canvas id="browsersChart"></canvas>
                </div>
                ` : ''}
            </div>
        `;

        // Create charts
        createAnalyticsCharts(stats);

        // Scroll to analytics details
        setTimeout(() => detailsDiv.scrollIntoView({ behavior: 'smooth' }), 100);

    } catch (error) {
        console.error('Error loading link analytics:', error);
        dataDiv.innerHTML = '<div class="error-state"><p>Error loading statistics</p></div>';
    }
}

// Create analytics charts with Chart.js
function createAnalyticsCharts(stats) {
    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#f7fafc' : '#1a202c';
    const gridColor = isDark ? '#2d3748' : '#e2e8f0';

    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                labels: { color: textColor, font: { size: 12 } }
            }
        }
    };

    // Daily clicks line chart
    if (stats.daily && stats.daily.length > 0) {
        const ctx = document.getElementById('dailyChart');
        if (ctx) {
            const dates = stats.daily.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).reverse();
            const clicks = stats.daily.map(d => parseInt(d.clicks)).reverse();

            analyticsCharts.daily = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Clicks',
                        data: clicks,
                        borderColor: '#6366f1',
                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
                        x: { ticks: { color: textColor }, grid: { color: gridColor } }
                    }
                }
            });
        }
    }

    // Devices doughnut chart
    if (stats.devices && stats.devices.length > 0) {
        const ctx = document.getElementById('devicesChart');
        if (ctx) {
            analyticsCharts.devices = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: stats.devices.map(d => d.device_type || 'Unknown'),
                    datasets: [{
                        data: stats.devices.map(d => parseInt(d.count)),
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                    }]
                },
                options: chartDefaults
            });
        }
    }

    // OS doughnut chart
    if (stats.os && stats.os.length > 0) {
        const ctx = document.getElementById('osChart');
        if (ctx) {
            analyticsCharts.os = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: stats.os.map(o => o.os || 'Unknown'),
                    datasets: [{
                        data: stats.os.map(o => parseInt(o.count)),
                        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                    }]
                },
                options: chartDefaults
            });
        }
    }

    // Browsers doughnut chart
    if (stats.browsers && stats.browsers.length > 0) {
        const ctx = document.getElementById('browsersChart');
        if (ctx) {
            analyticsCharts.browsers = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: stats.browsers.map(b => b.browser || 'Unknown'),
                    datasets: [{
                        data: stats.browsers.map(b => parseInt(b.count)),
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
                    }]
                },
                options: chartDefaults
            });
        }
    }
}

// Навигация
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    loadUserData();
    showOverview();

    // Обновляем иконку языка после загрузки страницы
    const intervalId = setInterval(() => {
        if (typeof updateLangDisplay === 'function' && document.getElementById('currentLangFlag')) {
            updateLangDisplay();
            clearInterval(intervalId);
        }
    }, 100);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const page = item.getAttribute('data-page');

            if (page === 'overview') {
                document.getElementById('pageTitle').setAttribute('data-lang', 'dashboard.title.overview');
                showOverview();
            } else if (page === 'links') {
                document.getElementById('pageTitle').setAttribute('data-lang', 'dashboard.title.links');
                showLinks();
            } else if (page === 'analytics') {
                document.getElementById('pageTitle').setAttribute('data-lang', 'dashboard.title.analytics');
                showAnalytics();
            } else if (page === 'profile') {
                document.getElementById('pageTitle').setAttribute('data-lang', 'dashboard.title.profile');
                showProfile();
            }

            if (typeof updatePageLanguage === 'function') {
                updatePageLanguage();
            }
        });
    });
});

// Модалка создания ссылки
function showCreateModal() {
    document.getElementById('createLinkModal').classList.add('show');
    document.getElementById('createUrl').value = '';
    document.getElementById('createError').classList.remove('show');
    document.getElementById('createSuccess').classList.remove('show');
    document.getElementById('createResult').style.display = 'none';

    const btn = document.getElementById('createLinkBtn');
    btn.style.display = 'block';

    if (typeof updatePageLanguage === 'function') {
        updatePageLanguage();
    }
}

function closeCreateModal() {
    document.getElementById('createLinkModal').classList.remove('show');
}

async function createLink() {
    const url = document.getElementById('createUrl').value.trim();
    const errorEl = document.getElementById('createError');
    const successEl = document.getElementById('createSuccess');
    const resultEl = document.getElementById('createResult');
    const btn = document.getElementById('createLinkBtn');

    errorEl.classList.remove('show');
    successEl.classList.remove('show');
    resultEl.style.display = 'none';

    if (!url) {
        errorEl.textContent = currentLang === 'ru' ? 'Пожалуйста, введите URL' :
            currentLang === 'de' ? 'Bitte geben Sie eine URL ein' :
                'Please enter a URL';
        errorEl.classList.add('show');
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        errorEl.textContent = currentLang === 'ru' ? 'Пожалуйста, введите корректный URL' :
            currentLang === 'de' ? 'Bitte geben Sie eine gültige URL ein' :
                'Please enter a valid URL';
        errorEl.classList.add('show');
        return;
    }

    btn.disabled = true;
    btn.textContent = currentLang === 'ru' ? 'Создание...' :
        currentLang === 'de' ? 'Erstellen...' :
            'Creating...';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (response.ok) {
            const shortUrl = `${window.location.origin}/${data.shortCode}`;
            document.getElementById('createdShortUrl').value = shortUrl;
            document.getElementById('createdQrCode').src = data.qrCode;
            resultEl.style.display = 'block';

            successEl.textContent = currentLang === 'ru' ? 'Ссылка успешно создана!' :
                currentLang === 'de' ? 'Link erfolgreich erstellt!' :
                    'Link created successfully!';
            successEl.classList.add('show');

            btn.style.display = 'none';

            if (typeof updatePageLanguage === 'function') {
                updatePageLanguage();
            }

            setTimeout(() => {
                showOverview();
            }, 3000);
        } else {
            errorEl.textContent = data.error || 'Error creating link';
            errorEl.classList.add('show');
        }
    } catch (error) {
        console.error('Error:', error);
        errorEl.textContent = 'Network error';
        errorEl.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.textContent = currentLang === 'ru' ? 'Создать ссылку' :
            currentLang === 'de' ? 'Link erstellen' :
                'Create Link';
        if (typeof updatePageLanguage === 'function') {
            updatePageLanguage();
        }
    }
}

function copyCreatedUrl() {
    const input = document.getElementById('createdShortUrl');
    input.select();
    navigator.clipboard.writeText(input.value);

    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = currentLang === 'ru' ? '✓ Скопировано' :
        currentLang === 'de' ? '✓ Kopiert' :
            '✓ Copied';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}

function copyLink(shortCode, event) {
    const url = `${window.location.origin}/${shortCode}`;
    navigator.clipboard.writeText(url);

    const btn = event.target.closest('.btn-action');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '✓';
    btn.style.background = 'var(--success)';
    btn.style.color = 'white';

    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.style.background = '';
        btn.style.color = '';
    }, 2000);
}

function showQR(shortCode) {
    const qrUrl = `/api/qr/${shortCode}`;
    window.open(qrUrl, '_blank');
}

async function deleteLink(id) {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            toast.success('Link deleted successfully!');
            showOverview();
        } else {
            toast.error('Error deleting link');
        }
    } catch (error) {
        console.error('Error:', error);
        toast.error('Error deleting link');
    }
}

async function changePassword() {
    const current = document.getElementById('currentPassword')?.value;
    const newPass = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;

    if (!current || !newPass || !confirm) {
        toast.warning('Please fill in all fields');
        return;
    }

    if (newPass.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
    }

    if (newPass !== confirm) {
        toast.error('Passwords do not match');
        return;
    }

    try {
        const response = await fetch('/api/user/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword: current,
                newPassword: newPass
            })
        });

        const data = await response.json();

        if (response.ok) {
            toast.success('Password changed successfully!');
            // Clear form
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            toast.error(data.error || 'Error changing password');
        }
    } catch (error) {
        console.error('Error:', error);
        toast.error('Error changing password');
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}