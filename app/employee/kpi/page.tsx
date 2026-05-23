"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { taskScore, calculateKpiScore } from "@/lib/kpiUtils";

type Submission = {
  created_at: string;
};

type Task = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  task_submissions: Submission[];
};


export default function EmployeeKpiPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("vittaya_current_user");
    if (!raw) { router.push("/login"); return; }
    const localUser = JSON.parse(raw);
    if (localUser.role !== "employee") { router.push("/login"); return; }

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) { router.push("/login"); return; }

      supabase
        .from("tasks")
        .select("id, title, status, due_date, task_submissions(created_at)")
        .eq("assigned_to", authUser.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ data, error }) => {
        if (error) { setLoading(false); return; }
        if (data) {
          const mapped = data.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            due_date: t.due_date ?? null,
            task_submissions: Array.isArray(t.task_submissions) ? t.task_submissions : [],
          }));
          setTasks(mapped);
        }
        setLoading(false);
        });
    });
  }, [router]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const pendingApproval = tasks.filter((t) => t.status === "pending_approval").length;
  const rejected = tasks.filter((t) => t.status === "rejected").length;

  const kpiScore = calculateKpiScore(tasks);

  const onTime = tasks.filter((t) => t.status === "completed" && taskScore(t) === 100).length;
  const late = completed - onTime;

  const maxLateDays = tasks.reduce((max, t) => {
    if (t.status !== "completed" || !t.due_date) return max;
    const latestSub = t.task_submissions.length > 0
      ? t.task_submissions.reduce((a, b) =>
          new Date(a.created_at) > new Date(b.created_at) ? a : b)
      : null;
    if (!latestSub) return max;
    const due = new Date(t.due_date); due.setHours(0, 0, 0, 0);
    const sub = new Date(latestSub.created_at); sub.setHours(0, 0, 0, 0);
    const diffDays = Math.round((sub.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > max ? diffDays : max;
  }, 0);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 sm:px-5 sm:py-7">
      <div className="mx-auto w-full max-w-md sm:max-w-lg space-y-6">
        <div className="rounded-[1.75rem] bg-white p-4 shadow-lg ring-1 ring-zinc-200 sm:p-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/employee")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
            >
              ←
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-600">KPI</p>
              <h1 className="text-lg font-semibold text-zinc-950">KPI ของฉัน</h1>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[1.75rem] bg-white p-8 shadow-lg ring-1 ring-zinc-200 flex items-center justify-center">
            <p className="text-sm text-zinc-500">กำลังโหลด KPI...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-[1.75rem] bg-white p-8 shadow-lg ring-1 ring-zinc-200 flex items-center justify-center">
            <p className="text-sm text-zinc-500">ยังไม่มีข้อมูลงาน</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* คะแนนใหญ่ */}
            <div className="rounded-[1.75rem] bg-white p-5 shadow-lg ring-1 ring-zinc-200">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">ผลงานของฉัน</p>
              <p className={`mt-2 text-5xl font-bold ${kpiScore >= 80 ? "text-emerald-600" : kpiScore >= 50 ? "text-sky-600" : "text-orange-500"}`}>
                {kpiScore}%
              </p>
              <p className="mt-1 text-sm text-zinc-500">คะแนน KPI เฉลี่ย (คำนวณจากความตรงเวลา)</p>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${kpiScore >= 80 ? "bg-emerald-500" : kpiScore >= 50 ? "bg-sky-500" : "bg-orange-400"}`}
                  style={{ width: `${kpiScore}%` }}
                />
              </div>
              <p className={`mt-1.5 text-xs font-semibold ${kpiScore >= 80 ? "text-emerald-600" : kpiScore >= 50 ? "text-sky-600" : "text-orange-500"}`}>
                {kpiScore >= 80 ? "ยอดเยี่ยม! ผลงานดีมาก" : kpiScore >= 50 ? "ดี ยังมีงานที่ต้องทำต่อ" : "ยังมีงานค้างอีกมาก สู้ๆ"}
              </p>
            </div>

            {/* คำแนะนำ */}
            <div className="rounded-[1.75rem] bg-white p-5 shadow-lg ring-1 ring-zinc-200 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">คำแนะนำ</p>
              {total === 0 && (
                <div className="rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-200">
                  <p className="text-sm text-zinc-600">ยังไม่มีงานในระบบ</p>
                </div>
              )}
              {rejected > 0 && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-100">
                  <p className="text-sm text-rose-700">มีงานที่ไม่ผ่าน แนะนำให้ตรวจรายละเอียดและรูปภาพก่อนส่งงาน</p>
                </div>
              )}
              {late > 0 && (
                <div className="rounded-2xl bg-orange-50 px-4 py-3 ring-1 ring-orange-100">
                  <p className="text-sm text-orange-700">มีงานส่งช้า {late} ชิ้น (ช้าสูงสุด {maxLateDays} วัน) แนะนำให้วางแผนงานล่วงหน้า</p>
                </div>
              )}
              {inProgress > 3 && (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                  <p className="text-sm text-amber-700">มีงานกำลังทำหลายงาน แนะนำให้จัดลำดับงานที่ใกล้ถึงกำหนดก่อน</p>
                </div>
              )}
              {pendingApproval > 0 && (
                <div className="rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                  <p className="text-sm text-sky-700">มีงานรออนุมัติ รอผู้ดูแลตรวจสอบ</p>
                </div>
              )}
              {kpiScore >= 80 && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                  <p className="text-sm text-emerald-700">ทำได้ดีมาก รักษามาตรฐานนี้ต่อไป</p>
                </div>
              )}
            </div>

            {/* การ์ดสรุป */}
            <div className="rounded-[1.75rem] bg-white p-5 shadow-lg ring-1 ring-zinc-200 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">สรุปงาน</p>
              <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">งานทั้งหมด</p>
                <p className="mt-1 text-2xl font-bold text-zinc-950">{total}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">งานสำเร็จ</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">{completed}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">กำลังทำ</p>
                  <p className="mt-1 text-2xl font-bold text-sky-700">{inProgress}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">รออนุมัติ</p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">{pendingApproval}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600">ไม่ผ่าน</p>
                  <p className="mt-1 text-2xl font-bold text-rose-700">{rejected}</p>
                </div>
                <div className="rounded-2xl bg-teal-50 p-3 ring-1 ring-teal-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">ตรงเวลา</p>
                  <p className="mt-1 text-2xl font-bold text-teal-700">{onTime}</p>
                </div>
                <div className="rounded-2xl bg-orange-50 p-3 ring-1 ring-orange-100">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">ส่งช้า</p>
                  <p className="mt-1 text-2xl font-bold text-orange-700">{late}</p>
                </div>
              </div>
              {maxLateDays > 0 && (
                <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">ช้าสูงสุด</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-950">{maxLateDays} <span className="text-base font-medium text-zinc-500">วัน</span></p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
