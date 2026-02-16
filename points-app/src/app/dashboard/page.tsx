"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  account_id: number;
  provider: "rakuten" | "dpoint";
  nickname: string;
  points: number | null;
  captured_at: string | null;
};

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<"rakuten" | "dpoint">("rakuten");
  const [points, setPoints] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      window.location.href = "/";
      return;
    }

    // 初期化（profilesとアカウント2つを用意）
    await fetch("/api/init", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await fetch("/api/points/latest", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setItems(json.items ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;

    await fetch("/api/points/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider, points: Number(points), note }),
    });

    setPoints("");
    setNote("");
    await load();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <main style={{ maxWidth: 900, margin: "20px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>ダッシュボード</h1>
        <button onClick={signOut} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}>
          ログアウト
        </button>
      </div>

      <section style={{ marginTop: 16, padding: 14, border: "1px solid #ddd", borderRadius: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>残高を登録</h2>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as any)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
          >
            <option value="rakuten">楽天ポイント</option>
            <option value="dpoint">dポイント</option>
          </select>

          <input
            placeholder="例: 1234"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
          />

          <input
            placeholder="メモ（任意）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc", gridColumn: "1 / -1" }}
          />

          <button
            onClick={add}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #333", gridColumn: "1 / -1" }}
          >
            追加
          </button>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>最新残高</h2>

        {loading ? (
          <p>読み込み中...</p>
        ) : (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {items.map((it) => (
              <div key={it.account_id} style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 800 }}>{it.nickname}</div>
                <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
                  {it.points ?? 0} pt
                </div>
                <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
                  最終更新: {it.captured_at ? new Date(it.captured_at).toLocaleString() : "未登録"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
