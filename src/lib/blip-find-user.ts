import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const BLIP_COMMANDS_URL = "https://http.msging.net/commands";
const PORTAL_BASE = "https://macro.blip.ai/application/detail";
const ORDER_EXTRA_KEYS = [
  "idpedido",
  "idpedidoref",
  "idpedidobot",
  "orderid",
  "orderref",
  "numeropedido",
  "pedido",
];

export type BlipRouter = {
  name: string;
  id: string;
  authorization: string;
  phoneNumber?: string;
};

export type BlipRouterHit = {
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

export type BlipSearchMode = "phone" | "order";

export type MacroOrderSummary = {
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

export type BlipFindUserResult = {
  searchMode: BlipSearchMode;
  query: string;
  identitiesTested: string[];
  totalRouters: number;
  foundCount: number;
  withOrderCount: number;
  found: BlipRouterHit[];
  withOrder: string[];
  orderInfo?: MacroOrderSummary;
};

type RawRouter = {
  id?: string;
  authorization?: string;
  router?: string;
  bot?: string;
  phoneNumber?: string;
  "phone number"?: string;
  phone?: string;
};

type BlipContact = {
  identity?: string;
  name?: string;
  lastMessageDate?: string;
  phoneNumber?: string;
  extras?: Record<string, unknown>;
};

type BlipContactResponse = {
  status?: string;
  resource?: BlipContact & {
    total?: number;
    items?: BlipContact[];
  };
};

let routersCache: BlipRouter[] | null = null;

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function buildIdentities(phoneInput: string, ddd?: string): string[] {
  const digits = onlyDigits(phoneInput);
  const candidates: string[] = [];

  const add = (identityDigits: string) => {
    const identity = `${identityDigits}@wa.gw.msging.net`;
    if (!candidates.includes(identity)) candidates.push(identity);
  };

  if (phoneInput.includes("@")) {
    add(phoneInput.split("@", 1)[0]!);
    return candidates;
  }

  if (digits.startsWith("55") && digits.length >= 12) {
    add(digits);
    if (digits.length > 12) add(`55${digits.slice(-11)}`);
    return candidates;
  }

  if (ddd) {
    const dddDigits = onlyDigits(ddd);
    let local = digits;
    if (local.startsWith("0")) local = local.replace(/^0+/, "");

    if (local.startsWith(dddDigits)) {
      add(`55${local}`);
      const withoutDdd = local.slice(dddDigits.length);
      if (withoutDdd.length === 8 && !withoutDdd.startsWith("9")) {
        add(`55${dddDigits}9${withoutDdd}`);
      }
    } else {
      add(`55${dddDigits}${local}`);
      if (!local.startsWith("9") && local.length <= 9) {
        add(`55${dddDigits}9${local}`);
      }
    }
    return candidates;
  }

  if (digits.length === 10 || digits.length === 11) {
    add(`55${digits}`);
    if (digits.length === 10) add(`55${digits.slice(0, 2)}9${digits.slice(2)}`);
    return candidates;
  }

  add(digits);
  if (!digits.startsWith("55")) add(`55${digits}`);
  return candidates;
}

function extractOrderFields(extras: Record<string, unknown>): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [key, value] of Object.entries(extras)) {
    if (value == null || value === "" || value === "false" || value === "null") continue;
    const keyLower = key.toLowerCase();
    if (ORDER_EXTRA_KEYS.some((token) => keyLower.includes(token))) {
      found[key] = String(value);
    }
  }
  return found;
}

