"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTask() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Validazione client
  const isTitleValid = title.trim().length > 0;
  const isDueProvided = dueDate.trim().length > 0;
  // La data non può essere nel passato (oggi incluso è valido)
  const isDueValid = (() => {
    if (!isDueProvided) return false;
    const date = new Date(dueDate);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  })();
  const isFormValid = isTitleValid && isDueProvided && isDueValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // prevenire invio se invalido o in invio
    if (!isFormValid || submitting) return;
    setSubmitting(true);
    setErrors({});
    const token = typeof window !== 'undefined' ? localStorage.getItem('vita-token') : null;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, due_date: dueDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Mappa errori dal backend
        if (data.errorCode === 'VALIDATION_ERROR' && data.fields) {
          setErrors(data.fields);
        } else {
          setErrors({ form: data.message || data.error || 'Errore nella creazione del task' });
        }
        setSubmitting(false);
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setErrors({ form: 'Errore di rete' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: '500px', marginTop: '2rem' }}>
      <h2>Nuovo Task</h2>
      {errors.form && <p style={{ color: 'red' }}>{errors.form}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="title" style={{ marginTop: '1rem' }}>Titolo</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
        {!isTitleValid && title && (
          <small style={{ color: 'red' }}>Il titolo è obbligatorio</small>
        )}
        {errors.title && (
          <small style={{ color: 'red' }}>{errors.title.join(', ')}</small>
        )}
        <label htmlFor="description" style={{ marginTop: '1rem' }}>Descrizione</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={inputStyle}
        />
        <label htmlFor="dueDate" style={{ marginTop: '1rem' }}>Data di scadenza</label>
        <input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={inputStyle}
        />
        {!isDueProvided && dueDate === '' && (
          <small style={{ color: 'red' }}>La data di scadenza è obbligatoria</small>
        )}
        {isDueProvided && !isDueValid && (
          <small style={{ color: 'red' }}>La data non può essere nel passato</small>
        )}
        {errors.due_date && (
          <small style={{ color: 'red' }}>{errors.due_date.join(', ')}</small>
        )}
        <button
          type="submit"
          style={{ ...buttonStyle, marginTop: '1.5rem', opacity: isFormValid && !submitting ? 1 : 0.5 }}
          disabled={!isFormValid || submitting}
        >
          {submitting ? 'Salvataggio…' : 'Salva'}
        </button>
      </form>
    </main>
  );
}

const inputStyle = {
  padding: '0.5rem',
  fontSize: '1rem',
  borderRadius: '4px',
  border: '1px solid #ccc',
  width: '100%',
};

const buttonStyle = {
  padding: '0.5rem 1rem',
  fontSize: '1rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#0070f3',
  color: '#fff',
};