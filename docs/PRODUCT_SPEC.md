# CampusFix — Student Damage Reporting System

## Product goal

CampusFix gives students a fast, login-free way to report damaged campus facilities. Administrators triage reports and create work tickets, while workers receive assignments and post progress that administrators can monitor.

## Users and access

### Students

- Do not create an account or sign in.
- Submit a report with category, description, location, and optional files.
- May provide an optional email address for notifications.
- Receive a human-readable reference number and a private tracking token.
- Can track a report only with both values.

### Administrators

- Must authenticate with Supabase Auth.
- The first super-admin is provisioned during setup.
- Additional admin accounts are invitation-only; public admin registration is prohibited.
- Can triage reports, set priority, create and assign tickets, manage workers, review updates, and close reports.

### Workers

- Must authenticate with Supabase Auth.
- Accounts are created or invited by an administrator.
- Can see only tickets assigned to them.
- Can acknowledge assignments, update progress, add notes, and upload evidence.

## Core workflows

### Student report

1. Student opens `/report` without signing in.
2. Student enters category, message, and campus location.
3. Student optionally supplies contact details and up to five files.
4. The server validates the request, verifies Turnstile, rate-limits it, and stores files privately.
5. The system creates a report and returns a reference number plus tracking token.
6. Resend sends confirmation when an email address was supplied.

Report states:

`submitted -> under_review -> assigned -> in_progress -> resolved -> closed`

`rejected` is available for spam, invalid, or out-of-scope reports. A resolved or closed report may be reopened by an administrator.

### Ticket assignment

1. An administrator reviews a report.
2. The administrator creates one or more tickets for the work required.
3. Each ticket is assigned to a worker and may have a priority and due date.
4. The assigned worker is notified by email.
5. Worker updates are visible to administrators in chronological order.
6. A worker marks work completed; an administrator verifies it before resolving the report.

Ticket states:

`assigned -> accepted -> in_progress -> blocked -> completed`

Administrators may cancel or reassign tickets.

## MVP screens

### Public

- Landing page
- Student report form
- Submission success page with reference and tracking token
- Private report tracker

### Admin

- Login and password reset
- Dashboard with counts and overdue work
- Report queue with filters
- Report detail and attachments
- Ticket creation and assignment
- Worker management
- Audit history

### Worker

- Login and password reset
- Assigned ticket list
- Ticket detail
- Status update, note, and evidence upload

## Technical stack

- React 19, Vite, and React Router for the existing web client
- Supabase Postgres for application data
- Supabase Auth for admin and worker identities
- Supabase Storage for private report and ticket attachments
- Supabase Row Level Security for authorization
- Supabase Edge Functions for public report submission and privileged workflows
- Resend for transactional email
- React Hook Form and Zod for client validation (planned)
- Cloudflare Turnstile and server-side rate limiting for public-form abuse prevention
- Vercel for the web client
- Sentry for production error monitoring (planned)
- Vitest and Playwright for automated testing (planned)

## Security requirements

- Never expose the Supabase service-role key or Resend API key in browser code.
- Students cannot query or enumerate reports directly.
- Tracking requires both a reference number and a high-entropy token; only a token hash is stored.
- All storage buckets are private and files are accessed through short-lived signed URLs.
- Workers can read only their own assigned tickets and related report details.
- Workers cannot assign tickets, manage accounts, or close reports.
- Only super-admins can grant or remove administrator access.
- Every privileged mutation is written to `audit_logs`.
- File extensions, MIME types, file sizes, and file counts are checked server-side.
- The public form uses Turnstile, rate limiting, and generic error responses.

## Email events

- Student report confirmation
- New report alert for administrators
- Worker ticket assignment or reassignment
- Ticket due-date reminder
- Worker blocked-ticket alert
- Worker completion alert
- Student resolution notification
- Admin and worker account invitation

Email delivery is asynchronous and must not roll back a successful report or ticket update. Every email request uses an idempotency key and is recorded in `notifications`.

## Main data model

- `profiles`: admin and worker identity/role data
- `departments`: maintenance teams or departments
- `categories`: report classification and routing
- `reports`: student-submitted issues
- `report_attachments`: private student evidence
- `tickets`: work assigned from a report
- `ticket_updates`: immutable progress timeline
- `ticket_attachments`: private progress/completion evidence
- `notifications`: email delivery lifecycle
- `audit_logs`: privileged activity history

Reports and tickets are deliberately separate: one student report may require multiple work tickets across different departments.

## Delivery phases

### Phase 1 — foundation

- Supabase schema, enums, indexes, triggers, and RLS
- Environment configuration
- Auth session and role handling
- Private storage buckets

### Phase 2 — public reporting

- Student-first form and validation
- Secure upload and submission Edge Function
- Reference/token success screen
- Private tracking screen
- Confirmation email

### Phase 3 — admin operations

- Report queue and detail
- Ticket creation, assignment, and reassignment
- Worker invitations
- Dashboard and audit trail

### Phase 4 — worker operations

- Assigned ticket portal
- Status transitions, notes, and evidence uploads
- Admin live visibility and email notifications

### Phase 5 — production readiness

- End-to-end tests, accessibility, monitoring, backups, rate-limit tuning, and deployment documentation

## MVP acceptance criteria

- A student can submit a valid report on mobile without an account.
- A student cannot list or retrieve another student's report.
- An administrator can review a report and assign a ticket.
- A worker sees only assigned tickets and can add progress updates.
- Administrators see the complete ticket timeline.
- Attachments are not publicly accessible.
- Assignment and status emails are sent without duplicate delivery.
- Unauthorized role and direct API access are rejected by database policies.
