"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type TaskStatus = "open" | "pending" | "in_progress" | "submitted" | "pending_approval" | "completed" | "approved" | "rejected";

type TaskItem = {
  id: string;
  title: string;
  assignee: string;
  status: TaskStatus;
  due: string;
  submittedAt?: string;
  submissionNote?: string;
  submissionImage?: string;
};

const employeeNames: Record<string, string> = {
  E001: "พนักงาน A",
  E002: "พนักงาน B",
  E003: "พนักงาน C",
  E004: "ผู้บริหาร",
  E005: "ผู้จัดการคลัง",
  E006: "ผู้จัดการฝ่ายขาย",
};

const initialTasks: TaskItem[] = [
  { id: "T001", title: "ออกแบบระบบ", assignee: "พนักงาน A", status: "pending", due: "2026-05-30" },
  { id: "T002", title: "เตรียมรายงาน", assignee: "พนักงาน B", status: "in_progress", due: "2026-05-28" },
  {
    id: "T003",
    title: "ตรวจสอบสต็อก",
    assignee: "พนักงาน A",
    status: "pending_approval",
    due: "2026-05-22",
    submittedAt: "2026-05-21T14:30:00",
    submissionNote: "ตรวจสอบสต็อกเรียบร้อยแล้ว พบสินค้าหมดอายุ 3 รายการ ได้แจ้งแผนกจัดซื้อเรียบร้อย",
    submissionImage: "https://placehold.co/300x200/e2e8f0/64748b?text=Stock+Image",
  },
  {
    id: "T004",
    title: "สรุปยอดขาย",
    assignee: "พนักงาน B",
    status: "pending_approval",
    due: "2026-05-19",
    submittedAt: "2026-05-19T08:00:00",
    submissionNote: "สรุปยอดขายเดือน เม.ย. รวม 1.2 ล้านบาท เพิ่มขึ้น 15% จากเดือนก่อน",
    submissionImage: "https://placehold.co/300x200/e2e8f0/64748b?text=Sales+Report",
  },
  {
    id: "T005",
    title: "ทำรายงานประจำปี",
    assignee: "พนักงาน A",
    status: "rejected",
    due: "2026-05-15",
    submittedAt: "2026-05-15T16:00:00",
    submissionNote: "จัดทำรายงานประจำปีฉบับแรก ข้อมูลยังไม่ครบ",
  },
];

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

function getTimeStatus(dueDate: string, submittedAt: string | undefined, status: TaskStatus) {
  const due = new Date(dueDate).getTime();
  const now = Date.now();

  if ((status === "submitted" || status === "pending_approval" || status === "completed" || status === "approved" || status === "rejected") && submittedAt) {
    const submitted = new Date(submittedAt).getTime();
    const diff = due - submitted;
    if (diff >= 0) {
      if (diff >= MS_PER_DAY) return { text: `ส่งก่อนกำหนด ${Math.floor(diff / MS_PER_DAY)} วัน`, color: "bg-emerald-100 text-emerald-900" };
      if (diff >= MS_PER_HOUR) return { text: `ส่งก่อนกำหนด ${Math.floor(diff / MS_PER_HOUR)} ชม.`, color: "bg-emerald-100 text-emerald-900" };
      return { text: "ส่งทันเวลา", color: "bg-emerald-100 text-emerald-900" };
    }
    const late = submitted - due;
    if (late >= MS_PER_DAY) return { text: `ส่งช้า ${Math.ceil(late / MS_PER_DAY)} วัน`, color: "bg-amber-100 text-amber-900" };
    return { text: `ส่งช้า ${Math.ceil(late / MS_PER_HOUR)} ชม.`, color: "bg-amber-100 text-amber-900" };
  }

  const diff = due - now;
  if (diff >= 0) {
    if (diff >= MS_PER_DAY) return { text: `เหลืออีก ${Math.ceil(diff / MS_PER_DAY)} วัน`, color: "bg-sky-100 text-sky-900" };
    return { text: `เหลืออีก ${Math.max(1, Math.ceil(diff / MS_PER_HOUR))} ชม.`, color: "bg-sky-100 text-sky-900" };
  }
  const late = now - due;
  if (late >= MS_PER_DAY) return { text: `เกินกำหนด ${Math.ceil(late / MS_PER_DAY)} วัน`, color: "bg-rose-100 text-rose-900" };
  return { text: `เกินกำหนด ${Math.max(1, Math.ceil(late / MS_PER_HOUR))} ชม.`, color: "bg-rose-100 text-rose-900" };
}

const statusBadge: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: "รอดำเนินการ", className: "bg-slate-100 text-slate-700" },
  in_progress: { label: "กำลังทำ", className: "bg-sky-100 text-sky-700" },
  submitted: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  pending_approval: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  completed: { label: "สำเร็จ", className: "bg-emerald-100 text-emerald-700" },
  approved: { label: "สำเร็จ", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ไม่ผ่านงาน", className: "bg-red-100 text-red-700" },
};

