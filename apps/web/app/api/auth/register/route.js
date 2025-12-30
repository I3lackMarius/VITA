import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '../../../../lib/db.js';
import { hashPassword } from '../../../../lib/auth.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
});

export async function POST(request) {
  const body = await request.json();
  const parse = registerSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
  }
  const { email, password, name } = parse.data;
  try {
    const client = await pool.connect();
    try {
      // Controlla se l'utente esiste già
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rowCount > 0) {
        return NextResponse.json({ error: 'Utente già registrato' }, { status: 400 });
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