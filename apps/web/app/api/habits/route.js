import { NextResponse } from 'next/server';
import { z } from 'zod';
// We'll import pool dynamically when needed to avoid DB connection in demo mode
import { getUserFromRequest } from '../../../lib/auth.js';
import { isDemo, readDemo, writeDemo, newId } from '../../../lib/demoStore.js';

// Enable Node.js runtime for demo mode
export const runtime = 'nodejs';

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
  // Demo mode: recupera abitudini e log dal file JSON
  if (isDemo()) {
    const data = await readDemo();
    // Filtra le abitudini per l'utente
    const habits = data.habits
      .filter((h) => h.user_id === user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // Costruisce la mappa dei log
    const logsMap = {};
    data.habit_logs
      .filter((l) => l.user_id === user.id)
      .forEach((log) => {
        if (!logsMap[log.habit_id]) logsMap[log.habit_id] = [];
        logsMap[log.habit_id].push({
          id: log.id,
          date: log.date,
          count: log.count,
        });
      });
    const habitsWithLogs = habits.map((h) => ({ ...h, logs: logsMap[h.id] || [] }));
    return NextResponse.json({ habits: habitsWithLogs });
  }
  try {
    // Import pool dynamically only when not in demo mode
    const { pool } = await import('../../../lib/db.js');
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
    const { validationErrorResponse } = await import('../../../lib/validate.js');
    return validationErrorResponse(parse.error);
  }
  const { name, description, target_count } = parse.data;

  // Demo mode: aggiunge una nuova abitudine al file JSON
  if (isDemo()) {
    const data = await readDemo();
    const habit = {
      id: newId('h'),
      user_id: user.id,
      name,
      description: description ?? null,
      target_count: target_count ?? null,
      created_at: new Date().toISOString(),
    };
    data.habits.unshift(habit);
    await writeDemo(data);
    return NextResponse.json(habit, { status: 201 });
  }
  try {
    // Import pool dynamically only when not in demo mode
    const { pool } = await import('../../../lib/db.js');
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