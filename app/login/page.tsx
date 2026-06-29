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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("email", data.user.email)
      .single();

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
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-[120px] w-[150px] items-center justify-center">
            <img src="/logo.png" alt="Vittaya Task logo" className="h-[120px] w-[120px] object-contain" />
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
              placeholder="กรอกอีเมลของคุณ"
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
              placeholder="กรอกรหัสผ่านของคุณ"
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

      </div>
    </div>
  );
}
