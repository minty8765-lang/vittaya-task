"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TaskStatus = "pending" | "in_progress" | "submitted" | "pending_approval" | "completed" | "approved" | "rejected" | "overdue";

type Task = {
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

const initialTasks: Task[] = [
  { id: "T001", title: "ออกแบบระบบ", assignee: "พนักงาน A", status: "pending", due: "2026-05-30" },
  { id: "T002", title: "เตรียมรายงาน", assignee: "พนักงาน B", status: "in_progress", due: "2026-05-28", submittedAt: "2026-05-28T14:20:00" },
  {
    id: "T003",
    title: "ตรวจสอบสต็อก",
    assignee: "พนักงาน A",
    status: "pending_approval",
    due: "2026-05-22",
    submittedAt: "2026-05-22T09:15:00",
    submissionNote: "ตรวจสอบสต็อกเรียบร้อยแล้ว พบสินค้าหมดอายุ 3 รายการ ได้แจ้งแผนกจัดซื้อเรียบร้อย",
    submissionImage: "https://placehold.co/300x200/e2e8f0/64748b?text=Stock+Image",
  },
  { id: "T004", title: "อนุมัติค่าใช้จ่าย", assignee: "ผู้บริหาร", status: "completed", due: "2026-05-20", submittedAt: "2026-05-20T10:40:00" },
  { id: "T005", title: "ติดตามลูกค้า", assignee: "พนักงาน C", status: "overdue", due: "2026-05-18" },
  {
    id: "T006",
    title: "สรุปยอดขาย",
    assignee: "พนักงาน B",
    status: "pending_approval",
    due: "2026-05-19",
    submittedAt: "2026-05-19T08:00:00",
    submissionNote: "สรุปยอดขายประจำเดือน เม.ย. รวม 1.2 ล้านบาท เพิ่มขึ้น 15% จากเดือนก่อน",
    submissionImage: "https://placehold.co/300x200/e2e8f0/64748b?text=Sales+Report",
  },
  {
    id: "T007",
    title: "ทำรายงานประจำปี",
    assignee: "พนักงาน A",
    status: "rejected",
    due: "2026-05-15",
    submittedAt: "2026-05-15T16:00:00",
    submissionNote: "จัดทำรายงานประจำปีฉบับแรก ข้อมูลยังไม่ครบ",
  },
];

const tabOptions = [
  { key: "all", label: "ทั้งหมด" },
  { key: "overdue", label: "เกินกำหนด" },
  { key: "pending_approval", label: "รออนุมัติ" },
  { key: "completed", label: "สำเร็จ" },
  { key: "rejected", label: "ไม่ผ่าน" },
];

const statusMeta: Record<TaskStatus, { label: string; className: string }> = {
  overdue: { label: "เกินกำหนด", className: "bg-red-100 text-red-700" },
  submitted: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  pending_approval: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  approved: { label: "สำเร็จ", className: "bg-emerald-100 text-emerald-700" },
  completed: { label: "สำเร็จ", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ไม่ผ่านงาน", className: "bg-red-100 text-red-700" },
  in_progress: { label: "กำลังทำ", className: "bg-sky-100 text-sky-700" },
  pending: { label: "รอดำเนินการ", className: "bg-sky-100 text-sky-700" },
};

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

function formatTimeStatus(task: Task) {
  const now = new Date();
  const dueDate = new Date(task.due + "T23:59:59");
  if (task.submittedAt) {
    const submittedDate = new Date(task.submittedAt);
    const diff = submittedDate.getTime() - dueDate.getTime();
    if (diff > 0) {
      const hoursLate = Math.max(1, Math.round(diff / MS_PER_HOUR));
      return `ส่งช้า ${hoursLate} ชม.`;
    }
    return "ส่งทันเวลา";
  }
  const diff = dueDate.getTime() - now.getTime();
  if (diff < 0) {
    const daysLate = Math.max(1, Math.ceil(Math.abs(diff) / MS_PER_DAY));
    return `เกินกำหนด ${daysLate} วัน`;
  }
  const daysLeft = Math.max(1, Math.ceil(diff / MS_PER_DAY));
  return `เหลืออีก ${daysLeft} วัน`;
}

function formatDate(value: string) {
  if (!value) return "ไม่มีกำหนดส่ง";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function TasksPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [taskList, setTaskList] = useState<Task[]>(initialTasks);

  useEffect(() => {
    const stored: { id: string; title: string; dueDate: string; assigneeId: string | null; assignType: string; status: string }[] =
      JSON.parse(localStorage.getItem("vittaya_tasks") || "[]");

    const fromStorage = stored.map((t) => ({
      id: t.id,
      title: t.title,
      assignee: t.assigneeId ? (employeeNames[t.assigneeId] || t.assigneeId) : "เปิดให้รับ",
      status: (t.status === "open" ? "pending" : t.status) as TaskStatus,
      due: t.dueDate || "",
    }));

    if (fromStorage.length > 0) {
      setTaskList((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        return [...prev, ...fromStorage.filter((t) => !ids.has(t.id))];
      });
    }
  }, []);

  const pendingCount = taskList.filter((t) => t.status === "pending_approval").length;

  const filteredTasks = useMemo(() => {
    if (activeTab === "all") return taskList;
    return taskList.filter((task) => task.status === activeTab);
  }, [activeTab, taskList]);

  function handleApprove(id: string) {
    const stored: { id: string; status: string }[] = JSON.parse(localStorage.getItem("vittaya_tasks") || "[]");
    localStorage.setItem("vittaya_tasks", JSON.stringify(stored.map((t) => (t.id === id ? { ...t, status: "completed" } : t))));
    setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, status: "completed" } : t)));
  }

  function handleReject(id: string) {
    const stored: { id: string; status: string }[] = JSON.parse(localStorage.getItem("vittaya_tasks") || "[]");
    localStorage.setItem("vittaya_tasks", JSON.stringify(stored.map((t) => (t.id === id ? { ...t, status: "rejected" } : t))));
    setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, status: "rejected" } : t)));
  }

  function handleResubmit(id: string) {
    setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, status: "in_progress" } : t)));
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md sm:max-w-lg">
        <div className="flex items-center justify-between rounded-3xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-600">Task List</p>
            <h1 className="mt-2 text-xl font-semibold text-zinc-950">รายการงานทั้งหมด</h1>
          </div>
          <div className="h-10 w-10" />
        </div>

        <div className="mt-4 rounded-3xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {tabOptions.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-sky-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {tab.label}
                {tab.key === "pending_approval" && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {filteredTasks.map((task) => {
            const meta = statusMeta[task.status] || statusMeta.pending;
            const isPendingApproval = task.status === "pending_approval";
            const isRejected = task.status === "rejected";
            return (
              <div key={task.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">{task.id}</p>
                    <h2 className="mt-2 text-base font-semibold text-zinc-950">{task.title}</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">ผู้รับผิดชอบ</p>
                    <p className="mt-1 font-medium text-zinc-900">{task.assignee}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-3">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">Due date</p>
                    <p className="mt-1 font-medium text-zinc-900">{formatDate(task.due)}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-3 sm:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">สถานะเวลา</p>
                    <p className="mt-1 font-medium text-zinc-900">{formatTimeStatus(task)}</p>
                  </div>
                  {task.submittedAt ? (
                    <div className="rounded-2xl bg-zinc-50 p-3 sm:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">วันที่ส่งงาน</p>
                      <p className="mt-1 font-medium text-zinc-900">{formatDate(task.submittedAt)}</p>
                    </div>
                  ) : null}

                  {(isPendingApproval || isRejected) && task.submissionNote && (
                    <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100 sm:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-amber-600">ข้อความที่พนักงานส่ง</p>
                      <p className="mt-1 text-sm font-medium text-zinc-900">{task.submissionNote}</p>
                    </div>
                  )}
                  {(isPendingApproval || isRejected) && task.submissionImage && (
                    <div className="rounded-2xl bg-zinc-50 p-3 sm:col-span-2">
                      <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-zinc-500">รูปที่แนบ</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={task.submissionImage}
                        alt="รูปที่แนบ"
                        className="w-full max-h-32 rounded-xl object-cover"
                      />
                    </div>
                  )}
                </div>

                {isPendingApproval && (
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleApprove(task.id)}
                      className="flex-1 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 active:scale-95"
                    >
                      อนุมัติ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(task.id)}
                      className="flex-1 rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 active:scale-95"
                    >
                      ไม่อนุมัติ
                    </button>
                  </div>
                )}

              </div>
            );
          })}

          {filteredTasks.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-center text-sm text-zinc-600 shadow-sm ring-1 ring-zinc-200">
              ไม่มีงานในหมวดนี้
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-md sm:max-w-lg mt-8 flex justify-center pb-6">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full max-w-md rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 font-semibold hover:bg-rose-100"
        >
          Logout
        </button>
      </div>
    </main>
  );
}
