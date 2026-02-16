"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(false);

  // リセットリンクから戻ってきたときにセッションがセットされるので待つ
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const updatePassword = async () => {
    setMsg("");
    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    });
    if (error) {
      setMsg(`失敗: ${error.message}`);
      return;
    }
    setMsg("パスワードを更新しました。ログイン画面へ戻ってください。");
  };

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>パスワード再設定</h1>
      <p style={{ opacity: 0.7 }}>
        メールのリンクから来た場合、ここで新しいパスワードを設定できます。
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <input
          type="password"
          placeholder="新しいパスワード（6文字以上）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 12, border: "1px solid #ccc", borderRadius: 10 }}
        />

        <button
          onClick={updatePassword}
          disabled={!ready}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #333" }}
        >
          パスワードを更新
        </button>

        {msg && <div style={{ color: msg.startsWith("失敗") ? "#b00" : "#060" }}>{msg}</div>}

        <a href="/" style={{ color: "#06c" }}>
          ログイン画面へ戻る
        </a>
      </div>
    </main>
  );
}
