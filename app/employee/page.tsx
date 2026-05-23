"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TaskStatus = "in_progress" | "pending_approval" | "completed" | "rejected";

type Task = {
  id: string;
  task_code?: string;
  title: string;
  description: string;
  assigner: string;
  dueDate: string;
  priority: string;
  status: TaskStatus;
  submittedAt?: string;
  rejectReason?: string;
};


const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

function getTimeStatus(dueDate: string, submittedAt: string | undefined, status: TaskStatus) {
  const due = new Date(dueDate + "T23:59:59").getTime();
  const now = Date.now();

  if (submittedAt && (status === "pending_approval" || status === "completed" || status === "rejected")) {
    const submitted = new Date(submittedAt).getTime();
    const diff = due - submitted;
    if (diff >= 0) {
      if (diff >= MS_PER_DAY) return { text: `ส่งก่อนกำหนด ${Math.floor(diff / MS_PER_DAY)} วัน`, color: "bg-emerald-100 text-emerald-800" };
      if (diff >= MS_PER_HOUR) return { text: `ส่งก่อนกำหนด ${Math.floor(diff / MS_PER_HOUR)} ชม.`, color: "bg-emerald-100 text-emerald-800" };
      return { text: "ส่งทันเวลา", color: "bg-emerald-100 text-emerald-800" };
    }
    const late = submitted - due;
    if (late >= MS_PER_DAY) return { text: `ส่งช้า ${Math.ceil(late / MS_PER_DAY)} วัน`, color: "bg-orange-100 text-orange-700" };
    return { text: `ส่งช้า ${Math.ceil(late / MS_PER_HOUR)} ชม.`, color: "bg-orange-100 text-orange-700" };
  }

  const diff = due - now;
  if (diff >= 0) {
    if (diff >= MS_PER_DAY) return { text: `เหลืออีก ${Math.ceil(diff / MS_PER_DAY)} วัน`, color: "bg-sky-100 text-sky-800" };
    return { text: `เหลืออีก ${Math.max(1, Math.ceil(diff / MS_PER_HOUR))} ชม.`, color: "bg-sky-100 text-sky-800" };
  }
  const late = now - due;
  if (late >= MS_PER_DAY) return { text: `เกินกำหนด ${Math.ceil(late / MS_PER_DAY)} วัน`, color: "bg-red-100 text-red-700" };
  return { text: `เกินกำหนด ${Math.max(1, Math.ceil(late / MS_PER_HOUR))} ชม.`, color: "bg-red-100 text-red-700" };
}

const statusLabels = {
  all: "งานทั้งหมด",
  in_progress: "กำลังทำ",
  pending_approval: "รออนุมัติ",
  completed: "สำเร็จ",
  rejected: "ไม่ผ่าน",
} as const;

type StatusKey = keyof typeof statusLabels;