async function blipCommand(
  authorization: string,
  uri: string,
  to = "postmaster@msging.net",
): Promise<BlipContactResponse> {
  const response = await fetch(BLIP_COMMANDS_URL, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: randomUUID(),
      to,
      method: "get",
      uri,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as BlipContactResponse;
}

async function blipGetContact(
  authorization: string,
  identity: string,
): Promise<BlipContactResponse> {
  return blipCommand(authorization, `/contacts/${identity}`);
}

function contactFromResource(
  router: BlipRouter,
  contact: BlipContact,
): BlipRouterHit {
  const identity = contact.identity ?? "";
  const extras = (contact.extras ?? {}) as Record<string, unknown>;
  const orderFields = extractOrderFields(extras);
  const extrasPreview = Object.fromEntries(
    Object.entries(extras)
      .filter(([, value]) => value != null && value !== "" && value !== "false")
      .slice(0, 12)
      .map(([key, value]) => [key, String(value)]),
  );

  return {
    router: router.name,
    id: router.id,
    phoneNumber: router.phoneNumber,
    identity,
    name: contact.name,
    lastMessageDate: contact.lastMessageDate,
    hasOrder: Object.keys(orderFields).length > 0,
    orderFields,
    extrasPreview,
    portalUrl: `${PORTAL_BASE}/${router.id}/users/${identity}`,
  };
}

function hitMatchesOrder(
  hit: BlipRouterHit,
  orderId: string,
  orderRef?: string,
): boolean {
  const targets = new Set(
    [orderId, orderRef].filter(Boolean).map((value) => value!.toUpperCase()),
  );
  return Object.values(hit.orderFields).some((value) =>
    targets.has(value.toUpperCase()),
  );
}

async function inspectRouter(
  router: BlipRouter,
  identities: string[],
): Promise<BlipRouterHit | null> {
  for (const identity of identities) {
    try {
      const payload = await blipGetContact(router.authorization, identity);
      if (payload.status !== "success") continue;

      const resource = payload.resource ?? {};
      return contactFromResource(router, { ...resource, identity });
    } catch {
      continue;
    }
  }

  return null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function parseRouters(raw: RawRouter[]): BlipRouter[] {
  const byId = new Map<string, BlipRouter>();

  for (const item of raw) {
    if (!item.id || !item.authorization) continue;
    const phone = item.phoneNumber ?? item["phone number"] ?? item.phone;
    byId.set(item.id, {
      name: item.router ?? item.bot ?? item.id,
      id: item.id,
      authorization: item.authorization,
      phoneNumber: phone ? String(phone).trim() : undefined,
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function loadRouters(): Promise<BlipRouter[]> {
  if (routersCache) return routersCache;

  const envRouters = process.env.BLIP_ROUTERS_JSON;
  if (envRouters) {
    routersCache = parseRouters(JSON.parse(envRouters) as RawRouter[]);
    return routersCache;
  }

  const filePath = path.join(process.cwd(), "data", "blip-routers.json");
  const raw = JSON.parse(await readFile(filePath, "utf-8")) as RawRouter[];
  routersCache = parseRouters(raw);
  return routersCache;
}

function buildFindResult(
  mode: BlipSearchMode,
  query: string,
  identitiesTested: string[],
  hits: BlipRouterHit[],
  totalRouters: number,
  extra?: Pick<BlipFindUserResult, "orderInfo">,
): BlipFindUserResult {
  hits.sort((a, b) => {
    if (a.hasOrder !== b.hasOrder) return a.hasOrder ? -1 : 1;
    return a.router.localeCompare(b.router, "pt-BR");
  });

  const withOrder = hits.filter((hit) => hit.hasOrder);

  return {
    searchMode: mode,
    query,
    identitiesTested,
    totalRouters,
    foundCount: hits.length,
    withOrderCount: withOrder.length,
    found: hits,
    withOrder: withOrder.map((hit) => hit.id),
    ...extra,
  };
}

export async function findUserInRouters(
  phone: string,
  options?: { ddd?: string; concurrency?: number },
): Promise<BlipFindUserResult> {
  const routers = await loadRouters();
  const identities = buildIdentities(phone, options?.ddd);
  const concurrency = options?.concurrency ?? 12;

  const hits = (await mapWithConcurrency(routers, concurrency, (router) =>
    inspectRouter(router, identities),
  )).filter((hit): hit is BlipRouterHit => hit !== null);

  return buildFindResult("phone", phone, identities, hits, routers.length);
}

export async function findOrderInRouters(
  orderQuery: string,
  options?: { concurrency?: number },
): Promise<BlipFindUserResult> {
  const { getOrderById } = await import("@/lib/macro-order");
  const order = await getOrderById(orderQuery);

  const phoneResult = await findUserInRouters(order.phone, {
    ddd: order.ddd,
    concurrency: options?.concurrency,
  });

  const matchingHits = phoneResult.found.filter((hit) =>
    hitMatchesOrder(hit, order.orderId, order.orderRef),
  );
  const hits =
    matchingHits.length > 0
      ? matchingHits
      : phoneResult.found.filter((hit) => hit.hasOrder);

  return buildFindResult(
    "order",
    orderQuery,
    phoneResult.identitiesTested,
    hits.length > 0 ? hits : phoneResult.found,
    phoneResult.totalRouters,
    {
      orderInfo: {
        orderId: order.orderId,
        orderRef: order.orderRef,
        phone: order.phone,
        ddd: order.ddd,
        status: order.status,
        productType: order.productType,
        projectId: order.projectId,
        customerName: order.customerName,
        email: order.email,
      },
    },
  );
}
