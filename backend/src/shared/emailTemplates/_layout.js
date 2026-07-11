export function baseLayout({ preview, body }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; }
  .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
  .card { background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .header { text-align: center; margin-bottom: 24px; }
  .header h1 { font-size: 20px; color: #1f2937; margin: 0; }
  .body { color: #374151; font-size: 14px; line-height: 1.6; }
  .otp-code { display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #4F46E5; background: #EEF2FF; padding: 12px 24px; border-radius: 8px; margin: 16px 0; }
  .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af; }
  .btn { display: inline-block; padding: 12px 24px; background: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; }
</style>
</head><body>
<div style="display:none">${preview}</div>
<div class="container"><div class="card">${body}</div>
<div class="footer">This is an automated message. Please do not reply.</div>
</div></body></html>`;
}
