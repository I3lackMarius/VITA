import { NextResponse } from 'next/server';
import { z } from 'zod';
// We import pool dynamically only when needed. Avoid static import for demo mode.
import { getUserFromRequest } from '../../../lib/auth.js';
import { isDemo, readDemo, writeDemo, newId } from '../../../lib/demoStore.js';

// Ensure filesystem API is available for demo mode
export const runtime = 'nodejs';

// Define schema for creating a new task. Title and due_date are required.
const taskSchema = z.object({
  title: z.string().min(1, { message: 'Il titolo è obbligatorio' }),
  description: z.string().optional().nullable(),
  due_date: z
    .string()
    .min(1, { message: 'La data di scadenza è obbligatoria' })
    .refine((val) => {
      // ensure date is valid and not in the past
      const date = new Date(val);
      if (Number.isNaN(date.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, { message: 'La data non può essere nel passato' }),
  status: z.enum(['pending', 'completed']).optional(),
});

// GET /api/tasks
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  // Demo mode: restituisce i task dal file JSON per l'utente corrente
  if (isDemo()) {
    const data = await readDemo();
    const tasks = data.tasks
      .filter((t) => t.user_id === user.id)
      // Ordina i task per data di creazione decrescente per coerenza con il DB
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return NextResponse.json({ tasks });
  }
  try {
    // Import pool dynamically to avoid creating a DB connection when in demo mode
    const { pool } = await import('../../../lib/db.js');
    const client = await pool.connect();
    try {
      const res = await client.query(
        'SELECT id, title, description, due_date, status, created_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
        [user.id],
      );
      return NextResponse.json({ tasks: res.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const body = await request.json();
  const parse = taskSchema.safeParse(body);
  if (!parse.success) {
    // Return a consistent validation error response
    const { validationErrorResponse } = await import('../../../lib/validate.js');
    return validationErrorResponse(parse.error);
  }
  const { title, description, due_date, status } = parse.data;

  // Demo mode: aggiunge un nuovo task al file JSON
  if (isDemo()) {
    const data = await readDemo();
    const task = {
      id: newId('t'),
      user_id: user.id,
      title,
      description: description ?? null,
      due_date: due_date ?? null,
      status: status ?? 'pending',
      created_at: new Date().toISOString(),
    };
    // Inserisce in cima alla lista per mantenere l'ordinamento
    data.tasks.unshift(task);
    await writeDemo(data);
    return NextResponse.json(task, { status: 201 });
  }
  try {
    // Import pool dynamically to avoid creating a DB connection when in demo mode
    const { pool } = await import('../../../lib/db.js');
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO tasks (user_id, title, description, due_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, title, description, due_date, status',
        [user.id, title, description || null, due_date || null, status || 'pending'],
      );
      return NextResponse.json(result.rows[0], { status: 201 });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}