import { NextResponse } from 'next/server';
import { z } from 'zod';
// Dynamic import of pool will be used in each handler to avoid DB connections in demo mode
import { getUserFromRequest } from '../../../../lib/auth.js';
import { isDemo, readDemo, writeDemo } from '../../../../lib/demoStore.js';

export const runtime = 'nodejs';

// Schema for updating a task. If due_date is provided, ensure it is not in the past.
const updateSchema = z.object({
  title: z.string().min(1, { message: 'Il titolo è obbligatorio' }).optional(),
  description: z.string().optional().nullable(),
  due_date: z
    .string()
    .min(1, { message: 'La data di scadenza è obbligatoria' })
    .refine((val) => {
      if (val === undefined || val === null) return true;
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, { message: 'La data non può essere nel passato' })
    .optional()
    .nullable(),
  status: z.enum(['pending', 'completed']).optional(),
});

export async function GET(request, { params }) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { id } = params;
  // Demo mode: restituisce il task dal file JSON
  if (isDemo()) {
    const data = await readDemo();
    const task = data.tasks.find((t) => t.id === id && t.user_id === user.id);
    if (!task) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }
    return NextResponse.json(task);
  }
  try {
    // Import pool dynamically only when not in demo mode
    const { pool } = await import('../../../../lib/db.js');
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
    const { validationErrorResponse } = await import('../../../../lib/validate.js');
    return validationErrorResponse(parse.error);
  }
  const { title, description, due_date, status } = parse.data;

  // Demo mode: aggiorna un task nel file JSON
  if (isDemo()) {
    const data = await readDemo();
    const taskIndex = data.tasks.findIndex((t) => t.id === id && t.user_id === user.id);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }
    const existing = data.tasks[taskIndex];
    // Aggiorna solo i campi presenti
    if (title !== undefined) existing.title = title;
    if (description !== undefined) existing.description = description ?? null;
    if (due_date !== undefined) existing.due_date = due_date ?? null;
    if (status !== undefined) existing.status = status;
    data.tasks[taskIndex] = existing;
    await writeDemo(data);
    return NextResponse.json(existing);
  }
  try {
    // Import pool dynamically only when not in demo mode
    const { pool } = await import('../../../../lib/db.js');
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
  // Demo mode: elimina un task dal file JSON
  if (isDemo()) {
    const data = await readDemo();
    const taskIndex = data.tasks.findIndex((t) => t.id === id && t.user_id === user.id);
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }
    data.tasks.splice(taskIndex, 1);
    await writeDemo(data);
    return NextResponse.json({ success: true });
  }
  try {
    // Import pool dynamically only when not in demo mode
    const { pool } = await import('../../../../lib/db.js');
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