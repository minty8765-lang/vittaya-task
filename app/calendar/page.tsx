"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TaskStatus = "open" | "in_progress" | "pending_approval" | "completed" | "rejected";

type Task = {
  id: string;
  task_code?: string;
  title: string;
  assigned_to: string | null;
  due_date: string | null;
  status: TaskStatus;
};

const statusColor: Record<TaskStatus, string> = {
  open: "bg-slate-100 text-slate-800",
  in_progress: "bg-sky-100 text-sky-800",
  pending_approval: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-900",
  rejected: "bg-rose-100 text-rose-900",
};

const statusLabel: Record<TaskStatus, string> = {
  open: "รอดำเนินการ",
  in_progress: "กำลังทำ",
  pending_approval: "รออนุมัติ",
  completed: "สำเร็จ",
  rejected: "ไม่ผ่าน",
};

function formatYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
    setSelectedDate(null);
  }

  useEffect(() => {
    supabase
      .from("tasks")
      .select("id, task_code, title, due_date, status, assigned_to")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => {
        if (data) setTasks(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.filter((t: any) => t.due_date).map((t: any) => ({
            id: t.id,
            task_code: t.task_code ?? undefined,
            title: t.title,
            assigned_to: t.assigned_to ?? null,
            due_date: t.due_date,
            status: t.status as TaskStatus,
          }))
        );
      });
  }, []);

  const today = new Date();
  const year = viewYear;
  const month = viewMonth;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!t.due_date) return acc;
    (acc[t.due_date] = acc[t.due_date] || []).push(t);
    return acc;
  }, {});

  const dayItems = (d: number | null) => {
    if (!d) return [];
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return tasksByDate[key] ?? [];
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("vittaya_current_user");
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6">
      <div className="mx-auto w-full max-w-md sm:max-w-lg space-y-4">
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
            >
              ←
            </button>

            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-600">ปฏิทินงาน</p>
              <h1 className="text-lg font-semibold text-zinc-950">ปฏิทินงาน</h1>
            </div>

            {/* Logout moved to bottom */}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100">‹ ก่อนหน้า</button>
            <span className="text-sm font-semibold text-zinc-950">{`เดือน ${String(month + 1).padStart(2, "0")} / ${year}`}</span>
            <button type="button" onClick={nextMonth} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100">ถัดไป ›</button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
            {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d) => (
              <div key={d} className="text-zinc-500 py-1">{d}</div>
            ))}
            {cells.map((day, idx) => {
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
              const dayTasks = day ? tasksByDate[dateStr!] ?? [] : [];
              const isToday = day === today.getDate() && viewYear === today.getFullYear() && viewMonth === today.getMonth();
              return (
                <button
                  key={idx}
                  onClick={() => day && setSelectedDate(dateStr)}
                  className={`min-h-[56px] flex flex-col items-start p-2 text-left rounded-lg ${isToday ? 'ring-1 ring-sky-200' : ''} ${day ? 'bg-white' : 'bg-transparent'}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-sm font-semibold ${day ? 'text-zinc-900' : 'text-zinc-400'}`}>{day ?? ''}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dayTasks.slice(0,3).map((t) => (
                      <span key={t.id} className={`rounded-full px-2 py-0.5 text-[11px] ${statusColor[t.status]}`}>{t.title}</span>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[11px] text-zinc-500">+{dayTasks.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout will be rendered after the day list below */}

        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900">รายการวันที่เลือก</h2>
          <p className="text-xs text-zinc-600">{selectedDate ?? 'ยังไม่ได้เลือกวันที่'}</p>

          <div className="mt-3 space-y-2">
            {selectedDate && (tasksByDate[selectedDate] ?? []).length === 0 && (
              <div className="text-sm text-zinc-600">ไม่มีงานในวันนี้</div>
            )}

            {selectedDate && (tasksByDate[selectedDate] ?? []).map((t) => (
              <div key={t.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{t.title}</p>
                    <p className="text-xs text-zinc-600">Due: {t.due_date}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[t.status]}`}>{statusLabel[t.status]}</span>
                    <p className="text-xs text-zinc-600 mt-1">{t.due_date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center pb-8">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full max-w-md rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 font-semibold hover:bg-rose-100"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}
