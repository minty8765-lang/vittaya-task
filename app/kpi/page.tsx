"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type EmployeeKPI = {
  name: string;
  totalTasks: number;
  onTimeTasks: number;
  completedTasks: number;
  lateTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  pendingApprovalTasks: number;
  rejectedTasks: number;
  completionRate: number;
};

type StoredTask = {
  id: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assignee: any;
};

function calcKPI(emp: EmployeeKPI) {
  const t = emp.totalTasks;
  if (t === 0) return 0;
  const score =
    (emp.onTimeTasks / t) * 70 +
    (emp.completedTasks / t) * 20 -
    (emp.lateTasks / t) * 10 -
    (emp.overdueTasks / t) * 10;
  // clamp 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

function levelAndColor(score: number) {
  if (score >= 90) return { level: "ดีมาก", color: "bg-emerald-100 text-emerald-900" };
  if (score >= 75) return { level: "ดี", color: "bg-sky-100 text-sky-900" };
  if (score >= 60) return { level: "ต้องปรับปรุง", color: "bg-amber-100 text-amber-900" };
  return { level: "น่าเป็นห่วง", color: "bg-rose-100 text-rose-900" };
}

export default function KpiPage() {
  const router = useRouter();
  const [taskList, setTaskList] = useState<StoredTask[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("vittaya_current_user");
    if (!raw) { router.push("/login"); return; }
    const user = JSON.parse(raw);
    if (user.role !== "admin") { router.push("/login"); return; }
  }, [router]);

  useEffect(() => {
    supabase
      .from("tasks")
      .select("id, status, assigned_to, due_date, assignee:profiles!tasks_assigned_to_fkey(full_name, email)")
      .not("assigned_to", "is", null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => { if (data) setTaskList(data as any); });
  }, []);

  const employees = (() => {
    if (taskList.length === 0) return [];

    const grouped: Record<string, StoredTask[]> = {};
    for (const t of taskList) {
      if (!t.assigned_to) continue;
      if (!grouped[t.assigned_to]) grouped[t.assigned_to] = [];
      grouped[t.assigned_to].push(t);
    }

    return Object.entries(grouped).map(([, tasks]) => {
      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === "completed").length;
      const inProgress = tasks.filter((t) => t.status === "in_progress").length;
      const pendingApproval = tasks.filter((t) => t.status === "pending_approval").length;
      const rejected = tasks.filter((t) => t.status === "rejected").length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const assignee = tasks[0]?.assignee;
      return {
        name: assignee?.full_name || assignee?.email || "ไม่ระบุชื่อ",
        totalTasks: total,
        onTimeTasks: 0,
        completedTasks: completed,
        lateTasks: 0,
        overdueTasks: 0,
        inProgressTasks: inProgress,
        pendingApprovalTasks: pendingApproval,
        rejectedTasks: rejected,
        completionRate,
      };
    });
  })();

  const summary = employees.reduce(
    (acc, e) => {
      acc.total += e.totalTasks;
      acc.completed += e.completedTasks;
      acc.inProgress += e.inProgressTasks;
      acc.pendingApproval += e.pendingApprovalTasks;
      acc.rejected += e.rejectedTasks;
      return acc;
    },
    { total: 0, completed: 0, inProgress: 0, pendingApproval: 0, rejected: 0 },
  );

  const handleLogout = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem("mockUser");
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6">
      <div className="mx-auto w-full max-w-md sm:max-w-lg space-y-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
            >
              ←
            </button>

            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-600">สรุป KPI</p>
              <h1 className="text-lg font-semibold text-zinc-950">สรุป KPI พนักงาน</h1>
            </div>

            <div className="flex items-center">
              {/* Logout moved to bottom */}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-zinc-50 p-3 text-center">
              <p className="text-xs text-zinc-500">พนักงานทั้งหมด</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">{employees.length}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 text-center">
              <p className="text-xs text-zinc-500">งานทั้งหมด</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">{summary.total}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 text-center">
              <p className="text-xs text-zinc-500">งานสำเร็จ</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">{summary.completed}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 text-center">
              <p className="text-xs text-zinc-500">งานกำลังทำ</p>
              <p className="mt-1 text-lg font-semibold text-sky-600">{summary.inProgress}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 text-center">
              <p className="text-xs text-zinc-500">งานรออนุมัติ</p>
              <p className="mt-1 text-lg font-semibold text-amber-600">{summary.pendingApproval}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 text-center">
              <p className="text-xs text-zinc-500">งานไม่ผ่าน</p>
              <p className="mt-1 text-lg font-semibold text-red-600">{summary.rejected}</p>
            </div>
          </div>
        </div>

        {/* Logout will be rendered after the employee list */}

        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
          <div className="space-y-3">
            {employees.map((e) => {
              const lvl = levelAndColor(e.completionRate);
              return (
                <div key={e.name} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-900">{e.name}</p>
                      <p className="mt-1 text-xs text-zinc-600">งานทั้งหมด: {e.totalTasks}</p>
                      <p className="text-xs text-zinc-600">
                        สำเร็จ: {e.completedTasks} • กำลังทำ: {e.inProgressTasks} • รออนุมัติ: {e.pendingApprovalTasks} • ไม่ผ่าน: {e.rejectedTasks}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">{e.completionRate}%</p>
                        <p className="text-xs text-zinc-600">completion rate</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${lvl.color}`}>{lvl.level}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
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
