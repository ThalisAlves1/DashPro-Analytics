"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else console.log("Logado:", data.user);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="rounded-xl bg-white p-8 shadow-lg w-96">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">DashPro Login</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded border px-3 py-2"
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded border px-3 py-2"
        />
        <button
          onClick={handleLogin}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}