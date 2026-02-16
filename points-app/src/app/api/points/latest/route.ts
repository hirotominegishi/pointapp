import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getPool } from "@/lib/tidb";

export async function GET(req: Request) {
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
  const pool = getPool();

  const [rows] = await pool.execute<any[]>(
    `
    SELECT
      a.id as account_id,
      a.provider,
      a.nickname,
      s.points,
      s.captured_at
    FROM point_accounts a
    LEFT JOIN (
      SELECT ps.*
      FROM point_snapshots ps
      JOIN (
        SELECT account_id, MAX(captured_at) as max_captured_at
        FROM point_snapshots
        GROUP BY account_id
      ) latest
      ON ps.account_id = latest.account_id AND ps.captured_at = latest.max_captured_at
    ) s
    ON a.id = s.account_id
    WHERE a.user_id = ?
    ORDER BY a.provider
    `,
    [userId]
  );

  return NextResponse.json({ items: rows });
}
