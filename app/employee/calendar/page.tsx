"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TaskStatus = "in_progress" | "pending_approval" | "completed" | "rejected";

type Task = {
  id: string;
  task_code?: string;
  title: string;
  description: string;
  due_date: string | null;
  priority: string;
  status: TaskStatus;
  submittedAt?: string;
  resubmitDueDate?: string;
};

const statusLabels: Record<TaskStatus, string> = {
  in_progress: "กำลังทำ",
  pending_approval: "รออนุมัติ",
  completed: "สำเร็จ",
  rejected: "ไม่ผ่าน",
};

const statusStyles: Record<TaskStatus, string> = {
  in_progress: "bg-sky-100 text-sky-800",
  pending_approval: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};


const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

function getTimeStatus(
  dueDate: string,
  submittedAt: string | undefined,
  status: TaskStatus,
  resubmitDueDate?: string,
) {
  const now = Date.now();

  // completed / pending_approval: compare earliest submission date vs due_date
  if (submittedAt && (status === "completed" || status === "pending_approval")) {
    const dueDay = new Date(dueDate); dueDay.setHours(0, 0, 0, 0);
    const subDay = new Date(submittedAt); subDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((subDay.getTime() - dueDay.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `ส่งก่อนกำหนด ${Math.abs(diffDays)} วัน`, color: "text-emerald-700" };
    if (diffDays === 0) return { text: "ส่งตรงเวลา", color: "text-emerald-700" };
    return { text: `ส่งช้า ${diffDays} วัน`, color: "text-orange-600" };
  }

  // rejected: count down to resubmit_due_date (if set) or original due_date
  if (status === "rejected") {
    const deadline = new Date((resubmitDueDate ?? dueDate) + "T23:59:59").getTime();
    const diff = deadline - now;
    const label = resubmitDueDate ? "กำหนดแก้ไข" : "กำหนดส่ง";
    if (diff >= 0) {
      if (diff >= MS_PER_DAY) return { text: `เหลืออีก ${Math.ceil(diff / MS_PER_DAY)} วัน`, color: "text-orange-600" };
      return { text: `เหลืออีก ${Math.max(1, Math.ceil(diff / MS_PER_HOUR))} ชม.`, color: "text-orange-600" };
    }
    const late = now - deadline;
    if (late >= MS_PER_DAY) return { text: `เกิน${label} ${Math.ceil(late / MS_PER_DAY)} วัน`, color: "text-red-600" };
    return { text: `เกิน${label} ${Math.max(1, Math.ceil(late / MS_PER_HOUR))} ชม.`, color: "text-red-600" };
  }

  // in_progress / open: count down to original due_date
  const due = new Date(dueDate + "T23:59:59").getTime();
  const diff = due - now;
  if (diff >= 0) {
    if (diff >= MS_PER_DAY) return { text: `เหลืออีก ${Math.ceil(diff / MS_PER_DAY)} วัน`, color: "text-sky-700" };
    return { text: `เหลืออีก ${Math.max(1, Math.ceil(diff / MS_PER_HOUR))} ชม.`, color: "text-sky-700" };
  }
  const late = now - due;
  if (late >= MS_PER_DAY) return { text: `เกินกำหนด ${Math.ceil(late / MS_PER_DAY)} วัน`, color: "text-red-600" };
  return { text: `เกินกำหนด ${Math.max(1, Math.ceil(late / MS_PER_HOUR))} ชม.`, color: "text-red-600" };
}

const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const THAI_DAYS_SHORT = ["อา","จ","อ","พ","พฤ","ศ","ส"];

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatThaiDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}

const statusDotColor: Record<TaskStatus, string> = {
  in_progress: "bg-sky-500",
  pending_approval: "bg-amber-400",
  completed: "bg-emerald-500",
  rejected: "bg-rose-500",
};

