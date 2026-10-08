// Netlify function: POST /api/lead (redirected here by netlify.toml)
// Sends the lead a confirmation email and sends RetireFlow a new-lead notification via Resend.
//
// Environment variables (set in Netlify > Site configuration > Environment variables):
//   RESEND_API_KEY   required  Resend API key
//   FROM_EMAIL       required  Sender on a domain verified in Resend, e.g. "RetireFlow <info@retireflow.com>"
//   NOTIFY_EMAIL     required  Where new-lead notifications go (comma-separate for several)
//   REPLY_TO_EMAIL   optional  Where lead replies go (defaults to the first NOTIFY_EMAIL)
//   SITE_URL         optional  Public site URL, used to show the logo in emails, e.g. "https://retireflow.com"
//   CALLBACK_PHONE   optional  Phone number agents call from, shown in the confirmation email
//   TIMEZONE         optional  Time zone for the submitted time in notifications (default America/New_York)
//   SHEETS_WEBHOOK_URL optional Google Apps Script web app URL that appends leads to the Google Sheet
//   SHEETS_SECRET    optional  Shared secret; must match SHEETS_SECRET in the Apps Script's Script Properties

const RESEND_URL = 'https://api.resend.com/emails';

const PRIORITIES = [
  'Protecting my family',
  'Building cash value',
  'Supplementing retirement income',
  'Leaving a legacy',
  'Just exploring',
];

const TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max || 200);
}

function validate(body) {
  const lead = {
    first_name: clean(body.first_name, 60),
    last_name: clean(body.last_name, 60),
    email: clean(body.email, 254).toLowerCase(),
    phone: clean(body.phone, 30),
    state: clean(body.state, 40),
    priority: clean(body.priority, 60),
    consent: body.consent === true || body.consent === 'on' || body.consent === 'true',
    page: clean(body.page, 500),
    submitted_at: new Date().toISOString(),
    tracking: {},
  };
  TRACKING_KEYS.forEach(function (k) {
    if (body[k]) lead.tracking[k] = clean(body[k], 300);
  });

  const errors = [];
  if (!lead.first_name) errors.push('first_name');
  if (!lead.last_name) errors.push('last_name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.push('email');
  if (lead.phone.replace(/\D/g, '').length < 10) errors.push('phone');
  if (!lead.state) errors.push('state');
  if (PRIORITIES.indexOf(lead.priority) === -1) errors.push('priority');
  if (!lead.consent) errors.push('consent');
  return { lead: lead, errors: errors };
}

async function sendEmail(apiKey, payload) {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(function () { return ''; });
    throw new Error('Resend ' + res.status + ': ' + text);
  }
  return res.json();
}

