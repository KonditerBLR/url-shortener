// ===== DASHBOARD LOGIC =====

// ===== SKELETON LOADERS =====
const SkeletonLoader = {
    statsCards: () => `
        <div class="stats-grid">
            ${Array(4).fill(0).map(() => `
                <div class="skeleton-stat-card">
                    <div class="skeleton skeleton-stat-icon"></div>
                    <div class="skeleton-stat-content">
                        <div class="skeleton skeleton-stat-title"></div>
                        <div class="skeleton skeleton-stat-value"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `,

    linksTable: (rows = 5) => `
        <div class="skeleton-table">
            <div class="skeleton-table-header">
                <div class="skeleton skeleton-table-header-cell" style="width: 120px;"></div>
                <div class="skeleton skeleton-table-header-cell" style="flex: 2;"></div>
                <div class="skeleton skeleton-table-header-cell" style="width: 80px;"></div>
                <div class="skeleton skeleton-table-header-cell" style="width: 100px;"></div>
                <div class="skeleton skeleton-table-header-cell" style="width: 100px;"></div>
            </div>
            ${Array(rows).fill(0).map(() => `
                <div class="skeleton-table-row">
                    <div class="skeleton skeleton-table-cell short"></div>
                    <div class="skeleton skeleton-table-cell long"></div>
                    <div class="skeleton skeleton-table-cell number"></div>
                    <div class="skeleton skeleton-table-cell date"></div>
                    <div class="skeleton skeleton-table-cell actions"></div>
                </div>
            `).join('')}
        </div>
    `,

    chart: () => `
        <div class="skeleton-chart">
            <div class="skeleton skeleton-chart-title"></div>
            <div class="skeleton skeleton-chart-body"></div>
        </div>
    `,

    analyticsList: (items = 5) => `
        <div class="skeleton-analytics-list">
            ${Array(items).fill(0).map(() => `
                <div class="skeleton-analytics-item">
                    <div class="skeleton-analytics-item-info">
                        <div class="skeleton skeleton-analytics-item-title"></div>
                        <div class="skeleton skeleton-analytics-item-url"></div>
                    </div>
                    <div class="skeleton-analytics-item-meta">
                        <div class="skeleton skeleton-analytics-item-clicks"></div>
                        <div class="skeleton skeleton-analytics-item-date"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `
};

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
            <div id="recentLinksTable">
                ${SkeletonLoader.linksTable(3)}
            </div>
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

// ===== TAGS MANAGEMENT =====
let allTags = [];
let selectedTagFilter = null;

// ===== STARRED MANAGEMENT =====
let showOnlyStarred = false;

// ===== ARCHIVED MANAGEMENT =====
let showArchivedLinks = false;

// ===== BULK ACTIONS =====
let selectedLinks = new Set();

// Toggle starred status
async function toggleStarred(urlId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${urlId}/starred`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            // Update local data
            const link = allLinksData.find(l => l.id === urlId);
            if (link) {
                link.is_starred = data.is_starred;
            }
            // Refresh display
            filterLinks();
            toast.success(data.is_starred ? 'Added to favorites' : 'Removed from favorites');
        }
    } catch (error) {
        console.error('Error toggling starred:', error);
        toast.error('Failed to update favorites');
    }
}

// Toggle starred filter
function toggleStarredFilter() {
    showOnlyStarred = !showOnlyStarred;
    const btn = document.getElementById('starredFilterBtn');
    if (btn) {
        btn.classList.toggle('active', showOnlyStarred);
    }
    filterLinks();
}

// ===== ARCHIVED MANAGEMENT FUNCTIONS =====

// Toggle archived status
async function toggleArchived(urlId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${urlId}/archived`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            // Update local data
            const link = allLinksData.find(l => l.id === urlId);
            if (link) {
                link.is_archived = data.is_archived;
                link.archived_at = data.archived_at;
            }
            // Refresh display
            filterLinks();
            toast.success(data.is_archived ? 'Link archived' : 'Link restored from archive');
        }
    } catch (error) {
        console.error('Error toggling archived:', error);
        toast.error('Failed to update archived status');
    }
}

// Toggle show archived filter
function toggleArchivedFilter() {
    showArchivedLinks = !showArchivedLinks;
    const btn = document.getElementById('archivedFilterBtn');
    if (btn) {
        btn.classList.toggle('active', showArchivedLinks);
        btn.textContent = showArchivedLinks ? 'Hide Archived' : 'Show Archived';
    }
    filterLinks();
}

// ===== PASSWORD PROTECTION =====

// Set or update link password
async function setLinkPassword(urlId) {
    const link = allLinksData.find(l => l.id === urlId);
    if (!link) return;

    // Create modal for password settings
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3>${link.has_password ? '🔒 Update Password' : '🔓 Set Password Protection'}</h3>
            <div class="form-group" style="margin: 20px 0;">
                <label for="linkPassword">Password:</label>
                <input type="password" id="linkPassword" class="form-control" placeholder="Enter password (min 4 characters)" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 10px;">
                <input type="password" id="linkPasswordConfirm" class="form-control" placeholder="Confirm password" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                <small style="color: var(--text-gray); display: block; margin-top: 5px;">Leave empty to remove password protection</small>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" onclick="saveLinkPassword(${urlId})">Save</button>
                ${link.has_password ? `<button class="btn-danger" onclick="removeLinkPassword(${urlId})">Remove Password</button>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Save link password
async function saveLinkPassword(urlId) {
    try {
        const password = document.getElementById('linkPassword').value;
        const passwordConfirm = document.getElementById('linkPasswordConfirm').value;

        if (!password && !passwordConfirm) {
            // Empty = remove password
            await removeLinkPassword(urlId);
            return;
        }

        if (password !== passwordConfirm) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 4) {
            toast.error('Password must be at least 4 characters');
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${urlId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok) {
            // Update local data
            const link = allLinksData.find(l => l.id === urlId);
            if (link) {
                link.has_password = data.has_password;
            }

            filterLinks();
            toast.success('Password protection set successfully');
            document.querySelector('.modal-overlay')?.remove();
        } else {
            toast.error(data.error || 'Failed to set password');
        }
    } catch (error) {
        console.error('Error setting password:', error);
        toast.error('Failed to set password');
    }
}

// Remove link password
async function removeLinkPassword(urlId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${urlId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password: null })
        });

        const data = await response.json();

        if (response.ok) {
            // Update local data
            const link = allLinksData.find(l => l.id === urlId);
            if (link) {
                link.has_password = false;
            }

            filterLinks();
            toast.success('Password protection removed');
            document.querySelector('.modal-overlay')?.remove();
        } else {
            toast.error(data.error || 'Failed to remove password');
        }
    } catch (error) {
        console.error('Error removing password:', error);
        toast.error('Failed to remove password');
    }
}

// ===== LINK EXPIRATION =====

// Set or update link expiration
async function setLinkExpiration(urlId) {
    const link = allLinksData.find(l => l.id === urlId);
    if (!link) return;

    // Create modal for expiration settings
    const currentExpiration = link.expires_at ? new Date(link.expires_at).toISOString().slice(0, 16) : '';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3>Set Link Expiration</h3>
            <div class="form-group" style="margin: 20px 0;">
                <label for="expirationDate">Expiration Date & Time:</label>
                <input type="datetime-local" id="expirationDate" class="form-control" value="${currentExpiration}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                <small style="color: var(--text-gray); display: block; margin-top: 5px;">Leave empty to remove expiration</small>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" onclick="saveExpiration(${urlId})">Save</button>
                ${currentExpiration ? `<button class="btn-danger" onclick="removeExpiration(${urlId})">Remove</button>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Save expiration date
async function saveExpiration(urlId) {
    try {
        const dateInput = document.getElementById('expirationDate');
        const expirationDate = dateInput.value ? new Date(dateInput.value).toISOString() : null;

        if (!expirationDate) {
            toast.error('Please select a date and time');
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${urlId}/expiration`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ expires_at: expirationDate })
        });

        const data = await response.json();

        if (response.ok) {
            // Update local data
            const link = allLinksData.find(l => l.id === urlId);
            if (link) {
                link.expires_at = data.expires_at;
            }

            filterLinks();
            toast.success('Expiration date set successfully');
            document.querySelector('.modal-overlay')?.remove();
        } else {
            toast.error(data.error || 'Failed to set expiration');
        }
    } catch (error) {
        console.error('Error setting expiration:', error);
        toast.error('Failed to set expiration');
    }
}

// Remove expiration date
async function removeExpiration(urlId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${urlId}/expiration`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ expires_at: null })
        });

        const data = await response.json();

        if (response.ok) {
            // Update local data
            const link = allLinksData.find(l => l.id === urlId);
            if (link) {
                link.expires_at = null;
            }

            filterLinks();
            toast.success('Expiration removed');
            document.querySelector('.modal-overlay')?.remove();
        } else {
            toast.error(data.error || 'Failed to remove expiration');
        }
    } catch (error) {
        console.error('Error removing expiration:', error);
        toast.error('Failed to remove expiration');
    }
}

