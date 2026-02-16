"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Provider = { code: string; name: string };

type Item = {
  account_id: number;
  provider: string;
  nickname: string;
  points: number | null;
  captured_at: string | null;
  note?: string | null;
};

type HistoryItem = {
  id: number;
  points: number;
  captured_at: string;
  note: string | null;
};

function NoteCell({ note }: { note: string | null }) {
  const [open, setOpen] = useState(false);
  if (!note) return <span style={{ opacity: 0.5 }}>—</span>;

  const short = note.length > 30 ? note.slice(0, 30) + "…" : note;

  return (
    <div>
      <div style={{ whiteSpace: "pre-wrap" }}>{open ? note : short}</div>
      {note.length > 30 && (
        <button
          onClick={() => setOpen(!open)}
          style={{
            marginTop: 4,
            border: "1px solid #ccc",
            background: "transparent",
            borderRadius: 8,
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {open ? "閉じる" : "もっと見る"}
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // 残高登録フォーム
  const [provider, setProvider] = useState<string>("");
  const [points, setPoints] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // 種別追加フォーム（表示名だけ）
  const [newName, setNewName] = useState("");

  // 履歴（選択中の種別）
  const [historyProvider, setHistoryProvider] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState("");

  const filterHistory = (list: HistoryItem[], q: string) => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return list;
    return list.filter((h) => {
      const s = [String(h.points ?? ""), h.captured_at ?? "", h.note ?? ""].join(" ").toLowerCase();
      return s.includes(keyword);
    });
  };

  const filteredHistory = useMemo(
    () => filterHistory(history, historySearch),
    [history, historySearch]
  );

  const loadProviders = async (token: string) => {
    const res = await fetch("/api/providers", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error("providers failed:", res.status, await res.text().catch(() => ""));
      return [] as Provider[];
    }
    const json = await res.json();
    const list = (json.items ?? []) as Provider[];
    setProviders(list);

    // 初期選択
    const first = list[0]?.code ?? "";
    if (!provider && first) setProvider(first);
    if (!historyProvider && first) setHistoryProvider(first);

    return list;
  };

  const loadLatest = async (token: string) => {
    const res = await fetch("/api/points/latest", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error("latest failed:", res.status, await res.text().catch(() => ""));
      return;
    }
    const json = await res.json();
    setItems(json.items ?? []);
  };

  const loadHistory = async (token: string, p: string) => {
    if (!p) return;
    const res = await fetch(`/api/points/history?provider=${encodeURIComponent(p)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error("history failed:", p, res.status, await res.text().catch(() => ""));
      setHistory([]);
      return;
    }
    const json = await res.json();
    setHistory((json.items ?? []) as HistoryItem[]);
  };

  const loadAll = async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      window.location.href = "/";
      return;
    }

    // init（profiles + provider分のpoint_accounts用意）
    await fetch("/api/init", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const list = await loadProviders(token);
    await loadLatest(token);

    const hp = historyProvider || list[0]?.code || "";
    if (hp) await loadHistory(token, hp);

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 履歴のタブを切り替えたら読み直す
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      if (!historyProvider) return;
      await loadHistory(token, historyProvider);
    })();
  }, [historyProvider]);

  const addSnapshot = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;

    await fetch("/api/points/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        provider,
        points: Number(points),
        note: note.trim() || null,
      }),
    });

    setPoints("");
    setNote("");

    await loadLatest(token);
    if (historyProvider) await loadHistory(token, historyProvider);
  };

  const addProvider = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;

    const name = newName.trim();
    if (!name) return;

    const res = await fetch("/api/providers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }), // ← code送らない
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      alert(text || "追加に失敗しました");
      return;
    }

    const json = text ? JSON.parse(text) : {};
    const createdCode = (json.code ?? "") as string;

    setNewName("");

    // initを叩くと、そのprovider分のpoint_accountsが作られる
    await fetch("/api/init", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const list = await loadProviders(token);
    await loadLatest(token);

    // 追加したものへ自動選択（APIが返したcodeを使う）
    if (createdCode && list.find((p) => p.code === createdCode)) {
      setProvider(createdCode);
      setHistoryProvider(createdCode);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const historyTitle =
    providers.find((p) => p.code === historyProvider)?.name || historyProvider || "履歴";

  return (
    <main style={{ maxWidth: 980, margin: "20px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>ダッシュボード</h1>
        <button onClick={signOut} style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}>
          ログアウト
        </button>
      </div>

      {/* ポイント種別追加（表示名だけ） */}
      <section style={{ marginTop: 16, padding: 14, border: "1px solid #ddd", borderRadius: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>ポイント種別を追加</h2>
        <p style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
        </p>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
          <input
            placeholder="表示名（例: PayPayポイント）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc", gridColumn: "1 / -1" }}
          />
          <button
            onClick={addProvider}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #333", gridColumn: "1 / -1" }}
          >
            追加
          </button>
        </div>
      </section>

      {/* 残高登録 */}
      <section style={{ marginTop: 16, padding: 14, border: "1px solid #ddd", borderRadius: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>残高を登録</h2>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc" }}
          >
            {providers.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
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
            onClick={addSnapshot}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #333", gridColumn: "1 / -1" }}
          >
            追加
          </button>
        </div>
      </section>

      {/* 最新残高 */}
      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>最新残高</h2>

        {loading ? (
          <p>読み込み中...</p>
        ) : (
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {items.map((it) => (
              <div
                key={`${it.account_id}-${it.provider}`}
                style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}
              >
                <div style={{ fontWeight: 900 }}>{it.nickname}</div>
                <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>{it.points ?? 0} pt</div>

                <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
                  最終更新: {it.captured_at ? new Date(it.captured_at).toLocaleString() : "未登録"}
                </div>

                {it.note && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 10,
                      background: "#f7f7f7",
                      border: "1px solid #eee",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7 }}>メモ</div>
                    <div style={{ marginTop: 4 }}>{it.note}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 履歴（タブ＋検索＋折りたたみ） */}
      <section style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>履歴（直近10件）: {historyTitle}</h2>

          <input
            placeholder="検索（pt/メモ/日時）"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", minWidth: 240 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {providers.map((p) => (
            <button
              key={p.code}
              onClick={() => setHistoryProvider(p.code)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid #ccc",
                background: historyProvider === p.code ? "#111" : "transparent",
                color: historyProvider === p.code ? "#fff" : "#111",
                cursor: "pointer",
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto", marginTop: 12, border: "1px solid #ddd", borderRadius: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>pt</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>日時</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #eee" }}>メモ</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((h) => (
                <tr key={h.id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3", fontWeight: 800 }}>
                    {h.points} pt
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3", fontSize: 12, opacity: 0.8 }}>
                    {new Date(h.captured_at).toLocaleString()}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f3f3" }}>
                    <NoteCell note={h.note} />
                  </td>
                </tr>
              ))}

              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 12, opacity: 0.7 }}>
                    該当する履歴がありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
