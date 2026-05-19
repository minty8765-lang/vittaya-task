"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

type EmployeeKPI = {
  name: string;
  totalTasks: number;
  onTimeTasks: number;
  completedTasks: number;
  lateTasks: number;
  overdueTasks: number;
};

const employees: EmployeeKPI[] = [
  { name: "พนักงาน A", totalTasks: 12, onTimeTasks: 9, completedTasks: 11, lateTasks: 1, overdueTasks: 1 },
  { name: "พนักงาน B", totalTasks: 8, onTimeTasks: 5, completedTasks: 6, lateTasks: 2, overdueTasks: 0 },
  { name: "พนักงาน C", totalTasks: 0, onTimeTasks: 0, completedTasks: 0, lateTasks: 0, overdueTasks: 0 },
  { name: "พนักงาน D", totalTasks: 5, onTimeTasks: 2, completedTasks: 3, lateTasks: 2, overdueTasks: 1 },
];

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

  const summary = employees.reduce(
    (acc, e) => {
      acc.total += e.totalTasks;
      acc.onTime += e.onTimeTasks;
      acc.completed += e.completedTasks;
      acc.late += e.lateTasks;
      acc.overdue += e.overdueTasks;
      return acc;
    },
    { total: 0, onTime: 0, completed: 0, late: 0, overdue: 0 },
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
              <p className="text-xs text-zinc-500">งานส่งตรงเวลา</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">{summary.onTime}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 text-center">
              <p className="text-xs text-zinc-500">งานส่งช้า</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">{summary.late}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3 text-center col-span-2">
              <p className="text-xs text-zinc-500">งานเกินกำหนด</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">{summary.overdue}</p>
            </div>
          </div>
        </div>

        {/* Logout will be rendered after the employee list */}

        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
          <div className="space-y-3">
            {employees.map((e) => {
              const score = calcKPI(e);
              const lvl = levelAndColor(score);
              const onTimeRate = e.totalTasks === 0 ? 0 : Math.round((e.onTimeTasks / e.totalTasks) * 100);
              return (
                <div key={e.name} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-900">{e.name}</p>
                      <p className="mt-1 text-xs text-zinc-600">งานทั้งหมด: {e.totalTasks}</p>
                      <p className="text-xs text-zinc-600">ส่งตรงเวลา: {e.onTimeTasks} • ส่งช้า: {e.lateTasks} • เกินกำหนด: {e.overdueTasks}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{onTimeRate}%</p>
                        <p className="text-xs text-zinc-600">อัตราส่งตรงเวลา</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{score}</p>
                        <p className="text-xs text-zinc-600">คะแนน KPI</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${lvl.color}`}>{lvl.level}</span>
                    </div>
                  </div>
                </div>
              );
            })}
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
