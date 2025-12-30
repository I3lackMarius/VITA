import Link from 'next/link';

export default function Home() {
  return (
    <main className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h1>Benvenuto su VITA</h1>
      <p>Il tuo spazio personale per organizzare la vita quotidiana.</p>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/login"><button style={buttonStyle}>Accedi</button></Link>
        <Link href="/register"><button style={{ ...buttonStyle, marginLeft: '1rem' }}>Registrati</button></Link>
      </div>
    </main>
  );
}

const buttonStyle = {
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#0070f3',
  color: '#fff',
};