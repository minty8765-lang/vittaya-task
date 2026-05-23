"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  name: string;
  email: string;
  position: string;
  role: "admin" | "employee";
  status: "active" | "inactive";
  totalTasks: number;
  completedTasks: number;
  kpiScore: number;
};


const emptyForm = {
  name: "",
  email: "",
  position: "",
  role: "employee" as "admin" | "employee",
  password: "",
};

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, email, full_name, position, role, created_at")
      .eq("role", "employee")
      .then(({ data }) => {
        if (data) {
          setEmployees(
            data.map((p) => ({
              id: p.id,
              name: p.full_name || p.email,
              email: p.email,
              position: p.position || "",
              role: p.role as "admin" | "employee",
              status: "active" as const,
              totalTasks: 0,
              completedTasks: 0,
              kpiScore: 0,
            }))
          );
        }
      });
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showAddInfo, setShowAddInfo] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("vittaya_current_user");
    router.push("/login");
  };

  const openAddModal = () => {
    setEditId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      position: employee.position,
      role: employee.role,
      password: "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editId) {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.name, position: form.position, role: form.role })
        .eq("id", editId);

      if (error) {
        alert(error.message);
        return;
      }
      setEmployees((current) =>
        current.map((employee) =>
          employee.id === editId
            ? { ...employee, name: form.name, position: form.position, role: form.role }
            : employee,
        ),
      );
    } else {
      const newEmployee: Employee = {
        id: `E${Date.now()}`,
        name: form.name,
        email: form.email,
        position: form.position,
        role: form.role,
        status: "active",
        totalTasks: 0,
        completedTasks: 0,
        kpiScore: 0,
      };
      setEmployees((current) => [newEmployee, ...current]);
    }

    closeModal();
  };

  const toggleStatus = (id: string) => {
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === id
          ? {
              ...employee,
              status: employee.status === "active" ? "inactive" : "active",
            }
          : employee,
      ),
    );
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md sm:max-w-lg">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
            >
              ←
            </button>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="text-lg font-semibold text-zinc-950">จัดการพนักงาน</h1>
              <p className="mt-1 text-sm text-zinc-600">ดูและจัดการสถานะพนักงาน</p>
            </div>
            {/* Logout moved to bottom */}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700">พนักงานทั้งหมด</p>
              <p className="text-xs text-zinc-500">{employees.length} คน</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddInfo(true)}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700"
            >
              เพิ่มพนักงาน
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {employees.map((employee) => (
            <div key={employee.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-zinc-950">{employee.name}</h2>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        employee.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {employee.status === "active" ? "ใช้งาน" : "ปิดใช้งาน"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{employee.position || "ยังไม่ระบุตำแหน่ง"}</p>
                  <p className="mt-1 text-sm text-zinc-500">{employee.email}</p>
                  <p className="mt-1 text-sm text-zinc-500">บทบาท: {employee.role === "admin" ? "ผู้ดูแลระบบ" : "พนักงาน"}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-[13px] text-zinc-700">
                      งานทั้งหมด
                      <p className="mt-1 text-sm font-semibold text-zinc-950">{employee.totalTasks}</p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-[13px] text-zinc-700">
                      งานสำเร็จ
                      <p className="mt-1 text-sm font-semibold text-zinc-950">{employee.completedTasks}</p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 px-3 py-2 text-[13px] text-zinc-700">
                      KPI
                      <p className="mt-1 text-sm font-semibold text-zinc-950">{employee.kpiScore}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-2 sm:w-36">
                  <button
                    type="button"
                    onClick={() => openEditModal(employee)}
                    className="rounded-2xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(employee.id)}
                    className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
                  >
                    {employee.status === "active" ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">{editId ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}</h2>
                <p className="mt-1 text-sm text-zinc-600">กรอกข้อมูลพนักงานใหม่หรือแก้ไขข้อมูลเดิม</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
                  ชื่อพนักงาน
                </label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                  อีเมล
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-zinc-700">
                  ตำแหน่ง
                </label>
                <input
                  id="position"
                  value={form.position}
                  onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
                  className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-zinc-700">
                  บทบาท
                </label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as "admin" | "employee" }))}
                  className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="employee">พนักงาน</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  {editId ? "บันทึกการแก้ไข" : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {showAddInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl text-center">
            <h2 className="text-base font-semibold text-zinc-950">เพิ่มพนักงานใหม่</h2>
            <p className="mt-3 text-sm text-zinc-600">
              ตอนนี้การสร้างพนักงานใหม่ทำผ่าน<br />
              <span className="font-medium text-zinc-800">Supabase Authentication → Users</span>
            </p>
            <button
              type="button"
              onClick={() => setShowAddInfo(false)}
              className="mt-5 w-full rounded-2xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full max-w-md rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 font-semibold hover:bg-rose-100"
        >
          Logout
        </button>
      </div>
    </main>
  );
}
