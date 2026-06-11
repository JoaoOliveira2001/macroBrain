import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const MCP_TOKEN_PATH = join(
  homedir(),
  ".mcp-auth/mcp-remote-0.1.37/bfde98de241e1611e8ea4a3d2ede71eb_tokens.json",
);

type TokenFile = {
  access_token?: string;
  refresh_token?: string;
};

let cachedMcpToken: string | null = null;

async function readMcpToken(): Promise<string | null> {
  if (cachedMcpToken) return cachedMcpToken;
  if (process.env.ZOHO_USE_MCP_TOKEN === "false") return null;

  try {
    const raw = await readFile(MCP_TOKEN_PATH, "utf-8");
    const parsed = JSON.parse(raw) as TokenFile;
    cachedMcpToken = parsed.access_token ?? null;
    return cachedMcpToken;
  } catch {
    return null;
  }
}

export async function getZohoSheetAccessToken(): Promise<string | null> {
  return process.env.ZOHO_SHEET_ACCESS_TOKEN || (await readMcpToken());
}

export async function getZohoProjectsAccessToken(): Promise<string | null> {
  return process.env.ZOHO_PROJECTS_ACCESS_TOKEN || (await readMcpToken());
}
