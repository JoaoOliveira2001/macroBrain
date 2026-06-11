import { findDeveloperByEmail, findDeveloperByName, TEAM_DEVELOPERS } from "./devs";

/** Planilha oficial — aba 4, dados a partir de B36 */
export const SHEET_CONFIG = {
  resourceId: process.env.ZOHO_SHEET_RESOURCE_ID ?? "u7fcfe192878498624414a3905bce8b39da6f",
  worksheetId: process.env.ZOHO_SHEET_WORKSHEET_ID ?? "4",
  /** Linha 36 (1-based) = índice 35 */
  headerRow: 35,
  dataStartRow: 36,
  /** Coluna B = índice 1 (A=0) */
  devNameCol: 1,
  projectStartCol: 2,
  maxRows: 200,
  maxCols: 80,
} as const;

export type SheetCell = {
  row: number;
  col: number;
};

export type ProjectAssignment = {
  project: string;
  developerName: string | null;
  developerEmail: string | null;
  cell: SheetCell | null;
};

export type DeveloperWithProjects = {
  name: string;
  email: string;
  projects: string[];
};

export type AssignmentsSnapshot = {
  projects: ProjectAssignment[];
  developers: DeveloperWithProjects[];
  worksheetName: string | null;
  source: "sheet" | "fallback";
  lastSyncedAt: string;
};

/** Fallback alinhado ao roster validado pelo time (até OAuth Sheet estar ativo) */
export const FALLBACK_PROJECT_ASSIGNMENTS: Record<string, string | null> = {
  "Vivo Controle": "André Nascimento",
  Brother: "André Nascimento",
  Itaú: "André Nascimento",
  "Vivo Seguros": "André Meliunas",
  "TIM Digital": "Benilson",
  Dealer: "Benilson",
  "TIM Controle": "Davi Jacob",
  "TIM B2B": "Davi Jacob",
  ITV: "Leandro Viegas",
  IPTV: "Leandro Machado",
  "IPTV Webchat": "Leandro Jesus",
  "SVA B2C": "Leandro Viegas",
  "Renovação B2B": "Leandro Machado",
  IA: "Jeoston Junior",
  "Superbot Vivo": "João Victor Oliveira",
  Onboarding: "João Meneses",
  "SVA B2B": "Mariana de Oliveira",
  "B2B Ativo": "Mariana de Oliveira",
  "OI TV": "Mariana de Oliveira",
  "Fibra B2C": "Silvinha",
  Webchat: "Silvinha",
  "Total B2C": "Silvinha",
  "Fibra B2B": "Vitor Aguiar",
  "Total B2B": "Vitor Aguiar",
  "Assine Fibra": "Vitor Aguiar",
  "Vivo Pós": null,
  "Retenção B2C": null,
};

function isAssignedCell(value: unknown): boolean {
  if (value == null) return false;
  const text = String(value).trim().toLowerCase();
  if (!text) return false;
  return text === "x" || text === "sim" || text === "s" || text === "1" || text === "true" || text.length > 1;
}

function resolveDevFromCell(value: unknown, devNameInRow: string): string | null {
  if (!isAssignedCell(value)) return null;
  const text = String(value).trim();
  if (text.toLowerCase() === "x" || text.toLowerCase() === "sim") {
    return devNameInRow || null;
  }
  return text;
}

/** Converte matriz 2D da planilha em assignments */
export function parseSheetMatrix(
  rows: unknown[][],
  worksheetName: string | null = null,
): AssignmentsSnapshot {
  if (!rows.length) {
    return buildFallbackSnapshot();
  }

  const header = rows[0] ?? [];
  const projectNames: { name: string; col: number }[] = [];

  for (let col = SHEET_CONFIG.projectStartCol; col < header.length; col++) {
    const name = String(header[col] ?? "").trim();
    if (name) projectNames.push({ name, col });
  }

  const projectToDev = new Map<string, { name: string; cell: SheetCell }>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const devName = String(row[SHEET_CONFIG.devNameCol] ?? "").trim();
    if (!devName) continue;

    for (const { name: project, col } of projectNames) {
      const cellValue = row[col];
      const assignedDev = resolveDevFromCell(cellValue, devName);
      if (assignedDev) {
        projectToDev.set(project, {
          name: assignedDev,
          cell: { row: SHEET_CONFIG.dataStartRow + r, col },
        });
      }
    }
  }

  return buildSnapshotFromProjectMap(projectToDev, projectNames.map((p) => p.name), worksheetName, "sheet");
}

export function buildFallbackSnapshot(): AssignmentsSnapshot {
  const projectToDev = new Map<string, { name: string; cell: SheetCell | null }>();
  for (const [project, devName] of Object.entries(FALLBACK_PROJECT_ASSIGNMENTS)) {
    if (devName) {
      projectToDev.set(project, { name: devName, cell: null });
    }
  }
  return buildSnapshotFromProjectMap(
    projectToDev,
    Object.keys(FALLBACK_PROJECT_ASSIGNMENTS),
    null,
    "fallback",
  );
}

function buildSnapshotFromProjectMap(
  projectToDev: Map<string, { name: string; cell: SheetCell | null }>,
  allProjects: string[],
  worksheetName: string | null,
  source: "sheet" | "fallback",
): AssignmentsSnapshot {
  const projects: ProjectAssignment[] = allProjects.map((project) => {
    const match = projectToDev.get(project);
    const dev = match ? findDeveloperByName(match.name) : undefined;
    return {
      project,
      developerName: match?.name ?? null,
      developerEmail: dev?.email ?? null,
      cell: match?.cell ?? null,
    };
  });

  const devProjects = new Map<string, string[]>();
  for (const dev of TEAM_DEVELOPERS) {
    devProjects.set(dev.email, []);
  }

  for (const { project, developerEmail } of projects) {
    if (developerEmail) {
      devProjects.get(developerEmail)?.push(project);
    }
  }

  const developers: DeveloperWithProjects[] = TEAM_DEVELOPERS.map((dev) => ({
    name: dev.name,
    email: dev.email,
    projects: devProjects.get(dev.email) ?? [],
  }));

  return {
    projects,
    developers,
    worksheetName,
    source,
    lastSyncedAt: new Date().toISOString(),
  };
}

export function getCellForAssignment(
  snapshot: AssignmentsSnapshot,
  project: string,
  developerEmail: string,
): SheetCell | null {
  const projectRow = snapshot.projects.find((p) => p.project === project);
  if (!projectRow?.cell) return null;

  const dev = findDeveloperByEmail(developerEmail);
  if (!dev) return null;

  const devRowIndex = snapshot.developers.findIndex((d) => d.email === developerEmail);
  if (devRowIndex < 0) return null;

  return {
    row: SHEET_CONFIG.dataStartRow + devRowIndex,
    col: projectRow.cell.col,
  };
}

export function colIndexToLetter(col: number): string {
  let n = col + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}
