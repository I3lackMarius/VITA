import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '../../../../lib/db.js';
import { comparePassword, generateToken } from '../../../../lib/auth.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request) {
  const body = await request.json();
  const parse = loginSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Credenziali non valide' }, { status: 400 });
  }
  const { email, password } = parse.data;
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Credenziali non valide' }, { status: 400 });
      }
      const user = result.rows[0];
      const match = await comparePassword(password, user.password_hash);
      if (!match) {
        return NextResponse.json({ error: 'Credenziali non valide' }, { status: 400 });
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