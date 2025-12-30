import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '../../../../lib/db.js';
import { getUserFromRequest } from '../../../../lib/auth.js';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  status: z.enum(['pending', 'completed']).optional(),
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
      const res = await client.query(
        'SELECT id, title, description, due_date, status, created_at FROM tasks WHERE id = $1 AND user_id = $2',
        [id, user.id],
      );
      if (res.rowCount === 0) {
        return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
      }
      return NextResponse.json(res.rows[0]);
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
  const { title, description, due_date, status } = parse.data;
  try {
    const client = await pool.connect();
    try {
      // Verifica proprietario
      const check = await client.query('SELECT id FROM tasks WHERE id = $1 AND user_id = $2', [id, user.id]);
      if (check.rowCount === 0) {
        return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
      }
      const fields = [];
      const values = [];
      let idx = 1;
      if (title !== undefined) { fields.push(`title = $${++idx}`); values.push(title); }
      if (description !== undefined) { fields.push(`description = $${++idx}`); values.push(description || null); }
      if (due_date !== undefined) { fields.push(`due_date = $${++idx}`); values.push(due_date || null); }
      if (status !== undefined) { fields.push(`status = $${++idx}`); values.push(status); }
      if (fields.length === 0) {
        return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
      }
      // Compose query string
      const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING id, title, description, due_date, status`;
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
      const res = await client.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id', [id, user.id]);
      if (res.rowCount === 0) {
        return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
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