// Get expiration status text
function getExpirationStatus(expiresAt) {
    if (!expiresAt) return null;

    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff < 0) {
        return { text: 'Expired', class: 'expired', color: '#ef4444' };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 7) {
        return { text: `Expires in ${days} days`, class: 'expires-soon', color: '#10b981' };
    } else if (days > 0) {
        return { text: `Expires in ${days}d ${hours}h`, class: 'expires-soon', color: '#f59e0b' };
    } else if (hours > 0) {
        return { text: `Expires in ${hours}h`, class: 'expires-urgent', color: '#f97316' };
    } else {
        return { text: 'Expires soon', class: 'expires-urgent', color: '#ef4444' };
    }
}

// ===== BULK ACTIONS FUNCTIONS =====

// Toggle select all links
function toggleSelectAll() {
    const checkbox = document.getElementById('selectAllCheckbox');
    const isChecked = checkbox.checked;

    if (isChecked) {
        // Select all visible links
        filteredLinksData.forEach(link => selectedLinks.add(link.id));
    } else {
        // Deselect all
        selectedLinks.clear();
    }

    updateBulkActionsBar();
    updateCheckboxes();
}

// Toggle single link selection
function toggleSelectLink(linkId) {
    if (selectedLinks.has(linkId)) {
        selectedLinks.delete(linkId);
    } else {
        selectedLinks.add(linkId);
    }

    updateBulkActionsBar();
    updateSelectAllCheckbox();
}

// Update bulk actions bar visibility and count
function updateBulkActionsBar() {
    const bar = document.getElementById('bulkActionsBar');
    const count = document.getElementById('selectedCount');

    if (!bar || !count) return;

    if (selectedLinks.size > 0) {
        bar.style.display = 'flex';
        count.textContent = selectedLinks.size;
    } else {
        bar.style.display = 'none';
    }
}

// Update individual checkboxes state
function updateCheckboxes() {
    filteredLinksData.forEach(link => {
        const checkbox = document.getElementById(`checkbox-${link.id}`);
        if (checkbox) {
            checkbox.checked = selectedLinks.has(link.id);
        }
    });
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
    const selectAll = document.getElementById('selectAllCheckbox');
    if (!selectAll) return;

    const visibleIds = filteredLinksData.map(l => l.id);
    const allVisibleSelected = visibleIds.length > 0 &&
                                visibleIds.every(id => selectedLinks.has(id));

    selectAll.checked = allVisibleSelected;
    selectAll.indeterminate = selectedLinks.size > 0 && !allVisibleSelected;
}

