import { baseLayout } from './_layout.js';

export function welcomeEmail({ displayName, loginUrl }) {
  const body = `
    <div class="header"><h1>Welcome!</h1></div>
    <div class="body">
      <p>Hi ${displayName || 'there'},</p>
      <p>Your account has been created successfully.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${loginUrl || '#'}" class="btn">Sign In</a>
      </p>
    </div>`;
  return {
    subject: 'Welcome to echora',
    html: baseLayout({ preview: `Welcome to echora, ${displayName}!`, body }),
  };
}
