"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  message: string;
  type: string;
  created_at: string;
  is_read: boolean;
};

const typeLabel: Record<string, { label: string; className: string }> = {
  new_task:  { label: "งานใหม่",  className: "bg-sky-100 text-sky-800" },
  completed: { label: "อนุมัติ",  className: "bg-emerald-100 text-emerald-800" },
  rejected:  { label: "ไม่ผ่าน", className: "bg-rose-100 text-rose-800" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("notifications")
        .select("id, message, type, created_at, is_read")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setNotifications(data as Notification[]);
      setLoading(false);

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6">
      <div className="mx-auto w-full max-w-md sm:max-w-lg space-y-4">

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/employee")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
            >
              ←
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-600">การแจ้งเตือน</p>
              <h1 className="text-lg font-semibold text-zinc-950">แจ้งเตือน</h1>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 flex items-center justify-center">
            <p className="text-sm text-zinc-500">กำลังโหลด...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 text-center">
            <p className="text-sm text-zinc-500">ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const meta = typeLabel[n.type] ?? { label: n.type, className: "bg-zinc-100 text-zinc-700" };
              return (
                <div
                  key={n.id}
                  className={`rounded-2xl p-4 shadow-sm ring-1 ${n.is_read ? "bg-white ring-zinc-200" : "bg-sky-50 ring-sky-200"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-900 leading-relaxed">{n.message}</p>
                    {!n.is_read && (
                      <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        ใหม่
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-zinc-500">{formatDate(n.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
