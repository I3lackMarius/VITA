import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword } from '../../../../lib/auth.js';
// Nota: non importiamo il pool qui per evitare di caricare il DB in demo mode.  Lo importeremo dinamicamente.
import { validationErrorResponse } from '../../../../lib/validate.js';
import { isDemo, readDemo, writeDemo, newId } from '../../../../lib/demoStore.js';

// Use Node.js runtime so that FS operations are available in demo mode.
export const runtime = 'nodejs';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
});

export async function POST(request) {
  const body = await request.json();
  const parse = registerSchema.safeParse(body);
  if (!parse.success) {
    // Utilizza la risposta di errore standardizzata per validation errors
    return validationErrorResponse(parse.error);
  }
  const { email, password, name } = parse.data;

  // Demo mode: registra l'utente nel file JSON senza usare il DB.
  if (isDemo()) {
    const data = await readDemo();
    const exists = data.users.find((u) => u.email === email);
    if (exists) {
      // L'utente esiste già: restituisci un codice di errore consistente
      return NextResponse.json(
        { errorCode: 'USER_EXISTS', message: 'Utente già registrato' },
        { status: 400 },
      );
    }
    const hashed = await hashPassword(password);
    const id = newId('u');
    const newUser = { id, email, name, password_hash: hashed };
    data.users.push(newUser);
    await writeDemo(data);
    return NextResponse.json({ id, email });
  }
  try {
    // Import dinamicamente il pool solo quando necessario
    const { pool } = await import('../../../../lib/db.js');
    const client = await pool.connect();
    try {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rowCount > 0) {
        return NextResponse.json(
          { errorCode: 'USER_EXISTS', message: 'Utente già registrato' },
          { status: 400 },
        );
      }
      const hashed = await hashPassword(password);
      const result = await client.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email',
        [email, hashed, name],
      );
      return NextResponse.json({ id: result.rows[0].id, email: result.rows[0].email });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}