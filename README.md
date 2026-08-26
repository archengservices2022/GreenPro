# GreenOps

Responsive landscaping operations and billing app for desktop, tablet, iPhone,
and Android browsers.

## Run locally

The frontend and authenticated API now run together from one command. Before
starting, confirm that `backend/.env` points
`GOOGLE_APPLICATION_CREDENTIALS` to your Firebase service-account JSON.

```powershell
npm run dev
```

Open `http://localhost:8080`. The same server handles both the interface and
all `/api` authentication and workspace requests.

## Included

- Firebase Authentication with protected backend endpoints
- Verified Admin registration with full name, email, password, company name,
  and company address
- Owner dashboard, revenue trend, alerts, and activity history
- Schedule, customers, estimates, jobs, crew, and reports
- Estimate-to-job and job-to-invoice workflows
- Invoice line items, tax, discounts, payment dates, and payment methods
- Invoice and receipt printing
- Responsive navigation, professional icons, validation, and save feedback

## Admin registration

New Admin details are stored as a pending registration after Firebase sends the
verification email. The Admin profile and isolated workspace are created only
after Firebase reports that the email is verified. Add the frontend origin
(for example, `localhost` during development) to Firebase Authentication's
authorized domains so the verification link can return to GreenOps.

## Security

Do not commit `backend/.env` or Firebase service-account keys. The repository
contains only `.env.example`; keep actual credentials outside the project.

## Emailing invoice and estimate PDFs

Invoice and estimate emails are sent by the backend with a PDF attachment. Add
the SMTP settings below to `backend/.env`, using the same verified Admin email
as `SMTP_USER` and `SMTP_FROM`. For Gmail, create and use a Google App Password
(not the normal account password).

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=admin@yourcompany.com
SMTP_PASS=your_google_app_password
SMTP_FROM=admin@yourcompany.com
```

Restart `npm run dev` after saving these settings. The app will then send the
PDF directly to each customer from the Admin mailbox.

## Scheduled crew notifications

When a job is scheduled, GreenOps sends the assigned crew an email with a
calendar invitation. To also deliver an SMS and automated call, add these
optional Twilio values to `backend/.env`. Crew phone numbers must include the
country code (for example, `+919876543210`).

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM=your_twilio_sms_number
TWILIO_VOICE_FROM=your_twilio_voice_number
```

Without Twilio configured, the app still creates the in-app notification and
sends email whenever SMTP is configured.
