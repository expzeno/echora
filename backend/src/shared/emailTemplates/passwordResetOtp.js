import { baseLayout } from './_layout.js';

export function passwordResetOtpEmail({ otp, displayName, expiryMinutes = 5 }) {
  const body = `
    <div class="header"><h1>Password Reset</h1></div>
    <div class="body">
      <p>Hi ${displayName || 'there'},</p>
      <p>Use this code to reset your password:</p>
      <div style="text-align:center"><span class="otp-code">${otp}</span></div>
      <p>This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>`;
  return {
    subject: 'Your password reset code',
    html: baseLayout({ preview: `Your password reset code is ${otp}`, body }),
  };
}