export default function EmployeeCalendarPage() {
  const router = useRouter();
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(4); // พฤษภาคม = index 4
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("vittaya_current_user");
    if (!raw) { router.push("/login"); return; }
    const user = JSON.parse(raw);
    supabase
      .from("tasks")
      .select("id, task_code, title, description, status, due_date, resubmit_due_date, task_submissions(created_at)")
      .eq("assigned_to", user.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => {
        if (data) setTasks(data.map((t: any) => {
          const subs: { created_at: string }[] = Array.isArray(t.task_submissions) ? t.task_submissions : [];
          const earliestSub = subs.length > 0
            ? subs.reduce((a, b) => new Date(a.created_at) < new Date(b.created_at) ? a : b)
            : null;
          return {
            id: t.id,
            task_code: t.task_code ?? undefined,
            title: t.title,
            description: t.description || "",
            due_date: t.due_date || null,
            priority: "ปานกลาง",
            status: t.status as TaskStatus,
            submittedAt: earliestSub?.created_at ?? undefined,
            resubmitDueDate: t.resubmit_due_date ?? undefined,
          };
        }));
      });
  }, [router]);

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!task.due_date) return acc;
    if (!acc[task.due_date]) acc[task.due_date] = [];
    acc[task.due_date].push(task);
    return acc;
  }, {});

  const cells = buildCalendarCells(viewYear, viewMonth);
  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : [];

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("vittaya_current_user");
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 sm:px-5 sm:py-7">
      <div className="mx-auto w-full max-w-md sm:max-w-lg space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3 rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <button
            type="button"
            onClick={() => router.push("/employee")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
          >
            ←
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-600">ปฏิทิน</p>
            <h1 className="text-lg font-semibold text-zinc-950">ปฏิทินงานของฉัน</h1>
          </div>
        </div>

        {/* Calendar card */}
        <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          {/* Month navigation */}
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
            >
              ‹ ก่อนหน้า
            </button>
            <p className="text-sm font-semibold text-zinc-950">
              {THAI_MONTHS[viewMonth]} {viewYear + 543}
            </p>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
            >
              ถัดไป ›
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="mb-1 grid grid-cols-7">
            {THAI_DAYS_SHORT.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-semibold text-zinc-400">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const ds = toDateStr(viewYear, viewMonth, day);
              const dayTasks = tasksByDate[ds] ?? [];
              const hasTasks = dayTasks.length > 0;
              const isSelected = ds === selectedDate;
              const isToday = ds === todayStr;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : ds)}
                  className={`relative flex flex-col items-center rounded-xl py-1.5 text-sm transition ${
                    isSelected
                      ? "bg-sky-600 font-semibold text-white"
                      : isToday
                      ? "bg-sky-50 font-semibold text-sky-700"
                      : "font-medium text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  {day}
                  {hasTasks && (
                    <div className="mt-0.5 flex gap-0.5">
                      {dayTasks.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white/80" : statusDotColor[t.status]}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 border-t border-zinc-100 pt-3">
            {(Object.entries(statusLabels) as [TaskStatus, string][]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${statusDotColor[k]}`} />
                <span className="text-[10px] text-zinc-500">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected date tasks */}
        {selectedDate && (
          <div className="space-y-3">
            <p className="px-1 text-sm font-semibold text-zinc-600">
              {selectedTasks.length > 0
                ? `งาน due date ${selectedDate} (${selectedTasks.length} งาน)`
                : `ไม่มีงาน due date วันที่ ${selectedDate}`}
            </p>

            {selectedTasks.length === 0 && (
              <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-5 text-center text-sm text-zinc-500">
                ไม่มีงานในวันนี้
              </div>
            )}

            {selectedTasks.map((task) => {
              const ts = getTimeStatus(task.due_date!, task.submittedAt, task.status, task.resubmitDueDate);
              return (
                <div key={task.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-zinc-200">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[task.status]}`}>
                      {statusLabels[task.status]}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">{task.task_code ?? task.id.slice(0, 8)}</p>
                  <h3 className="mt-1 text-base font-semibold text-zinc-950">{task.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{task.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="text-xs text-zinc-500">
                      Due: <span className="font-medium text-zinc-700">{task.due_date}</span>
                    </span>
                    <span className={`text-xs font-semibold ${ts.color}`}>{ts.text}</span>
                  </div>
                  {task.submittedAt && (
                    <p className="mt-1 text-xs text-zinc-500">
                      วันที่ส่งงาน: <span className="font-medium text-zinc-700">{formatThaiDate(task.submittedAt)}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-semibold text-rose-700 hover:bg-rose-100"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}
