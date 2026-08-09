import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import './TrackReport.css';

const STATUS_ORDER = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed'];

const STATUS_COPY = {
  submitted: ['Submitted', 'Your report is safely in the queue.'],
  under_review: ['Under review', 'The campus team is reviewing the issue.'],
  assigned: ['Assigned', 'The work has been assigned to a maintenance team.'],
  in_progress: ['In progress', 'Work on the issue has started.'],
  resolved: ['Resolved', 'The team has marked the issue as resolved.'],
  closed: ['Closed', 'The report has been reviewed and closed.'],
  rejected: ['Unable to proceed', 'The campus team could not proceed with this report.'],
};

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const TrackReport = () => {
  const [reference, setReference] = useState('');
  const [trackingToken, setTrackingToken] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentIndex = useMemo(
    () => (result ? STATUS_ORDER.indexOf(result.report.status) : -1),
    [result],
  );

  const track = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!isSupabaseConfigured) {
      setError('The tracking service is not configured yet.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: trackingError } = await getSupabase().functions.invoke('track-report', {
        body: { reference: reference.trim(), trackingToken: trackingToken.trim() },
      });
      if (trackingError) throw trackingError;
      setResult(data);
    } catch (trackingError) {
      setError(trackingError.message || 'The report reference or tracking token is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="tracker-page">
      <div className="tracker-shell">
        <header className="tracker-header">
          <Link to="/submit-complaint" className="back-link">← Submit a report</Link>
          <p className="tracker-eyebrow">Private report tracker</p>
          <h1>Check the progress of your report.</h1>
          <p>Enter both values given to you after submission. Your tracking token is private and is not visible to campus workers.</p>
        </header>

        <section className="tracker-card" aria-labelledby="tracker-form-heading">
          <h2 id="tracker-form-heading">Find your report</h2>
          <form onSubmit={track} className="tracker-form">
            <label htmlFor="reference">Report reference</label>
            <input id="reference" value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} required placeholder="RPT-20260809-ABC123" autoComplete="off" />
            <label htmlFor="trackingToken">Private tracking token</label>
            <input id="trackingToken" value={trackingToken} onChange={(event) => setTrackingToken(event.target.value)} required minLength="64" maxLength="64" placeholder="64-character token" autoComplete="off" spellCheck="false" />
            {error && <div className="tracker-error" role="alert">{error}</div>}
            <button type="submit" disabled={loading}>{loading ? 'Checking…' : 'Check progress'}</button>
          </form>
        </section>

        {result && (
          <section className="tracking-result" aria-live="polite">
            <div className="result-summary">
              <div>
                <span>{result.report.reference}</span>
                <h2>{result.report.title}</h2>
                <p>{result.report.location}</p>
              </div>
              <strong className={`status-badge status-${result.report.status}`}>
                {STATUS_COPY[result.report.status]?.[0] ?? result.report.status}
              </strong>
            </div>

            {result.report.status === 'rejected' ? (
              <div className="closed-message">{STATUS_COPY.rejected[1]}</div>
            ) : (
              <ol className="status-timeline">
                {STATUS_ORDER.map((status, index) => {
                  const complete = index <= currentIndex;
                  const current = index === currentIndex;
                  return (
                    <li key={status} className={`${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''}`}>
                      <span className="timeline-dot" aria-hidden="true">{complete ? '✓' : index + 1}</span>
                      <div><strong>{STATUS_COPY[status][0]}</strong><p>{STATUS_COPY[status][1]}</p></div>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="tracking-meta">
              <div><span>Reported</span><strong>{formatDate(result.report.createdAt)}</strong></div>
              <div><span>Last updated</span><strong>{formatDate(result.report.updatedAt)}</strong></div>
              <div><span>Priority</span><strong>{result.report.priority}</strong></div>
              <div><span>Active work tickets</span><strong>{result.tickets.length}</strong></div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default TrackReport;