async function saveToSheet(env, lead) {
  const payload = Object.assign({
    secret: env.SHEETS_SECRET,
    submitted_at: lead.submitted_at,
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone,
    state: lead.state,
    priority: lead.priority,
    consent: lead.consent,
    page: lead.page,
  }, lead.tracking);
  // Apps Script answers with a redirect to the result; fetch follows it.
  const res = await fetch(env.SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text().catch(function () { return ''; });
  let out = null;
  try { out = JSON.parse(text); } catch (e) { /* not JSON */ }
  if (!res.ok || !out || !out.ok) {
    throw new Error('Sheets ' + res.status + ': ' + (out && out.error ? out.error : text.slice(0, 200)));
  }
  return out;
}

function emailShell(inner, siteUrl) {
  const logo = siteUrl
    ? '<img src="' + esc(siteUrl.replace(/\/$/, '')) + '/assets/retireflow-logo.png" width="150" alt="RetireFlow Retirement Planning" style="display:block;width:150px;height:auto;border:0;">'
    : '<span style="font-size:24px;font-weight:800;color:#041C3B;">RetireFlow</span>';
  return '<!doctype html><html><body style="margin:0;padding:0;background:#F4F8FA;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F8FA;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1B2A3D;">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border-top:5px solid #087B82;">' +
    '<tr><td style="padding:28px 32px 8px;">' + logo + '</td></tr>' +
    '<tr><td style="padding:8px 32px 32px;font-size:16px;line-height:1.6;">' + inner + '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function confirmationEmail(lead, env) {
  const phoneLine = env.CALLBACK_PHONE
    ? ' Keep an eye out for a call or text from <strong>' + esc(env.CALLBACK_PHONE) + '</strong>.'
    : '';
  const phoneText = env.CALLBACK_PHONE ? ' Keep an eye out for a call or text from ' + env.CALLBACK_PHONE + '.' : '';

  const html = emailShell(
    '<h1 style="font-size:22px;color:#041C3B;margin:0 0 16px;">Thanks, ' + esc(lead.first_name) + '. You\'re all set.</h1>' +
    '<p style="margin:0 0 16px;">We received your request for information about Indexed Universal Life (IUL) insurance. A licensed professional from RetireFlow will reach out within one business day by phone, text, or email to schedule your free educational session.' + phoneLine + '</p>' +
    '<p style="margin:0 0 8px;font-weight:bold;color:#041C3B;">What to expect</p>' +
    '<ul style="margin:0 0 16px;padding-left:20px;">' +
    '<li style="margin-bottom:6px;">A short call to learn about your goals.</li>' +
    '<li style="margin-bottom:6px;">A plain-English walkthrough of how IULs work, including the trade-offs.</li>' +
    '<li style="margin-bottom:6px;">An honest take on whether an IUL fits your plans.</li>' +
    '</ul>' +
    '<p style="margin:0 0 16px;padding:14px 16px;background:#E6F3F3;border-radius:8px;color:#041C3B;">This is not a sales call. The session is strictly informational, and you are under no obligation to buy anything.</p>' +
    '<p style="margin:0 0 24px;">Have a question before then? Just reply to this email.</p>' +
    '<p style="margin:0;">The RetireFlow Team</p>' +
    '<hr style="border:0;border-top:1px solid #DDE4EC;margin:28px 0 16px;">' +
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#56657A;">You\'re receiving this email because you requested information on our website. Indexed Universal Life insurance is a life insurance product, not an investment. Policy guarantees are subject to the claims-paying ability of the issuing insurance company. Product features and availability vary by state and carrier.</p>',
    env.SITE_URL
  );

  const text =
    'Thanks, ' + lead.first_name + '. You\'re all set.\n\n' +
    'We received your request for information about Indexed Universal Life (IUL) insurance. A licensed professional from RetireFlow will reach out within one business day by phone, text, or email to schedule your free educational session.' + phoneText + '\n\n' +
    'What to expect:\n' +
    '- A short call to learn about your goals.\n' +
    '- A plain-English walkthrough of how IULs work, including the trade-offs.\n' +
    '- An honest take on whether an IUL fits your plans.\n\n' +
    'This is not a sales call. The session is strictly informational, and you are under no obligation to buy anything.\n\n' +
    'Have a question before then? Just reply to this email.\n\n' +
    'The RetireFlow Team\n\n' +
    '---\n' +
    'You\'re receiving this email because you requested information on our website. Indexed Universal Life insurance is a life insurance product, not an investment. Policy guarantees are subject to the claims-paying ability of the issuing insurance company. Product features and availability vary by state and carrier.';

  return { subject: 'Your free IUL information request is confirmed', html: html, text: text };
}

function formatTime(iso, timeZone) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: timeZone || 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch (e) {
    return iso;
  }
}

