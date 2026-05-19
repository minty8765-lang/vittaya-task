"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const mockEmployees = [
  { id: "E001", name: "พนักงาน A" },
  { id: "E002", name: "พนักงาน B" },
  { id: "E003", name: "พนักงาน C" },
  { id: "E004", name: "ผู้บริหาร" },
  { id: "E005", name: "ผู้จัดการคลัง" },
  { id: "E006", name: "ผู้จัดการฝ่ายขาย" },
];

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [assignType, setAssignType] = useState("");
  const [status, setStatus] = useState("");
  const [selectValue, setSelectValue] = useState("");
  const [assigneeError, setAssigneeError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  function handleAssigneeChange(value: string) {
    setSelectValue(value);
    setAssigneeError(false);
    if (value === "open") {
      setAssigneeId(null);
      setAssignType("open");
      setStatus("open");
    } else {
      setAssigneeId(value || null);
      setAssignType(value ? "assigned" : "");
      setStatus(value ? "assigned" : "");
    }
  }

  function handleSubmit() {
    if (!selectValue) {
      setAssigneeError(true);
      return;
    }
    setAssigneeError(false);

    const newTask = {
      id: `T-${Date.now()}`,
      title,
      description,
      dueDate,
      assigneeId,
      assignType,
      status,
    };
    const existing = JSON.parse(localStorage.getItem("vittaya_tasks") || "[]");
    localStorage.setItem("vittaya_tasks", JSON.stringify([...existing, newTask]));

    setShowModal(true);
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-600">สร้างงานใหม่</p>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-950">ฟอร์มสร้างงาน</h1>
          <p className="mt-2 text-zinc-600">กรอกข้อมูลงานใหม่ พร้อมกำหนด due date และแนบรูป</p>
        </div>

        <form className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-700">
              หัวข้องาน
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="ชื่อหัวข้องาน" />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              ผู้รับผิดชอบ
              <select
                value={selectValue}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className={`mt-2 block w-full rounded-2xl border bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-100 ${assigneeError ? "border-red-400 focus:border-red-400" : "border-zinc-200 focus:border-sky-500"}`}
              >
                <option value="">-- เลือกผู้รับผิดชอบ --</option>
                <option value="open">ไม่มีผู้รับผิดชอบ / เปิดให้พนักงานรับเอง</option>
                {mockEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              {assigneeError && (
                <p className="mt-1.5 text-xs font-medium text-red-500">กรุณาเลือกผู้รับผิดชอบ</p>
              )}
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-700">
              Due Date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              แนบรูป
              <input type="file" accept="image/*" className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none" />
            </label>
          </div>

          <label className="block text-sm font-medium text-zinc-700">
            รายละเอียดงาน
            <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 block w-full rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="รายละเอียดเพิ่มเติม"></textarea>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-600">Mockup form — ยังไม่เชื่อมฐานข้อมูล</div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/tasks" className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                ยกเลิก
              </Link>
              <button type="button" onClick={handleSubmit} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">
                สร้างงาน
              </button>
            </div>
          </div>
        </form>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-zinc-950">สร้างงานสำเร็จ</h2>
            <p className="mt-1 text-sm text-zinc-500">งานใหม่ถูกบันทึกเรียบร้อยแล้ว</p>
            <button
              type="button"
              onClick={() => router.push("/tasks")}
              className="mt-5 w-full rounded-2xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
