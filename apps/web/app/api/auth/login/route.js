import { NextResponse } from 'next/server';
import { z } from 'zod';
import { comparePassword, generateToken } from '../../../../lib/auth.js';
// Import validation helper
import { validationErrorResponse } from '../../../../lib/validate.js';
import { isDemo, readDemo } from '../../../../lib/demoStore.js';

// Ensure this route runs in a Node.js environment so that filesystem
// operations (used in demo mode) are available.
export const runtime = 'nodejs';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request) {
  const body = await request.json();
  const parse = loginSchema.safeParse(body);
  if (!parse.success) {
    // Rispondi con struttura uniforme per gli errori di validazione
    return validationErrorResponse(parse.error);
  }
  const { email, password } = parse.data;

  // Demo mode short-circuit: read from local JSON instead of hitting the DB.
  if (isDemo()) {
    const data = await readDemo();
    // Trova l'utente nel file demo
    const user = data.users.find((u) => u.email === email);
    if (!user) {
      return NextResponse.json(
        { errorCode: 'INVALID_CREDENTIALS', message: 'Credenziali non valide' },
        { status: 400 },
      );
    }
    // Verifica la password usando lo stesso helper di bcrypt
    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      return NextResponse.json(
        { errorCode: 'INVALID_CREDENTIALS', message: 'Credenziali non valide' },
        { status: 400 },
      );
    }
    // Genera il token JWT usando i dati minimi
    const token = generateToken({ id: user.id, email: user.email });
    return NextResponse.json({ token });
  }
  try {
    // Import dinamicamente il pool per evitare di creare connessioni quando non necessario
    const { pool } = await import('../../../../lib/db.js');
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
      if (result.rowCount === 0) {
        return NextResponse.json(
          { errorCode: 'INVALID_CREDENTIALS', message: 'Credenziali non valide' },
          { status: 400 },
        );
      }
      const user = result.rows[0];
      const match = await comparePassword(password, user.password_hash);
      if (!match) {
        return NextResponse.json(
          { errorCode: 'INVALID_CREDENTIALS', message: 'Credenziali non valide' },
          { status: 400 },
        );
      }
      const token = generateToken(user);
      return NextResponse.json({ token });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}