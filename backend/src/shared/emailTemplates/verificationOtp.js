import { baseLayout } from './_layout.js';

export const verificationOtp = ({ otp, expiryMinutes = 10 }) => {
  const body = `
    <div class="header"><h1>Verify Your Account</h1></div>
    <div class="body">
      <p>Use the code below to verify your account. This code expires in ${expiryMinutes} minutes.</p>
      <div style="text-align:center">
        <span class="otp-code">${otp}</span>
      </div>
      <p>If you did not request this code, please ignore this email.</p>
    </div>`;
  return {
    subject: 'Your Verification Code',
    html: baseLayout({ preview: `Your verification code is ${otp}`, body }),
  };
};
