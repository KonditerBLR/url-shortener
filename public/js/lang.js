// ===== LANGUAGE SYSTEM =====
let currentLang = localStorage.getItem('lang');
let translations = {};
let availableLanguages = [];

// Загрузка списка языков
async function loadLanguagesList() {
    try {
        const response = await fetch('/js/lang/languages.json');
        const data = await response.json();
        availableLanguages = data.languages;

        // Если язык не выбран, используем default
        if (!currentLang) {
            currentLang = data.default;
        }

        // Генерируем dropdown
        generateLanguageDropdown();

        // Загружаем переводы
        await loadLanguage(currentLang);
    } catch (error) {
        console.error('Error loading languages list:', error);
    }
}

// Генерация dropdown из списка языков
function generateLanguageDropdown() {
    const menuEl = document.getElementById('langMenu');
    if (!menuEl) return;

    menuEl.innerHTML = availableLanguages.map(lang => `
        <button class="lang-option" data-lang-code="${lang.code}" onclick="switchLanguage('${lang.code}')">
            ${lang.flag} ${lang.name}
        </button>
    `).join('');
}

// Загрузка переводов
async function loadLanguage(lang) {
    try {
        const response = await fetch(`/js/lang/${lang}.json`);
        translations = await response.json();
        currentLang = lang;
        localStorage.setItem('lang', lang);
        updatePageLanguage();
    } catch (error) {
        console.error('Error loading language:', error);
    }
}

// Получение перевода
function t(path) {
    const keys = path.split('.');
    let value = translations;
    for (const key of keys) {
        value = value[key];
        if (!value) return path;
    }
    return value;
}

// Обновление текстов на странице
function updatePageLanguage() {
    // Update all elements with data-lang attribute
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        const translation = t(key);

        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.setAttribute('placeholder', translation);
        } else {
            el.textContent = translation;
        }
    });

    // Auth Modal
    updateAuthModalLanguage();

    // Update lang switcher display
    updateLangDisplay();
}

// Обновление текстов модалки авторизации
function updateAuthModalLanguage() {
    if (typeof isLoginMode === 'undefined') return;

    document.getElementById('modalTitle').textContent = isLoginMode ? t('auth.login_title') : t('auth.register_title');
    document.querySelector('[for="authEmail"]').textContent = t('auth.email_label');
    document.getElementById('authEmail').setAttribute('placeholder', t('auth.email_placeholder'));
    document.querySelector('[for="authPassword"]').textContent = t('auth.password_label');
    document.getElementById('authPassword').setAttribute('placeholder', t('auth.password_placeholder'));
    document.querySelector('[for="authPasswordConfirm"]').textContent = t('auth.password_confirm_label');
    document.getElementById('authPasswordConfirm').setAttribute('placeholder', t('auth.password_confirm_placeholder'));
    document.getElementById('authSubmitBtn').textContent = isLoginMode ? t('auth.login_button') : t('auth.register_button');
    document.getElementById('switchBtn').textContent = isLoginMode ? t('auth.switch_to_register') : t('auth.switch_to_login');
    document.getElementById('forgotPasswordBtn').textContent = t('auth.forgot_password');
}

// Update current language display
// Update current language display
function updateLangDisplay() {
    const currentLanguage = availableLanguages.find(l => l.code === currentLang);
    if (!currentLanguage) return;

    const flagEl = document.getElementById('currentLangFlag');
    const codeEl = document.getElementById('currentLangCode');

    if (flagEl) flagEl.textContent = currentLanguage.flag;
    if (codeEl) codeEl.textContent = currentLanguage.code.toUpperCase();

    // Update active state
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-lang-code') === currentLang);
    });

    // Force update after a delay to ensure DOM is ready
    setTimeout(() => {
        if (flagEl) flagEl.textContent = currentLanguage.flag;
        if (codeEl) codeEl.textContent = currentLanguage.code.toUpperCase();
    }, 100);
}

// Toggle dropdown menu
function toggleLangMenu() {
    const menu = document.getElementById('langMenu');
    const btn = document.querySelector('.lang-current');
    menu?.classList.toggle('show');
    btn?.classList.toggle('active');
}

// Переключение языка
function switchLanguage(lang) {
    if (lang === currentLang) return;
    localStorage.setItem('lang', lang);
    location.reload();
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.lang-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        document.getElementById('langMenu')?.classList.remove('show');
        document.querySelector('.lang-current')?.classList.remove('active');
    }
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadLanguagesList();
});

// Переопределяем глобальные функции
window.switchLanguage = switchLanguage;
window.toggleLangMenu = toggleLangMenu;