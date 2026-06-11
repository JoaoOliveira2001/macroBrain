import {
  AssignmentsSnapshot,
  SHEET_CONFIG,
  buildFallbackSnapshot,
  colIndexToLetter,
  parseSheetMatrix,
  type SheetCell,
} from "./sheet-mapper";
import { getZohoSheetAccessToken } from "./zoho-auth";

type ZohoApiResponse = {
  status?: string;
  error_code?: number;
  error_message?: string;
  worksheets?: Array<{
    worksheet_id?: string;
    worksheet_name?: string;
    index?: string;
  }>;
  range_details?: Array<{
    row_index?: number;
    column_index?: number;
    content?: string;
  }>;
  worksheet_content?: unknown[][];
  content?: unknown[][];
};

async function zohoSheetRequest(
  method: string,
  params: Record<string, string | number | boolean> = {},
): Promise<ZohoApiResponse> {
  const token = await getZohoSheetAccessToken();
  if (!token) {
    throw new ZohoSheetError("ZOHO_SHEET_ACCESS_TOKEN não configurado", "missing_token");
  }

  const resourceId = SHEET_CONFIG.resourceId;
  const body = new URLSearchParams({
    method,
    resource_id: resourceId,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  });

  const res = await fetch(`https://sheet.zoho.com/api/v2/${resourceId}`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = (await res.json()) as ZohoApiResponse;

  if (!res.ok || data.error_code) {
    const message = data.error_message ?? `Zoho Sheet API error (${res.status})`;
    const code =
      data.error_code === 2403 ? "invalid_scope" : data.error_code === 2867 ? "unsupported_method" : "api_error";
    throw new ZohoSheetError(message, code, data.error_code);
  }

  return data;
}

export class ZohoSheetError extends Error {
  code: string;
  zohoCode?: number;

  constructor(message: string, code: string, zohoCode?: number) {
    super(message);
    this.name = "ZohoSheetError";
    this.code = code;
    this.zohoCode = zohoCode;
  }
}

async function resolveWorksheetName(): Promise<string> {
  const list = await zohoSheetRequest("worksheet.list");
  const targetId = SHEET_CONFIG.worksheetId;

  const match = list.worksheets?.find(
    (ws) =>
      ws.worksheet_id === `${targetId}#` ||
      ws.index === targetId ||
      ws.worksheet_id?.startsWith(`${targetId}`),
  );

  if (match?.worksheet_name) return match.worksheet_name;
  throw new ZohoSheetError(`Aba ${targetId} não encontrada na planilha`, "worksheet_not_found");
}

function rangeDetailsToMatrix(
  details: NonNullable<ZohoApiResponse["range_details"]>,
  startRow: number,
  startCol: number,
  rowCount: number,
  colCount: number,
): unknown[][] {
  const matrix: unknown[][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => ""),
  );

  for (const cell of details) {
    const r = (cell.row_index ?? startRow) - startRow;
    const c = (cell.column_index ?? startCol) - startCol;
    if (r >= 0 && r < rowCount && c >= 0 && c < colCount) {
      matrix[r][c] = cell.content ?? "";
    }
  }

  return matrix;
}

export async function fetchAssignmentsFromSheet(): Promise<AssignmentsSnapshot> {
  try {
    const worksheetName = await resolveWorksheetName();
    const startRow = SHEET_CONFIG.headerRow;
    const startCol = 0;
    const rowCount = SHEET_CONFIG.maxRows - startRow;
    const colCount = SHEET_CONFIG.maxCols;

    const data = await zohoSheetRequest("worksheet.records.fetch", {
      worksheet_name: worksheetName,
      start_row: startRow,
      start_column: startCol,
      end_row: startRow + rowCount,
      end_column: startCol + colCount,
    });

    let matrix: unknown[][] = [];

    if (data.range_details?.length) {
      matrix = rangeDetailsToMatrix(data.range_details, startRow, startCol, rowCount + 1, colCount);
    } else if (Array.isArray(data.worksheet_content)) {
      matrix = data.worksheet_content as unknown[][];
    } else if (Array.isArray(data.content)) {
      matrix = data.content as unknown[][];
    }

    if (!matrix.length) {
      throw new ZohoSheetError("Planilha retornou vazia", "empty_response");
    }

    return parseSheetMatrix(matrix, worksheetName);
  } catch (error) {
    if (error instanceof ZohoSheetError && (error.code === "invalid_scope" || error.code === "missing_token")) {
      const fallback = buildFallbackSnapshot();
      return {
        ...fallback,
        source: "fallback",
      };
    }
    throw error;
  }
}

export async function updateAssignmentCell(
  cell: SheetCell,
  value: string,
  clearCells: SheetCell[] = [],
): Promise<void> {
  const worksheetName = await resolveWorksheetName();

  for (const clear of clearCells) {
    await updateSingleCell(worksheetName, clear, "");
  }

  await updateSingleCell(worksheetName, cell, value);
}

async function updateSingleCell(
  worksheetName: string,
  cell: SheetCell,
  value: string,
): Promise<void> {
  const row = cell.row + 1;
  const col = colIndexToLetter(cell.col);

  await zohoSheetRequest("worksheet.cell.update", {
    worksheet_name: worksheetName,
    row: row,
    column: col,
    value,
  });
}

export async function getAssignmentsWithFallback(): Promise<AssignmentsSnapshot & { warning?: string }> {
  try {
    const snapshot = await fetchAssignmentsFromSheet();
    if (snapshot.source === "fallback") {
      return {
        ...snapshot,
        warning:
          "OAuth Zoho Sheet indisponível — exibindo roster local. Configure ZOHO_SHEET_ACCESS_TOKEN com escopos ZohoSheet.dataAPI.READ e UPDATE.",
      };
    }
    return snapshot;
  } catch (error) {
    const fallback = buildFallbackSnapshot();
    const message = error instanceof Error ? error.message : "Erro ao ler planilha";
    return {
      ...fallback,
      warning: `${message} — exibindo roster local.`,
    };
  }
}
