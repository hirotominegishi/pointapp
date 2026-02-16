"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session) {
    // ログイン済みならダッシュボードへ
    window.location.href = "/dashboard";
    return null;
  }

  const signUp = async () => {
    setMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else setMsg("登録OK。メール確認が必要な設定の場合は確認してください。");
  };

  const signIn = async () => {
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    if (error) setMsg("メールアドレスかパスワードが違います。");
  };

  const [mode, setMode] = useState<"login" | "reset">("login");

  const sendResetEmail = async () => {
    setMsg("メールアドレスを入力してください。");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setMsg("メールアドレスを入力してください。");
    else setMsg("パスワード再設定メールを送信しました。メールを確認してください。");
  };


  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>ポイント残高アプリ</h1>
      <p style={{ opacity: 0.7 }}>メール/パスワードでログイン</p>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 12, border: "1px solid #ccc", borderRadius: 10 }}
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 12, border: "1px solid #ccc", borderRadius: 10 }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={signIn}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #333", flex: 1 }}
          >
            ログイン
          </button>
          <button
            onClick={signUp}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ccc", flex: 1 }}
          >
            新規登録
          </button>
          

        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
            <button
              onClick={() => setMode(mode === "login" ? "reset" : "login")}
              style={{ background: "transparent", border: "none", color: "#06c", cursor: "pointer" }}
            >
              {mode === "login" ? "パスワードを忘れた" : "ログインに戻る"}
            </button>
          </div>

          {mode === "reset" && (
            <button
              onClick={sendResetEmail}
              style={{ padding: 12, borderRadius: 10, border: "1px solid #333", marginTop: 10, width: "100%" }}
            >
              再設定メールを送る
            </button>
          )}

        {msg && <div style={{ color: "#b00" }}>{msg}</div>}
      </div>
    </main>
  );
}
