"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Validazione lato client
  const isNameValid = name.trim().length > 0;
  const isEmailValid = email.includes('@');
  const isPasswordValid = password.length >= 6;
  const isFormValid = isNameValid && isEmailValid && isPasswordValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Non procedere se il form è invalido
    if (!isFormValid || submitting) return;
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Mappa gli errori di validazione dal backend
        if (data.errorCode === 'VALIDATION_ERROR' && data.fields) {
          setErrors(data.fields);
        } else {
          setErrors({ form: data.message || 'Errore durante la registrazione' });
        }
        setSubmitting(false);
        return;
      }
      // Dopo la registrazione effettua il login automatico
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('vita-token', loginData.token);
        }
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } catch (err) {
      setErrors({ form: 'Si è verificato un errore. Riprova.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: '400px', marginTop: '3rem' }}>
      <h2>Registrati su VITA</h2>
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
        {!isNameValid && <small style={{ color: 'red' }}>Il nome è obbligatorio</small>}
        {errors.name && <small style={{ color: 'red' }}>{errors.name.join(', ')}</small>}

        <label htmlFor="email" style={{ marginTop: '1rem' }}>Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        {!isEmailValid && email && <small style={{ color: 'red' }}>Inserisci un'email valida</small>}
        {errors.email && <small style={{ color: 'red' }}>{errors.email.join(', ')}</small>}

        <label htmlFor="password" style={{ marginTop: '1rem' }}>Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        {!isPasswordValid && password && <small style={{ color: 'red' }}>La password deve avere almeno 6 caratteri</small>}
        {errors.password && <small style={{ color: 'red' }}>{errors.password.join(', ')}</small>}

        <button
          type="submit"
          style={{ ...buttonStyle, marginTop: '1.5rem', opacity: isFormValid && !submitting ? 1 : 0.5 }}
          disabled={!isFormValid || submitting}
        >
          {submitting ? 'Registrazione…' : 'Registrati'}
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
};

const buttonStyle = {
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#0070f3',
  color: '#fff',
};