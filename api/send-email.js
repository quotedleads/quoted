const nodemailer = require('nodemailer');

// Rate limiting store (in-memory, resets on cold start — good enough for free tier)
const rateLimitMap = {};

function rateLimit(ip, max = 10, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  if (!rateLimitMap[ip]) rateLimitMap[ip] = [];
  rateLimitMap[ip] = rateLimitMap[ip].filter(t => now - t < windowMs);
  if (rateLimitMap[ip].length >= max) return false;
  rateLimitMap[ip].push(now);
  return true;
}

function sanitize(str, max = 500) {
  return String(str || '').trim().slice(0, max).replace(/[<>]/g, '');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Email templates
const templates = {

  // Client receives their form code after submitting a lead request
  'form-code': ({ clientName, formCode, eventType, eventDate, location }) => ({
    subject: `Your Quoted Request — Form Code ${formCode}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#FFFDF9;border-radius:12px;overflow:hidden;border:1px solid #e8dcc8;">
        <div style="background:#1A1209;padding:28px 32px;text-align:center;">
          <h1 style="color:#C9A84C;font-size:28px;margin:0;letter-spacing:1px;">Quoted<span style="color:#fff;">.</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Photography Leads Marketplace</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1A1209;margin:0 0 8px;">Hi ${sanitize(clientName)} 👋</h2>
          <p style="color:#7A6652;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Your photography request has been submitted! Photographers in your area will review your request and reach out to you directly.
          </p>

          <div style="background:#FDF6E3;border:2px solid #C9A84C;border-radius:10px;padding:20px 24px;margin-bottom:24px;text-align:center;">
            <p style="font-size:12px;color:#7A6652;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your Form Code</p>
            <p style="font-size:32px;font-weight:700;color:#C9A84C;letter-spacing:4px;margin:0;font-family:monospace;">${sanitize(formCode)}</p>
            <p style="font-size:12px;color:#7A6652;margin:8px 0 0;">Save this — you'll need it to leave a review after your event.</p>
          </div>

          <div style="background:#FAF7F2;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <h3 style="font-size:13px;color:#7A6652;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;font-weight:600;">Request Summary</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:4px 0;color:#7A6652;width:40%;">Event Type</td><td style="color:#1A1209;font-weight:500;">${sanitize(eventType)}</td></tr>
              <tr><td style="padding:4px 0;color:#7A6652;">Event Date</td><td style="color:#1A1209;font-weight:500;">${sanitize(eventDate)}</td></tr>
              <tr><td style="padding:4px 0;color:#7A6652;">Location</td><td style="color:#1A1209;font-weight:500;">${sanitize(location)}</td></tr>
            </table>
          </div>

          <p style="color:#7A6652;font-size:13px;line-height:1.6;margin:0;">
            Questions? Reply to this email or contact us at <a href="mailto:${process.env.GMAIL_USER}" style="color:#C9A84C;">${process.env.GMAIL_USER}</a>.
          </p>
        </div>
        <div style="background:#F5F0E8;padding:16px 32px;text-align:center;font-size:12px;color:#7A6652;">
          © ${new Date().getFullYear()} Quoted · <a href="#" style="color:#C9A84C;">Privacy Policy</a>
        </div>
      </div>
    `,
  }),

  // Client receives a review request from a photographer
  'review-request': ({ clientName, photographerName, studioName, formCode, reviewUrl }) => ({
    subject: `${photographerName} would love your review — Quoted`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#FFFDF9;border-radius:12px;overflow:hidden;border:1px solid #e8dcc8;">
        <div style="background:#1A1209;padding:28px 32px;text-align:center;">
          <h1 style="color:#C9A84C;font-size:28px;margin:0;letter-spacing:1px;">Quoted<span style="color:#fff;">.</span></h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1A1209;margin:0 0 8px;">Hi ${sanitize(clientName)} 👋</h2>
          <p style="color:#7A6652;font-size:15px;line-height:1.6;margin:0 0 24px;">
            <strong style="color:#1A1209;">${sanitize(photographerName)}</strong>${studioName ? ` from <strong style="color:#1A1209;">${sanitize(studioName)}</strong>` : ''} is requesting a review for your recent event. It only takes 2 minutes and means the world to them!
          </p>

          <div style="text-align:center;margin-bottom:28px;">
            <a href="${sanitize(reviewUrl)}" style="display:inline-block;background:#C9A84C;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
              Leave a Review ★
            </a>
          </div>

          <div style="background:#FDF6E3;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
            <p style="font-size:13px;color:#7A6652;margin:0 0 4px;font-weight:600;">You'll need your form code:</p>
            <p style="font-size:22px;font-weight:700;color:#C9A84C;letter-spacing:3px;margin:0;font-family:monospace;">${sanitize(formCode)}</p>
          </div>

          <p style="color:#7A6652;font-size:13px;line-height:1.6;margin:0;">
            If you didn't use a Quoted photographer, you can ignore this email.
          </p>
        </div>
        <div style="background:#F5F0E8;padding:16px 32px;text-align:center;font-size:12px;color:#7A6652;">
          © ${new Date().getFullYear()} Quoted · This email was sent on behalf of ${sanitize(photographerName)}
        </div>
      </div>
    `,
  }),

  // Photographer receives a password reset link
  'password-reset': ({ name, resetToken, resetUrl }) => ({
    subject: 'Reset your Quoted password',
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#FFFDF9;border-radius:12px;overflow:hidden;border:1px solid #e8dcc8;">
        <div style="background:#1A1209;padding:28px 32px;text-align:center;">
          <h1 style="color:#C9A84C;font-size:28px;margin:0;letter-spacing:1px;">Quoted<span style="color:#fff;">.</span></h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1A1209;margin:0 0 8px;">Password Reset Request</h2>
          <p style="color:#7A6652;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Hi ${sanitize(name)}, we received a request to reset your password. Click the button below — this link expires in <strong>1 hour</strong>.
          </p>

          <div style="text-align:center;margin-bottom:28px;">
            <a href="${sanitize(resetUrl)}" style="display:inline-block;background:#C9A84C;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
              Reset My Password →
            </a>
          </div>

          <div style="background:#FAF7F2;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
            <p style="font-size:12px;color:#7A6652;margin:0 0 4px;">Or paste this link in your browser:</p>
            <p style="font-size:12px;color:#C9A84C;word-break:break-all;margin:0;">${sanitize(resetUrl)}</p>
          </div>

          <p style="color:#7A6652;font-size:13px;line-height:1.6;margin:0;">
            If you didn't request a password reset, you can safely ignore this email. Your password won't change.
          </p>
        </div>
        <div style="background:#F5F0E8;padding:16px 32px;text-align:center;font-size:12px;color:#7A6652;">
          © ${new Date().getFullYear()} Quoted · For security, this link expires in 1 hour.
        </div>
      </div>
    `,
  }),

  // Photographer notification: new lead in their area
  'new-lead': ({ photographerName, eventType, location, eventDate, leadCost }) => ({
    subject: `New ${eventType} lead available — ${location}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#FFFDF9;border-radius:12px;overflow:hidden;border:1px solid #e8dcc8;">
        <div style="background:#1A1209;padding:28px 32px;text-align:center;">
          <h1 style="color:#C9A84C;font-size:28px;margin:0;letter-spacing:1px;">Quoted<span style="color:#fff;">.</span></h1>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1A1209;margin:0 0 8px;">New Lead Available 📸</h2>
          <p style="color:#7A6652;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Hi ${sanitize(photographerName)}, a new lead matching your area just came in!
          </p>

          <div style="background:#FDF6E3;border:1.5px solid #C9A84C;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:5px 0;color:#7A6652;width:40%;">Event Type</td><td style="color:#1A1209;font-weight:600;">${sanitize(eventType)}</td></tr>
              <tr><td style="padding:5px 0;color:#7A6652;">Location</td><td style="color:#1A1209;font-weight:600;">${sanitize(location)}</td></tr>
              <tr><td style="padding:5px 0;color:#7A6652;">Event Date</td><td style="color:#1A1209;font-weight:600;">${sanitize(eventDate)}</td></tr>
              <tr><td style="padding:5px 0;color:#7A6652;">Lead Cost</td><td style="color:#C9A84C;font-weight:700;font-size:16px;">${sanitize(String(leadCost))} pts</td></tr>
            </table>
          </div>

          <div style="text-align:center;margin-bottom:24px;">
            <a href="${process.env.SITE_URL || 'https://quoted.vercel.app'}/pro-login" style="display:inline-block;background:#C9A84C;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
              View Lead →
            </a>
          </div>

          <p style="color:#7A6652;font-size:12px;">Leads are first-come, first-served and limited to ${leadCost === 15 ? '5' : '5'} photographers per request.</p>
        </div>
        <div style="background:#F5F0E8;padding:16px 32px;text-align:center;font-size:12px;color:#7A6652;">
          © ${new Date().getFullYear()} Quoted · <a href="#" style="color:#C9A84C;">Unsubscribe</a>
        </div>
      </div>
    `,
  }),
};

module.exports = async function handler(req, res) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!rateLimit(ip, 20, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  // Validate origin
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    process.env.SITE_URL,
    'http://localhost:3000',
    'https://localhost:3000',
  ].filter(Boolean);
  // Be permissive for same vercel deployment
  if (origin && !allowedOrigins.some(o => origin.startsWith(o)) && !origin.includes('vercel.app')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { type, to, data } = req.body || {};

  // Validate
  if (!type || !to || !data) {
    return res.status(400).json({ error: 'Missing required fields: type, to, data' });
  }
  if (!templates[type]) {
    return res.status(400).json({ error: 'Unknown email type' });
  }
  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const { subject, html } = templates[type](data);

    await transporter.sendMail({
      from: `"Quoted" <${process.env.GMAIL_USER}>`,
      to: sanitize(to, 200),
      subject,
      html,
      // Plain text fallback
      text: html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Quoted Email Error]', err.message);
    // Don't leak error details to client
    return res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
};