type FilterKey = "all" | "open" | "in_progress" | "pending_approval" | "completed" | "rejected";

export default function DashboardPage() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<FilterKey>("all");
  const [taskList, setTaskList] = useState<TaskItem[]>(initialTasks);

  useEffect(() => {
    const stored: { id: string; title: string; dueDate: string; assigneeId: string | null; status: string }[] =
      JSON.parse(localStorage.getItem("vittaya_tasks") || "[]");

    if (stored.length > 0) {
      const fromStorage = stored.map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assigneeId ? (employeeNames[t.assigneeId] || t.assigneeId) : "เปิดให้รับ",
        status: (t.status === "open" ? "pending" : t.status) as TaskStatus,
        due: t.dueDate || "",
      }));
      setTaskList(fromStorage);
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("mockUser");
    }
    router.push("/login");
  };

  function handleApprove(id: string) {
    setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, status: "completed" } : t)));
  }

  function handleReject(id: string) {
    setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, status: "rejected" } : t)));
  }

  function handleResubmit(id: string) {
    setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, status: "in_progress" } : t)));
  }

  const tabs: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "ทั้งหมด", count: taskList.length },
    { key: "open", label: "รอดำเนินการ", count: taskList.filter((t) => t.status === "open" || t.status === "pending").length },
    { key: "in_progress", label: "กำลังทำ", count: taskList.filter((t) => t.status === "in_progress").length },
    { key: "pending_approval", label: "รออนุมัติ", count: taskList.filter((t) => t.status === "pending_approval").length },
    { key: "completed", label: "สำเร็จ", count: taskList.filter((t) => t.status === "completed" || t.status === "approved").length },
    { key: "rejected", label: "ไม่ผ่านงาน", count: taskList.filter((t) => t.status === "rejected").length },
  ];

  const filteredTasks = taskList.filter((task) => {
    if (selectedStatus === "all") return true;
    if (selectedStatus === "open") return task.status === "open" || task.status === "pending";
    if (selectedStatus === "completed") return task.status === "completed" || task.status === "approved";
    return task.status === selectedStatus;
  });

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6">
      <div className="mx-auto w-full max-w-md sm:max-w-lg space-y-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-zinc-950">ติดตามงาน</h1>
              <p className="mt-1 text-sm text-zinc-600">ภาพรวมงานและสถานะทีมของคุณ</p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/kpi" className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-200">
                <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3v18M21 12H3" />
                </svg>
                KPI
              </Link>

              <Link href="/calendar" className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-200">
                <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                ปฏิทิน
              </Link>

              <Link href="/employees" className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-200">
                <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.654 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                พนักงาน
              </Link>

              <Link href="/tasks/new" className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                สร้างงาน
              </Link>
            </div>
          </div>

          <div className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex gap-2 pb-1">
              {tabs.map((tab) => {
                const active = selectedStatus === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedStatus(tab.key)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                      active ? "bg-sky-600 text-white shadow" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    {tab.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${active ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-600"}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">งานล่าสุด</h2>
              <p className="mt-1 text-sm text-zinc-600">รายการงานที่เพิ่งสร้างหรือปรับสถานะ</p>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const timeStatus = getTimeStatus(task.due, task.submittedAt, task.status);
              const badge = statusBadge[task.status] || statusBadge.pending;
              const isPendingApproval = task.status === "pending_approval";
              const isRejected = task.status === "rejected";
              return (
                <div key={task.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.15em] text-zinc-500">{task.id}</p>
                      <h3 className="mt-1 text-base font-semibold text-zinc-950">{task.title}</h3>
                      <p className="mt-1 text-xs text-zinc-600">ผู้รับผิดชอบ: {task.assignee}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${timeStatus.color}`}>
                        {timeStatus.text}
                      </span>
                      <span className="text-xs text-zinc-500">due {task.due}</span>
                    </div>
                  </div>

                  {(isPendingApproval || isRejected) && task.submissionNote && (
                    <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600">ข้อความพนักงาน</p>
                      <p className="mt-0.5 text-xs text-zinc-800">{task.submissionNote}</p>
                    </div>
                  )}
                  {(isPendingApproval || isRejected) && task.submissionImage && (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={task.submissionImage}
                        alt="รูปที่แนบ"
                        className="h-20 w-full rounded-xl object-cover"
                      />
                    </div>
                  )}

                  {isPendingApproval && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(task.id)}
                        className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 active:scale-95"
                      >
                        อนุมัติ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(task.id)}
                        className="flex-1 rounded-xl bg-red-500 py-2 text-xs font-semibold text-white transition hover:bg-red-600 active:scale-95"
                      >
                        ไม่อนุมัติ
                      </button>
                    </div>
                  )}

                  {isRejected && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleResubmit(task.id)}
                        className="w-full rounded-xl border border-zinc-300 bg-white py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 active:scale-95"
                      >
                        แก้ไขและส่งใหม่
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="rounded-2xl bg-zinc-100 p-6 text-center text-sm text-zinc-500">
                ไม่มีงานในหมวดนี้
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-center">
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
