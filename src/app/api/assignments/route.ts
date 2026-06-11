import { NextRequest, NextResponse } from "next/server";
import { findDeveloperByEmail } from "@/lib/devs";
import { getCellForAssignment } from "@/lib/sheet-mapper";
import {
  getAssignmentsWithFallback,
  updateAssignmentCell,
  ZohoSheetError,
} from "@/lib/zoho-sheet";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "true";

  try {
    const snapshot = await getAssignmentsWithFallback();

    return NextResponse.json({
      ...snapshot,
      refreshed: forceRefresh,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar assignments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type PatchBody = {
  project?: string;
  developerEmail?: string | null;
};

export async function PATCH(request: NextRequest) {
  let body: PatchBody;

  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { project, developerEmail } = body;

  if (!project) {
    return NextResponse.json({ error: "Campo 'project' é obrigatório" }, { status: 400 });
  }

  const snapshot = await getAssignmentsWithFallback();

  if (snapshot.source === "fallback") {
    return NextResponse.json(
      {
        error:
          "Escrita bloqueada: configure ZOHO_SHEET_ACCESS_TOKEN com escopos ZohoSheet.dataAPI.READ e UPDATE.",
        code: "sheet_oauth_required",
      },
      { status: 503 },
    );
  }

  const projectEntry = snapshot.projects.find((p) => p.project === project);
  if (!projectEntry?.cell) {
    return NextResponse.json({ error: `Projeto '${project}' não mapeado na planilha` }, { status: 404 });
  }

  const clearCells = snapshot.projects
    .filter((p) => p.project === project && p.cell)
    .map((p) => p.cell!)
    .filter(Boolean);

  try {
    if (!developerEmail) {
      for (const cell of clearCells) {
        await updateAssignmentCell(cell, "", []);
      }
    } else {
      const dev = findDeveloperByEmail(developerEmail);
      if (!dev) {
        return NextResponse.json({ error: "Desenvolvedor não encontrado no roster" }, { status: 404 });
      }

      const targetCell = getCellForAssignment(snapshot, project, developerEmail);
      if (!targetCell) {
        return NextResponse.json(
          { error: "Não foi possível resolver célula na planilha para este dev/projeto" },
          { status: 422 },
        );
      }

      const otherCells = clearCells.filter(
        (c) => !(c.row === targetCell.row && c.col === targetCell.col),
      );

      await updateAssignmentCell(targetCell, "X", otherCells);
    }

    const updated = await getAssignmentsWithFallback();
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZohoSheetError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "invalid_scope" ? 503 : 502 },
      );
    }

    const message = error instanceof Error ? error.message : "Erro ao atualizar planilha";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