function notificationEmail(lead, env) {
  const rows = [
    ['Name', lead.first_name + ' ' + lead.last_name],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['State', lead.state],
    ['Most important', lead.priority],
    ['Consent to contact', lead.consent ? 'Yes' : 'No'],
    ['Submitted', formatTime(lead.submitted_at, env.TIMEZONE)],
    ['Page', lead.page],
  ];
  Object.keys(lead.tracking).forEach(function (k) { rows.push([k, lead.tracking[k]]); });

  const phoneDigits = lead.phone.replace(/[^\d+]/g, '');
  const html = emailShell(
    '<h1 style="font-size:22px;color:#041C3B;margin:0 0 6px;">New IUL lead</h1>' +
    '<p style="margin:0 0 20px;color:#56657A;">Reply to this email to write to the lead directly.</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;border-collapse:collapse;">' +
    rows.map(function (r) {
      return '<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #DDE4EC;color:#56657A;white-space:nowrap;vertical-align:top;">' + esc(r[0]) +
        '</td><td style="padding:8px 0;border-bottom:1px solid #DDE4EC;color:#041C3B;font-weight:bold;word-break:break-word;">' + esc(r[1]) + '</td></tr>';
    }).join('') +
    '</table>' +
    '<p style="margin:24px 0 0;">' +
    '<a href="tel:' + esc(phoneDigits) + '" style="display:inline-block;background:#087B82;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;margin-right:8px;">Call ' + esc(lead.first_name) + '</a>' +
    '<a href="mailto:' + esc(lead.email) + '" style="display:inline-block;background:#041C3B;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;">Email ' + esc(lead.first_name) + '</a>' +
    '</p>' +
    '<p style="margin:20px 0 0;font-size:13px;color:#56657A;">The lead was told a licensed professional will reach out within one business day.</p>',
    env.SITE_URL
  );

  const text = 'New IUL lead\n\n' + rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');

  return {
    subject: 'New IUL lead: ' + lead.first_name + ' ' + lead.last_name + ' (' + lead.state + ')',
    html: html,
    text: text,
  };
}

function reply(statusCode, body, headers) {
  return {
    statusCode: statusCode,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: JSON.stringify(body),
  };
}

async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return reply(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const env = process.env;
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL || !env.NOTIFY_EMAIL) {
    console.error('Missing RESEND_API_KEY, FROM_EMAIL, or NOTIFY_EMAIL');
    return reply(500, { error: 'Server not configured' });
  }

  let body = {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body;
    body = JSON.parse(raw || '{}') || {};
  } catch (e) {
    body = {};
  }

  // Honeypot: real visitors never see or fill this field. Pretend success so bots move on.
  if (body.company) return reply(200, { ok: true });

  const result = validate(body);
  if (result.errors.length) {
    return reply(400, { error: 'Invalid fields', fields: result.errors });
  }
  const lead = result.lead;

  const notifyTo = env.NOTIFY_EMAIL.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  const replyTo = env.REPLY_TO_EMAIL || notifyTo[0];

  const notice = notificationEmail(lead, env);
  const confirm = confirmationEmail(lead, env);

  const sheetsEnabled = Boolean(env.SHEETS_WEBHOOK_URL && env.SHEETS_SECRET);
  if (env.SHEETS_WEBHOOK_URL && !env.SHEETS_SECRET) console.error('SHEETS_WEBHOOK_URL is set but SHEETS_SECRET is missing; skipping Google Sheet');

  const results = await Promise.allSettled([
    sendEmail(env.RESEND_API_KEY, {
      from: env.FROM_EMAIL,
      to: notifyTo,
      reply_to: lead.email,
      subject: notice.subject,
      html: notice.html,
      text: notice.text,
      tags: [{ name: 'type', value: 'lead_notification' }],
    }),
    sendEmail(env.RESEND_API_KEY, {
      from: env.FROM_EMAIL,
      to: [lead.email],
      reply_to: replyTo,
      subject: confirm.subject,
      html: confirm.html,
      text: confirm.text,
      tags: [{ name: 'type', value: 'lead_confirmation' }],
    }),
    sheetsEnabled ? saveToSheet(env, lead) : Promise.resolve('skipped'),
  ]);

  const labels = ['Notification email', 'Confirmation email', 'Google Sheet'];
  results.forEach(function (r, i) {
    if (r.status === 'rejected') console.error(labels[i] + ' failed:', r.reason && r.reason.message);
  });

  // The lead is captured if it reached you by email or landed in the sheet. Fail only if neither happened.
  const notified = results[0].status === 'fulfilled';
  const saved = sheetsEnabled && results[2].status === 'fulfilled';
  if (!notified && !saved) {
    return reply(502, { error: 'Could not submit. Please try again.' });
  }
  return reply(200, { ok: true });
}

exports.handler = handler;
exports.validate = validate;
