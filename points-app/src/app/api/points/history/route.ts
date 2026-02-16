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

  const url = new URL(req.url);
  const provider = (url.searchParams.get("provider") ?? "").toString().trim().toLowerCase();
  if (!provider) {
    return NextResponse.json({ error: "Bad provider" }, { status: 400 });
  }

  const pool = getPool();

  // ✅ providersテーブルに存在するcodeかチェック
  const [pRows] = await pool.execute<any[]>(
    `SELECT code FROM point_providers WHERE code = ? LIMIT 1`,
    [provider]
  );
  if (pRows.length === 0) {
    return NextResponse.json({ error: "Bad provider" }, { status: 400 });
  }

  // user_id + provider から account_id を特定
  const [accRows] = await pool.execute<any[]>(
    `SELECT id FROM point_accounts WHERE user_id = ? AND provider = ? LIMIT 1`,
    [userId, provider]
  );
  if (accRows.length === 0) {
    // providerはあるが、このユーザーのアカウントがまだ無いケース
    return NextResponse.json({ items: [] });
  }
  const accountId = accRows[0].id;

  // 直近10件（同時刻対策で id DESC も付ける）
  const [rows] = await pool.execute<any[]>(
    `SELECT id, points, captured_at, note
     FROM point_snapshots
     WHERE account_id = ?
     ORDER BY captured_at DESC, id DESC
     LIMIT 10`,
    [accountId]
  );

  return NextResponse.json({ items: rows });
}
