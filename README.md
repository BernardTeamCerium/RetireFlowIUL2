# RetireFlow IUL Landing Page

Single-page, single-action lead capture page for the RetireFlow IUL Meta campaign. Static HTML/CSS/JS; no build step.

- `index.html`: page markup and copy (Part 3 of the IUL Meta Ads & Landing Page Copy doc)
- `styles.css`: RetireFlow brand styles (navy `#041C3B`, teal `#087B82`, Poppins)
- `script.js`: form validation, submission, UTM/fbclid capture, Meta Pixel `Lead` event
- `assets/`: logo (color + white), favicon
- `api/lead.js`: Vercel serverless function the form posts to. Emails the lead a confirmation and emails you a new-lead notification through [Resend](https://resend.com).

## Email setup (Resend + Vercel)

1. **Resend:** create an account, add and verify your sending domain (Domains > Add Domain, then add the DNS records it gives you), and create an API key.
2. **Vercel:** import this repo as a new project (no build settings needed). Under Settings > Environment Variables, add:

   | Variable | Required | Example |
   |---|---|---|
   | `RESEND_API_KEY` | yes | `re_...` |
   | `FROM_EMAIL` | yes | `RetireFlow <info@yourdomain.com>` (must be on the verified domain) |
   | `NOTIFY_EMAIL` | yes | where new-lead alerts go; comma-separate for several |
   | `REPLY_TO_EMAIL` | no | where lead replies go (defaults to `NOTIFY_EMAIL`) |
   | `SITE_URL` | no | `https://yourdomain.com`, shows the logo in emails |
   | `CALLBACK_PHONE` | no | number agents call from, shown in the confirmation email |
   | `TIMEZONE` | no | time zone for submission times (default `America/New_York`) |

3. Redeploy after adding the variables, then submit a test lead with your own email.

How it behaves:
- The lead gets "Your free IUL information request is confirmed" right away. Replies go to you.
- You get "New IUL lead: Name (State)" with their details, ad tracking (UTM tags), and Call/Email buttons. Hitting reply writes to the lead.
- If the notification can't be sent, the visitor sees an error and can retry, so a lead is never silently lost. If only the confirmation fails, the lead is still accepted and the error is logged in Vercel.
- A hidden spam-trap field quietly drops most bot submissions.

## Before launch

1. **Email.** Complete the Resend + Vercel setup above. The form posts to `/api/lead` (set on `<form id="lead-form" data-endpoint="/api/lead">`).
2. **Meta Pixel.** Add your Pixel base code in `<head>`. The script fires `fbq('track', 'Lead')` on a successful submit.
3. **Fill placeholders** (search for `[`): states licensed, families served, agency license #, Remove any trust-strip item if you can't make them accurate.
4. **State dropdown.** Trim it to the states you're licensed in.
5. **Links.** Point Privacy Policy, Terms, and Contact (`href="#"`) at real pages.
6. **Compliance.** Run the page through carrier/IMO review and have compliance confirm the TCPA consent wording.
