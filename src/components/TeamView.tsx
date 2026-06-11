"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBanner } from "./StatusBanner";

type Developer = {
  name: string;
  email: string;
  projects: string[];
};

type WorkloadDev = {
  email: string;
  openTaskCount: number;
  tasks: Array<{ name: string; projectName: string }>;
};

type AssignmentsData = {
  developers: Developer[];
  source: "sheet" | "fallback";
  lastSyncedAt: string;
  warning?: string;
};

type WorkloadData = {
  developers: WorkloadDev[];
  warning?: string;
};

export function TeamView() {
  const [assignments, setAssignments] = useState<AssignmentsData | null>(null);
  const [workload, setWorkload] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setError(null);
    try {
      const [assignRes, workRes] = await Promise.all([
        fetch(`/api/assignments${force ? "?refresh=true" : ""}`),
        fetch("/api/workload"),
      ]);

      if (!assignRes.ok) throw new Error("Falha ao carregar responsabilidades");
      if (!workRes.ok) throw new Error("Falha ao carregar workload");

      setAssignments((await assignRes.json()) as AssignmentsData);
      setWorkload((await workRes.json()) as WorkloadData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load(true);
  };

  const workloadByEmail = new Map(
    workload?.developers.map((d) => [d.email.toLowerCase(), d]) ?? [],
  );

  if (loading) {
    return <p className="text-[var(--macro-text-muted)]">Carregando time...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--macro-danger)]/40 bg-[var(--macro-danger)]/10 p-4 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Visão do Time</h1>
          <p className="mt-1 text-sm text-[var(--macro-text-dim)]">
            15 devs · responsabilidades da planilha · workload Zoho Projects
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-lg border border-[var(--macro-accent)] bg-[var(--macro-accent-glow)] px-4 py-2 text-sm font-medium text-[var(--macro-accent)] transition hover:bg-[var(--macro-accent)] hover:text-black disabled:opacity-50"
        >
          {refreshing ? "Recarregando..." : "Recarregar da planilha"}
        </button>
      </div>

      {assignments && (
        <StatusBanner
          source={assignments.source}
          warning={assignments.warning}
          lastSyncedAt={assignments.lastSyncedAt}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assignments?.developers.map((dev) => {
          const wl = workloadByEmail.get(dev.email.toLowerCase());
          return (
            <article
              key={dev.email}
              className="rounded-2xl border border-[var(--macro-border)] bg-[var(--macro-surface)] p-5 transition hover:border-[var(--macro-accent)]/40"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{dev.name}</h2>
                  <p className="text-xs text-[var(--macro-text-dim)]">{dev.email}</p>
                </div>
                <span className="rounded-full border border-[var(--macro-border-muted)] bg-[var(--macro-surface-elevated)] px-2.5 py-1 text-xs text-[var(--macro-accent)]">
                  {wl?.openTaskCount ?? 0} tarefas
                </span>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--macro-text-dim)]">
                  Projetos (planilha)
                </p>
                {dev.projects.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {dev.projects.map((p) => (
                      <li
                        key={p}
                        className="rounded-md bg-[var(--macro-accent-glow)] px-2 py-1 text-xs text-[var(--macro-accent)]"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--macro-text-dim)]">Sem projetos atribuídos</p>
                )}
              </div>

              {wl && wl.tasks.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--macro-text-dim)]">
                    Tarefas abertas
                  </p>
                  <ul className="space-y-1.5">
                    {wl.tasks.slice(0, 4).map((t, i) => (
                      <li key={`${t.name}-${i}`} className="text-xs text-[var(--macro-text-muted)]">
                        <span className="text-[var(--macro-text)]">{t.name}</span>
                        <span className="text-[var(--macro-text-dim)]"> · {t.projectName}</span>
                      </li>
                    ))}
                    {wl.tasks.length > 4 && (
                      <li className="text-xs text-[var(--macro-text-dim)]">
                        +{wl.tasks.length - 4} mais
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {workload?.warning && (
        <p className="mt-4 text-xs text-[var(--macro-warning)]">Workload: {workload.warning}</p>
      )}
    </div>
  );
}
