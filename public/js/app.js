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
        toast.error(typeof t === 'function' ? t('hero.error_empty') : 'Please enter a URL');
        return;
    }

    // Показываем загрузку
    btn.disabled = true;
    btn.textContent = 'Загрузка...';

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
            toast.error(data.error || 'Error');
        }
    } catch (error) {
        toast.error('Connection error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Сократить';
    }
}

function copyHeroUrl() {
    const input = document.getElementById('heroShortUrl');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Скопировано';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// ===== AUTH MODAL =====
function showLoginModal() {
    isLoginMode = true;
    document.getElementById('confirmPasswordGroup').style.display = 'none';
    document.getElementById('forgotPasswordBtn').style.display = 'block';
    document.getElementById('authModal').classList.add('show');
    clearAuthMessages();

    // Update translations
    if (typeof updateAuthModalLanguage === 'function') {
        updateAuthModalLanguage();
    }
}

function showRegisterModal() {
    isLoginMode = false;
    document.getElementById('confirmPasswordGroup').style.display = 'block';
    document.getElementById('forgotPasswordBtn').style.display = 'none';
    document.getElementById('authModal').classList.add('show');
    clearAuthMessages();

    // Update translations
    if (typeof updateAuthModalLanguage === 'function') {
        updateAuthModalLanguage();
    }
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('show');
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
    btn.textContent = 'Loading...';

    try {
        if (!email || !password) {
            errorDiv.textContent = typeof t === 'function' ? t('auth.error_empty') : 'Fill in all fields';
            errorDiv.classList.add('show');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorDiv.textContent = typeof t === 'function' ? t('auth.error_email') : 'Enter a valid email';
            errorDiv.classList.add('show');
            return;
        }

        if (!isLoginMode) {
            if (password.length < 8) {
                errorDiv.textContent = typeof t === 'function' ? t('auth.error_password_short') : 'Password must be at least 8 characters';
                errorDiv.classList.add('show');
                return;
            }

            const hasLetter = /[a-zA-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            if (!hasLetter || !hasNumber) {
                errorDiv.textContent = typeof t === 'function' ? t('auth.error_password_format') : 'Password must contain letters and numbers';
                errorDiv.classList.add('show');
                return;
            }

            if (password !== passwordConfirm) {
                errorDiv.textContent = typeof t === 'function' ? t('auth.error_password_mismatch') : 'Passwords don\'t match';
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
                const successMsg = typeof t === 'function' ? t('auth.success_registered') : '✅ Registration successful!<br>Check your email to verify your account.<br><small style=\'color: #999;\'>This window will close in 5 seconds</small>';
                successDiv.innerHTML = successMsg;
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
        errorDiv.textContent = 'Network error';
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
        errorDiv.textContent = 'Введите email';
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
                successDiv.textContent = 'Письмо отправлено на ваш email';
                successDiv.classList.add('show');
            } else {
                errorDiv.textContent = data.error || 'Ошибка';
                errorDiv.classList.add('show');
            }
        })
        .catch(error => {
            errorDiv.textContent = 'Ошибка соединения';
            errorDiv.classList.add('show');
        });
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