import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/common/toastContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getAllWorkers, getDepartments, inviteWorker, setWorkerActive } from '../../api/adminSupabase';
import AdminNavigation from '../../components/AdminNavigation';
import './AdminWorkers.css';

const AdminWorkers = () => {
  const { showSuccess, showError } = useToast();
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerData, setWorkerData] = useState({ email: '', fullName: '', departmentId: '' });
  const [setupLink, setSetupLink] = useState('');

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const [workerRows, departmentRows] = await Promise.all([getAllWorkers(), getDepartments()]);
      setWorkers(workerRows);
      setDepartments(departmentRows);
    } catch (error) {
      showError(error.message || 'Failed to load workers');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadWorkers(); }, [loadWorkers]);

  const handleInvite = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await inviteWorker(workerData);
      setShowCreateModal(false);
      setWorkerData({ email: '', fullName: '', departmentId: '' });
      if (result.delivery === 'manual' && result.setupLink) {
        setSetupLink(result.setupLink);
        showSuccess('Worker created. Copy and send the secure setup link.');
      } else {
        showSuccess('Worker invitation sent.');
      }
      await loadWorkers();
    } catch (error) {
      showError(error.message || 'Failed to invite worker');
    } finally {
      setSaving(false);
    }
  };

  const confirmStatusChange = (worker) => {
    setSelectedWorker(worker);
    setShowConfirm(true);
  };

  const changeStatus = async () => {
    try {
      await setWorkerActive(selectedWorker.id, !selectedWorker.active);
      showSuccess(selectedWorker.active ? 'Worker access disabled.' : 'Worker access restored.');
      await loadWorkers();
    } catch (error) {
      showError(error.message || 'Failed to update worker');
    }
  };

  if (loading) return <div className="loading">Loading workers…</div>;

  return (
    <div className="admin-dashboard">
      <AdminNavigation title="Manage Workers" subtitle="Invite workers and control portal access" />
      <div className="workers-container">
        <div className="workers-header"><h2>Maintenance workers</h2><button onClick={() => setShowCreateModal(true)} className="add-worker-btn">+ Invite worker</button></div>
        {workers.length === 0 ? <div className="empty-state"><h3>No workers yet</h3><p>Invite the first maintenance worker to begin assigning tickets.</p></div> : (
          <div className="workers-table"><table>
            <thead><tr><th>Name</th><th>Department</th><th>Status</th><th>Tickets</th><th>Actions</th></tr></thead>
            <tbody>{workers.map((worker) => <tr key={worker.id}>
              <td>{worker.full_name}</td>
              <td>{worker.department?.name ?? 'Not assigned'}</td>
              <td><span className={`status-badge ${worker.active ? 'active' : 'inactive'}`}>{worker.active ? 'Active' : 'Inactive'}</span></td>
              <td>{worker.tickets?.length ?? 0}</td>
              <td><button onClick={() => confirmStatusChange(worker)} className={worker.active ? 'delete-btn' : 'restore-btn'}>{worker.active ? 'Disable' : 'Restore'}</button></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </div>

      {showCreateModal && <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
        <div className="modal-content" onClick={(event) => event.stopPropagation()}>
          <h2>Invite a worker</h2><p className="modal-complaint-title">They will receive a secure email to set up their account.</p>
          <form onSubmit={handleInvite}>
            <div className="form-group"><label htmlFor="workerName">Full name *</label><input id="workerName" value={workerData.fullName} onChange={(event) => setWorkerData({ ...workerData, fullName: event.target.value })} minLength="2" maxLength="120" required /></div>
            <div className="form-group"><label htmlFor="workerEmail">Email *</label><input id="workerEmail" type="email" value={workerData.email} onChange={(event) => setWorkerData({ ...workerData, email: event.target.value })} required /></div>
            <div className="form-group"><label htmlFor="workerDepartment">Department</label><select id="workerDepartment" value={workerData.departmentId} onChange={(event) => setWorkerData({ ...workerData, departmentId: event.target.value })}><option value="">Not assigned</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
            <div className="modal-actions"><button type="button" onClick={() => setShowCreateModal(false)} className="cancel-btn">Cancel</button><button type="submit" className="submit-btn" disabled={saving}>{saving ? 'Sending…' : 'Send invitation'}</button></div>
          </form>
        </div>
      </div>}

      {setupLink && <div className="modal-overlay" onClick={() => setSetupLink('')}>
        <div className="modal-content" onClick={(event) => event.stopPropagation()}>
          <h2>Worker setup link</h2>
          <p className="modal-complaint-title">Email delivery is unavailable. Copy this secure one-time link and send it directly to the worker.</p>
          <div className="form-group"><label htmlFor="workerSetupLink">Setup link</label><textarea id="workerSetupLink" value={setupLink} readOnly rows="5" /></div>
          <div className="modal-actions"><button type="button" className="cancel-btn" onClick={() => setSetupLink('')}>Close</button><button type="button" className="submit-btn" onClick={async () => { await navigator.clipboard.writeText(setupLink); showSuccess('Setup link copied.'); }}>Copy link</button></div>
        </div>
      </div>}

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={changeStatus}
        title={selectedWorker?.active ? 'Disable worker access' : 'Restore worker access'}
        message={selectedWorker?.active ? `Disable ${selectedWorker.full_name}? Their existing tickets remain assigned but they cannot sign in.` : `Restore portal access for ${selectedWorker?.full_name}?`}
        confirmText={selectedWorker?.active ? 'Disable' : 'Restore'}
        cancelText="Cancel"
        type={selectedWorker?.active ? 'danger' : 'info'}
      />
    </div>
  );
};

export default AdminWorkers;
