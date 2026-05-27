"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type TaskStatus = "open" | "in_progress" | "pending_approval" | "completed" | "rejected";

type TaskItem = {
  id: string;
  task_code?: string;
  title: string;
  description?: string;
  assignee: string;
  assignedTo?: string;
  status: TaskStatus;
  due: string;
  submittedAt?: string;
  submissionNote?: string;
  submissionImages?: string[];
  rejectReason?: string;
};

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

function getTimeStatus(dueDate: string, submittedAt: string | undefined, status: TaskStatus) {
  const due = new Date(dueDate).getTime();
  const now = Date.now();

  if ((status === "pending_approval" || status === "completed" || status === "rejected") && submittedAt) {
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
  open: { label: "รอดำเนินการ", className: "bg-slate-100 text-slate-700" },
  in_progress: { label: "กำลังทำ", className: "bg-sky-100 text-sky-700" },
  pending_approval: { label: "รออนุมัติ", className: "bg-amber-100 text-amber-700" },
  completed: { label: "สำเร็จ", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "ไม่ผ่านงาน", className: "bg-red-100 text-red-700" },
};

type FilterKey = "all" | "open" | "in_progress" | "pending_approval" | "completed" | "rejected";

export default function DashboardPage() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<FilterKey>("all");
  const [taskList, setTaskList] = useState<TaskItem[]>([]);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; task_id: string | null; message: string; created_at: string; is_read: boolean }[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("vittaya_current_user");
    if (!raw) { router.push("/login"); return; }
    const user = JSON.parse(raw);
    if (user.role !== "admin") { router.push("/login"); return; }
    setAdminId(user.id);
    console.log("[ADMIN USER] id:", user.id, "role:", user.role);
    supabase
      .from("notifications")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .then(({ count, error }) => {
        console.log("[UNREAD COUNT]", count, "error:", error?.message ?? null);
        setUnreadCount(count ?? 0);
      });
  }, [router]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "employee")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => {
        if (data) setEmployees(data.map((p: any) => ({ id: p.id, name: p.full_name || p.email || p.id })));
      });
  }, []);

  useEffect(() => {
    async function loadTasks() {
      const { data } = await supabase
        .from("tasks")
        .select(`
          id,
          task_code,
          title,
          description,
          assigned_to,
          due_date,
          status,
          reject_reason,
          assignee:profiles!tasks_assigned_to_fkey(full_name, email),
          task_submissions (
            description,
            image_urls,
            created_at
          )
        `)
        .order("created_at", { ascending: false });

      if (!data) return;

      const taskIds = data.map((t: any) => t.id);
      const { data: submissions } = await supabase
        .from("task_submissions")
        .select("task_id, description, image_urls, created_at")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });

      setTaskList(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.map((t: any) => {
          const sub = submissions?.find((s: any) => s.task_id === t.id) ?? null;
          return {
            id: t.id,
            task_code: t.task_code ?? undefined,
            title: t.title,
            description: t.description ?? "",
            assignee: t.assignee?.full_name || t.assignee?.email || "งานเปิดรับ",
            assignedTo: t.assigned_to ?? "",
            status: t.status as TaskStatus,
            due: t.due_date ?? "",
            submittedAt: sub?.created_at ?? undefined,
            submissionNote: sub?.description ?? undefined,
            submissionImages: sub?.image_urls ?? [],
            rejectReason: t.reject_reason ?? undefined,
          };
        })
      );
    }
    loadTasks();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("vittaya_current_user");
    router.push("/login");
  };

  async function handleApprove(id: string) {
    const { error } = await supabase.from("tasks").update({ status: "completed" }).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, status: "completed" as TaskStatus } : t)));

    const task = taskList.find((t) => t.id === id);
    if (task?.assignedTo) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: task.assignedTo,
        task_id: id,
        type: "completed",
        message: `งาน ${task.title} ได้รับการอนุมัติแล้ว`,
      });
      if (notifError) console.error(notifError);
    }
  }

  function handleReject(id: string) {
    setRejectTargetId(id);
    setRejectReasonInput("");
  }

  async function confirmReject() {
    if (!rejectTargetId) return;
    if (!rejectReasonInput.trim()) {
      alert("กรุณากรอกเหตุผลที่ไม่อนุมัติก่อน");
      return;
    }
    const { error } = await supabase
      .from("tasks")
      .update({ status: "rejected", reject_reason: rejectReasonInput })
      .eq("id", rejectTargetId);
    if (error) {
      alert(error.message);
      return;
    }
    setTaskList((prev) =>
      prev.map((t) =>
        t.id === rejectTargetId ? { ...t, status: "rejected" as TaskStatus, rejectReason: rejectReasonInput } : t
      )
    );

    const task = taskList.find((t) => t.id === rejectTargetId);
    if (task?.assignedTo) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: task.assignedTo,
        task_id: rejectTargetId,
        type: "rejected",
        message: `งาน ${task.title} ไม่ผ่าน: ${rejectReasonInput}`,
      });
      if (notifError) console.error(notifError);
    }

    setRejectTargetId(null);
    setRejectReasonInput("");
  }

  function handleEdit(task: TaskItem) {
    setEditTargetId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditDueDate(task.due);
    setEditAssignedTo(task.assignedTo ?? "");
  }

  async function confirmEdit() {
    if (!editTargetId) return;
    const { error } = await supabase
      .from("tasks")
      .update({
        title: editTitle,
        description: editDescription,
        due_date: editDueDate || null,
        assigned_to: editAssignedTo || null,
      })
      .eq("id", editTargetId);
    if (error) {
      alert(error.message);
      return;
    }
    const assigneeName = employees.find((e) => e.id === editAssignedTo)?.name ?? "งานเปิดรับ";
    setTaskList((prev) =>
      prev.map((t) =>
        t.id === editTargetId
          ? { ...t, title: editTitle, description: editDescription, due: editDueDate, assignee: assigneeName, assignedTo: editAssignedTo }
          : t
      )
    );
    setEditTargetId(null);
  }

  async function confirmDelete() {
    if (!deleteTargetId) return;
    const { error } = await supabase.from("tasks").delete().eq("id", deleteTargetId);
    if (error) {
      alert(error.message);
      return;
    }
    setTaskList((prev) => prev.filter((t) => t.id !== deleteTargetId));
    setDeleteTargetId(null);
  }

  async function handleToggleNotifications() {
    if (showNotifications) { setShowNotifications(false); setShowAllNotifications(false); return; }
    console.log("[TOGGLE] adminId state:", adminId);
    if (!adminId) { console.warn("[TOGGLE] adminId is null — aborting"); return; }
    const { data, error } = await supabase
      .from("notifications")
      .select("id, task_id, message, created_at, is_read")
      .eq("user_id", adminId)
      .order("created_at", { ascending: false });
    console.log("[ADMIN NOTIFICATIONS] data:", data, "error:", error?.message ?? null);
    if (data) setNotifications(data);
    setShowNotifications(true);
    setUnreadCount(0);
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", adminId)
      .eq("is_read", false);
  }

  function handleNotificationClick(taskId: string | null) {
    setShowNotifications(false);
    setShowAllNotifications(false);
    if (!taskId) return;
    const task = taskList.find((t) => t.id === taskId);
    if (!task) return;
    setSelectedStatus(task.status as FilterKey);
    setTimeout(() => {
      document.getElementById(`task-${taskId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  const tabs: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "ทั้งหมด", count: taskList.length },
    { key: "open", label: "รอดำเนินการ", count: taskList.filter((t) => t.status === "open").length },
    { key: "in_progress", label: "กำลังทำ", count: taskList.filter((t) => t.status === "in_progress").length },
    { key: "pending_approval", label: "รออนุมัติ", count: taskList.filter((t) => t.status === "pending_approval").length },
    { key: "completed", label: "สำเร็จ", count: taskList.filter((t) => t.status === "completed").length },
    { key: "rejected", label: "ไม่ผ่านงาน", count: taskList.filter((t) => t.status === "rejected").length },
  ];

  const filteredTasks = taskList.filter((task) => {
    if (selectedStatus === "all") return true;
    return task.status === selectedStatus;
  });

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6">
      <div className="mx-auto w-full max-w-md sm:max-w-lg space-y-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-auto sm:min-w-0">
              <h1 className="text-lg font-semibold text-zinc-950">ติดตามงาน</h1>
              <p className="mt-1 text-sm text-zinc-600">ภาพรวมงานและสถานะทีมของคุณ</p>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
            <div className="flex items-center gap-2 sm:flex-nowrap">
              <button
                type="button"
                onClick={handleToggleNotifications}
                className="relative inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-200"
              >
                <svg className="h-4 w-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                แจ้งเตือน
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
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

        {showNotifications && (
          <div className="rounded-2xl bg-zinc-50 ring-1 ring-zinc-200 overflow-hidden">
            <p className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">การแจ้งเตือน</p>
            {notifications.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-zinc-500">ไม่มีการแจ้งเตือน</p>
            ) : (
              <>
                <div className="max-h-[360px] overflow-y-auto space-y-2 px-3 pb-3">
                  {(showAllNotifications ? notifications : notifications.slice(0, 5)).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n.task_id)}
                      className={`rounded-xl p-3 transition active:scale-[0.98] ${n.task_id ? "cursor-pointer" : "cursor-default"} ${n.is_read ? "bg-white ring-1 ring-zinc-100 hover:bg-zinc-50" : "bg-sky-100 ring-1 ring-sky-300 hover:bg-sky-200"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
                          <p className={`text-sm leading-relaxed ${n.is_read ? "font-normal text-zinc-600" : "font-semibold text-zinc-900"}`}>
                            {n.message}
                          </p>
                        </div>
                        {!n.is_read && (
                          <span className="shrink-0 rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">ใหม่</span>
                        )}
                      </div>
                      <p className={`mt-1 text-xs ${n.is_read ? "text-zinc-400" : "text-sky-700 font-medium"}`}>
                        {new Date(n.created_at).toLocaleString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                </div>
                {notifications.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllNotifications((v) => !v)}
                    className="w-full py-2.5 text-xs font-semibold text-sky-600 hover:bg-zinc-100 transition border-t border-zinc-200"
                  >
                    {showAllNotifications ? "แสดงน้อยลง" : `ดูทั้งหมด (${notifications.length})`}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">งานล่าสุด</h2>
              <p className="mt-1 text-sm text-zinc-600">รายการงานที่เพิ่งสร้างหรือปรับสถานะ</p>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const timeStatus = task.due ? getTimeStatus(task.due, task.submittedAt, task.status) : null;
              const badge = statusBadge[task.status] ?? statusBadge.open;
              const isPendingApproval = task.status === "pending_approval";
              const isRejected = task.status === "rejected";
              return (
                <div key={task.id} id={`task-${task.id}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.15em] text-zinc-500">{task.task_code ?? task.id.slice(0, 8)}</p>
                      <h3 className="mt-1 text-base font-semibold text-zinc-950">{task.title}</h3>
                      <p className="mt-1 text-xs text-zinc-600">ผู้รับผิดชอบ: {task.assignee}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                      {timeStatus && (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${timeStatus.color}`}>
                          {timeStatus.text}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">{task.due ? `due ${task.due}` : "ไม่มีกำหนด"}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(task)}
                          className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-200"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(task.id)}
                          className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>

                  {(isPendingApproval || isRejected) && task.submissionNote && (
                    <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-amber-600">ข้อความพนักงาน</p>
                      <p className="mt-0.5 text-xs text-zinc-800">{task.submissionNote}</p>
                    </div>
                  )}
                  {(isPendingApproval || isRejected) && task.submissionImages && task.submissionImages.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {task.submissionImages.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`รูปที่แนบ ${i + 1}`}
                            className="h-20 w-20 rounded-xl object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {isRejected && task.rejectReason && (
                    <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 ring-1 ring-red-100">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-red-600">เหตุผลที่ไม่อนุมัติ</p>
                      <p className="mt-0.5 text-xs text-zinc-800">{task.rejectReason}</p>
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

      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-zinc-950">ยืนยันการลบงาน</h2>
            <p className="mt-2 text-sm text-zinc-600">ต้องการลบงานนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {editTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-zinc-950">แก้ไขงาน</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600">ชื่องาน</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600">รายละเอียด</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600">วันกำหนดส่ง</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600">ผู้รับผิดชอบ</label>
                <select
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="">ไม่ระบุ (งานเปิดรับ)</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setEditTargetId(null)}
                className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmEdit}
                className="flex-1 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-zinc-950">ระบุเหตุผลที่ไม่อนุมัติ</h2>
            <textarea
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              rows={3}
              placeholder="กรอกเหตุผล..."
              className="mt-3 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setRejectTargetId(null)}
                className="flex-1 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmReject}
                className="flex-1 rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                ยืนยันไม่อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
