import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth';
import { useToast } from '../../components/common/toastContext';
import { getWorkerTickets, summarizeWorkerTickets, updateWorkerTicket, uploadTicketEvidence } from '../../api/workerSupabase';
import './WorkerDashboard.css';

const statusClass = {
  assigned: 'badge-assigned', accepted: 'badge-assigned', in_progress: 'badge-progress',
  blocked: 'badge-pending', completed: 'badge-resolved', cancelled: 'badge-closed',
};

const nextStatuses = {
  assigned: ['accepted'],
  accepted: ['in_progress'],
  in_progress: ['in_progress', 'blocked', 'completed'],
  blocked: ['blocked', 'in_progress', 'completed'],
  completed: ['completed'],
};

const label = (value) => value?.replaceAll('_', ' ') ?? '';
const MAX_EVIDENCE_FILES = 5;
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;

const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [updateData, setUpdateData] = useState({ status: '', message: '' });
  const [evidenceFiles, setEvidenceFiles] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setTickets(await getWorkerTickets());
    } catch (error) {
      showError(error.message || 'Failed to load assigned tickets');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadData(); }, [loadData]);

  const openUpdate = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateData({ status: nextStatuses[ticket.status]?.[0] ?? ticket.status, message: '' });
    setEvidenceFiles([]);
    setShowUpdateModal(true);
  };

  const submitUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await updateWorkerTicket(selectedTicket.id, updateData.status, updateData.message);
      if (evidenceFiles.length) {
        await uploadTicketEvidence(selectedTicket.id, result.update_id, evidenceFiles);
      }
      showSuccess('Progress update saved.');
      setShowUpdateModal(false);
      setSelectedTicket(null);
      await loadData();
    } catch (error) {
      showError(error.message || 'Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const chooseEvidence = (event) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > MAX_EVIDENCE_FILES) {
      showError(`Upload no more than ${MAX_EVIDENCE_FILES} evidence files.`);
      event.target.value = '';
      return;
    }
    if (selected.some((file) => file.size > MAX_EVIDENCE_SIZE)) {
      showError('Each evidence file must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }
    setEvidenceFiles(selected);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/worker/login');
  };

  if (loading) return <div className="loading">Loading assigned work…</div>;
  const stats = summarizeWorkerTickets(tickets);

  return (
    <div className="worker-dashboard">
      <div className="dashboard-header worker-header">
        <div className="header-content"><h1>My assigned work</h1><p>Welcome back, {user?.fullName}</p></div>
        <div className="header-actions"><button onClick={handleLogout} className="logout-btn">Logout</button><button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu"><span></span><span></span><span></span></button></div>
      </div>

      <div className={`mobile-drawer ${menuOpen ? 'open' : ''}`}><div className="drawer-overlay" onClick={() => setMenuOpen(false)}></div><div className="drawer-content"><div className="drawer-header"><h3>Worker portal</h3></div><nav className="drawer-nav"><button onClick={() => setMenuOpen(false)} className="drawer-nav-btn active">Assigned work</button><button onClick={handleLogout} className="drawer-nav-btn logout">Logout</button></nav></div></div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon total">#</div><div className="stat-info"><h3>{stats.total}</h3><p>Total tickets</p></div></div>
        <div className="stat-card"><div className="stat-icon pending">○</div><div className="stat-info"><h3>{stats.pending}</h3><p>Awaiting work</p></div></div>
        <div className="stat-card"><div className="stat-icon progress">↻</div><div className="stat-info"><h3>{stats.inProgress}</h3><p>In progress</p></div></div>
        <div className="stat-card"><div className="stat-icon resolved">✓</div><div className="stat-info"><h3>{stats.completed}</h3><p>Completed</p></div></div>
      </div>

      <div className="tickets-container"><h2>Tickets</h2>
        {tickets.length === 0 ? <div className="worker-empty"><h3>No assigned work</h3><p>New tickets assigned by an administrator will appear here.</p></div> : <div className="tickets-grid">
          {tickets.map((ticket) => <article key={ticket.id} className="ticket-card">
            <div className="ticket-header"><span className="ticket-number">{ticket.ticket_number}</span><span className={`badge ${statusClass[ticket.status]}`}>{label(ticket.status)}</span></div>
            <h3>{ticket.title}</h3><p className="ticket-description">{ticket.report?.description}</p>
            <div className="ticket-details">
              <div className="detail-item"><strong>Category:</strong> {ticket.report?.category?.name ?? 'Uncategorized'}</div>
              <div className="detail-item"><strong>Priority:</strong> <span className={`priority-${ticket.priority}`}>{label(ticket.priority)}</span></div>
              <div className="detail-item"><strong>Location:</strong> {ticket.report?.location}</div>
              <div className="detail-item"><strong>Building / room:</strong> {[ticket.report?.building, ticket.report?.room].filter(Boolean).join(' · ') || 'Not provided'}</div>
            </div>
            {ticket.instructions && <div className="ticket-notes"><strong>Admin instructions:</strong> {ticket.instructions}</div>}
            {ticket.updates?.length > 0 && <div className="worker-updates"><strong>Progress history</strong>{ticket.updates.map((update) => <div key={update.id}><span>{label(update.new_status)}</span><p>{update.message}</p>{update.attachments?.length > 0 && <small>{update.attachments.length} evidence file{update.attachments.length === 1 ? '' : 's'}</small>}<small>{new Date(update.created_at).toLocaleString()}</small></div>)}</div>}
            {ticket.status !== 'completed' && ticket.status !== 'cancelled' && <button onClick={() => openUpdate(ticket)} className="update-btn">Add progress update</button>}
          </article>)}
        </div>}
      </div>

      {showUpdateModal && selectedTicket && <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}><div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <h2>Update ticket</h2><p className="modal-ticket-number">{selectedTicket.ticket_number}</p>
        <form onSubmit={submitUpdate}>
          <div className="form-group"><label htmlFor="workerStatus">Progress status *</label><select id="workerStatus" value={updateData.status} onChange={(event) => setUpdateData({ ...updateData, status: event.target.value })} required>{nextStatuses[selectedTicket.status]?.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div>
          <div className="form-group"><label htmlFor="workerMessage">Progress note *</label><textarea id="workerMessage" value={updateData.message} onChange={(event) => setUpdateData({ ...updateData, message: event.target.value })} rows="5" minLength="2" maxLength="3000" placeholder="Describe the work completed, current progress, or reason the job is blocked…" required /></div>
          <div className="form-group"><label htmlFor="workerEvidence">Photo or document evidence</label><input id="workerEvidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={chooseEvidence} /><small>{evidenceFiles.length ? `${evidenceFiles.length} file${evidenceFiles.length === 1 ? '' : 's'} selected` : 'Optional · JPG, PNG, WebP, or PDF · maximum 5 files'}</small></div>
          <div className="modal-actions"><button type="button" onClick={() => setShowUpdateModal(false)} className="cancel-btn">Cancel</button><button type="submit" className="submit-btn" disabled={saving}>{saving ? 'Saving…' : 'Save update'}</button></div>
        </form>
      </div></div>}
    </div>
  );
};

export default WorkerDashboard;
