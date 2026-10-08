# RetireFlow IUL Landing Page

Single-page, single-action lead capture page for the RetireFlow IUL Meta campaign. Static HTML/CSS/JS; no build step.

- `index.html`: page markup and copy (Part 3 of the IUL Meta Ads & Landing Page Copy doc)
- `styles.css`: RetireFlow brand styles (navy `#041C3B`, teal `#087B82`, Poppins)
- `script.js`: form validation, submission, UTM/fbclid capture, Meta Pixel `Lead` event
- `assets/`: logo (color + white), favicon

## Before launch

1. **Form endpoint.** Set `data-endpoint="..."` on `<form id="lead-form">` to your CRM/Zapier/GoHighLevel webhook. It receives JSON with the form fields plus UTM params, `page`, and `submitted_at`. With no endpoint set, the form shows the success state but sends nothing.
2. **Meta Pixel.** Add your Pixel base code in `<head>`. The script fires `fbq('track', 'Lead')` on a successful submit.
3. **Fill placeholders** (search for `[`): states licensed, families served, agency license #, and the callback phone number in the success message. Remove any trust-strip item if you can't make them accurate.
4. **State dropdown.** Trim it to the states you're licensed in.
5. **Links.** Point Privacy Policy, Terms, and Contact (`href="#"`) at real pages.
6. **Compliance.** Run the page through carrier/IMO review and have compliance confirm the TCPA consent wording.
