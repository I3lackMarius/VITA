import { NextResponse } from 'next/server';
import { z } from 'zod';
// We'll import pool dynamically when needed to avoid DB connection in demo mode
import { getUserFromRequest } from '../../../../lib/auth.js';
import { isDemo, readDemo, writeDemo } from '../../../../lib/demoStore.js';

export const runtime = 'nodejs';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  target_count: z.number().int().positive().optional(),
});

export async function GET(request, { params }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { id } = params;
  // Demo mode: restituisce l'abitudine e i suoi log dal file JSON
  if (isDemo()) {
    const data = await readDemo();
    const habit = data.habits.find((h) => h.id === id && h.user_id === user.id);
    if (!habit) {
      return NextResponse.json({ error: 'Abitudine non trovata' }, { status: 404 });
    }
    const logs = data.habit_logs
      .filter((l) => l.habit_id === id && l.user_id === user.id)
      .map((log) => ({ id: log.id, date: log.date, count: log.count }));
    return NextResponse.json({ ...habit, logs });
  }
  try {
    // Import pool dynamically only when not in demo mode
    const { pool } = await import('../../../../lib/db.js');
    const client = await pool.connect();
    try {
      const resHabit = await client.query(
        'SELECT id, name, description, target_count, created_at FROM habits WHERE id = $1 AND user_id = $2',
        [id, user.id],
      );
      if (resHabit.rowCount === 0) {
        return NextResponse.json({ error: 'Abitudine non trovata' }, { status: 404 });
      }
      const habit = resHabit.rows[0];
      const resLogs = await client.query('SELECT id, habit_id, date, count FROM habit_logs WHERE habit_id = $1', [id]);
      const logs = resLogs.rows.map((log) => ({ id: log.id, date: log.date.toISOString(), count: log.count }));
      return NextResponse.json({ ...habit, logs });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { id } = params;
  const body = await request.json();
  const parse = updateSchema.safeParse(body);
  if (!parse.success) {
    const { validationErrorResponse } = await import('../../../../lib/validate.js');
    return validationErrorResponse(parse.error);
  }
  const { name, description, target_count } = parse.data;

  // Demo mode: aggiorna l'abitudine nel file JSON
  if (isDemo()) {
    const data = await readDemo();
    const habitIndex = data.habits.findIndex((h) => h.id === id && h.user_id === user.id);
    if (habitIndex === -1) {
      return NextResponse.json({ error: 'Abitudine non trovata' }, { status: 404 });
    }
    const existing = data.habits[habitIndex];
    if (name !== undefined) existing.name = name;
    if (description !== undefined) existing.description = description ?? null;
    if (target_count !== undefined) existing.target_count = target_count;
    data.habits[habitIndex] = existing;
    await writeDemo(data);
    return NextResponse.json(existing);
  }
  try {
    // Import pool dynamically only when not in demo mode
    const { pool } = await import('../../../../lib/db.js');
    const client = await pool.connect();
    try {
      const check = await client.query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [id, user.id]);
      if (check.rowCount === 0) {
        return NextResponse.json({ error: 'Abitudine non trovata' }, { status: 404 });
      }
      const fields = [];
      const values = [];
      let idx = 1;
      if (name !== undefined) { fields.push(`name = $${++idx}`); values.push(name); }
      if (description !== undefined) { fields.push(`description = $${++idx}`); values.push(description || null); }
      if (target_count !== undefined) { fields.push(`target_count = $${++idx}`); values.push(target_count); }
      if (fields.length === 0) {
        return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
      }
      const query = `UPDATE habits SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING id, name, description, target_count`;
      const res = await client.query(query, [id, user.id, ...values]);
      return NextResponse.json(res.rows[0]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { id } = params;
  // Demo mode: elimina l'abitudine e i suoi log dal file JSON
  if (isDemo()) {
    const data = await readDemo();
    const habitIndex = data.habits.findIndex((h) => h.id === id && h.user_id === user.id);
    if (habitIndex === -1) {
      return NextResponse.json({ error: 'Abitudine non trovata' }, { status: 404 });
    }
    // Rimuovi l'abitudine
    data.habits.splice(habitIndex, 1);
    // Rimuovi anche i log associati
    data.habit_logs = data.habit_logs.filter((log) => !(log.habit_id === id && log.user_id === user.id));
    await writeDemo(data);
    return NextResponse.json({ success: true });
  }
  try {
    // Import pool dynamically only when not in demo mode
    const { pool } = await import('../../../../lib/db.js');
    const client = await pool.connect();
    try {
      const res = await client.query('DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id', [id, user.id]);
      if (res.rowCount === 0) {
        return NextResponse.json({ error: 'Abitudine non trovata' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}