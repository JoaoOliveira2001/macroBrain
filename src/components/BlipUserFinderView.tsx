"use client";

import { FormEvent, useState } from "react";

type BlipRouterHit = {
  router: string;
  id: string;
  phoneNumber?: string;
  identity: string;
  name?: string;
  lastMessageDate?: string;
  hasOrder: boolean;
  orderFields: Record<string, string>;
  extrasPreview: Record<string, string>;
  portalUrl: string;
};

type MacroOrderSummary = {
  orderId: string;
  orderRef?: string;
  phone: string;
  ddd?: string;
  status?: string;
  productType?: string;
  projectId?: string;
  customerName?: string;
  email?: string;
};

type SearchMode = "phone" | "order";

type SearchResult = {
  searchMode: SearchMode;
  query: string;
  identitiesTested: string[];
  totalRouters: number;
  foundCount: number;
  withOrderCount: number;
  found: BlipRouterHit[];
  withOrder: string[];
  orderInfo?: MacroOrderSummary;
};

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export function BlipUserFinderView() {
  const [mode, setMode] = useState<SearchMode>("phone");
  const [query, setQuery] = useState("");
  const [ddd, setDdd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        mode,
        q: query.trim(),
      });
      if (mode === "phone" && ddd.trim()) params.set("ddd", ddd.trim());

      const response = await fetch(`/api/blip/find-user?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Falha na busca");
      }

      setResult(data as SearchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const withOrder = result?.found.filter((item) => item.hasOrder) ?? [];
  const withoutOrder = result?.found.filter((item) => !item.hasOrder) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Busca Blip</h1>
        <p className="mt-1 text-sm text-[var(--macro-text-muted)]">
          Localiza em qual router o usuário tem dados de pedido na Blip.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--macro-border)] bg-[var(--macro-surface)] p-5"
      >
        <div className="mb-4 flex gap-1 rounded-xl border border-[var(--macro-border)] bg-[var(--macro-surface-elevated)] p-1">
          {([
            ["phone", "Telefone"],
            ["order", "Pedido"],
          ] as const).map(([value, label]) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--macro-accent)] text-black"
                    : "text-[var(--macro-text-muted)] hover:text-[var(--macro-text)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div
          className={`grid gap-4 ${mode === "phone" ? "sm:grid-cols-[1fr_120px_auto]" : "sm:grid-cols-[1fr_auto]"}`}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm text-[var(--macro-text-muted)]">
              {mode === "phone" ? "Telefone ou identity" : "Order ID ou Order Ref"}
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mode === "phone" ? "5532991757724" : "26EB5R0GR38A06"}
              className="w-full rounded-lg border border-[var(--macro-border-muted)] bg-[var(--macro-surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--macro-accent)]"
            />
          </label>

          {mode === "phone" && (
            <label className="block">
              <span className="mb-1.5 block text-sm text-[var(--macro-text-muted)]">DDD</span>
              <input
                value={ddd}
                onChange={(event) => setDdd(event.target.value)}
                placeholder="32"
                className="w-full rounded-lg border border-[var(--macro-border-muted)] bg-[var(--macro-surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--macro-accent)]"
              />
            </label>
          )}

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full rounded-lg border border-[var(--macro-accent)] bg-[var(--macro-accent-glow)] px-4 py-2 text-sm font-medium text-[var(--macro-accent)] transition hover:bg-[var(--macro-accent)] hover:text-black disabled:opacity-50 sm:w-auto"
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-[var(--macro-text-dim)]">
          {mode === "phone"
            ? "A busca consulta todos os routers cadastrados. Pode levar alguns segundos."
            : "Busca o telefone no MacroLabs e depois localiza o usuário nos routers da Blip."}
        </p>
      </form>

      {error && (
        <div className="rounded-xl border border-[var(--macro-danger)]/40 bg-[var(--macro-danger)]/10 p-4 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-[var(--macro-border)] bg-[var(--macro-surface)] p-5 text-sm text-[var(--macro-text-muted)]">
          {mode === "order"
            ? "Consultando pedido no MacroLabs e routers na Blip..."
            : "Consultando routers na Blip..."}
        </div>
      )}

      {result && !loading && (
        <div className="space-y-5">
          {result.orderInfo && (
            <section className="rounded-2xl border border-[var(--macro-border)] bg-[var(--macro-surface)] p-5">
              <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--macro-text-dim)]">
                Pedido MacroLabs
              </h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-[var(--macro-text-dim)]">Order ID</dt>
                  <dd className="font-mono text-xs">{result.orderInfo.orderId}</dd>
                </div>
                {result.orderInfo.orderRef && (
                  <div>
                    <dt className="text-[var(--macro-text-dim)]">Order Ref</dt>
                    <dd className="font-mono text-xs">{result.orderInfo.orderRef}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[var(--macro-text-dim)]">Telefone</dt>
                  <dd>
                    {result.orderInfo.ddd
                      ? `(${result.orderInfo.ddd}) ${result.orderInfo.phone}`
                      : result.orderInfo.phone}
                  </dd>
                </div>
                {result.orderInfo.customerName && (
                  <div>
                    <dt className="text-[var(--macro-text-dim)]">Cliente</dt>
                    <dd>{result.orderInfo.customerName}</dd>
                  </div>
                )}
                {result.orderInfo.status && (
                  <div>
                    <dt className="text-[var(--macro-text-dim)]">Status</dt>
                    <dd>{result.orderInfo.status}</dd>
                  </div>
                )}
                {result.orderInfo.productType && (
                  <div>
                    <dt className="text-[var(--macro-text-dim)]">Produto</dt>
                    <dd>{result.orderInfo.productType}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Routers", result.totalRouters],
              ["Encontrados", result.foundCount],
              ["Com pedido", result.withOrderCount],
              ["Identidades", result.identitiesTested.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--macro-border)] bg-[var(--macro-surface)] p-4"
              >
                <p className="text-xs text-[var(--macro-text-dim)]">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {result.identitiesTested.length > 0 && (
            <p className="text-xs text-[var(--macro-text-dim)]">
              Identidades testadas: {result.identitiesTested.join(", ")}
            </p>
          )}

          {withOrder.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-[var(--macro-accent)]">
                Routers com dados de pedido
              </h2>
              {withOrder.map((item) => (
                <article
                  key={`${item.id}-${item.identity}`}
                  className="rounded-2xl border border-[var(--macro-accent)]/30 bg-[var(--macro-accent-glow)]/40 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{item.router}</h3>
                      <p className="text-sm text-[var(--macro-text-muted)]">{item.id}</p>
                    </div>
                    <a
                      href={item.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-[var(--macro-accent)] px-3 py-1.5 text-sm font-medium text-[var(--macro-accent)] transition hover:bg-[var(--macro-accent)] hover:text-black"
                    >
                      Abrir no Blip
                    </a>
                  </div>

                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[var(--macro-text-dim)]">Nome</dt>
                      <dd>{item.name ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--macro-text-dim)]">Última mensagem</dt>
                      <dd>{formatDate(item.lastMessageDate)}</dd>
                    </div>
                    {item.phoneNumber && (
                      <div>
                        <dt className="text-[var(--macro-text-dim)]">Número do bot</dt>
                        <dd>{item.phoneNumber}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[var(--macro-text-dim)]">Identity</dt>
                      <dd className="break-all font-mono text-xs">{item.identity}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-xl border border-[var(--macro-border)] bg-[var(--macro-surface)] p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--macro-text-dim)]">
                      Pedido
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.orderFields).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-full border border-[var(--macro-border-muted)] bg-[var(--macro-surface-elevated)] px-3 py-1 text-xs"
                        >
                          <span className="text-[var(--macro-text-dim)]">{key}:</span> {value}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}

          {withoutOrder.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Usuário encontrado sem pedido</h2>
              {withoutOrder.map((item) => (
                <article
                  key={`${item.id}-${item.identity}`}
                  className="rounded-2xl border border-[var(--macro-border)] bg-[var(--macro-surface)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{item.router}</h3>
                      <p className="text-sm text-[var(--macro-text-muted)]">{item.id}</p>
                    </div>
                    <a
                      href={item.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[var(--macro-accent)] hover:underline"
                    >
                      Abrir no Blip
                    </a>
                  </div>
                </article>
              ))}
            </section>
          )}

          {result.foundCount === 0 && (
            <div className="rounded-xl border border-[var(--macro-border)] bg-[var(--macro-surface)] p-5 text-sm text-[var(--macro-text-muted)]">
              Nenhum router retornou esse usuário.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
