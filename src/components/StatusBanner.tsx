type StatusBannerProps = {
  source: "sheet" | "fallback" | "zoho" | "empty";
  warning?: string;
  lastSyncedAt?: string;
};

export function StatusBanner({ source, warning, lastSyncedAt }: StatusBannerProps) {
  const isFallback = source === "fallback" || Boolean(warning);

  if (!isFallback && !lastSyncedAt) return null;

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        isFallback
          ? "border-[var(--macro-warning)]/40 bg-[var(--macro-warning)]/10 text-[var(--macro-text-muted)]"
          : "border-[var(--macro-accent)]/30 bg-[var(--macro-accent-glow)] text-[var(--macro-text-muted)]"
      }`}
    >
      {warning ? (
        <p>{warning}</p>
      ) : (
        <p>
          Dados sincronizados da {source === "sheet" ? "planilha Zoho Sheet" : "Zoho Projects"}
          {lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleString("pt-BR")}` : ""}
        </p>
      )}
    </div>
  );
}
