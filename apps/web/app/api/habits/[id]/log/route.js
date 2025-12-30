import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '../../../../../lib/db.js';
import { getUserFromRequest } from '../../../../../lib/auth.js';

const logSchema = z.object({
  count: z.number().int().positive().default(1),
});

// POST /api/habits/[id]/log
export async function POST(request, { params }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { id } = params;
  const body = await request.json();
  const parse = logSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
  }
  const { count } = parse.data;
  try {
    const client = await pool.connect();
    try {
      // verifica che l'abitudine appartenga all'utente
      const check = await client.query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [id, user.id]);
      if (check.rowCount === 0) {
        return NextResponse.json({ error: 'Abitudine non trovata' }, { status: 404 });
      }
      const now = new Date();
      const res = await client.query(
        'INSERT INTO habit_logs (habit_id, date, count) VALUES ($1, $2, $3) RETURNING id, habit_id, date, count',
        [id, now, count],
      );
      return NextResponse.json({ log: { id: res.rows[0].id, habit_id: res.rows[0].habit_id, date: res.rows[0].date.toISOString(), count: res.rows[0].count } }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}