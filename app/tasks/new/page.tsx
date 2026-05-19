import Link from "next/link";

export default function NewTaskPage() {
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
              <input className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="ชื่อหัวข้องาน" />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              ผู้รับผิดชอบ
              <input className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="ชื่อพนักงาน" />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-700">
              Due Date
              <input type="date" className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              แนบรูป
              <input type="file" accept="image/*" className="mt-2 block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:outline-none" />
            </label>
          </div>

          <label className="block text-sm font-medium text-zinc-700">
            รายละเอียดงาน
            <textarea rows={5} className="mt-2 block w-full rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="รายละเอียดเพิ่มเติม"></textarea>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-600">Mockup form — ยังไม่เชื่อมฐานข้อมูล</div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/tasks" className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">
                ยกเลิก
              </Link>
              <button type="button" className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700">
                สร้างงาน
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
