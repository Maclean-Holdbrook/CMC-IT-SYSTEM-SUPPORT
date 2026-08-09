import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  try {
    const body = await request.json();
    const reference = typeof body.reference === 'string' ? body.reference.trim().toUpperCase().slice(0, 40) : '';
    const trackingToken = typeof body.trackingToken === 'string' ? body.trackingToken.trim().slice(0, 128) : '';

    if (!/^RPT-\d{8}-[A-Z0-9]{6}$/.test(reference) || !/^[a-f0-9]{64}$/i.test(trackingToken)) {
      return json({ message: 'The report reference or tracking token is incorrect.' }, 404);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const tokenHash = await sha256(trackingToken);

    const { data: report, error } = await supabase
      .from('reports')
      .select('id, reference_number, title, location, status, priority, created_at, updated_at, resolved_at, closed_at')
      .eq('reference_number', reference)
      .eq('tracking_token_hash', tokenHash)
      .maybeSingle();

    if (error) throw error;
    if (!report) return json({ message: 'The report reference or tracking token is incorrect.' }, 404);

    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select('ticket_number, status, created_at, accepted_at, completed_at')
      .eq('report_id', report.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (ticketError) throw ticketError;

    return json({
      report: {
        reference: report.reference_number,
        title: report.title,
        location: report.location,
        status: report.status,
        priority: report.priority,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        resolvedAt: report.resolved_at,
        closedAt: report.closed_at,
      },
      tickets: (tickets ?? []).map((ticket) => ({
        number: ticket.ticket_number,
        status: ticket.status,
        createdAt: ticket.created_at,
        acceptedAt: ticket.accepted_at,
        completedAt: ticket.completed_at,
      })),
    });
  } catch (error) {
    console.error(error);
    return json({ message: 'We could not check this report right now. Please try again.' }, 500);
  }
});
