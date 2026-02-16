import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getPool } from "@/lib/tidb";

async function requireUserId(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function GET(req: Request) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    `SELECT code, name FROM point_providers ORDER BY id`
  );

  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const userId = await requireUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);

  // codeは任意（空なら自動生成）
  let code = (body?.code ?? "").toString().trim().toLowerCase();
  const name = (body?.name ?? "").toString().trim();

  if (!name) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const pool = getPool();

  // ---- code自動生成 ----
  if (!code) {
    const lowerName = name.toLowerCase();

    // よくあるブランドは確実に綺麗なcodeへ
    const presets: Array<[RegExp, string]> = [
      [/paypay|ペイペイ/, "paypay"],
      [/rakuten|楽天/, "rakuten"],
      [/dポイント|dpoint|docomo|ドコモ/, "dpoint"],
      [/ponta|ポンタ/, "ponta"],
      [/vポイント|tポイント|vpoint|tpoint/, "vpoint"],
      [/waon|ワオン/, "waon"],
      [/nanaco|ナナコ/, "nanaco"],
      [/line\s*point|lineポイント|ラインポイント/, "linepoint"],
    ];

    let base = "";
    for (const [re, c] of presets) {
      if (re.test(lowerName)) {
        base = c;
        break;
      }
    }

    // 当たらない場合：英数字だけ抽出（なければ provider）
    if (!base) {
      base = name
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

      if (!base) base = "provider";
    }

    // UNIQUE回避：base, base_2, base_3...
    let candidate = base;
    let n = 1;
    while (true) {
      const [rows] = await pool.execute<any[]>(
        `SELECT code FROM point_providers WHERE code = ? LIMIT 1`,
        [candidate]
      );
      if (rows.length === 0) break;
      n += 1;
      candidate = `${base}_${n}`;
    }
    code = candidate;
  }

  // codeの最終バリデーション
  if (!/^[a-z0-9_]+$/.test(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }

  await pool.execute(
    `INSERT INTO point_providers (code, name)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [code, name]
  );

  // 生成したcodeを返す（フロントで自動選択に使う）
  return NextResponse.json({ ok: true, code });
}
