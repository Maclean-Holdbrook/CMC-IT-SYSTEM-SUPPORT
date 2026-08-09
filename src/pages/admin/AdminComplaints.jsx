import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/common/toastContext';
import {
  createTicket,
  getActiveWorkers,
  getAdminReports,
  getSignedReportFile,
  getSignedTicketFile,
} from '../../api/adminSupabase';
import AdminNavigation from '../../components/AdminNavigation';
import './AdminComplaints.css';

const statusClass = {
  submitted: 'badge-pending',
  under_review: 'badge-pending',
  assigned: 'badge-assigned',
  in_progress: 'badge-progress',
  resolved: 'badge-resolved',
  closed: 'badge-closed',
  rejected: 'badge-closed',
};

const label = (value) => value?.replaceAll('_', ' ') ?? '';

const AdminComplaints = () => {
  const { showSuccess, showError } = useToast();
  const [reports, setReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketData, setTicketData] = useState({ workerId: '', priority: 'MEDIUM', notes: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRows, workerRows] = await Promise.all([getAdminReports(), getActiveWorkers()]);
      setReports(reportRows);
      setWorkers(workerRows);
    } catch (error) {
      console.error(error);
      showError(error.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetails = async (report) => {
    const hydratedTickets = await Promise.all((report.tickets ?? []).map(async (ticket) => ({
      ...ticket,
      updates: await Promise.all((ticket.updates ?? []).map(async (update) => ({
        ...update,
        attachments: await Promise.all((update.attachments ?? []).map(async (attachment) => {
          try {
            return { ...attachment, signedUrl: await getSignedTicketFile(attachment.storage_path) };
          } catch {
            return attachment;
          }
        })),
      }))),
    })));
    const hydratedReport = { ...report, tickets: hydratedTickets };
    setSelectedReport(hydratedReport);
    setShowDetails(true);

    if (!report.attachments?.length) return;
    const attachments = await Promise.all(report.attachments.map(async (attachment) => {
      try {
        return { ...attachment, signedUrl: await getSignedReportFile(attachment.storage_path) };
      } catch {
        return attachment;
      }
    }));
    setSelectedReport((current) => current?.id === report.id ? { ...current, attachments } : current);
  };

  const openTicketForm = (report) => {
    setSelectedReport(report);
    setShowDetails(false);
    setShowTicketForm(true);
  };

  const submitTicket = async (event) => {
    event.preventDefault();
    setSubmittingTicket(true);
    try {
      await createTicket({
        reportId: selectedReport.id,
        workerId: ticketData.workerId,
        priority: ticketData.priority,
        instructions: ticketData.notes,
      });
      showSuccess('Work ticket created successfully.');
      setShowTicketForm(false);
      setSelectedReport(null);
      setTicketData({ workerId: '', priority: 'MEDIUM', notes: '' });
      await loadData();
    } catch (error) {
      showError(error.message || 'Failed to create ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  if (loading) return <div className="loading">Loading reports…</div>;

  return (
    <div className="admin-dashboard">
      <AdminNavigation title="Campus Reports" subtitle="Review student reports and assign maintenance work" />

      <div className="complaints-container">
        {reports.length === 0 ? (
          <div className="empty-state"><h3>No reports yet</h3><p>Student damage reports will appear here.</p></div>
        ) : (
          <div className="complaints-table">
            <table>
              <thead><tr><th>Reference</th><th>Category</th><th>Issue</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td><strong>{report.reference_number}</strong></td>
                    <td>{report.category?.name ?? 'Uncategorized'}</td>
                    <td>{report.title}</td>
                    <td><span className={`badge ${statusClass[report.status]}`}>{label(report.status)}</span></td>
                    <td>{new Date(report.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => openDetails(report)} className="action-btn view-btn">View details</button>
                        <button onClick={() => openTicketForm(report)} className="action-btn create-ticket-btn">Create ticket</button>
                        {report.tickets?.length > 0 && <span className="ticket-number">{report.tickets.length} ticket{report.tickets.length === 1 ? '' : 's'}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showTicketForm && selectedReport && (
        <div className="modal-overlay" onClick={() => setShowTicketForm(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>Create work ticket</h2>
            <p className="modal-complaint-title">{selectedReport.title}</p>
            <form onSubmit={submitTicket}>
              <div className="form-group">
                <label htmlFor="ticketWorker">Assign worker</label>
                <select id="ticketWorker" value={ticketData.workerId} onChange={(event) => setTicketData({ ...ticketData, workerId: event.target.value })}>
                  <option value="">Leave unassigned</option>
                  {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="ticketPriority">Priority</label>
                <select id="ticketPriority" value={ticketData.priority} onChange={(event) => setTicketData({ ...ticketData, priority: event.target.value })}>
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="ticketNotes">Instructions</label>
                <textarea id="ticketNotes" value={ticketData.notes} onChange={(event) => setTicketData({ ...ticketData, notes: event.target.value })} rows="4" maxLength="3000" placeholder="Add instructions for the worker…" />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowTicketForm(false)} className="cancel-btn">Cancel</button>
                <button type="submit" className="submit-btn" disabled={submittingTicket}>{submittingTicket ? 'Creating…' : 'Create ticket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetails && selectedReport && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content modal-large" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><h2>Report details</h2><button className="modal-close-btn" onClick={() => setShowDetails(false)} aria-label="Close">&times;</button></div>
            <div className="complaint-details">
              <div className="detail-section">
                <div className="detail-row">
                  <div className="detail-item"><label>Reference</label><p>{selectedReport.reference_number}</p></div>
                  <div className="detail-item"><label>Category</label><p>{selectedReport.category?.name ?? 'Uncategorized'}</p></div>
                </div>
                <div className="detail-row">
                  <div className="detail-item"><label>Issue</label><p className="complaint-title-text">{selectedReport.title}</p></div>
                  <div className="detail-item"><label>Status</label><p><span className={`badge ${statusClass[selectedReport.status]}`}>{label(selectedReport.status)}</span></p></div>
                </div>
                <div className="detail-row">
                  <div className="detail-item"><label>Location</label><p>{selectedReport.location}</p></div>
                  <div className="detail-item"><label>Building / room</label><p>{[selectedReport.building, selectedReport.room].filter(Boolean).join(' · ') || 'Not provided'}</p></div>
                </div>
                <div className="detail-row"><div className="detail-item full-width"><label>Description</label><div className="description-box">{selectedReport.description}</div></div></div>
                <div className="detail-row">
                  <div className="detail-item"><label>Reporter</label><p>{selectedReport.reporter_name || 'Anonymous'}</p></div>
                  <div className="detail-item"><label>Contact</label><p>{selectedReport.reporter_email || 'Not provided'}</p></div>
                </div>
                {selectedReport.attachments?.length > 0 && (
                  <div className="detail-row"><div className="detail-item full-width"><label>Attachments</label>
                    <div className="attachment-list">{selectedReport.attachments.map((attachment) => attachment.signedUrl
                      ? <a key={attachment.id} href={attachment.signedUrl} target="_blank" rel="noreferrer">{attachment.file_name}</a>
                      : <span key={attachment.id}>{attachment.file_name} (unavailable)</span>)}</div>
                  </div></div>
                )}
                {selectedReport.tickets?.length > 0 && <div className="detail-row"><div className="detail-item full-width"><label>Work ticket timeline</label><div className="admin-ticket-timeline">
                  {selectedReport.tickets.map((ticket) => <section key={ticket.id}>
                    <h3>{ticket.ticket_number} <span>{label(ticket.status)}</span></h3>
                    {ticket.updates?.length ? ticket.updates.map((update) => <div className="admin-update" key={update.id}>
                      <div><strong>{label(update.previous_status)} → {label(update.new_status)}</strong><time>{new Date(update.created_at).toLocaleString()}</time></div>
                      <p>{update.message}</p>
                      {update.attachments?.length > 0 && <div className="update-files">{update.attachments.map((attachment) => attachment.signedUrl
                        ? <a key={attachment.id} href={attachment.signedUrl} target="_blank" rel="noreferrer">{attachment.file_name}</a>
                        : <span key={attachment.id}>{attachment.file_name} (unavailable)</span>)}</div>}
                    </div>) : <p className="no-updates">No worker updates yet.</p>}
                  </section>)}
                </div></div></div>}
              </div>
              <div className="modal-actions"><button onClick={() => setShowDetails(false)} className="cancel-btn">Close</button><button onClick={() => openTicketForm(selectedReport)} className="submit-btn">Create ticket</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComplaints;
