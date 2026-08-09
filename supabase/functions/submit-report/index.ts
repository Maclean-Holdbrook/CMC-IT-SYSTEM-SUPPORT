import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clean(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function referenceNumber() {
  const date = new Date();
  const day = date.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(6, '0').slice(-6);
  return `RPT-${day}-${suffix}`;
}

async function verifyTurnstile(token: string, ip: string | null) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) return true;
  if (!token) return false;

  const payload = new FormData();
  payload.set('secret', secret);
  payload.set('response', token);
  if (ip) payload.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: payload,
  });
  const result = await response.json();
  return result.success === true;
}

async function sendConfirmation(email: string, reference: string, token: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('REPORT_EMAIL_FROM');
  if (!resendKey || !from || !email) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `report-confirmation-${reference}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Campus report received — ${reference}`,
      html: `<p>Your campus damage report has been received.</p><p><strong>Reference:</strong> ${reference}</p><p><strong>Private tracking token:</strong> ${token}</p><p>Keep both values private. You will need them to check progress.</p>`,
    }),
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  try {
    const form = await request.formData();
    const categoryId = clean(form.get('categoryId'), 36);
    const title = clean(form.get('title'), 160);
    const description = clean(form.get('description'), 5000);
    const location = clean(form.get('location'), 300);
    const building = clean(form.get('building'), 120);
    const room = clean(form.get('room'), 80);
    const reporterName = clean(form.get('reporterName'), 120);
    const reporterEmail = clean(form.get('reporterEmail'), 254).toLowerCase();
    const turnstileToken = clean(form.get('turnstileToken'), 2048);
    const files = form.getAll('files').filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (title.length < 5 || description.length < 10 || location.length < 2) {
      return json({ message: 'Please provide a title, description, and location.' }, 400);
    }
    if (!validEmail(reporterEmail)) return json({ message: 'Enter a valid email address.' }, 400);
    if (files.length > MAX_FILES) return json({ message: `Upload no more than ${MAX_FILES} files.` }, 400);
    if (files.some((file) => file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(file.type))) {
      return json({ message: 'Files must be JPG, PNG, WebP, or PDF and no larger than 10 MB each.' }, 400);
    }

    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    if (!(await verifyTurnstile(turnstileToken, forwardedFor))) {
      return json({ message: 'Human verification failed. Please try again.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const reference = referenceNumber();
    const trackingToken = randomToken();
    const trackingTokenHash = await sha256(trackingToken);

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        reference_number: reference,
        tracking_token_hash: trackingTokenHash,
        category_id: categoryId || null,
        title,
        description,
        location,
        building: building || null,
        room: room || null,
        reporter_name: reporterName || null,
        reporter_email: reporterEmail || null,
      })
      .select('id')
      .single();

    if (reportError) throw reportError;

    for (const [index, file] of files.entries()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
      const storagePath = `${report.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('report-attachments')
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: attachmentError } = await supabase.from('report_attachments').insert({
        report_id: report.id,
        storage_path: storagePath,
        file_name: file.name.slice(0, 255) || `attachment-${index + 1}`,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (attachmentError) throw attachmentError;
    }

    if (reporterEmail) {
      sendConfirmation(reporterEmail, reference, trackingToken).catch(console.error);
    }

    return json({ reference, trackingToken }, 201);
  } catch (error) {
    console.error(error);
    return json({ message: 'We could not submit your report. Please try again.' }, 500);
  }
});
