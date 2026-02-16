import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getPool } from "@/lib/tidb";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const userId = data.user.id;
  const email = data.user.email ?? null;

  const pool = getPool();

  // profiles upsert
  await pool.execute(
    `INSERT INTO profiles (id, email) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE email = VALUES(email)`,
    [userId, email]
  );

  // point_accounts ensure 2 providers exist
  const [rows] = await pool.execute<any[]>(
    `SELECT provider FROM point_accounts WHERE user_id = ?`,
    [userId]
  );
  const existing = new Set(rows.map((r) => r.provider));

  // providers を取得
  const [providers] = await pool.execute<any[]>(
    `SELECT code, name FROM point_providers ORDER BY id`
  );

  // user のアカウントを用意（存在しなければ作る）
  for (const p of providers) {
    await pool.execute(
      `INSERT IGNORE INTO point_accounts (user_id, provider, nickname)
     VALUES (?, ?, ?)`,
      [userId, p.code, p.name]
    );
  }


  return NextResponse.json({ ok: true });
}
