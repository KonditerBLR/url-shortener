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

    // Загружаем агрегированную статистику одним запросом
    const token = localStorage.getItem('token');
    let totalClicksToday = 0;
    let totalClicksMonth = 0;

    try {
        const response = await fetch('/api/stats/summary', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const stats = await response.json();
            totalClicksToday = stats.totalClicksToday || 0;
            totalClicksMonth = stats.totalClicksMonth || 0;
        }
    } catch (error) {
        console.error('Error loading summary stats:', error);
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

    // Исправляем ошибку с топ-ссылкой
    if (topLink) {
        document.getElementById('topLinkClicks').textContent = topLink.clicks;
    } else {
        document.getElementById('topLinkClicks').textContent = 0;
    }

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
async function showLinks() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `
        <div class="links-section">
            <div class="section-header">
                <h2 class="section-title" data-lang="dashboard.all_links">All Links</h2>
                <button class="btn-create" onclick="showCreateModal()" data-lang="dashboard.create_link">+ Create Link</button>
            </div>
            <div id="allLinksTable"></div>
        </div>
    `;

    const links = await loadLinks();
    if (!links || links.length === 0) {
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
        renderLinksTable(links, 'allLinksTable');
    }

    if (typeof updatePageLanguage === 'function') {
        updatePageLanguage();
    }
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
                                <button class="btn-action" onclick="showLinkAnalytics(${link.id})" title="View Analytics">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                    </svg>
                                </button>
                                <button class="btn-action" onclick="showEditModal(${link.id})" title="Edit">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="btn-action" onclick="exportStats(${link.id}, '${link.short_code}')" title="Export CSV">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
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

// Отображение аналитики
async function showAnalytics() {
    const content = document.getElementById('dashboardContent');

    content.innerHTML = `
        <div class="analytics-section">
            <div class="charts-grid">
                <!-- Clicks Timeline Chart -->
                <div class="chart-card">
                    <h3 data-lang="analytics.clicks_timeline">Clicks Over Time</h3>
                    <canvas id="clicksChart"></canvas>
                </div>

                <!-- Devices Chart -->
                <div class="chart-card">
                    <h3 data-lang="analytics.devices">Devices</h3>
                    <canvas id="devicesChart"></canvas>
                </div>

                <!-- Browsers Chart -->
                <div class="chart-card">
                    <h3 data-lang="analytics.browsers">Browsers</h3>
                    <canvas id="browsersChart"></canvas>
                </div>

                <!-- OS Chart -->
                <div class="chart-card">
                    <h3 data-lang="analytics.operating_systems">Operating Systems</h3>
                    <canvas id="osChart"></canvas>
                </div>

                <!-- Referrers Table -->
                <div class="chart-card">
                    <h3 data-lang="analytics.top_referrers">Top Referrers</h3>
                    <div id="referrersTable"></div>
                </div>

                <!-- Geography Table -->
                <div class="chart-card">
                    <h3 data-lang="analytics.top_countries">Top Countries</h3>
                    <div id="geoTable"></div>
                </div>

                <!-- World Map -->
                <div class="chart-card map-card">
                    <h3 data-lang="analytics.world_map">Clicks World Map</h3>
                    <div id="worldMap" style="height: 400px; border-radius: 12px; overflow: hidden;"></div>
                </div>
            </div>
        </div>
    `;

    await loadAnalyticsData();
    updatePageLanguage();
}

// Загрузка данных аналитики
async function loadAnalyticsData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        // Загружаем все данные параллельно
        const [timeline, devices, platforms, referrers, geo] = await Promise.all([
            fetch('/api/stats/analytics/clicks-timeline?days=30', {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()),
            fetch('/api/stats/analytics/devices', {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()),
            fetch('/api/stats/analytics/platforms', {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()),
            fetch('/api/stats/analytics/referrers', {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()),
            fetch('/api/stats/analytics/geo', {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json())
        ]);

        // Рендерим графики
        renderClicksChart(timeline.timeline || []);
        renderDevicesChart(devices.devices || []);
        renderBrowsersChart(platforms.browsers || []);
        renderOSChart(platforms.os || []);
        renderReferrersTable(referrers.referrers || []);
        renderGeoTable(geo.countries || []);
        renderWorldMap(geo.countries || []);
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// График кликов по времени
function renderClicksChart(data) {
    const ctx = document.getElementById('clicksChart');
    if (!ctx) return;

    const chartData = {
        labels: data.map(d => new Date(d.date).toLocaleDateString()),
        datasets: [{
            label: 'Clicks',
            data: data.map(d => parseInt(d.clicks)),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            fill: true,
            tension: 0.4
        }]
    };

    new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// График устройств
function renderDevicesChart(data) {
    const ctx = document.getElementById('devicesChart');
    if (!ctx || data.length === 0) {
        if (ctx) ctx.parentElement.innerHTML = `<p style="text-align:center;color:var(--text-gray);">${t('analytics.no_data')}</p>`;
        return;
    }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.device_type || 'Unknown'),
            datasets: [{
                data: data.map(d => parseInt(d.count)),
                backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// График браузеров
function renderBrowsersChart(data) {
    const ctx = document.getElementById('browsersChart');
    if (!ctx || data.length === 0) {
        if (ctx) ctx.parentElement.innerHTML = `<p style="text-align:center;color:var(--text-gray);">${t('analytics.no_data')}</p>`;
        return;
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.browser || 'Unknown'),
            datasets: [{
                label: 'Clicks',
                data: data.map(d => parseInt(d.count)),
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// График ОС
function renderOSChart(data) {
    const ctx = document.getElementById('osChart');
    if (!ctx || data.length === 0) {
        if (ctx) ctx.parentElement.innerHTML = `<p style="text-align:center;color:var(--text-gray);">${t('analytics.no_data')}</p>`;
        return;
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.os || 'Unknown'),
            datasets: [{
                label: 'Clicks',
                data: data.map(d => parseInt(d.count)),
                backgroundColor: '#764ba2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Таблица реферальных источников
function renderReferrersTable(data) {
    const container = document.getElementById('referrersTable');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-gray);">${t('analytics.no_data')}</p>`;
        return;
    }

    container.innerHTML = `
        <table class="analytics-table">
            <thead>
                <tr>
                    <th>${t('analytics.source')}</th>
                    <th>${t('analytics.clicks')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td>${d.source}</td>
                        <td>${d.count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Таблица географии
function renderGeoTable(data) {
    const container = document.getElementById('geoTable');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-gray);">${t('analytics.no_data')}</p>`;
        return;
    }

    container.innerHTML = `
        <table class="analytics-table">
            <thead>
                <tr>
                    <th>${t('analytics.country')}</th>
                    <th>${t('analytics.clicks')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td>${d.country}</td>
                        <td>${d.count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Карта мира с геолокацией кликов
function renderWorldMap(data) {
    const container = document.getElementById('worldMap');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-gray);padding-top:180px;">${t('analytics.no_data')}</p>`;
        return;
    }

    // Координаты стран (основные)
    const countryCoords = {
        'United States': [37.0902, -95.7129],
        'USA': [37.0902, -95.7129],
        'Russia': [61.5240, 105.3188],
        'China': [35.8617, 104.1954],
        'India': [20.5937, 78.9629],
        'Brazil': [-14.2350, -51.9253],
        'Germany': [51.1657, 10.4515],
        'United Kingdom': [55.3781, -3.4360],
        'UK': [55.3781, -3.4360],
        'France': [46.2276, 2.2137],
        'Japan': [36.2048, 138.2529],
        'Canada': [56.1304, -106.3468],
        'Australia': [-25.2744, 133.7751],
        'Spain': [40.4637, -3.7492],
        'Italy': [41.8719, 12.5674],
        'Mexico': [23.6345, -102.5528],
        'South Korea': [35.9078, 127.7669],
        'Poland': [51.9194, 19.1451],
        'Ukraine': [48.3794, 31.1656],
        'Netherlands': [52.1326, 5.2913],
        'Turkey': [38.9637, 35.2433],
        'Argentina': [-38.4161, -63.6167],
        'Belgium': [50.5039, 4.4699],
        'Sweden': [60.1282, 18.6435],
        'Switzerland': [46.8182, 8.2275],
        'Norway': [60.4720, 8.4689],
        'Austria': [47.5162, 14.5501],
        'Czech Republic': [49.8175, 15.4730],
        'Unknown': [0, 0]
    };

    // Создаем карту
    const map = L.map('worldMap', {
        center: [30, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 6,
        zoomControl: true
    });

    // Добавляем тайлы (светлая тема)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Добавляем маркеры для каждой страны
    data.forEach(item => {
        const coords = countryCoords[item.country] || countryCoords['Unknown'];
        if (coords[0] !== 0 || coords[1] !== 0) {
            const marker = L.circleMarker(coords, {
                radius: Math.min(5 + Math.sqrt(item.count) * 2, 25),
                fillColor: '#667eea',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            }).addTo(map);

            marker.bindPopup(`
                <div style="text-align: center; padding: 8px;">
                    <strong style="color: #667eea; font-size: 16px;">${item.country}</strong><br>
                    <span style="color: #6b7280; font-size: 14px;">${item.count} ${t('analytics.clicks')}</span>
                </div>
            `);
        }
    });
}

// Показать детальную аналитику ссылки
async function showLinkAnalytics(linkId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`/api/stats/analytics/link/${linkId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            toast.error('Failed to load analytics');
            return;
        }

        const data = await response.json();

        // Переключаемся на страницу analytics и обновляем контент
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelector('.nav-item[data-page="analytics"]').classList.add('active');
        document.getElementById('pageTitle').textContent = `${data.link.title || data.link.short_code} - Analytics`;

        const content = document.getElementById('dashboardContent');
        content.innerHTML = `
            <div class="analytics-section">
                <div class="link-analytics-header">
                    <div>
                        <h2 style="color: var(--primary); margin-bottom: 8px;">${data.link.title || data.link.short_code}</h2>
                        <p style="color: var(--text-gray); font-size: 14px;">${data.link.original_url}</p>
                    </div>
                    <button class="btn-create" onclick="showAnalytics()" style="background: var(--text-gray);">
                        ← Back to All Analytics
                    </button>
                </div>

                <div class="stats-cards" style="margin-top: 24px;">
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <span class="stat-card-title">${t('dashboard.stats.total_clicks')}</span>
                            <div class="stat-card-icon">📊</div>
                        </div>
                        <div class="stat-card-value">${data.stats.total_clicks}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <span class="stat-card-title">Unique Clicks</span>
                            <div class="stat-card-icon">👥</div>
                        </div>
                        <div class="stat-card-value">${data.stats.unique_clicks}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-header">
                            <span class="stat-card-title">Created</span>
                            <div class="stat-card-icon">📅</div>
                        </div>
                        <div class="stat-card-value" style="font-size: 18px;">${new Date(data.link.created_at).toLocaleDateString()}</div>
                    </div>
                </div>

                <div class="charts-grid" style="margin-top: 32px;">
                    <div class="chart-card">
                        <h3 data-lang="analytics.clicks_timeline">Clicks Over Time</h3>
                        <canvas id="linkClicksChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3 data-lang="analytics.devices">Devices</h3>
                        <canvas id="linkDevicesChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3 data-lang="analytics.browsers">Browsers</h3>
                        <canvas id="linkBrowsersChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3 data-lang="analytics.operating_systems">Operating Systems</h3>
                        <canvas id="linkOSChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3 data-lang="analytics.top_referrers">Top Referrers</h3>
                        <div id="linkReferrersTable"></div>
                    </div>
                    <div class="chart-card">
                        <h3 data-lang="analytics.top_countries">Top Countries</h3>
                        <div id="linkGeoTable"></div>
                    </div>
                </div>
            </div>
        `;

        updatePageLanguage();

        // Рендерим графики с префиксом link
        renderLinkClicksChart(data.timeline || []);
        renderLinkDevicesChart(data.devices || []);
        renderLinkBrowsersChart(data.browsers || []);
        renderLinkOSChart(data.os || []);
        renderLinkReferrersTable(data.referrers || []);
        renderLinkGeoTable(data.countries || []);

    } catch (error) {
        console.error('Error loading link analytics:', error);
        toast.error('Failed to load analytics');
    }
}

// Функции рендеринга для аналитики конкретной ссылки
function renderLinkClicksChart(data) {
    const ctx = document.getElementById('linkClicksChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => new Date(d.date).toLocaleDateString()),
            datasets: [{
                label: 'Clicks',
                data: data.map(d => parseInt(d.clicks)),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderLinkDevicesChart(data) {
    const ctx = document.getElementById('linkDevicesChart');
    if (!ctx || data.length === 0) {
        if (ctx) ctx.parentElement.innerHTML = `<p style="text-align:center;color:var(--text-gray);">${t('analytics.no_data')}</p>`;
        return;
    }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.device_type || 'Unknown'),
            datasets: [{
                data: data.map(d => parseInt(d.count)),
                backgroundColor: ['#667eea', '#f765a3', '#16aaff', '#ffa16a']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderLinkBrowsersChart(data) {
    const ctx = document.getElementById('linkBrowsersChart');
    if (!ctx || data.length === 0) {
        if (ctx) ctx.parentElement.innerHTML = `<p style="text-align:center;color:var(--text-gray);">${t('analytics.no_data')}</p>`;
        return;
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.browser || 'Unknown'),
            datasets: [{
                label: 'Clicks',
                data: data.map(d => parseInt(d.count)),
                backgroundColor: '#f765a3'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderLinkOSChart(data) {
    const ctx = document.getElementById('linkOSChart');
    if (!ctx || data.length === 0) {
        if (ctx) ctx.parentElement.innerHTML = `<p style="text-align:center;color:var(--text-gray);">${t('analytics.no_data')}</p>`;
        return;
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.os || 'Unknown'),
            datasets: [{
                label: 'Clicks',
                data: data.map(d => parseInt(d.count)),
                backgroundColor: '#764ba2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderLinkReferrersTable(data) {
    const container = document.getElementById('linkReferrersTable');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-gray);">${t('analytics.no_data')}</p>`;
        return;
    }

    container.innerHTML = `
        <table class="analytics-table">
            <thead>
                <tr>
                    <th>${t('analytics.source')}</th>
                    <th>${t('analytics.clicks')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td>${d.source}</td>
                        <td>${d.count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderLinkGeoTable(data) {
    const container = document.getElementById('linkGeoTable');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-gray);">${t('analytics.no_data')}</p>`;
        return;
    }

    container.innerHTML = `
        <table class="analytics-table">
            <thead>
                <tr>
                    <th>${t('analytics.country')}</th>
                    <th>${t('analytics.clicks')}</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(d => `
                    <tr>
                        <td>${d.country}</td>
                        <td>${d.count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
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
            } else if (page === 'analytics') {
                document.getElementById('pageTitle').setAttribute('data-lang', 'dashboard.title.analytics');
                showAnalytics();
            } else if (page === 'links') {
                document.getElementById('pageTitle').setAttribute('data-lang', 'dashboard.title.links');
                showLinks();
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
    const title = document.getElementById('createTitle').value.trim();
    const customCode = document.getElementById('createCustomCode').value.trim();
    const expiresInDays = document.getElementById('createExpires').value;
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
        const body = { url };
        if (title) body.title = title;
        if (customCode) body.customCode = customCode;
        if (expiresInDays && parseInt(expiresInDays) > 0) body.expiresInDays = parseInt(expiresInDays);

        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(body)
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
                closeCreateModal();
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
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Валидация
    if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error(typeof t === 'function' ? t('auth.error_empty') : 'Fill in all fields');
        return;
    }

    if (newPassword.length < 8) {
        toast.error(typeof t === 'function' ? t('auth.error_password_short') : 'Password must be at least 8 characters');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert(typeof t === 'function' ? t('auth.error_password_mismatch') : 'Passwords don\'t match');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        toast.error('Not authorized');
        return;
    }

    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (response.ok) {
            toast.success(data.message || 'Password changed successfully!');
            // Очищаем поля
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

// Тёмная тема
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Загрузка сохранённой темы
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
}

// Вызываем при загрузке страницы
loadSavedTheme();

// Edit link
let editingLinkId = null;

function showEditModal(id) {
    editingLinkId = id;

    // Найти ссылку
    loadLinks().then(links => {
        const link = links.find(l => l.id === id);
        if (!link) return;

        document.getElementById('editUrl').value = link.original_url;
        document.getElementById('editTitle').value = link.title || '';
        document.getElementById('editExpires').value = '';

        document.getElementById('editLinkModal').classList.add('show');
        document.getElementById('editError').classList.remove('show');
        document.getElementById('editSuccess').classList.remove('show');
    });
}

function closeEditModal() {
    document.getElementById('editLinkModal').classList.remove('show');
    editingLinkId = null;
}

async function saveEdit() {
    if (!editingLinkId) return;

    const original_url = document.getElementById('editUrl').value.trim();
    const title = document.getElementById('editTitle').value.trim();
    const expiresInDays = document.getElementById('editExpires').value;
    const errorEl = document.getElementById('editError');
    const successEl = document.getElementById('editSuccess');

    errorEl.classList.remove('show');
    successEl.classList.remove('show');

    const body = {};
    if (original_url) body.original_url = original_url;
    if (title) body.title = title;
    if (expiresInDays) body.expiresInDays = parseInt(expiresInDays);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${editingLinkId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            successEl.textContent = 'Link updated successfully!';
            successEl.classList.add('show');
            setTimeout(() => {
                closeEditModal();
                showOverview();
            }, 1500);
        } else {
            const data = await response.json();
            errorEl.textContent = data.error || 'Error updating link';
            errorEl.classList.add('show');
        }
    } catch (error) {
        console.error('Error:', error);
        errorEl.textContent = 'Network error';
        errorEl.classList.add('show');
    }
}

// Export statistics
function exportStats(id, shortCode) {
    const token = localStorage.getItem('token');
    const url = `/api/urls/${id}/export`;

    // Создаем скрытую ссылку для скачивания
    const a = document.createElement('a');
    a.href = url;
    a.download = `link-${shortCode}-stats.csv`;
    a.style.display = 'none';

    // Добавляем токен в заголовки через fetch и создаем blob
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.blob())
    .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        a.href = blobUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    })
    .catch(error => {
        console.error('Error exporting stats:', error);
        toast.error('Error exporting statistics');
    });
}