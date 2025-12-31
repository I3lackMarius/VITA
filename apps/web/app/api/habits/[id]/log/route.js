import { NextResponse } from 'next/server';
import { z } from 'zod';
// We'll import pool dynamically when needed to avoid DB connection in demo mode
import { getUserFromRequest } from '../../../../../lib/auth.js';
import { isDemo, readDemo, writeDemo, newId } from '../../../../../lib/demoStore.js';

export const runtime = 'nodejs';

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
    const { validationErrorResponse } = await import('../../../../../lib/validate.js');
    return validationErrorResponse(parse.error);
  }
  const { count } = parse.data;

  // Demo mode: registra o aggiorna un log nel file JSON
  if (isDemo()) {
    const data = await readDemo();
    // Verifica che l'abitudine esista per l'utente
    const habit = data.habits.find((h) => h.id === id && h.user_id === user.id);
    if (!habit) {
      return NextResponse.json({ error: 'Abitudine non trovata' }, { status: 404 });
    }
    const today = new Date().toISOString().slice(0, 10);
    // Trova log esistente per la stessa data
    const logIndex = data.habit_logs.findIndex(
      (l) => l.habit_id === id && l.user_id === user.id && l.date === today,
    );
    let log;
    if (logIndex !== -1) {
      // Aggiorna il count
      data.habit_logs[logIndex].count += count;
      log = data.habit_logs[logIndex];
    } else {
      // Crea un nuovo log
      log = {
        id: newId('hl'),
        habit_id: id,
        user_id: user.id,
        date: today,
        count,
        created_at: new Date().toISOString(),
      };
      data.habit_logs.push(log);
    }
    await writeDemo(data);
    return NextResponse.json({ log: { id: log.id, habit_id: log.habit_id, date: log.date, count: log.count } }, { status: 201 });
  }
  try {
    // Import pool dynamically only when not in demo mode
    const { pool } = await import('../../../../../lib/db.js');
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