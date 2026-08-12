import { getSupabase } from '../lib/supabase';

async function countRows(table, configure = (query) => query) {
  const query = configure(getSupabase().from(table).select('*', { count: 'exact', head: true }));
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getAdminDashboardStats() {
  const [total, pending, inProgress, resolved, workers, activeWorkers] = await Promise.all([
    countRows('reports'),
    countRows('reports', (query) => query.in('status', ['submitted', 'under_review'])),
    countRows('reports', (query) => query.in('status', ['assigned', 'in_progress'])),
    countRows('reports', (query) => query.in('status', ['resolved', 'closed'])),
    countRows('profiles', (query) => query.eq('role', 'worker')),
    countRows('profiles', (query) => query.eq('role', 'worker').eq('active', true)),
  ]);

  const { data: categoryRows, error: categoryError } = await getSupabase()
    .from('reports')
    .select('category:categories(name)');
  if (categoryError) throw categoryError;

  const categoryCounts = new Map();
  for (const row of categoryRows ?? []) {
    const name = row.category?.name ?? 'Uncategorized';
    categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }

  return {
    reports: { total, pending, inProgress, resolved },
    workers: { total: workers, active: activeWorkers },
    byCategory: Array.from(categoryCounts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getAdminReports() {
  const { data, error } = await getSupabase()
    .from('reports')
    .select(`
      id, reference_number, title, description, location, building, room,
      reporter_name, reporter_email, status, priority, created_at, updated_at,
      category:categories(name),
      tickets(
        id, ticket_number, status, assigned_worker_id, created_at,
        updates:ticket_updates(
          id, previous_status, new_status, message, created_at,
          attachments:ticket_attachments(id, file_name, mime_type, storage_path)
        )
      ),
      attachments:report_attachments(id, file_name, mime_type, storage_path)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getActiveWorkers() {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, full_name, department_id')
    .eq('role', 'worker')
    .eq('active', true)
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function getAllWorkers() {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, full_name, role, active, department_id, department:departments(name), tickets:tickets!tickets_assigned_worker_id_fkey(id)')
    .eq('role', 'worker')
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}

export async function inviteWorker({ email, fullName, departmentId }) {
  const { data, error } = await getSupabase().functions.invoke('manage-worker', {
    body: { action: 'invite', email, fullName, departmentId },
  });
  if (error) {
    if (error.context instanceof Response) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.message || error.message);
    }
    throw error;
  }
  return data;
}

export async function setWorkerActive(workerId, active) {
  const { data, error } = await getSupabase().functions.invoke('manage-worker', {
    body: { action: 'set-active', workerId, active },
  });
  if (error) throw error;
  return data;
}

export async function getDepartments() {
  const { data, error } = await getSupabase()
    .from('departments')
    .select('id, name')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createTicket({ reportId, workerId, priority, instructions }) {
  const { data, error } = await getSupabase().rpc('create_ticket_for_report', {
    p_report_id: reportId,
    p_worker_id: workerId || null,
    p_priority: priority.toLowerCase(),
    p_instructions: instructions || null,
  });
  if (error) throw error;
  return data;
}

export async function getSignedReportFile(storagePath) {
  const { data, error } = await getSupabase().storage
    .from('report-attachments')
    .createSignedUrl(storagePath, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function getSignedTicketFile(storagePath) {
  const { data, error } = await getSupabase().storage
    .from('ticket-attachments')
    .createSignedUrl(storagePath, 300);
  if (error) throw error;
  return data.signedUrl;
}
