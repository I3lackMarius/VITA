"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewHabit() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetCount, setTargetCount] = useState(1);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
        setError(data.error || 'Errore nella creazione dell\'abitudine');
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setError('Errore di rete');
    }
  };

  return (
    <main className="container" style={{ maxWidth: '500px', marginTop: '2rem' }}>
      <h2>Nuova Abitudine</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="name" style={{ marginTop: '1rem' }}>Nome</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        <label htmlFor="targetCount" style={{ marginTop: '1rem' }}>Target giornaliero (quantità o minuti)</label>
        <input
          id="targetCount"
          type="number"
          min="1"
          value={targetCount}
          onChange={(e) => setTargetCount(e.target.value)}
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