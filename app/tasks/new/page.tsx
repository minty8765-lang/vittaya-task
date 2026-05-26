"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = { id: string; name: string };

export default function NewTaskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [selectValue, setSelectValue] = useState("");
  const [assigneeError, setAssigneeError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "employee")
      .then(({ data }) => {
        if (data) setEmployees(data.map((p) => ({ id: p.id, name: p.full_name || p.email || p.id })));
      });
  }, []);

  function handleAssigneeChange(value: string) {
    setSelectValue(value);
    setAssigneeError(false);
    if (value === "open") {
      setAssigneeId(null);
      setStatus("open");
    } else {
      setAssigneeId(value || null);
      setStatus(value ? "in_progress" : "");
    }
  }

  async function handleSubmit() {
    if (!selectValue) {
      setAssigneeError(true);
      return;
    }
    setAssigneeError(false);
    setIsSubmitting(true);
    setSubmitError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      title,
      description,
      due_date: dueDate || null,
      created_by: user.id,
      assigned_to: assigneeId,
      status,
    });

    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setShowModal(true);
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6">
      <div className="mx-auto w-full max-w-md sm:max-w-lg rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
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
                {employees.map((emp) => (
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
            <div className="text-sm text-red-500">{submitError}</div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                ยกเลิก
              </Link>
              <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                {isSubmitting ? "กำลังบันทึก..." : "สร้างงาน"}
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
              onClick={() => router.push("/dashboard")}
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