// Delete selected links
async function deleteSelectedLinks() {
    if (selectedLinks.size === 0) {
        toast.warning('No links selected');
        return;
    }

    const count = selectedLinks.size;
    const confirmed = await confirmModal(
        `Are you sure you want to delete ${count} link${count > 1 ? 's' : ''}? This action cannot be undone.`,
        'Delete Links'
    );
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    let successCount = 0;
    let failCount = 0;

    // Delete links one by one
    for (const linkId of selectedLinks) {
        try {
            const response = await fetch(`/api/urls/${linkId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            console.error('Error deleting link:', linkId, error);
            failCount++;
        }
    }

    // Clear selection
    selectedLinks.clear();

    // Show result
    if (successCount > 0) {
        toast.success(`${successCount} link${successCount > 1 ? 's' : ''} deleted successfully`);
    }
    if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} link${failCount > 1 ? 's' : ''}`);
    }

    // Reload links
    await showLinks();
}

// Clear selection
function clearSelection() {
    selectedLinks.clear();
    updateBulkActionsBar();
    updateSelectAllCheckbox();
    updateCheckboxes();
}

// ===== EXPORT FUNCTIONS =====

// Export links to CSV
function exportToCSV() {
    if (filteredLinksData.length === 0) {
        toast.warning('No links to export');
        return;
    }

    // CSV headers
    const headers = ['Short Code', 'Original URL', 'Clicks', 'Created Date', 'Starred', 'Tags'];

    // CSV rows
    const rows = filteredLinksData.map(link => {
        const shortCode = link.short_code;
        const originalUrl = `"${link.original_url.replace(/"/g, '""')}"`;
        const clicks = link.clicks || 0;
        const createdDate = new Date(link.created_at).toLocaleString();
        const starred = link.is_starred ? 'Yes' : 'No';
        const tags = link.tags && link.tags.length > 0
            ? `"${link.tags.map(t => t.name).join(', ')}"`
            : '';

        return [shortCode, originalUrl, clicks, createdDate, starred, tags].join(',');
    });

    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `links-export-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Close export menu
    const menu = document.getElementById('exportMenu');
    if (menu) menu.classList.remove('show');

    toast.success(`Exported ${filteredLinksData.length} links to CSV`);
}

// Export links to JSON
function exportToJSON() {
    if (filteredLinksData.length === 0) {
        toast.warning('No links to export');
        return;
    }

    // Format data
    const exportData = filteredLinksData.map(link => ({
        short_code: link.short_code,
        original_url: link.original_url,
        clicks: link.clicks || 0,
        created_at: link.created_at,
        is_starred: link.is_starred || false,
        tags: link.tags || []
    }));

    const json = JSON.stringify(exportData, null, 2);

    // Create download
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `links-export-${Date.now()}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Close export menu
    const menu = document.getElementById('exportMenu');
    if (menu) menu.classList.remove('show');

    toast.success(`Exported ${filteredLinksData.length} links to JSON`);
}

// Toggle export menu
function toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// Close export menu when clicking outside
document.addEventListener('click', (e) => {
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');

    if (exportBtn && exportMenu && !exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
        exportMenu.classList.remove('show');
    }
});

// ===== DESCRIPTION FUNCTIONS =====

// Show edit description inline
function showEditDescription(linkId) {
    const descContainer = document.getElementById(`desc-${linkId}`);
    const currentDesc = descContainer.getAttribute('data-description') || '';

    descContainer.innerHTML = `
        <div class="description-edit">
            <textarea id="desc-input-${linkId}"
                      class="description-input"
                      placeholder="Add a description..."
                      maxlength="500">${currentDesc}</textarea>
            <div class="description-actions">
                <button class="btn-desc-save" onclick="saveDescription(${linkId})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Save
                </button>
                <button class="btn-desc-cancel" onclick="cancelEditDescription(${linkId})">
                    Cancel
                </button>
            </div>
        </div>
    `;

    // Focus and select text
    const textarea = document.getElementById(`desc-input-${linkId}`);
    textarea.focus();
    textarea.select();
}

// Save description
async function saveDescription(linkId) {
    const textarea = document.getElementById(`desc-input-${linkId}`);
    const description = textarea.value.trim();

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${linkId}/description`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ description })
        });

        if (response.ok) {
            const data = await response.json();

            // Update local data
            const link = allLinksData.find(l => l.id === linkId);
            if (link) {
                link.description = data.description;
            }

            // Update display
            renderDescription(linkId, data.description);
            toast.success('Description updated');
        } else {
            toast.error('Failed to update description');
        }
    } catch (error) {
        console.error('Error updating description:', error);
        toast.error('Failed to update description');
    }
}

// Cancel edit description
function cancelEditDescription(linkId) {
    const descContainer = document.getElementById(`desc-${linkId}`);
    const currentDesc = descContainer.getAttribute('data-description');
    renderDescription(linkId, currentDesc);
}

// Render description display
function renderDescription(linkId, description) {
    const descContainer = document.getElementById(`desc-${linkId}`);
    descContainer.setAttribute('data-description', description || '');

    if (description) {
        descContainer.innerHTML = `
            <div class="description-display" onclick="showEditDescription(${linkId})">
                <span class="description-text">${description}</span>
                <svg class="description-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </div>
        `;
    } else {
        descContainer.innerHTML = `
            <div class="description-display description-empty" onclick="showEditDescription(${linkId})">
                <span class="description-text">Add description...</span>
                <svg class="description-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
            </div>
        `;
    }
}

// Load all tags
async function loadTags() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tags', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            allTags = await response.json();
            return allTags;
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
    return [];
}

// Create new tag
async function createTag(name, color = '#6366f1') {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/tags', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, color })
        });

        if (response.ok) {
            const newTag = await response.json();
            allTags.push(newTag);
            toast.success('Tag created successfully');
            return newTag;
        } else {
            const error = await response.json();
            toast.error(error.error || 'Failed to create tag');
        }
    } catch (error) {
        console.error('Error creating tag:', error);
        toast.error('Failed to create tag');
    }
    return null;
}

// Delete tag
async function deleteTag(tagId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tags/${tagId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            allTags = allTags.filter(t => t.id !== tagId);
            toast.success('Tag deleted successfully');
            return true;
        }
    } catch (error) {
        console.error('Error deleting tag:', error);
        toast.error('Failed to delete tag');
    }
    return false;
}

// Add tag to link
async function addTagToLink(urlId, tagId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${urlId}/tags/${tagId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            toast.success('Tag added to link');
            return true;
        }
    } catch (error) {
        console.error('Error adding tag to link:', error);
        toast.error('Failed to add tag');
    }
    return false;
}

// Remove tag from link
async function removeTagFromLink(urlId, tagId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/urls/${urlId}/tags/${tagId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            toast.success('Tag removed from link');
            return true;
        }
    } catch (error) {
        console.error('Error removing tag from link:', error);
        toast.error('Failed to remove tag');
    }
    return false;
}

// ===== TAGS MANAGER MODAL =====

// Show tags manager modal
function showTagsManager() {
    document.getElementById('tagsManagerModal').classList.add('show');
    renderTagsList();
}

// Close tags manager modal
function closeTagsManager() {
    document.getElementById('tagsManagerModal').classList.remove('show');
    document.getElementById('newTagName').value = '';
    document.getElementById('newTagColor').value = '#6366f1';
}

// Handle create tag button
async function handleCreateTag() {
    const nameInput = document.getElementById('newTagName');
    const colorInput = document.getElementById('newTagColor');

    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (!name) {
        toast.warning('Please enter a tag name');
        nameInput.focus();
        return;
    }

    const newTag = await createTag(name, color);
    if (newTag) {
        nameInput.value = '';
        colorInput.value = '#6366f1';
        renderTagsList();
        renderTagFilters(); // Update filters
    }
}

// Render tags list in manager
function renderTagsList() {
    const container = document.getElementById('tagsListContainer');
    if (!container) return;

    if (allTags.length === 0) {
        container.innerHTML = `
            <div class="tags-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <p>No tags yet. Create your first tag!</p>
            </div>
        `;
        return;
    }

    // Count links for each tag
    const tagCounts = {};
    allLinksData.forEach(link => {
        if (link.tags && Array.isArray(link.tags)) {
            link.tags.forEach(tag => {
                tagCounts[tag.id] = (tagCounts[tag.id] || 0) + 1;
            });
        }
    });

    container.innerHTML = allTags.map(tag => `
        <div class="tag-item">
            <div class="tag-item-color" style="background-color: ${tag.color}"></div>
            <div class="tag-item-name">${tag.name}</div>
            <div class="tag-item-count">${tagCounts[tag.id] || 0} links</div>
            <button class="btn-delete-tag" onclick="handleDeleteTag(${tag.id})" title="Delete tag">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
            </button>
        </div>
    `).join('');
}

// Handle delete tag
async function handleDeleteTag(tagId) {
    const confirmed = await confirmModal(
        'Are you sure you want to delete this tag? It will be removed from all links.',
        'Delete Tag'
    );
    if (!confirmed) return;

    const success = await deleteTag(tagId);
    if (success) {
        renderTagsList();
        renderTagFilters();
        // Reload links to update the display
        await showLinks();
    }
}

async function showLinks() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = `
        <div class="links-section">
            <div class="section-header">
                <h2 class="section-title" data-lang="dashboard.all_links">All Links</h2>
                <div class="header-actions">
                    <button class="btn-secondary" id="starredFilterBtn" onclick="toggleStarredFilter()" title="Show only favorites">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        Favorites
                    </button>
                    <button class="btn-secondary" id="archivedFilterBtn" onclick="toggleArchivedFilter()" title="Show archived links">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="21 8 21 21 3 21 3 8"/>
                            <rect x="1" y="3" width="22" height="5"/>
                            <line x1="10" y1="12" x2="14" y2="12"/>
                        </svg>
                        Show Archived
                    </button>
                    <button class="btn-secondary" onclick="showTagsManager()" title="Manage Tags">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                            <line x1="7" y1="7" x2="7.01" y2="7"/>
                        </svg>
                        Manage Tags
                    </button>
                    <div class="export-dropdown">
                        <button class="btn-secondary" id="exportBtn" onclick="toggleExportMenu()" title="Export links">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Export
                        </button>
                        <div class="export-menu" id="exportMenu">
                            <button onclick="exportToCSV()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="12" y1="18" x2="12" y2="12"/>
                                    <line x1="9" y1="15" x2="15" y2="15"/>
                                </svg>
                                Export as CSV
                            </button>
                            <button onclick="exportToJSON()">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <path d="M10 12h4"/>
                                    <path d="M10 16h4"/>
                                </svg>
                                Export as JSON
                            </button>
                        </div>
                    </div>
                    <button class="btn-create" onclick="showCreateModal()" data-lang="dashboard.create_link">+ Create Link</button>
                </div>
            </div>

            <div class="links-controls">
                <div class="search-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input type="text" id="linkSearch" placeholder="Search links..." oninput="filterLinks()">
                </div>
                <div class="tags-filter" id="tagsFilter"></div>
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

            <!-- Bulk Actions Bar -->
            <div class="bulk-actions-bar" id="bulkActionsBar" style="display: none;">
                <div class="bulk-actions-info">
                    <span><strong id="selectedCount">0</strong> selected</span>
                </div>
                <div class="bulk-actions-buttons">
                    <button class="btn-bulk-action" onclick="clearSelection()">
                        Clear Selection
                    </button>
                    <button class="btn-bulk-action btn-bulk-delete" onclick="deleteSelectedLinks()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete Selected
                    </button>
                </div>
            </div>

            <div id="allLinksTable">
                ${SkeletonLoader.linksTable(5)}
            </div>
        </div>
    `;

    // Load tags and links
    await loadTags();
    allLinksData = await loadLinks();
    filteredLinksData = [...allLinksData];

    // Clear selection when reloading
    selectedLinks.clear();

    // Render tag filters
    renderTagFilters();

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

// Render tag filters
function renderTagFilters() {
    const container = document.getElementById('tagsFilter');
    if (!container) return;

    if (allTags.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="tag-filters">
            <button class="tag-filter ${!selectedTagFilter ? 'active' : ''}"
                    onclick="filterByTag(null)">
                All
            </button>
            ${allTags.map(tag => `
                <button class="tag-filter ${selectedTagFilter === tag.id ? 'active' : ''}"
                        onclick="filterByTag(${tag.id})"
                        style="--tag-color: ${tag.color}">
                    ${tag.name}
                </button>
            `).join('')}
        </div>
    `;
}

// Filter by tag
function filterByTag(tagId) {
    selectedTagFilter = tagId;
    renderTagFilters();
    filterLinks();
}

function filterLinks() {
    const query = document.getElementById('linkSearch')?.value.toLowerCase() || '';

    filteredLinksData = allLinksData.filter(link => {
        // Text search filter
        const matchesSearch = !query ||
            link.short_code.toLowerCase().includes(query) ||
            link.original_url.toLowerCase().includes(query);

        // Tag filter
        const matchesTag = !selectedTagFilter ||
            (link.tags && Array.isArray(link.tags) &&
             link.tags.some(t => t.id === selectedTagFilter));

        // Starred filter
        const matchesStarred = !showOnlyStarred || link.is_starred;

        // Archived filter - only show archived if explicitly requested
        const matchesArchived = showArchivedLinks ? link.is_archived : !link.is_archived;

        return matchesSearch && matchesTag && matchesStarred && matchesArchived;
    });

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
    const showBulkActions = containerId === 'allLinksTable'; // Only show in main links table

    container.innerHTML = `
        <table class="links-table">
            <thead>
                <tr>
                    ${showBulkActions ? `
                        <th style="width: 40px;">
                            <input type="checkbox"
                                   id="selectAllCheckbox"
                                   class="link-checkbox"
                                   onchange="toggleSelectAll()"
                                   title="Select all">
                        </th>
                    ` : ''}
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
                        ${showBulkActions ? `
                            <td>
                                <input type="checkbox"
                                       id="checkbox-${link.id}"
                                       class="link-checkbox"
                                       onchange="toggleSelectLink(${link.id})"
                                       ${selectedLinks.has(link.id) ? 'checked' : ''}>
                            </td>
                        ` : ''}
                        <td>
                            <a href="${window.location.origin}/${link.short_code}" target="_blank" class="link-short">
                                ${window.location.host}/${link.short_code}
                            </a>
                        </td>
                        <td>
                            <div class="link-original" title="${link.original_url}">
                                ${link.original_url}
                            </div>
                            ${link.tags && link.tags.length > 0 ? `
                                <div class="link-tags">
                                    ${link.tags.map(tag => `
                                        <span class="tag-badge" style="--tag-color: ${tag.color}">
                                            ${tag.name}
                                            <span class="tag-badge-remove" onclick="handleRemoveTagFromLink(${link.id}, ${tag.id}, event)">×</span>
                                        </span>
                                    `).join('')}
                                    <button class="tag-badge" style="--tag-color: #cbd5e0" onclick="showAddTagMenu(${link.id}, event)" title="Add tag">
                                        +
                                    </button>
                                </div>
                            ` : `
                                <div class="link-tags">
                                    <button class="tag-badge" style="--tag-color: #cbd5e0" onclick="showAddTagMenu(${link.id}, event)" title="Add tag">
                                        + Add tag
                                    </button>
                                </div>
                            `}
                            <div class="link-description" id="desc-${link.id}" data-description="${link.description || ''}">
                                ${link.description ? `
                                    <div class="description-display" onclick="showEditDescription(${link.id})">
                                        <span class="description-text">${link.description}</span>
                                        <svg class="description-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                    </div>
                                ` : `
                                    <div class="description-display description-empty" onclick="showEditDescription(${link.id})">
                                        <span class="description-text">Add description...</span>
                                        <svg class="description-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M12 5v14M5 12h14"/>
                                        </svg>
                                    </div>
                                `}
                            </div>
                            ${(() => {
                                const status = getExpirationStatus(link.expires_at);
                                return status ? `
                                    <div class="expiration-badge ${status.class}" style="margin-top: 8px;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${status.color}" stroke-width="2" style="margin-right: 4px;">
                                            <circle cx="12" cy="12" r="10"/>
                                            <polyline points="12 6 12 12 16 14"/>
                                        </svg>
                                        <span style="color: ${status.color}; font-size: 12px; font-weight: 500;">${status.text}</span>
                                    </div>
                                ` : '';
                            })()}
                            ${link.has_password ? `
                                <div class="password-badge" style="margin-top: 8px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" style="margin-right: 4px;">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                    <span style="color: #8b5cf6; font-size: 12px; font-weight: 500;">Password Protected</span>
                                </div>
                            ` : ''}
                        </td>
                        <td>${link.clicks}</td>
                        <td>${new Date(link.created_at).toLocaleDateString()}</td>
                        <td>
                            <div class="link-actions">
                                <button class="btn-action btn-star ${link.is_starred ? 'starred' : ''}"
                                        onclick="toggleStarred(${link.id})"
                                        title="${link.is_starred ? 'Remove from favorites' : 'Add to favorites'}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${link.is_starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                </button>
                                <button class="btn-action" onclick="copyLink('${link.short_code}', event)" title="Copy">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                                <button class="btn-action" onclick="showQR('${link.short_code}')" title="QR Code">
                                    <span style="font-size: 12px; font-weight: 700;">QR</span>
                                </button>
                                <button class="btn-action btn-archive" onclick="toggleArchived(${link.id})" title="${link.is_archived ? 'Restore from archive' : 'Archive link'}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="21 8 21 21 3 21 3 8"/>
                                        <rect x="1" y="3" width="22" height="5"/>
                                        <line x1="10" y1="12" x2="14" y2="12"/>
                                    </svg>
                                </button>
                                <button class="btn-action btn-expiration" onclick="setLinkExpiration(${link.id})" title="Set expiration date">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                </button>
                                <button class="btn-action btn-password ${link.has_password ? 'active' : ''}" onclick="setLinkPassword(${link.id})" title="${link.has_password ? 'Update password protection' : 'Set password protection'}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="${link.has_password ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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

// ===== TAG MANAGEMENT IN TABLE =====

// Remove tag from link in table
async function handleRemoveTagFromLink(urlId, tagId, event) {
    event.stopPropagation();
    const success = await removeTagFromLink(urlId, tagId);
    if (success) {
        // Reload links to update display
        await showLinks();
    }
}

// Show add tag menu for link
async function showAddTagMenu(urlId, event) {
    event.stopPropagation();

    if (allTags.length === 0) {
        toast.info('No tags available. Create tags first!');
        showTagsManager();
        return;
    }

    // Get current link's tags
    const link = allLinksData.find(l => l.id === urlId);
    const currentTagIds = link && link.tags ? link.tags.map(t => t.id) : [];

    // Filter available tags (not already assigned)
    const availableTags = allTags.filter(t => !currentTagIds.includes(t.id));

    if (availableTags.length === 0) {
        toast.info('All tags are already assigned to this link');
        return;
    }

    // Create simple selection prompt (можно улучшить до dropdown)
    const tagNames = availableTags.map((t, i) => `${i + 1}. ${t.name}`).join('\n');
    const selection = prompt(`Select tag to add:\n\n${tagNames}\n\nEnter number (1-${availableTags.length}):`);

    if (selection) {
        const index = parseInt(selection) - 1;
        if (index >= 0 && index < availableTags.length) {
            const selectedTag = availableTags[index];
            const success = await addTagToLink(urlId, selectedTag.id);
            if (success) {
                await showLinks();
            }
        } else {
            toast.error('Invalid selection');
        }
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
                    ${SkeletonLoader.analyticsList(5)}
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

        if (!response.ok) {
            throw new Error(`Failed to load links: ${response.status}`);
        }

        const links = await response.json();

        const linksListDiv = document.getElementById('analyticsLinksList');

        if (!Array.isArray(links) || links.length === 0) {
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
// Current analytics state
let currentAnalyticsLink = null;
let currentAnalyticsPeriod = 'all';

async function viewLinkAnalytics(linkId, shortCode, period = 'all') {
    const detailsDiv = document.getElementById('analyticsDetails');
    const dataDiv = document.getElementById('analyticsData');

    // Store current link and period
    currentAnalyticsLink = { id: linkId, code: shortCode };
    currentAnalyticsPeriod = period;

    // Destroy existing charts
    Object.values(analyticsCharts).forEach(chart => chart?.destroy());
    analyticsCharts = {};

    detailsDiv.style.display = 'block';
    document.getElementById('analyticsLinkTitle').innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <span>Statistics for: ${shortCode}</span>
            <div class="time-filter">
                <button class="time-filter-btn ${period === 'today' ? 'active' : ''}" onclick="filterAnalyticsByTime('today')">Today</button>
                <button class="time-filter-btn ${period === 'week' ? 'active' : ''}" onclick="filterAnalyticsByTime('week')">Week</button>
                <button class="time-filter-btn ${period === 'month' ? 'active' : ''}" onclick="filterAnalyticsByTime('month')">Month</button>
                <button class="time-filter-btn ${period === 'all' ? 'active' : ''}" onclick="filterAnalyticsByTime('all')">All Time</button>
            </div>
        </div>
    `;
    dataDiv.innerHTML = `
        ${SkeletonLoader.statsCards()}
        ${SkeletonLoader.chart()}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 24px;">
            ${SkeletonLoader.chart()}
            ${SkeletonLoader.chart()}
        </div>
    `;

    try {
        const response = await fetch(`/api/urls/${linkId}/stats?period=${period}`, {
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

                ${stats.referrers && stats.referrers.length > 0 ? `
                <div class="chart-card">
                    <h4>🔗 Traffic Sources</h4>
                    <canvas id="referrersChart"></canvas>
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

// Filter analytics by time period
function filterAnalyticsByTime(period) {
    if (!currentAnalyticsLink) return;
    viewLinkAnalytics(currentAnalyticsLink.id, currentAnalyticsLink.code, period);
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

    // Referrers (Traffic Sources) doughnut chart
    if (stats.referrers && stats.referrers.length > 0) {
        const ctx = document.getElementById('referrersChart');
        if (ctx) {
            analyticsCharts.referrers = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: stats.referrers.map(r => r.source || 'Unknown'),
                    datasets: [{
                        data: stats.referrers.map(r => parseInt(r.count)),
                        backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#06b6d4', '#84cc16']
                    }]
                },
                options: chartDefaults
            });
        }
    }
}

// ===== MOBILE SIDEBAR =====
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
}

// Show mobile menu button on small screens
function updateMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (window.innerWidth <= 480) {
        menuBtn.style.display = 'flex';
    } else {
        menuBtn.style.display = 'none';
        closeMobileSidebar();
    }
}

// ===== API KEYS MANAGEMENT =====

async function showApiKeys() {
    const content = document.getElementById('dashboardContent');

    content.innerHTML = `
        <div class="api-keys-section">
            <div class="section-header">
                <h2 class="section-title">API Keys</h2>
                <p>Manage your API keys for programmatic access</p>
                <button class="btn-primary" onclick="showCreateApiKeyModal()" style="margin-top: 20px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Create New API Key
                </button>
            </div>

            <div class="api-keys-list" id="apiKeysList">
                <p style="text-align: center; color: var(--text-gray); padding: 40px;">Loading...</p>
            </div>

            <div class="api-docs" style="margin-top: 40px; padding: 24px; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color);">
                <h3 style="margin-bottom: 16px;">API Documentation</h3>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h4 style="margin-bottom: 8px;">Create Short URL</h4>
                    <code style="display: block; margin: 8px 0; padding: 12px; background: #fff; border-radius: 4px;">
POST /api/shorten<br>
Headers: { "X-API-Key": "your_api_key" }<br>
Body: { "url": "https://example.com", "customCode": "optional", "password": "optional", "expiresInDays": 30 }
                    </code>
                </div>
                <p style="color: var(--text-gray); font-size: 14px;">
                    Use the <code>X-API-Key</code> header to authenticate your requests.
                    API keys allow you to create short URLs programmatically.
                </p>
            </div>
        </div>
    `;

    await loadApiKeys();
}

async function loadApiKeys() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/api-keys', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load API keys');
        }

        const apiKeys = await response.json();
        renderApiKeys(apiKeys);
    } catch (error) {
        console.error('Error loading API keys:', error);
        document.getElementById('apiKeysList').innerHTML = `
            <p style="text-align: center; color: var(--text-danger); padding: 40px;">
                Failed to load API keys
            </p>
        `;
    }
}

function renderApiKeys(apiKeys) {
    const container = document.getElementById('apiKeysList');

    if (apiKeys.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px; opacity: 0.3;">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
                <h3 style="color: var(--text-dark); margin-bottom: 8px;">No API Keys Yet</h3>
                <p style="color: var(--text-gray); margin-bottom: 24px;">Create your first API key to start using the API</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="api-keys-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Key Prefix</th>
                    <th>Created</th>
                    <th>Last Used</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${apiKeys.map(key => {
                    const createdDate = new Date(key.created_at).toLocaleDateString();
                    const lastUsed = key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never';
                    const expires = key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never';
                    const isExpired = key.expires_at && new Date(key.expires_at) < new Date();
                    const statusClass = !key.is_active || isExpired ? 'inactive' : 'active';
                    const statusText = !key.is_active ? 'Revoked' : isExpired ? 'Expired' : 'Active';

                    return `
                        <tr>
                            <td><strong>${key.key_name}</strong></td>
                            <td><code>${key.key_prefix}...</code></td>
                            <td>${createdDate}</td>
                            <td>${lastUsed}</td>
                            <td>${expires}</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td>
                                ${key.is_active && !isExpired ? `
                                    <button class="btn-danger btn-sm" onclick="revokeApiKey(${key.id}, '${key.key_name}')">
                                        Revoke
                                    </button>
                                ` : `<span style="color: var(--text-gray);">—</span>`}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function showCreateApiKeyModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <h3>Create New API Key</h3>
            <div class="form-group" style="margin: 20px 0;">
                <label for="apiKeyName">API Key Name:</label>
                <input type="text" id="apiKeyName" class="form-control" placeholder="e.g., Production Server" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 16px;">

                <label for="apiKeyExpires">Expires In (days):</label>
                <input type="number" id="apiKeyExpires" class="form-control" placeholder="Leave empty for no expiration" min="1" max="365" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px;">
                <small style="color: var(--text-gray); display: block; margin-top: 5px;">Optional. Leave empty for API key that never expires.</small>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" onclick="createApiKey()">Create API Key</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    document.getElementById('apiKeyName').focus();
}

async function createApiKey() {
    try {
        const name = document.getElementById('apiKeyName').value.trim();
        const expiresInDays = document.getElementById('apiKeyExpires').value;

        if (!name) {
            toast.error('Please enter an API key name');
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch('/api/api-keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                expiresInDays: expiresInDays ? parseInt(expiresInDays) : null
            })
        });

        const data = await response.json();

        if (!response.ok) {
            toast.error(data.error || 'Failed to create API key');
            return;
        }

        // Close the create modal
        document.querySelector('.modal-overlay')?.remove();

        // Show the API key in a new modal (only shown once!)
        const keyModal = document.createElement('div');
        keyModal.className = 'modal-overlay';
        keyModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h3 style="color: #10b981;">✓ API Key Created Successfully!</h3>
                <div style="margin: 24px 0; padding: 20px; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px;">
                    <p style="color: #92400e; font-weight: 600; margin-bottom: 12px;">⚠️ Save this API key now. You won't be able to see it again!</p>
                    <div style="background: white; padding: 16px; border-radius: 4px; font-family: monospace; word-break: break-all; font-size: 14px;">
                        ${data.apiKey}
                    </div>
                    <button class="btn-secondary" onclick="navigator.clipboard.writeText('${data.apiKey}'); toast.success('API key copied to clipboard')" style="margin-top: 12px; width: 100%;">
                        Copy to Clipboard
                    </button>
                </div>
                <div style="padding: 16px; background: var(--card-bg); border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: var(--text-gray); font-size: 14px;">
                        <strong>Name:</strong> ${data.key_name}<br>
                        <strong>Prefix:</strong> <code>${data.key_prefix}...</code><br>
                        <strong>Created:</strong> ${new Date(data.created_at).toLocaleString()}<br>
                        ${data.expires_at ? `<strong>Expires:</strong> ${new Date(data.expires_at).toLocaleString()}` : '<strong>Expires:</strong> Never'}
                    </p>
                </div>
                <button class="btn-primary" onclick="this.closest('.modal-overlay').remove(); loadApiKeys()" style="width: 100%;">
                    I've Saved My API Key
                </button>
            </div>
        `;

        document.body.appendChild(keyModal);
        toast.success('API key created successfully');
    } catch (error) {
        console.error('Error creating API key:', error);
        toast.error('Failed to create API key');
    }
}

async function revokeApiKey(keyId, keyName) {
    const confirmed = await confirmModal(
        `Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`,
        'Revoke API Key'
    );
    if (!confirmed) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/api-keys/${keyId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            toast.error(data.error || 'Failed to revoke API key');
            return;
        }

        toast.success('API key revoked successfully');
        await loadApiKeys();
    } catch (error) {
        console.error('Error revoking API key:', error);
        toast.error('Failed to revoke API key');
    }
}

// ===== WEBHOOKS MANAGEMENT =====

async function showWebhooks() {
    const content = document.getElementById('dashboardContent');

    content.innerHTML = `
        <div class="webhooks-section">
            <div class="section-header">
                <h2 class="section-title">Webhooks</h2>
                <p>Receive real-time notifications when events occur</p>
                <button class="btn-primary" onclick="showCreateWebhookModal()" style="margin-top: 20px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Create New Webhook
                </button>
            </div>

            <div class="webhooks-list" id="webhooksList">
                <p style="text-align: center; color: var(--text-gray); padding: 40px;">Loading...</p>
            </div>

            <div class="webhook-docs" style="margin-top: 40px; padding: 24px; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color);">
                <h3 style="margin-bottom: 16px;">Webhook Events</h3>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h4 style="margin-bottom: 8px;">Available Events:</h4>
                    <ul style="margin: 8px 0; padding-left: 20px; color: var(--text-dark);">
                        <li><code>link.clicked</code> - Triggered when someone clicks your short link</li>
                        <li><code>link.created</code> - Triggered when you create a new short link</li>
                    </ul>
                </div>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
                    <h4 style="margin-bottom: 8px;">Payload Example:</h4>
                    <pre style="background: #fff; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 13px;"><code>{
  "event": "link.clicked",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "short_code": "abc123",
    "original_url": "https://example.com",
    "clicks": 42,
    "device_type": "Mobile",
    "os": "iOS",
    "browser": "Safari"
  }
}</code></pre>
                </div>
                <p style="color: var(--text-gray); font-size: 14px; margin-top: 16px;">
                    Webhooks include an <code>X-Webhook-Signature</code> header for security verification using HMAC SHA-256.
                </p>
            </div>
        </div>
    `;

    await loadWebhooks();
}

async function loadWebhooks() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/webhooks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load webhooks');
        }

        const webhooks = await response.json();
        renderWebhooks(webhooks);
    } catch (error) {
        console.error('Error loading webhooks:', error);
        document.getElementById('webhooksList').innerHTML = `
            <p style="text-align: center; color: var(--text-danger); padding: 40px;">
                Failed to load webhooks
            </p>
        `;
    }
}

function renderWebhooks(webhooks) {
    const container = document.getElementById('webhooksList');

    if (webhooks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px; opacity: 0.3;">
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                </svg>
                <h3 style="color: var(--text-dark); margin-bottom: 8px;">No Webhooks Yet</h3>
                <p style="color: var(--text-gray); margin-bottom: 24px;">Create your first webhook to receive real-time notifications</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="api-keys-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Endpoint URL</th>
                    <th>Events</th>
                    <th>Last Triggered</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${webhooks.map(webhook => {
                    const lastTriggered = webhook.last_triggered_at
                        ? new Date(webhook.last_triggered_at).toLocaleDateString()
                        : 'Never';
                    const statusClass = webhook.is_active ? 'active' : 'inactive';
                    const statusText = webhook.is_active ? 'Active' : 'Inactive';

                    return `
                        <tr>
                            <td><strong>${webhook.webhook_name}</strong></td>
                            <td><code style="font-size: 12px;">${webhook.endpoint_url.substring(0, 50)}${webhook.endpoint_url.length > 50 ? '...' : ''}</code></td>
                            <td>${webhook.events.join(', ')}</td>
                            <td>${lastTriggered}</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td>
                                <button class="btn-secondary btn-sm" onclick="toggleWebhook(${webhook.id})" style="margin-right: 8px;">
                                    ${webhook.is_active ? 'Disable' : 'Enable'}
                                </button>
                                <button class="btn-danger btn-sm" onclick="deleteWebhook(${webhook.id}, '${webhook.webhook_name}')">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function showCreateWebhookModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <h3>Create New Webhook</h3>
            <div class="form-group" style="margin: 20px 0;">
                <label for="webhookName">Webhook Name:</label>
                <input type="text" id="webhookName" class="form-control" placeholder="e.g., Slack Notifications" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 16px;">

                <label for="webhookUrl">Endpoint URL:</label>
                <input type="url" id="webhookUrl" class="form-control" placeholder="https://your-server.com/webhook" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 16px;">

                <label>Events to Subscribe:</label>
                <div style="margin: 10px 0;">
                    <label style="display: flex; align-items: center; margin-bottom: 8px;">
                        <input type="checkbox" value="link.clicked" checked style="margin-right: 8px;">
                        <span>link.clicked - When someone clicks your link</span>
                    </label>
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" value="link.created" style="margin-right: 8px;">
                        <span>link.created - When you create a new link</span>
                    </label>
                </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" onclick="createWebhook()">Create Webhook</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    document.getElementById('webhookName').focus();
}

async function createWebhook() {
    try {
        const name = document.getElementById('webhookName').value.trim();
        const url = document.getElementById('webhookUrl').value.trim();

        const eventCheckboxes = document.querySelectorAll('.modal-overlay input[type="checkbox"]:checked');
        const events = Array.from(eventCheckboxes).map(cb => cb.value);

        if (!name) {
            toast.error('Please enter a webhook name');
            return;
        }

        if (!url) {
            toast.error('Please enter an endpoint URL');
            return;
        }

        if (events.length === 0) {
            toast.error('Please select at least one event');
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch('/api/webhooks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, url, events })
        });

        const data = await response.json();

        if (!response.ok) {
            toast.error(data.error || 'Failed to create webhook');
            return;
        }

        // Close modal
        document.querySelector('.modal-overlay')?.remove();

        // Show secret key
        const secretModal = document.createElement('div');
        secretModal.className = 'modal-overlay';
        secretModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h3 style="color: #10b981;">✓ Webhook Created Successfully!</h3>
                <div style="margin: 24px 0; padding: 20px; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px;">
                    <p style="color: #92400e; font-weight: 600; margin-bottom: 12px;">⚠️ Save this secret key for signature verification!</p>
                    <div style="background: white; padding: 16px; border-radius: 4px; font-family: monospace; word-break: break-all; font-size: 14px;">
                        ${data.secret_key}
                    </div>
                    <button class="btn-secondary" onclick="navigator.clipboard.writeText('${data.secret_key}'); toast.success('Secret key copied to clipboard')" style="margin-top: 12px; width: 100%;">
                        Copy Secret Key
                    </button>
                </div>
                <button class="btn-primary" onclick="this.closest('.modal-overlay').remove(); loadWebhooks()" style="width: 100%;">
                    I've Saved the Secret Key
                </button>
            </div>
        `;

        document.body.appendChild(secretModal);
        toast.success('Webhook created successfully');
    } catch (error) {
        console.error('Error creating webhook:', error);
        toast.error('Failed to create webhook');
    }
}

async function toggleWebhook(webhookId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/webhooks/${webhookId}/toggle`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            toast.error(data.error || 'Failed to toggle webhook');
            return;
        }

        toast.success(data.is_active ? 'Webhook enabled' : 'Webhook disabled');
        await loadWebhooks();
    } catch (error) {
        console.error('Error toggling webhook:', error);
        toast.error('Failed to toggle webhook');
    }
}

async function deleteWebhook(webhookId, webhookName) {
    const confirmed = await confirmModal(
        `Are you sure you want to delete the webhook "${webhookName}"? This action cannot be undone.`,
        'Delete Webhook'
    );
    if (!confirmed) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/webhooks/${webhookId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
            toast.error(data.error || 'Failed to delete webhook');
            return;
        }

        toast.success('Webhook deleted successfully');
        await loadWebhooks();
    } catch (error) {
        console.error('Error deleting webhook:', error);
        toast.error('Failed to delete webhook');
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
            } else if (page === 'api-keys') {
                document.getElementById('pageTitle').textContent = 'API Keys';
                showApiKeys();
            } else if (page === 'webhooks') {
                document.getElementById('pageTitle').textContent = 'Webhooks';
                showWebhooks();
            }

            if (typeof updatePageLanguage === 'function') {
                updatePageLanguage();
            }

            // Close mobile sidebar when navigating
            closeMobileSidebar();
        });
    });

    // Initialize mobile menu
    updateMobileMenu();

    // Update mobile menu on resize
    window.addEventListener('resize', updateMobileMenu);
});

