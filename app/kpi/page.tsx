"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calculateKpiScore } from "@/lib/kpiUtils";

type EmployeeKPI = {
  name: string;
  totalTasks: number;
  onTimeTasks: number;
  completedTasks: number;
  lateTasks: number;
  inProgressTasks: number;
  pendingApprovalTasks: number;
  rejectedTasks: number;
  kpiScore: number;
};

type StoredTask = {
  id: string;
  title: string;
  status: string;
  assigned_to: string | null;
  due_date: string | null;
  rejection_count: number;
  task_submissions: { created_at: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assignee: any;
};

function isSubmittedOnTime(task: StoredTask): boolean {
  if (task.status !== "completed") return false;
  if (!task.due_date) return true;
  if (task.task_submissions.length === 0) return true;
  const earliestSub = task.task_submissions.reduce((a, b) =>
    new Date(a.created_at) < new Date(b.created_at) ? a : b
  );
  const due = new Date(task.due_date); due.setHours(23, 59, 59, 999);
  const sub = new Date(earliestSub.created_at);
  return sub.getTime() <= due.getTime();
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
      .select("id, title, status, assigned_to, due_date, rejection_count, task_submissions(created_at), assignee:profiles!tasks_assigned_to_fkey(full_name, email)")
      .not("assigned_to", "is", null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => {
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setTaskList((data as any[]).map((t: any) => ({
            id: t.id,
            title: t.title ?? "",
            status: t.status,
            assigned_to: t.assigned_to ?? null,
            due_date: t.due_date ?? null,
            rejection_count: t.rejection_count ?? 0,
            task_submissions: Array.isArray(t.task_submissions) ? t.task_submissions : [],
            assignee: t.assignee ?? null,
          })));
        }
      });
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
      const kpiScore = calculateKpiScore(tasks);
      const onTimeTasks = tasks.filter(isSubmittedOnTime).length;
      const lateTasks = completed - onTimeTasks;
      const assignee = tasks[0]?.assignee;
      return {
        name: assignee?.full_name || assignee?.email || "ไม่ระบุชื่อ",
        totalTasks: total,
        onTimeTasks,
        completedTasks: completed,
        lateTasks,
        inProgressTasks: inProgress,
        pendingApprovalTasks: pendingApproval,
        rejectedTasks: rejected,
        kpiScore,
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("vittaya_current_user");
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

        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
          <div className="space-y-3">
            {employees.map((e) => {
              const lvl = levelAndColor(e.kpiScore);
              return (
                <div key={e.name} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-900">{e.name}</p>
                      <p className="mt-1 text-xs text-zinc-600">งานทั้งหมด: {e.totalTasks}</p>
                      <p className="text-xs text-zinc-600">
                        สำเร็จ: {e.completedTasks} • กำลังทำ: {e.inProgressTasks} • รออนุมัติ: {e.pendingApprovalTasks} • ไม่ผ่าน: {e.rejectedTasks}
                      </p>
                      <p className="text-xs text-zinc-600">
                        ตรงเวลา: {e.onTimeTasks} • ส่งช้า: {e.lateTasks}
                      </p>
                      <div className="mt-2 space-y-1">
                        {e.kpiScore >= 90 && (
                          <p className="text-xs text-emerald-700">คะแนนสูงเพราะทำงานสำเร็จและส่งตรงเวลาส่วนใหญ่</p>
                        )}
                        {e.lateTasks > 0 && (
                          <p className="text-xs text-orange-700">คะแนนลดลงเพราะมีงานส่งช้า {e.lateTasks} งาน</p>
                        )}
                        {e.rejectedTasks > 0 && (
                          <p className="text-xs text-rose-700">มีงานไม่ผ่าน {e.rejectedTasks} งาน ควรตรวจรายละเอียดก่อนส่ง</p>
                        )}
                        {e.inProgressTasks > 0 && (
                          <p className="text-xs text-sky-700">มีงานกำลังทำ {e.inProgressTasks} งาน ควรติดตามให้เสร็จตามกำหนด</p>
                        )}
                        {e.pendingApprovalTasks > 0 && (
                          <p className="text-xs text-amber-700">มีงานรออนุมัติ {e.pendingApprovalTasks} งาน</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">{e.kpiScore}%</p>
                        <p className="text-xs text-zinc-600">KPI score</p>
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
