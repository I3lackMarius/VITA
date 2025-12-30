import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '../../../lib/db.js';
import { getUserFromRequest } from '../../../lib/auth.js';

const habitSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  target_count: z.number().int().positive().optional(),
});

export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  try {
    const client = await pool.connect();
    try {
      // Recupera tutte le abitudini
      const resHabits = await client.query(
        'SELECT id, name, description, target_count, created_at FROM habits WHERE user_id = $1 ORDER BY created_at DESC',
        [user.id],
      );
      const habits = resHabits.rows;
      // Recupera i log per tutte le abitudini
      const habitIds = habits.map((h) => h.id);
      let logs = [];
      if (habitIds.length > 0) {
        const logsRes = await client.query(
          'SELECT id, habit_id, date, count FROM habit_logs WHERE habit_id = ANY($1)',
          [habitIds],
        );
        logs = logsRes.rows;
      }
      // Raggruppa log per abitudine
      const logsMap = {};
      logs.forEach((log) => {
        if (!logsMap[log.habit_id]) logsMap[log.habit_id] = [];
        logsMap[log.habit_id].push({ id: log.id, date: log.date.toISOString(), count: log.count });
      });
      const habitsWithLogs = habits.map((h) => ({ ...h, logs: logsMap[h.id] || [] }));
      return NextResponse.json({ habits: habitsWithLogs });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const body = await request.json();
  const parse = habitSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
  }
  const { name, description, target_count } = parse.data;
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(
        'INSERT INTO habits (user_id, name, description, target_count) VALUES ($1, $2, $3, $4) RETURNING id, name, description, target_count',
        [user.id, name, description || null, target_count || null],
      );
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}