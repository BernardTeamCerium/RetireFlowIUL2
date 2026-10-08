# RetireFlow IUL Landing Page

Single-page, single-action lead capture page for the RetireFlow IUL Meta campaign. Static HTML/CSS/JS; no build step.

- `index.html`: page markup and copy (Part 3 of the IUL Meta Ads & Landing Page Copy doc)
- `styles.css`: RetireFlow brand styles (navy `#041C3B`, teal `#087B82`, Poppins)
- `script.js`: form validation, submission, UTM/fbclid capture, Meta Pixel `Lead` event
- `assets/`: logo (color + white), favicon
- `api/lead.js`: Vercel serverless function the form posts to. Emails the lead a confirmation, emails you a new-lead notification through [Resend](https://resend.com), and adds the lead to the Google Sheet.
- `google-apps-script/Code.gs`: script that lives in the "RetireFlow IUL Leads" Google Sheet and appends each lead as a row.

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
- If neither the notification email nor the Google Sheet row goes through, the visitor sees an error and can retry, so a lead is never silently lost. Any individual failure is logged in Vercel.
- A hidden spam-trap field quietly drops most bot submissions.

## Google Sheet setup

Leads are added to the [RetireFlow IUL Leads](https://docs.google.com/spreadsheets/d/19kzZ6hb9LSYd1-aQHBQYwCIHJ3lf05gOinqTZm-lGlM/edit) sheet.

1. Make up a long random password for the connection (for example, 30+ random letters and numbers). You'll paste it in two places.
2. Open the sheet and go to **Extensions > Apps Script**. Delete what's in `Code.gs`, paste in the contents of `google-apps-script/Code.gs`, and save.
3. In Apps Script, click **Project Settings** (gear icon) > **Script Properties** > **Add script property**: name `SHEETS_SECRET`, value = your password from step 1. Save.
4. Click **Deploy > New deployment**, choose type **Web app**, set *Execute as* **Me** and *Who has access* **Anyone**, and click Deploy. Approve the Google permissions prompt. Copy the **Web app URL**.
5. In Vercel, add `SHEETS_WEBHOOK_URL` (the Web app URL) and `SHEETS_SECRET` (the same password), then redeploy.

On the first lead, the script renames the empty `Sheet1` tab to `Leads` and adds a header row: Submitted, First Name, Last Name, Email, Phone, State, Most Important, Consent to Contact, Status, Notes, the UTM columns, FB Click ID, and Page. **Status** starts as "New" and has a dropdown (Contacted, Session Booked, Session Held, Not Interested, No Answer) for tracking follow-up.

"Anyone" access only means the URL can receive posts; the script rejects anything without the matching password, and it can't be used to read the sheet. If you change the script later, redeploy with **Deploy > Manage deployments > Edit > Version: New version** so the URL stays the same.

A lead counts as captured if either the notification email or the sheet row succeeds. The visitor only sees an error if both fail.

## Before launch

1. **Email.** Complete the Resend + Vercel setup above. The form posts to `/api/lead` (set on `<form id="lead-form" data-endpoint="/api/lead">`).
2. **Meta Pixel.** Add your Pixel base code in `<head>`. The script fires `fbq('track', 'Lead')` on a successful submit.
3. **Fill placeholders** (search for `[`): states licensed, families served, agency license #, Remove any trust-strip item if you can't make them accurate.
4. **State dropdown.** Trim it to the states you're licensed in.
5. **Links.** Point Privacy Policy, Terms, and Contact (`href="#"`) at real pages.
6. **Compliance.** Run the page through carrier/IMO review and have compliance confirm the TCPA consent wording.
