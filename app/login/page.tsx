"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    console.log("[login] auth user email:", data.user.email);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("email", data.user.email)
      .single();

    console.log("[login] profile:", profile);
    console.log("[login] profileError:", profileError);

    if (!profile) {
      setError("ไม่พบข้อมูลผู้ใช้ในระบบ");
      setLoading(false);
      return;
    }

    localStorage.setItem("vittaya_current_user", JSON.stringify({
      id: profile.id,
      name: profile.full_name,
      email: data.user.email,
      role: profile.role,
    }));

    if (profile.role === "admin") {
      router.push("/dashboard");
    } else {
      router.push("/employee");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-6">
      <div className="mx-auto w-full max-w-md sm:max-w-lg rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 sm:p-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-[120px] w-[120px] items-center justify-center rounded-3xl bg-sky-50 shadow-sm">
            <img src="/logo.png" alt="Vittaya Task logo" className="h-[96px] w-[96px] object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-zinc-950">Vittaya Task</h1>
            <p className="mt-2 text-sm text-zinc-600">ระบบสำหรับมอบหมายและส่งงาน</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              อีเมล
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@vittaya.com"
              className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              รหัสผ่าน
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="123456"
              className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
          <p className="text-sm font-semibold text-zinc-900">บัญชีทดลอง</p>
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-zinc-900">Admin</p>
              <p className="text-sm text-zinc-600">admin@vittaya.com / 123456</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-zinc-900">Employee</p>
              <p className="text-sm text-zinc-600">employee@vittaya.com / 123456</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