const statusStyles: Record<TaskStatus, string> = {
  in_progress: "bg-sky-100 text-sky-800",
  pending_approval: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

type OpenTask = {
  id: string;
  task_code?: string;
  title: string;
  description: string;
  dueDate: string;
  priority: string;
};


export default function EmployeePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openTasks, setOpenTasks] = useState<OpenTask[]>([]);
  const [acceptMessage, setAcceptMessage] = useState("");
  const [activeTab, setActiveTab] = useState<StatusKey | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submissionNote, setSubmissionNote] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("vittaya_current_user");
    if (!stored) { router.push("/login"); return; }
    const user = JSON.parse(stored);
    if (user.role !== "employee") { router.push("/login"); return; }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    async function loadTasks() {
      const [{ data }, { data: openData }] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, task_code, title, description, due_date, status, reject_reason")
          .eq("assigned_to", currentUser!.id),
        supabase
          .from("tasks")
          .select("id, task_code, title, description, due_date")
          .eq("status", "open")
          .is("assigned_to", null),
      ]);

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTasks(data.map((t: any) => ({
          id: t.id,
          task_code: t.task_code ?? undefined,
          title: t.title,
          description: t.description || "",
          assigner: "Admin",
          dueDate: t.due_date || "",
          priority: "ปานกลาง",
          status: (t.status || "in_progress") as TaskStatus,
          rejectReason: t.reject_reason ?? undefined,
        })));
      }

      if (openData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setOpenTasks(openData.map((t: any) => ({
          id: t.id,
          task_code: t.task_code ?? undefined,
          title: t.title,
          description: t.description || "",
          dueDate: t.due_date || "",
          priority: "ปานกลาง",
        })));
      }
    }

    loadTasks();
  }, [currentUser]);

  const filteredTasks = tasks.filter((task) => activeTab === "all" || task.status === activeTab);

  const counts = tasks.reduce(
    (acc, task) => {
      acc[task.status] += 1;
      acc.all += 1;
      return acc;
    },
    {
      all: 0,
      in_progress: 0,
      pending_approval: 0,
      completed: 0,
      rejected: 0,
    } as Record<StatusKey | "all", number>,
  );

  const openSubmitModal = (task: Task) => {
    setSelectedTask(task);
    setSubmissionNote("");
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setSubmissionNote("");
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAttachmentFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTask || !currentUser) return;

    let imageUrls: string[] = [];
    if (attachmentFile) {
      const path = `${selectedTask.id}-${Date.now()}-${attachmentFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("task-images")
        .upload(path, attachmentFile);
      if (uploadError) {
        alert(uploadError.message);
        return;
      }
      const { data: urlData } = supabase.storage.from("task-images").getPublicUrl(path);
      imageUrls = [urlData.publicUrl];
    }

    const { error } = await supabase
      .from("tasks")
      .update({ status: "pending_approval" })
      .eq("id", selectedTask.id);

    if (error) return;

    const { error: submissionError } = await supabase.from("task_submissions").insert({
      task_id: selectedTask.id,
      submitted_by: currentUser.id,
      description: submissionNote.trim() || null,
      image_urls: imageUrls,
    });

    if (submissionError) {
      alert(submissionError.message);
      console.error(submissionError);
      return;
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === selectedTask.id ? { ...task, status: "pending_approval" } : task,
      ),
    );

    setSuccessMessage("ส่งงานเรียบร้อยแล้ว");
    closeModal();
  };

  const handleAcceptTask = async (task: OpenTask) => {
    const { error } = await supabase
      .from("tasks")
      .update({ assigned_to: currentUser!.id, status: "in_progress" })
      .eq("id", task.id);

    if (error) return;

    setOpenTasks((current) => current.filter((t) => t.id !== task.id));
    setTasks((current) => [
      ...current,
      {
        id: task.id,
        title: task.title,
        description: task.description,
        assigner: "-",
        dueDate: task.dueDate,
        priority: task.priority,
        status: "in_progress" as TaskStatus,
      },
    ]);
    setAcceptMessage("รับงานเรียบร้อยแล้ว");
    setTimeout(() => setAcceptMessage(""), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("vittaya_current_user");
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 sm:px-5 sm:py-7">
      <div className="mx-auto w-full max-w-md sm:max-w-lg space-y-6">
        <div className="rounded-[1.75rem] bg-white p-4 shadow-lg ring-1 ring-zinc-200 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-600">งานของฉัน</p>
              <h1 className="mt-2 text-3xl font-semibold text-zinc-950">{currentUser?.name ?? ""}</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                ดูงานของคุณ แยกตามสถานะ และส่งงานหรือแก้ไขงานใหม่ได้ที่นี่
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => router.push("/employee/calendar")}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-100"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                ดูปฏิทินงาน
              </button>
              <button
                type="button"
                onClick={() => router.push("/employee/kpi")}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-100"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                ดู KPI
              </button>
            </div>
          </div>

          {(() => {
            const count = tasks.filter((t) => t.status === "rejected").length;
            if (count === 0) return null;
            return (
              <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
                <p className="text-sm font-semibold text-red-800">มีงานถูกตีกลับ {count} งาน</p>
              </div>
            );
          })()}

          {(() => {
            const total = tasks.length;
            const completed = counts.completed;
            const pending = total - completed;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const barColor = percent === 100 ? "bg-emerald-500" : percent >= 70 ? "bg-sky-500" : "bg-orange-400";
            const textColor = percent === 100 ? "text-emerald-600" : percent >= 70 ? "text-sky-600" : "text-orange-500";
            const motivational =
              percent === 100
                ? "ยอดเยี่ยม! เสร็จงานทั้งหมดแล้ว"
                : percent >= 70
                ? "ยอดเยี่ยม! งานใกล้เสร็จทั้งหมดแล้ว"
                : "ยังมีงานค้างอีกนิด สู้ๆ";
            return (
              <div className="mb-5 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 mb-3">ความคืบหน้างาน</p>
                <div className="flex items-end justify-between mb-2">
                  <span className={`text-2xl font-bold ${textColor}`}>{percent}%</span>
                  <span className="text-xs text-zinc-500">{motivational}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white p-2 ring-1 ring-zinc-200">
                    <p className="text-base font-bold text-zinc-950">{total}</p>
                    <p className="text-[10px] text-zinc-500">งานทั้งหมด</p>
                  </div>
                  <div className="rounded-xl bg-white p-2 ring-1 ring-zinc-200">
                    <p className="text-base font-bold text-emerald-600">{completed}</p>
                    <p className="text-[10px] text-zinc-500">งานสำเร็จ</p>
                  </div>
                  <div className="rounded-xl bg-white p-2 ring-1 ring-zinc-200">
                    <p className="text-base font-bold text-orange-500">{pending}</p>
                    <p className="text-[10px] text-zinc-500">งานค้าง</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="mb-5">
            <div className="mb-3">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-600">งานที่เปิดให้รับ</p>
              <h2 className="mt-1 text-base font-semibold text-zinc-950">รับงานที่ยังไม่มีผู้รับผิดชอบ</h2>
            </div>

            {acceptMessage && (
              <div className="mb-3 rounded-3xl bg-emerald-50 p-3 text-sm text-emerald-900 shadow-sm">
                {acceptMessage}
              </div>
            )}

            <div className="space-y-3">
              {openTasks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-600">
                  ไม่มีงานที่เปิดให้รับในขณะนี้
                </div>
              ) : (
                openTasks.map((task) => (
                  <div key={task.id} className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">{task.priority}</span>
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">เปิดรับ</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">{task.task_code ?? task.id.slice(0, 8)}</p>
                          <h3 className="mt-1 text-lg font-semibold text-zinc-950">{task.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-zinc-600">{task.description}</p>
                        </div>
                        <p className="text-sm text-zinc-600">
                          Due date: <span className="font-semibold text-zinc-900">{task.dueDate || "ไม่มีกำหนด"}</span>
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <button
                          type="button"
                          onClick={() => handleAcceptTask(task)}
                          className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 sm:px-4 sm:text-sm"
                        >
                          รับงาน
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mb-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex gap-2 rounded-full bg-zinc-100 p-1">
              {(Object.entries(statusLabels) as [StatusKey | "all", string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                    activeTab === key
                      ? "bg-sky-600 text-white shadow"
                      : "text-zinc-700 hover:bg-white"
                  }`}
                >
                  {label} ({counts[key] ?? 0})
                </button>
              ))}
            </div>
          </div>

          {successMessage && (
            <div className="mb-4 rounded-3xl bg-emerald-50 p-3 text-sm text-emerald-900 shadow-sm">
              {successMessage}
            </div>
          )}

          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
                ยังไม่มีงานในหมวดนี้
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div key={task.id} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800">{task.priority}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[task.status]}`}>{statusLabels[task.status]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">{task.task_code ?? task.id.slice(0, 8)}</p>
                        <h2 className="mt-1 text-xl font-semibold text-zinc-950 sm:text-2xl">{task.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-zinc-600">{task.description}</p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <p className="text-sm text-zinc-600">
                          ผู้สั่งงาน: <span className="font-semibold text-zinc-900">{task.assigner}</span>
                        </p>
                        <p className="text-sm text-zinc-600">
                          Due date: <span className="font-semibold text-zinc-900">{task.dueDate || "ไม่มีกำหนด"}</span>
                        </p>
                      </div>
                      {task.dueDate && (() => {
                        const ts = getTimeStatus(task.dueDate, task.submittedAt, task.status);
                        return (
                          <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${ts.color}`}>
                            {ts.text}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="flex flex-col gap-2 sm:items-end">
                      {task.status === "in_progress" && (
                        <button
                          type="button"
                          onClick={() => openSubmitModal(task)}
                          className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 sm:px-4 sm:text-sm"
                        >
                          ส่งงาน
                        </button>
                      )}
                      {task.status === "rejected" && (
                        <button
                          type="button"
                          onClick={() => openSubmitModal(task)}
                          className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 sm:px-4 sm:text-sm"
                        >
                          แก้ไขส่งใหม่
                        </button>
                      )}
                    </div>
                  </div>
                  {task.status === "rejected" && task.rejectReason && (
                    <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2.5 ring-1 ring-red-100">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-600">เหตุผลที่ไม่อนุมัติ</p>
                      <p className="mt-1 text-sm text-zinc-800">{task.rejectReason}</p>
                    </div>
                  )}
                </div>
              ))
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

      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 sm:px-6">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-600">ส่งงาน</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-950">{selectedTask.title}</h2>
                <p className="mt-1 text-sm text-zinc-600">{selectedTask.description}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-zinc-100 px-3 py-2 text-zinc-700 transition hover:bg-zinc-200"
              >
                ปิด
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700">รายละเอียดการส่งงาน</label>
                <textarea
                  value={submissionNote}
                  onChange={(event) => setSubmissionNote(event.target.value)}
                  rows={4}
                  placeholder="กรอกข้อมูลเพิ่มเติมเกี่ยวกับงานที่ส่ง"
                  className="mt-2 w-full rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">แนบรูปภาพ</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="mt-2 w-full text-sm text-zinc-700"
                />
              </div>

              {attachmentPreview && (
                <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-semibold text-zinc-900">ภาพตัวอย่างที่แนบ</p>
                  <img src={attachmentPreview} alt="preview" className="mt-3 max-h-64 w-full rounded-3xl object-cover" />
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  ยืนยันส่งงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
