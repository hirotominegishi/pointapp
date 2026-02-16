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

// export async function DELETE(req: Request, { params }: { params: { id: string } }) {
//   const userId = await getUserId(req);
//   if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const memoId = Number(params.id);
//   if (!Number.isFinite(memoId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

//   const pool = getPool();
//   await pool.execute(`DELETE FROM memos WHERE id = ? AND user_id = ?`, [memoId, userId]);

//   return NextResponse.json({ ok: true });
// }
