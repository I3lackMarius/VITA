"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewHabit() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetCount, setTargetCount] = useState(1);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Validazione client
  const isNameValid = name.trim().length > 0;
  const isTargetValid = (() => {
    // Se targetCount è definito, deve essere >= 1
    const num = Number(targetCount);
    return Number.isInteger(num) && num > 0;
  })();
  const isFormValid = isNameValid && isTargetValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Non procedere se form invalido o in invio
    if (!isFormValid || submitting) return;
    setSubmitting(true);
    setErrors({});
    const token = typeof window !== 'undefined' ? localStorage.getItem('vita-token') : null;
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, target_count: Number(targetCount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Mappa errori dal backend
        if (data.errorCode === 'VALIDATION_ERROR' && data.fields) {
          setErrors(data.fields);
        } else {
          setErrors({ form: data.message || data.error || 'Errore nella creazione dell\'abitudine' });
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
      <h2>Nuova Abitudine</h2>
      {errors.form && <p style={{ color: 'red' }}>{errors.form}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="name" style={{ marginTop: '1rem' }}>Nome</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
        {!isNameValid && name && (
          <small style={{ color: 'red' }}>Il nome è obbligatorio</small>
        )}
        {errors.name && (
          <small style={{ color: 'red' }}>{errors.name.join(', ')}</small>
        )}
        <label htmlFor="description" style={{ marginTop: '1rem' }}>Descrizione</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={inputStyle}
        />
        <label htmlFor="targetCount" style={{ marginTop: '1rem' }}>Target giornaliero (quantità o minuti)</label>
        <input
          id="targetCount"
          type="number"
          min="1"
          value={targetCount}
          onChange={(e) => setTargetCount(e.target.value)}
          style={inputStyle}
        />
        {!isTargetValid && targetCount !== '' && (
          <small style={{ color: 'red' }}>Il target deve essere un numero positivo</small>
        )}
        {errors.target_count && (
          <small style={{ color: 'red' }}>{errors.target_count.join(', ')}</small>
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