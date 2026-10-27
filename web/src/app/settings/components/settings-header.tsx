"use client";

export function SettingsHeader() {
  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="max-w-2xl text-sm leading-6 text-stone-500">Manage image storage, API access, backups, and connections.</p>
      </div>
    </section>
  );
}
