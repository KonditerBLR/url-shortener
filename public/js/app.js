// ===== THEME TOGGLE =====
window.toggleTheme = function() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

// Load saved theme on page load
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
})();

// Глобальные функции для языка (будут переопределены в lang.js)
window.switchLanguage = function(lang) {
    localStorage.setItem('lang', lang);
    location.reload();
};

window.toggleLangMenu = function() {
    const menu = document.getElementById('langMenu');
    const btn = document.querySelector('.lang-current');
    menu?.classList.toggle('show');
    btn?.classList.toggle('active');
};

// ===== STATE =====
let token = localStorage.getItem('token');
let currentUser = null;
let isLoginMode = true;

// ===== INIT =====
if (token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUser = payload;
        // Если залогинен и на landing - редирект на dashboard
        if (window.location.pathname === '/' || window.location.pathname === '/landing.html') {
            window.location.href = '/dashboard.html';
        }
    } catch (e) {
        localStorage.removeItem('token');
        token = null;
    }
}

// ===== HERO SHORTENER =====
async function heroShorten() {
    const url = document.getElementById('heroUrlInput').value;
    const resultDiv = document.getElementById('heroResult');
    const btn = event.target;

    if (!url) {
        toast.warning(t('hero.error_empty_url'));
        return;
    }

    // Показываем загрузку
    btn.disabled = true;
    btn.textContent = t('hero.loading');

    try {
        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('heroShortUrl').value = data.shortUrl;
            document.getElementById('heroQrCode').src = data.qrCode;
            resultDiv.style.display = 'block';
            document.getElementById('heroUrlInput').value = '';

            // Плавная прокрутка к результату
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            toast.error(data.error || t('hero.error'));
        }
    } catch (error) {
        toast.error(t('hero.error_connection'));
    } finally {
        btn.disabled = false;
        btn.textContent = t('hero.button');
    }
}

function copyHeroUrl() {
    const input = document.getElementById('heroShortUrl');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = t('result.copied');
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// ===== AUTH MODAL =====
function showLoginModal() {
    isLoginMode = true;
    const modal = document.getElementById('authModal');
    document.getElementById('confirmPasswordGroup').style.display = 'none';
    document.getElementById('forgotPasswordBtn').style.display = 'block';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    // Focus first input for accessibility
    setTimeout(() => document.getElementById('authEmail')?.focus(), 100);
    clearAuthMessages();
    // Update text via language system
    if (typeof updateAuthModalLanguage === 'function') {
        updateAuthModalLanguage();
    }
}

function showRegisterModal() {
    isLoginMode = false;
    const modal = document.getElementById('authModal');
    document.getElementById('confirmPasswordGroup').style.display = 'block';
    document.getElementById('forgotPasswordBtn').style.display = 'none';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    // Focus first input for accessibility
    setTimeout(() => document.getElementById('authEmail')?.focus(), 100);
    clearAuthMessages();
    // Update text via language system
    if (typeof updateAuthModalLanguage === 'function') {
        updateAuthModalLanguage();
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authPasswordConfirm').value = '';
    clearAuthMessages();
}

function clearAuthMessages() {
    document.getElementById('authError').classList.remove('show');
    document.getElementById('authSuccess').classList.remove('show');
}

// ===== AUTH SUBMIT =====
document.getElementById('switchBtn')?.addEventListener('click', function () {
    if (isLoginMode) {
        showRegisterModal();
    } else {
        showLoginModal();
    }
});

document.getElementById('authSubmitBtn')?.addEventListener('click', async function () {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const passwordConfirm = document.getElementById('authPasswordConfirm').value;
    const errorDiv = document.getElementById('authError');
    const successDiv = document.getElementById('authSuccess');

    clearAuthMessages();

    const btn = this;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = t('auth.loading');

    try {
        if (!email || !password) {
            errorDiv.textContent = t('auth.error_empty');
            errorDiv.classList.add('show');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorDiv.textContent = t('auth.error_email');
            errorDiv.classList.add('show');
            return;
        }

        if (!isLoginMode) {
            if (password.length < 8) {
                errorDiv.textContent = t('auth.error_password_short');
                errorDiv.classList.add('show');
                return;
            }

            const hasLetter = /[a-zA-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            if (!hasLetter || !hasNumber) {
                errorDiv.textContent = t('auth.error_password_format');
                errorDiv.classList.add('show');
                return;
            }

            if (password !== passwordConfirm) {
                errorDiv.textContent = t('auth.error_password_mismatch');
                errorDiv.classList.add('show');
                return;
            }
        }

        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            if (!isLoginMode && data.needsVerification) {
                successDiv.innerHTML = t('auth.success_registered');
                successDiv.classList.add('show');
                setTimeout(() => {
                    closeAuthModal();
                }, 5000);
            } else {
                localStorage.setItem('token', data.token);
                token = data.token;
                currentUser = data.user;
                window.location.href = '/dashboard.html';
            }
        } else {
            errorDiv.textContent = data.error;
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = t('auth.error_connection');
        errorDiv.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

// ===== FORGOT PASSWORD =====
document.getElementById('forgotPasswordBtn')?.addEventListener('click', function () {
    const email = document.getElementById('authEmail').value;
    const errorDiv = document.getElementById('authError');
    const successDiv = document.getElementById('authSuccess');

    clearAuthMessages();

    if (!email) {
        errorDiv.textContent = t('auth.forgot_password_prompt');
        errorDiv.classList.add('show');
        return;
    }

    fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                successDiv.textContent = data.message || t('auth.success_login');
                successDiv.classList.add('show');
            } else {
                errorDiv.textContent = data.error || t('hero.error');
                errorDiv.classList.add('show');
            }
        })
        .catch(error => {
            errorDiv.textContent = t('auth.error_connection');
            errorDiv.classList.add('show');
        });
});

// ===== KEYBOARD NAVIGATION =====
// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const authModal = document.getElementById('authModal');
        if (authModal && authModal.classList.contains('show')) {
            closeAuthModal();
        }
    }
});

// ===== ENTER KEY =====
document.getElementById('heroUrlInput')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') heroShorten();
});

document.getElementById('authPassword')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') document.getElementById('authSubmitBtn').click();
});

document.getElementById('authPasswordConfirm')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') document.getElementById('authSubmitBtn').click();
});

// ===== ANIMATED COUNTERS =====
function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    const isPercent = element.parentElement.querySelector('.stat-label').textContent.includes('работы');
    const duration = 2000;
    const start = 0;
    const increment = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            if (isPercent) {
                element.textContent = '99.9%';
            } else if (target >= 100000) {
                element.textContent = (target / 1000).toFixed(0) + 'K+';
            } else {
                element.textContent = target.toLocaleString('ru-RU') + '+';
            }
            clearInterval(timer);
        } else {
            if (isPercent) {
                element.textContent = Math.min(current, 99.9).toFixed(1) + '%';
            } else if (target >= 100000) {
                element.textContent = Math.floor(current / 1000) + 'K+';
            } else {
                element.textContent = Math.floor(current).toLocaleString('ru-RU') + '+';
            }
        }
    }, 16);
}

// Intersection Observer для запуска анимации при скролле
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
            entry.target.classList.add('animated');
            
            // Анимация цифр
            if (entry.target.classList.contains('stat-number')) {
                animateCounter(entry.target);
            }
            
            // Анимация появления элементов
            if (entry.target.classList.contains('feature-card') || 
                entry.target.classList.contains('step-card')) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            }
        }
    });
}, { threshold: 0.2 });

// Наблюдаем за элементами
document.querySelectorAll('.stat-number, .feature-card, .step-card').forEach(el => {
    observer.observe(el);
});