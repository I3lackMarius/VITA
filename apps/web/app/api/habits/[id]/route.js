import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '../../../../lib/db.js';
import { getUserFromRequest } from '../../../../lib/auth.js';

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
  try {
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
    return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
  }
  const { name, description, target_count } = parse.data;
  try {
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
  try {
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