const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
    if (transporter) return transporter;

    // Для разработки используем Ethereal (тестовый SMTP)
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });

    console.log('📧 Email configured with Ethereal (test account)');
    console.log('Test emails will be visible at: https://ethereal.email');

    return transporter;
}

async function sendPasswordResetEmail(email, resetToken) {
    try {
        const transporter = await getTransporter();

        const resetUrl = `${process.env.BASE_URL}/reset-password?token=${resetToken}`;

        const info = await transporter.sendMail({
            from: '"CutTo Support" <noreply@cutto.tech>',
            to: email,
            subject: 'Восстановление пароля - CutTo',
            html: `
        <h2>Восстановление пароля</h2>
        <p>Вы запросили восстановление пароля для вашего аккаунта на CutTo.</p>
        <p>Перейдите по ссылке ниже, чтобы создать новый пароль:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Сбросить пароль</a>
        <p>Ссылка действительна в течение 1 часа.</p>
        <p>Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.</p>
      `,
        });

        console.log('📧 Password reset email sent:', info.messageId);
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));

        return true;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
}

async function sendVerificationEmail(email, verificationToken) {
    try {
        const transporter = await getTransporter();

        const verifyUrl = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;

        const info = await transporter.sendMail({
            from: '"CutTo Support" <noreply@cutto.tech>',
            to: email,
            subject: 'Подтвердите ваш email - CutTo',
            html: `
        <h2>Добро пожаловать в CutTo!</h2>
        <p>Спасибо за регистрацию. Пожалуйста, подтвердите ваш email адрес.</p>
        <p>Нажмите на кнопку ниже, чтобы активировать ваш аккаунт:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Подтвердить Email</a>
        <p style="margin-top: 20px;">Или скопируйте эту ссылку в браузер:</p>
        <p style="color: #667eea; word-break: break-all;">${verifyUrl}</p>
        <p style="margin-top: 20px; color: #999; font-size: 14px;">Если вы не регистрировались на CutTo, проигнорируйте это письмо.</p>
      `,
        });

        console.log('📧 Verification email sent:', info.messageId);
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));

        return true;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
}

module.exports = { sendPasswordResetEmail, sendVerificationEmail };