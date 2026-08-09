import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ message: 'Authentication required' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ message: 'Authentication required' }, 401);

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, active')
      .eq('id', authData.user.id)
      .single();
    if (!profile?.active || !['admin', 'super_admin'].includes(profile.role)) {
      return json({ message: 'Administrator access required' }, 403);
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'invite') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
      const departmentId = typeof body.departmentId === 'string' && body.departmentId ? body.departmentId : null;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2) {
        return json({ message: 'A valid name and email are required.' }, 400);
      }

      const redirectTo = `${Deno.env.get('APP_URL') ?? ''}/worker/setup`;
      const { data: invitation, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: fullName, intended_role: 'worker' },
      });
      if (inviteError) throw inviteError;

      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: invitation.user.id,
        full_name: fullName,
        role: 'worker',
        department_id: departmentId,
        active: true,
      });
      if (profileError) throw profileError;

      return json({ workerId: invitation.user.id }, 201);
    }

    if (action === 'set-active') {
      const workerId = typeof body.workerId === 'string' ? body.workerId : '';
      const active = body.active === true;
      const { error } = await adminClient.from('profiles')
        .update({ active })
        .eq('id', workerId)
        .eq('role', 'worker');
      if (error) throw error;
      return json({ success: true });
    }

    return json({ message: 'Unknown action' }, 400);
  } catch (error) {
    console.error(error);
    return json({ message: error instanceof Error ? error.message : 'Worker operation failed' }, 500);
  }
});
