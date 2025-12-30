"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTask() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
        setError(data.error || 'Errore nella creazione del task');
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setError('Errore di rete');
    }
  };

  return (
    <main className="container" style={{ maxWidth: '500px', marginTop: '2rem' }}>
      <h2>Nuovo Task</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="title" style={{ marginTop: '1rem' }}>Titolo</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={inputStyle}
        />
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
        <button type="submit" style={{ ...buttonStyle, marginTop: '1.5rem' }}>Salva</button>
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