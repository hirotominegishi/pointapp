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

  const body = await req.json().catch(() => null);
  const provider = body?.provider as "rakuten" | "dpoint";
  const points = Number(body?.points);
  const note = typeof body?.note === "string" ? body.note : null;

  if (!["rakuten", "dpoint"].includes(provider) || !Number.isFinite(points)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const pool = getPool();

  // account_id を取得
  const [accRows] = await pool.execute<any[]>(
    `SELECT id FROM point_accounts WHERE user_id = ? AND provider = ? LIMIT 1`,
    [userId, provider]
  );
  if (accRows.length === 0) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  const accountId = accRows[0].id;

  await pool.execute(
    `INSERT INTO point_snapshots (account_id, points, note) VALUES (?, ?, ?)`,
    [accountId, points, note]
  );

  return NextResponse.json({ ok: true });
}
