// import { NextResponse } from "next/server";
// import { supabase } from "@/lib/supabaseClient";
// import { getPool } from "@/lib/tidb";

// async function getUserId(req: Request) {
//   const authHeader = req.headers.get("authorization");
//   if (!authHeader?.startsWith("Bearer ")) return null;
//   const token = authHeader.replace("Bearer ", "");
//   const { data, error } = await supabase.auth.getUser(token);
//   if (error || !data.user) return null;
//   return data.user.id;
// }

// export async function GET(req: Request) {
//   const userId = await getUserId(req);
//   if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const pool = getPool();
//   const [rows] = await pool.execute<any[]>(
//     `SELECT id, title, body, created_at, updated_at
//      FROM memos
//      WHERE user_id = ?
//      ORDER BY created_at DESC
//      LIMIT 50`,
//     [userId]
//   );

//   return NextResponse.json({ items: rows });
// }

// export async function POST(req: Request) {
//   const userId = await getUserId(req);
//   if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const body = await req.json().catch(() => null);
//   const title = (body?.title ?? "").toString().trim();
//   const memoBody = (body?.body ?? "").toString();

//   if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

//   const pool = getPool();
//   await pool.execute(
//     `INSERT INTO memos (user_id, title, body) VALUES (?, ?, ?)`,
//     [userId, title, memoBody]
//   );

//   return NextResponse.json({ ok: true });
// }
