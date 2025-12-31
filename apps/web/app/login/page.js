"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Client-side validation
  const isEmailValid = email.trim().length > 0 && email.includes('@');
  const isPasswordProvided = password.trim().length > 0;
  const isFormValid = isEmailValid && isPasswordProvided;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Prevent submit if invalid or already submitting
    if (!isFormValid || submitting) return;
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Map validation errors
        if (data.errorCode === 'VALIDATION_ERROR' && data.fields) {
          setErrors(data.fields);
        } else if (data.errorCode === 'INVALID_CREDENTIALS') {
          setErrors({ form: data.message || 'Email o password non validi' });
        } else {
          setErrors({ form: data.message || 'Errore di autenticazione' });
        }
        setSubmitting(false);
        return;
      }
      // Save token
      if (typeof window !== 'undefined') {
        localStorage.setItem('vita-token', data.token);
      }
      router.push('/dashboard');
    } catch (err) {
      setErrors({ form: 'Si è verificato un errore. Riprova.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: '400px', marginTop: '3rem' }}>
      <h2>Accedi a VITA</h2>
      {errors.form && <p style={{ color: 'red' }}>{errors.form}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <label htmlFor="email" style={{ marginTop: '1rem' }}>Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        {!isEmailValid && email && (
          <small style={{ color: 'red' }}>Inserisci un'email valida</small>
        )}
        {errors.email && (
          <small style={{ color: 'red' }}>{errors.email.join(', ')}</small>
        )}
        <label htmlFor="password" style={{ marginTop: '1rem' }}>Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        {!isPasswordProvided && password && (
          <small style={{ color: 'red' }}>La password è obbligatoria</small>
        )}
        {errors.password && (
          <small style={{ color: 'red' }}>{errors.password.join(', ')}</small>
        )}
        <button
          type="submit"
          style={{ ...buttonStyle, marginTop: '1.5rem', opacity: isFormValid && !submitting ? 1 : 0.5 }}
          disabled={!isFormValid || submitting}
        >
          {submitting ? 'Accesso…' : 'Accedi'}
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