// Модалка создания ссылки
function showCreateModal() {
    document.getElementById('createLinkModal').classList.add('show');
    document.getElementById('createUrl').value = '';
    document.getElementById('customCode').value = '';
    document.getElementById('utmSource').value = '';
    document.getElementById('utmMedium').value = '';
    document.getElementById('utmCampaign').value = '';
    document.getElementById('utmTerm').value = '';
    document.getElementById('utmContent').value = '';
    document.getElementById('createError').classList.remove('show');
    document.getElementById('createSuccess').classList.remove('show');
    document.getElementById('createResult').style.display = 'none';
    document.getElementById('utmBuilder').style.display = 'none';

    const btn = document.getElementById('createLinkBtn');
    btn.style.display = 'block';

    if (typeof updatePageLanguage === 'function') {
        updatePageLanguage();
    }
}

function closeCreateModal() {
    document.getElementById('createLinkModal').classList.remove('show');
}

function toggleUTMBuilder() {
    const builder = document.getElementById('utmBuilder');
    const icon = document.getElementById('utmToggleIcon');
    const isVisible = builder.style.display !== 'none';

    builder.style.display = isVisible ? 'none' : 'block';
    icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(90deg)';
}

async function createLink() {
    let url = document.getElementById('createUrl').value.trim();
    const customCode = document.getElementById('customCode').value.trim();
    const errorEl = document.getElementById('createError');
    const successEl = document.getElementById('createSuccess');
    const resultEl = document.getElementById('createResult');
    const btn = document.getElementById('createLinkBtn');

    errorEl.classList.remove('show');
    successEl.classList.remove('show');
    resultEl.style.display = 'none';

    if (!url) {
        toast.warning('Please enter a URL');
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        toast.error('Please enter a valid URL starting with http:// or https://');
        return;
    }

    // Validate custom code
    if (customCode) {
        if (!/^[a-zA-Z0-9-_]+$/.test(customCode)) {
            toast.error('Custom code can only contain letters, numbers, hyphens and underscores');
            return;
        }
        if (customCode.length < 3) {
            toast.error('Custom code must be at least 3 characters');
            return;
        }
    }

    // Build URL with UTM parameters
    const utmSource = document.getElementById('utmSource').value.trim();
    const utmMedium = document.getElementById('utmMedium').value.trim();
    const utmCampaign = document.getElementById('utmCampaign').value.trim();
    const utmTerm = document.getElementById('utmTerm').value.trim();
    const utmContent = document.getElementById('utmContent').value.trim();

    if (utmSource || utmMedium || utmCampaign) {
        const urlObj = new URL(url);
        if (utmSource) urlObj.searchParams.set('utm_source', utmSource);
        if (utmMedium) urlObj.searchParams.set('utm_medium', utmMedium);
        if (utmCampaign) urlObj.searchParams.set('utm_campaign', utmCampaign);
        if (utmTerm) urlObj.searchParams.set('utm_term', utmTerm);
        if (utmContent) urlObj.searchParams.set('utm_content', utmContent);
        url = urlObj.toString();
    }

    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
        const token = localStorage.getItem('token');
        const payload = { url };
        if (customCode) payload.customCode = customCode;

        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(payload)
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

// ===== QR CODE CUSTOMIZATION =====

let currentQRShortCode = null;

function showQR(shortCode) {
    currentQRShortCode = shortCode;

    // Reset colors to default
    document.getElementById('qrForegroundColor').value = '#000000';
    document.getElementById('qrBackgroundColor').value = '#FFFFFF';
    document.getElementById('qrForegroundHex').value = '#000000';
    document.getElementById('qrBackgroundHex').value = '#FFFFFF';

    // Update preview
    updateQRPreview();

    // Show modal
    document.getElementById('qrModal').classList.add('show');
}

function closeQRModal() {
    document.getElementById('qrModal').classList.remove('show');
    currentQRShortCode = null;
}

function updateQRPreview() {
    if (!currentQRShortCode) return;

    const foregroundColor = document.getElementById('qrForegroundColor').value;
    const backgroundColor = document.getElementById('qrBackgroundColor').value;

    // Update hex inputs to match color pickers
    document.getElementById('qrForegroundHex').value = foregroundColor.toUpperCase();
    document.getElementById('qrBackgroundHex').value = backgroundColor.toUpperCase();

    // Build QR URL with colors
    const qrUrl = `/api/qr/${currentQRShortCode}?color=${encodeURIComponent(foregroundColor)}&bgColor=${encodeURIComponent(backgroundColor)}`;

    // Update image
    const qrImage = document.getElementById('qrImage');
    qrImage.src = qrUrl;
}

function updateQRFromHex(type) {
    const hexInput = document.getElementById(type === 'foreground' ? 'qrForegroundHex' : 'qrBackgroundHex');
    const colorPicker = document.getElementById(type === 'foreground' ? 'qrForegroundColor' : 'qrBackgroundColor');

    let hex = hexInput.value.trim();

    // Add # if missing
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }

    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        colorPicker.value = hex;
        updateQRPreview();
    }
}

function resetQRColors() {
    document.getElementById('qrForegroundColor').value = '#000000';
    document.getElementById('qrBackgroundColor').value = '#FFFFFF';
    document.getElementById('qrForegroundHex').value = '#000000';
    document.getElementById('qrBackgroundHex').value = '#FFFFFF';
    updateQRPreview();
    toast.success('Colors reset to default');
}

function downloadQR() {
    if (!currentQRShortCode) return;

    const qrImage = document.getElementById('qrImage');
    const link = document.createElement('a');
    link.href = qrImage.src;
    link.download = `qr-${currentQRShortCode}.png`;
    link.click();
    toast.success('QR Code downloaded');
}

async function deleteLink(id) {
    const confirmed = await confirmModal(
        'Are you sure you want to delete this link? This action cannot be undone.',
        'Delete Link'
    );
    if (!confirmed) return;

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