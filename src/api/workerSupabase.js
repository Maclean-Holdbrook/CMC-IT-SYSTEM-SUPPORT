import { getSupabase } from '../lib/supabase';

export async function getWorkerTickets() {
  const { data, error } = await getSupabase()
    .from('tickets')
    .select(`
      id, ticket_number, title, instructions, status, priority, due_at,
      created_at, accepted_at, completed_at,
      report:reports(id, reference_number, title, description, location, building, room, category:categories(name)),
      updates:ticket_updates(id, previous_status, new_status, message, created_at, attachments:ticket_attachments(id, file_name, mime_type, storage_path))
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateWorkerTicket(ticketId, status, message) {
  const { data, error } = await getSupabase().rpc('worker_update_ticket', {
    p_ticket_id: ticketId,
    p_status: status,
    p_message: message,
  });
  if (error) throw error;
  return data;
}

export async function uploadTicketEvidence(ticketId, updateId, files) {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Authentication required');

  const uploaded = [];
  try {
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
      const path = `${userData.user.id}/${ticketId}/${updateId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      uploaded.push(path);

      const { error: metadataError } = await supabase.from('ticket_attachments').insert({
        ticket_update_id: updateId,
        storage_path: path,
        file_name: file.name.slice(0, 255),
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (metadataError) throw metadataError;
    }
  } catch (error) {
    if (uploaded.length) await supabase.storage.from('ticket-attachments').remove(uploaded);
    throw error;
  }
}

export function summarizeWorkerTickets(tickets) {
  return {
    total: tickets.length,
    pending: tickets.filter((ticket) => ['assigned', 'accepted'].includes(ticket.status)).length,
    inProgress: tickets.filter((ticket) => ['in_progress', 'blocked'].includes(ticket.status)).length,
    completed: tickets.filter((ticket) => ticket.status === 'completed').length,
  };
}
