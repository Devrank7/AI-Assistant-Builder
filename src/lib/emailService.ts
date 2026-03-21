import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;
if (!BASE_URL) {
  console.warn('[emailService] Neither NEXT_PUBLIC_BASE_URL nor NEXTAUTH_URL is set');
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@winbixai.com',
    to: email,
    subject: 'Reset your password - WinBix AI',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@winbixai.com',
    to: email,
    subject: 'Verify your email - WinBix AI',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email address.</p>`,
  });
}
