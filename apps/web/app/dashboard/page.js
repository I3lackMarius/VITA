"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vita-token') : null;
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        const [tasksRes, habitsRes] = await Promise.all([
          fetch('/api/tasks', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch('/api/habits', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);
        if (!tasksRes.ok || !habitsRes.ok) {
          setError('Errore durante il caricamento dei dati');
          setLoading(false);
          return;
        }
        const tasksData = await tasksRes.json();
        const habitsData = await habitsRes.json();
        setTasks(tasksData.tasks);
        setHabits(habitsData.habits);
        setLoading(false);
      } catch (err) {
        setError('Errore di rete');
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  if (loading) {
    return <p style={{ marginTop: '3rem', textAlign: 'center' }}>Caricamento...</p>;
  }

  if (error) {
    return <p style={{ marginTop: '3rem', color: 'red', textAlign: 'center' }}>{error}</p>;
  }

  // Calcola progressi abitudini (percentuale completata oggi)
  const today = new Date().toISOString().split('T')[0];
  const habitProgress = habits.map((h) => {
    const logsToday = h.logs?.filter((l) => l.date.startsWith(today)) || [];
    const count = logsToday.reduce((sum, l) => sum + l.count, 0);
    const progress = h.target_count ? Math.min((count / h.target_count) * 100, 100) : 0;
    return { id: h.id, name: h.name, progress };
  });

  const tasksRemaining = tasks.filter((t) => t.status !== 'completed').length;
  const dayProgress = tasks.length > 0 ? ((tasks.length - tasksRemaining) / tasks.length) * 100 : 0;

  return (
    <main className="container" style={{ marginTop: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Benvenuto su VITA</h1>
        <p>Task rimanenti oggi: {tasksRemaining}</p>
        <p>Avanzamento giornata: {dayProgress.toFixed(0)}%</p>
        <p>Citazione del giorno: “La semplicità è la massima sofisticazione.”</p>
      </header>
      <section style={{ marginBottom: '2rem' }}>
        <h2>Daily TODOs</h2>
        {tasks.length === 0 ? (
          <p>Nessun task per oggi.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {tasks.map((task) => (
              <li key={task.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', background: '#fff', padding: '0.5rem', borderRadius: '4px' }}>
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={async (e) => {
                    // Aggiorna status
                    const token = localStorage.getItem('vita-token');
                    await fetch(`/api/tasks/${task.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ status: e.target.checked ? 'completed' : 'pending' }),
                    });
                    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: e.target.checked ? 'completed' : 'pending' } : t));
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                <span>{task.title}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/dashboard/tasks/new"><button style={buttonStyle}>Aggiungi Task</button></Link>
      </section>
      <section style={{ marginBottom: '2rem' }}>
        <h2>Habits / Goals</h2>
        {habitProgress.length === 0 ? (
          <p>Nessuna abitudine.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {habitProgress.map((hp) => (
              <li key={hp.id} style={{ marginBottom: '1rem' }}>
                <strong>{hp.name}</strong>
                <div style={{ background: '#e6e6e6', borderRadius: '4px', overflow: 'hidden', height: '10px', marginTop: '0.5rem' }}>
                  <div style={{ width: `${hp.progress}%`, background: '#0070f3', height: '100%' }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href="/dashboard/habits/new"><button style={buttonStyle}>Aggiungi Abitudine</button></Link>
      </section>
      <section>
        <h2>Latest Transactions</h2>
        <p>Modulo Finanza non attivo. Questa sezione è un placeholder.</p>
      </section>
    </main>
  );
}

const buttonStyle = {
  padding: '0.5rem 1rem',
  fontSize: '1rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#0070f3',
  color: '#fff',
};