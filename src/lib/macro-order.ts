const MACRO_ORDER_API =
  process.env.MACROLABS_ORDER_API_URL ??
  "https://apimanager.macrolabs.app/v2/getOrderById";

export type MacroOrderData = {
  orderId: string;
  orderRef?: string;
  projectId?: string;
  projectType?: string;
  productType?: string;
  status?: string;
  initDate?: string;
  datas?: Record<string, string>;
};

export type MacroOrderLookup = {
  orderId: string;
  orderRef?: string;
  phone: string;
  ddd?: string;
  status?: string;
  productType?: string;
  projectId?: string;
  customerName?: string;
  email?: string;
  raw: MacroOrderData;
};

type MacroOrderResponse = {
  isValid: boolean;
  messages?: string[];
  data: MacroOrderData | null;
};

export async function getOrderById(orderId: string): Promise<MacroOrderLookup> {
  const token = process.env.MACROLABS_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MACROLABS_ACCESS_TOKEN não configurado");
  }

  const response = await fetch(`${MACRO_ORDER_API}/${encodeURIComponent(orderId.trim())}`, {
    headers: {
      accept: "*/*",
      "access-token": token,
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MacroLabs API retornou HTTP ${response.status}`);
  }

  const payload = (await response.json()) as MacroOrderResponse;
  if (!payload.isValid || !payload.data) {
    const message = payload.messages?.[0] ?? "Pedido não encontrado";
    throw new Error(message);
  }

  const datas = payload.data.datas ?? {};
  const phone = datas.telefone?.trim();
  if (!phone) {
    throw new Error("Pedido encontrado, mas sem telefone vinculado");
  }

  const ddd = datas["produtosdopedido.ddd"]?.trim() || undefined;

  return {
    orderId: payload.data.orderId,
    orderRef: payload.data.orderRef,
    phone,
    ddd,
    status: payload.data.status,
    productType: payload.data.productType,
    projectId: payload.data.projectId,
    customerName: datas.nome?.trim() || undefined,
    email: datas.email?.trim() || undefined,
    raw: payload.data,
  };
}
