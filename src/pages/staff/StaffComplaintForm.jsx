import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import './StaffComplaintForm.css';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FALLBACK_CATEGORIES = [
  'Broken furniture',
  'Building damage',
  'Electrical fault',
  'Water or plumbing issue',
  'Internet or equipment issue',
  'Safety hazard',
];

const emptyForm = {
  categoryId: '',
  title: '',
  description: '',
  location: '',
  building: '',
  room: '',
  reporterName: '',
  reporterEmail: '',
};

const StaffComplaintForm = () => {
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    getSupabase()
      .from('categories')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data, error: categoryError }) => {
        if (!categoryError) setCategories(data ?? []);
      });
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const chooseFiles = (event) => {
    const selected = Array.from(event.target.files ?? []);
    setError('');

    if (selected.length > MAX_FILES) {
      setError(`You can upload a maximum of ${MAX_FILES} files.`);
      event.target.value = '';
      return;
    }
    if (selected.some((file) => file.size > MAX_FILE_SIZE)) {
      setError('Each file must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }

    setFiles(selected);
  };

  const submitReport = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitted(false);

    if (!isSupabaseConfigured) {
      setError('The reporting service is not configured yet. Add the Supabase credentials to continue.');
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      files.forEach((file) => payload.append('files', file));

      const { error: submitError } = await getSupabase().functions.invoke('submit-report', {
        body: payload,
      });
      if (submitError) throw submitError;

      setSubmitted(true);
      setForm(emptyForm);
      setFiles([]);
    } catch (submitError) {
      setError(submitError.message || 'Your report could not be submitted. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="report-page">
      <section className="report-intro">
        <p className="eyebrow">Campus maintenance</p>
        <h1>See damage? Let the right team know.</h1>
        <p>No account is required. Tell us what happened, where it is, and add a photo if you can.</p>
        <div className="report-promises">
          <span>Usually takes 2–3 minutes</span>
          <span>Contact details are optional</span>
          <span>Your report goes directly to the maintenance team</span>
        </div>
      </section>

      <section className="report-card" aria-labelledby="form-heading">
        <div className="form-heading">
          <div><p className="step-label">New report</p><h2 id="form-heading">Describe the issue</h2></div>
          <span className="required-note">* Required</span>
        </div>

        <form onSubmit={submitReport} className="report-form">
          <div className="field">
            <label htmlFor="categoryId">Issue category</label>
            <select id="categoryId" name="categoryId" value={form.categoryId} onChange={updateField}>
              <option value="">Select the closest category</option>
              {categories.length > 0
                ? categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)
                : FALLBACK_CATEGORIES.map((name) => <option key={name} value="" disabled>{name}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="title">Short title *</label>
            <input id="title" name="title" value={form.title} onChange={updateField} minLength="5" maxLength="160" required placeholder="Example: Broken classroom window" />
          </div>

          <div className="field">
            <label htmlFor="description">What is damaged or unsafe? *</label>
            <textarea id="description" name="description" value={form.description} onChange={updateField} minLength="10" maxLength="5000" rows="5" required placeholder="Describe what you noticed and anything the maintenance team should know." />
            <small>{form.description.length}/5000 characters</small>
          </div>

          <fieldset>
            <legend>Where is the problem?</legend>
            <div className="field">
              <label htmlFor="location">Campus location *</label>
              <input id="location" name="location" value={form.location} onChange={updateField} minLength="2" maxLength="300" required placeholder="Example: North campus, beside the library entrance" />
            </div>
            <div className="field-row">
              <div className="field"><label htmlFor="building">Building</label><input id="building" name="building" value={form.building} onChange={updateField} maxLength="120" placeholder="Library" /></div>
              <div className="field"><label htmlFor="room">Room or area</label><input id="room" name="room" value={form.room} onChange={updateField} maxLength="80" placeholder="Room 204" /></div>
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="files">Photos or supporting files</label>
            <div className="file-drop">
              <input id="files" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={chooseFiles} />
              <strong>{files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected` : 'Choose files'}</strong>
              <span>JPG, PNG, WebP, or PDF · up to 5 files · 10 MB each</span>
            </div>
          </div>

          <fieldset>
            <legend>Contact details <span>(optional)</span></legend>
            <p className="fieldset-help">Add an email if you want confirmation and status notifications.</p>
            <div className="field-row">
              <div className="field"><label htmlFor="reporterName">Your name</label><input id="reporterName" name="reporterName" value={form.reporterName} onChange={updateField} maxLength="120" autoComplete="name" /></div>
              <div className="field"><label htmlFor="reporterEmail">Email address</label><input id="reporterEmail" name="reporterEmail" type="email" value={form.reporterEmail} onChange={updateField} maxLength="254" autoComplete="email" placeholder="student@example.edu" /></div>
            </div>
          </fieldset>

          {submitted && <div className="form-success" role="status">Your report was submitted successfully.</div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button type="submit" className="primary-button submit-report" disabled={loading}>
            {loading ? 'Submitting report…' : 'Submit report'}
          </button>
          <p className="form-footnote">By submitting, you confirm that this report is accurate to the best of your knowledge.</p>
        </form>
      </section>
    </main>
  );
};

export default StaffComplaintForm;
