import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import '../admin/Login.css';

const WorkerSetup = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;

    async function verifyInvitation() {
      try {
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error('This invitation is invalid or expired. Ask an administrator for a new invitation.');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, active')
          .eq('id', data.session.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (!profile?.active || profile.role !== 'worker') {
          await supabase.auth.signOut();
          throw new Error('This invitation is not connected to an active worker account.');
        }
        if (mounted) setReady(true);
      } catch (setupError) {
        if (mounted) setError(setupError.message || 'The invitation could not be verified.');
      } finally {
        if (mounted) setChecking(false);
      }
    }

    verifyInvitation();
    return () => { mounted = false; };
  }, []);

  const completeSetup = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    if (password !== confirmation) return setError('The passwords do not match.');

    setSaving(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      if (updateError) throw updateError;
      navigate('/worker/dashboard', { replace: true });
    } catch (setupError) {
      setError(setupError.message || 'Your password could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="login-container worker-login">
      <section className="login-card" aria-labelledby="setup-heading">
        <div className="login-header">
          <p className="setup-eyebrow">Worker invitation</p>
          <h1 id="setup-heading">Set up your account</h1>
          <p>Create a password to access work assigned by campus administrators.</p>
        </div>
        {checking && <div className="setup-state">Verifying your invitation…</div>}
        {!checking && ready && <form onSubmit={completeSetup} className="login-form">
          <div className="form-group"><label htmlFor="newWorkerPassword">New password</label><input id="newWorkerPassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="8" autoComplete="new-password" required /><small>Use at least 8 characters.</small></div>
          <div className="form-group"><label htmlFor="confirmWorkerPassword">Confirm password</label><input id="confirmWorkerPassword" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength="8" autoComplete="new-password" required /></div>
          {error && <div className="inline-error-message" role="alert">{error}</div>}
          <button type="submit" className="login-btn" disabled={saving}>{saving ? 'Saving password…' : 'Complete setup'}</button>
        </form>}
        {!checking && !ready && <div className="setup-state setup-error" role="alert"><p>{error}</p><Link to="/worker/login">Return to worker login</Link></div>}
      </section>
    </main>
  );
};

export default WorkerSetup;
