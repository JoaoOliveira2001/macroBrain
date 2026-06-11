import { NextResponse } from "next/server";
import { fetchWorkload } from "@/lib/zoho-projects";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workload = await fetchWorkload();
    return NextResponse.json(workload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar workload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
