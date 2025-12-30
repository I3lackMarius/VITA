import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '../../../lib/db.js';
import { getUserFromRequest } from '../../../lib/auth.js';

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  status: z.enum(['pending', 'completed']).optional(),
});

// GET /api/tasks
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  try {
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
    return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
  }
  const { title, description, due_date, status } = parse.data;
  try {
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