import { NextRequest, NextResponse } from "next/server";
import {
  findOrderInRouters,
  findUserInRouters,
  type BlipSearchMode,
} from "@/lib/blip-find-user";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const mode = (request.nextUrl.searchParams.get("mode")?.trim() ||
    "phone") as BlipSearchMode;
  const query =
    request.nextUrl.searchParams.get("q")?.trim() ||
    request.nextUrl.searchParams.get("phone")?.trim() ||
    request.nextUrl.searchParams.get("order")?.trim();
  const ddd = request.nextUrl.searchParams.get("ddd")?.trim() || undefined;

  if (!query) {
    return NextResponse.json({ error: "Informe o valor da busca" }, { status: 400 });
  }

  if (mode !== "phone" && mode !== "order") {
    return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
  }

  try {
    const result =
      mode === "order"
        ? await findOrderInRouters(query)
        : await findUserInRouters(query, { ddd });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao buscar nos routers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
