"use client";

import { useCallback, useEffect, useState } from "react";
import { TEAM_DEVELOPERS } from "@/lib/devs";
import { StatusBanner } from "./StatusBanner";

type ProjectAssignment = {
  project: string;
  developerName: string | null;
  developerEmail: string | null;
};

type AssignmentsData = {
  projects: ProjectAssignment[];
  source: "sheet" | "fallback";
  lastSyncedAt: string;
  warning?: string;
};

export function ProjectsView() {
  const [data, setData] = useState<AssignmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/assignments");
      if (!res.ok) throw new Error("Falha ao carregar projetos");
      setData((await res.json()) as AssignmentsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAssign = async (project: string, developerEmail: string) => {
    setSaving(project);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          developerEmail: developerEmail || null,
        }),
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error ?? "Falha ao salvar na planilha");
      }

      setData(payload as AssignmentsData);
      setMessage(`'${project}' atualizado na planilha.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <p className="text-[var(--macro-text-muted)]">Carregando projetos...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Visão de Projetos</h1>
        <p className="mt-1 text-sm text-[var(--macro-text-dim)]">
          Edite o responsável — mudanças gravam na planilha Zoho Sheet
        </p>
      </div>

      {data && (
        <StatusBanner
          source={data.source}
          warning={data.warning}
          lastSyncedAt={data.lastSyncedAt}
        />
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-[var(--macro-danger)]/40 bg-[var(--macro-danger)]/10 p-3 text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-[var(--macro-accent)]/40 bg-[var(--macro-accent-glow)] p-3 text-sm text-[var(--macro-accent)]">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--macro-border)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--macro-border)] bg-[var(--macro-surface-elevated)]">
            <tr>
              <th className="px-4 py-3 font-medium text-[var(--macro-text-muted)]">Projeto</th>
              <th className="px-4 py-3 font-medium text-[var(--macro-text-muted)]">Responsável</th>
              <th className="px-4 py-3 font-medium text-[var(--macro-text-muted)]">Ação</th>
            </tr>
          </thead>
          <tbody>
            {data?.projects.map((row) => (
              <ProjectRow
                key={row.project}
                row={row}
                saving={saving === row.project}
                onSave={handleAssign}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectRow({
  row,
  saving,
  onSave,
}: {
  row: ProjectAssignment;
  saving: boolean;
  onSave: (project: string, email: string) => void;
}) {
  const [selected, setSelected] = useState(row.developerEmail ?? "");

  useEffect(() => {
    setSelected(row.developerEmail ?? "");
  }, [row.developerEmail]);

  return (
    <tr className="border-b border-[var(--macro-border)]/60 hover:bg-[var(--macro-surface)]">
      <td className="px-4 py-3 font-medium">{row.project}</td>
      <td className="px-4 py-3 text-[var(--macro-text-muted)]">
        {row.developerName ?? (
          <span className="text-[var(--macro-warning)]">Sem responsável</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-[var(--macro-border-muted)] bg-[var(--macro-surface-elevated)] px-3 py-1.5 text-sm text-[var(--macro-text)] outline-none focus:border-[var(--macro-accent)]"
          >
            <option value="">— Sem responsável —</option>
            {TEAM_DEVELOPERS.map((d) => (
              <option key={d.email} value={d.email}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave(row.project, selected)}
            className="rounded-lg bg-[var(--macro-accent)] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[var(--macro-accent-muted)] disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </td>
    </tr>
  );
}
