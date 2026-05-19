"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type TaskStatus = "in_progress" | "pending_approval" | "completed" | "rejected";

type Task = {
  id: string;
  title: string;
  description: string;
  assigner: string;
  dueDate: string;
  priority: string;
  status: TaskStatus;
};

const currentEmployee = "พนักงาน A";

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

const initialTasks: Task[] = [
  {
    id: "T-101",
    title: "จัดทำรายงานสรุปผล",
    description: "รวบรวมข้อมูลยอดขายประจำเดือนและจัดทำสรุปรายงานให้ผู้บริหาร",
    assigner: "ผู้บริหาร",
    dueDate: "2026-05-30",
    priority: "สูง",
    status: "in_progress",
  },
  {
    id: "T-102",
    title: "ตรวจสอบคลังสินค้า",
    description: "ตรวจสอบสต็อกสินค้าและปรับข้อมูลในระบบให้ถูกต้อง",
    assigner: "ผู้จัดการคลัง",
    dueDate: "2026-05-24",
    priority: "ปานกลาง",
    status: "pending_approval",
  },
  {
    id: "T-103",
    title: "ส่งเอกสารสัญญา",
    description: "ตรวจสอบสัญญาและส่งให้ลูกค้าพร้อมเอกสารที่เกี่ยวข้อง",
    assigner: "ผู้บริหาร",
    dueDate: "2026-05-22",
    priority: "สูง",
    status: "completed",
  },
  {
    id: "T-104",
    title: "แก้ไขใบเสนอราคา",
    description: "ปรับแก้ใบเสนอราคาตามคำติชมของลูกค้าและส่งให้ตรวจสอบใหม่",
    assigner: "ผู้จัดการฝ่ายขาย",
    dueDate: "2026-05-27",
    priority: "ต่ำ",
    status: "rejected",
  },
  {
    id: "T-105",
    title: "ปรับปรุงข้อมูลลูกค้า",
    description: "อัปเดตข้อมูลลูกค้าในระบบ CRM ตามการติดต่อล่าสุด",
    assigner: "ผู้ช่วยผู้จัดการ",
    dueDate: "2026-05-26",
    priority: "ปานกลาง",
    status: "in_progress",
  },
];

export default function EmployeePage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<StatusKey | "all">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [submissionNote, setSubmissionNote] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTask) return;

    setTasks((current) =>
      current.map((task) =>
        task.id === selectedTask.id ? { ...task, status: "pending_approval" } : task,
      ),
    );

    setSuccessMessage("ส่งงานเรียบร้อยแล้ว");
    closeModal();
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("mockUser");
    }
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 sm:px-5 sm:py-7">
      <div className="mx-auto w-full max-w-md sm:max-w-lg">
        <div className="rounded-[1.75rem] bg-white p-4 shadow-lg ring-1 ring-zinc-200 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-600">งานของฉัน</p>
              <h1 className="mt-2 text-3xl font-semibold text-zinc-950">{currentEmployee}</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                ดูงานของคุณ แยกตามสถานะ และส่งงานหรือแก้ไขงานใหม่ได้ที่นี่
              </p>
            </div>
            <div className="flex items-center justify-end">
              {/* Back button and other header controls kept; Logout moved to bottom */}
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
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">{task.id}</p>
                        <h2 className="mt-1 text-xl font-semibold text-zinc-950 sm:text-2xl">{task.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-zinc-600">{task.description}</p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <p className="text-sm text-zinc-600">
                          ผู้สั่งงาน: <span className="font-semibold text-zinc-900">{task.assigner}</span>
                        </p>
                        <p className="text-sm text-zinc-600">
                          Due date: <span className="font-semibold text-zinc-900">{task.dueDate}</span>
                        </p>
                      </div>
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
