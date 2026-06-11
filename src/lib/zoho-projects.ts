import { TEAM_DEVELOPERS } from "./devs";
import { getZohoProjectsAccessToken } from "./zoho-auth";

const PORTAL_ID = process.env.ZOHO_PORTAL_ID ?? "754064774";
const ZOHO_PROJECTS_BASE = "https://projectsapi.zoho.com/restapi";

export type WorkloadTask = {
  id: string;
  name: string;
  projectName: string;
  status: string;
  dueDate: string | null;
};

export type DeveloperWorkload = {
  email: string;
  name: string;
  openTaskCount: number;
  tasks: WorkloadTask[];
};

export type WorkloadSnapshot = {
  developers: DeveloperWorkload[];
  source: "zoho" | "empty";
  lastSyncedAt: string;
  warning?: string;
};

type ZohoTask = {
  id_string?: string;
  id?: string;
  name?: string;
  status?: { name?: string } | string;
  end_date?: string;
  end_date_format?: string;
  custom_status?: string;
};

type ZohoProject = {
  id_string?: string;
  id?: string;
  name?: string;
};

async function zohoProjectsFetch(path: string): Promise<unknown> {
  const token = await getZohoProjectsAccessToken();
  if (!token) {
    throw new Error("ZOHO_PROJECTS_ACCESS_TOKEN não configurado");
  }

  const url = `${ZOHO_PROJECTS_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho Projects ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

function taskStatusName(task: ZohoTask): string {
  if (typeof task.status === "string") return task.status;
  return task.status?.name ?? task.custom_status ?? "open";
}

function isOpenTask(task: ZohoTask): boolean {
  const status = taskStatusName(task).toLowerCase();
  return !["closed", "completed", "fechado", "concluído", "concluido", "done"].some((s) =>
    status.includes(s),
  );
}

async function fetchPortalProjects(): Promise<ZohoProject[]> {
  const data = (await zohoProjectsFetch(`/portal/${PORTAL_ID}/projects/`)) as {
    projects?: ZohoProject[];
  };
  return data.projects ?? [];
}

async function fetchProjectTasks(projectId: string): Promise<ZohoTask[]> {
  try {
    const data = (await zohoProjectsFetch(
      `/portal/${PORTAL_ID}/projects/${projectId}/tasks/`,
    )) as { tasks?: ZohoTask[] };
    return data.tasks ?? [];
  } catch {
    return [];
  }
}

async function fetchTaskOwners(taskId: string, projectId: string): Promise<string[]> {
  try {
    const data = (await zohoProjectsFetch(
      `/portal/${PORTAL_ID}/projects/${projectId}/tasks/${taskId}/`,
    )) as {
      tasks?: Array<{ details?: { owners?: Array<{ email?: string; name?: string }> } }>;
      task?: { owners?: Array<{ email?: string }> };
    };

    const owners =
      data.task?.owners ??
      data.tasks?.[0]?.details?.owners ??
      [];

    return owners.map((o) => (o.email ?? "").toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchWorkload(): Promise<WorkloadSnapshot> {
  const empty: WorkloadSnapshot = {
    developers: TEAM_DEVELOPERS.map((d) => ({
      email: d.email,
      name: d.name,
      openTaskCount: 0,
      tasks: [],
    })),
    source: "empty",
    lastSyncedAt: new Date().toISOString(),
  };

  try {
    const projects = await fetchPortalProjects();
    const workloadMap = new Map<string, WorkloadTask[]>();

    for (const dev of TEAM_DEVELOPERS) {
      workloadMap.set(dev.email.toLowerCase(), []);
    }

    const projectSlice = projects.slice(0, 30);

    for (const project of projectSlice) {
      const projectId = project.id_string ?? String(project.id ?? "");
      if (!projectId) continue;

      const tasks = await fetchProjectTasks(projectId);
      const openTasks = tasks.filter(isOpenTask);

      for (const task of openTasks.slice(0, 50)) {
        const taskId = task.id_string ?? String(task.id ?? "");
        if (!taskId) continue;

        const owners = await fetchTaskOwners(taskId, projectId);
        const workloadTask: WorkloadTask = {
          id: taskId,
          name: task.name ?? "Sem título",
          projectName: project.name ?? "Projeto",
          status: taskStatusName(task),
          dueDate: task.end_date ?? null,
        };

        for (const ownerEmail of owners) {
          if (workloadMap.has(ownerEmail)) {
            workloadMap.get(ownerEmail)!.push(workloadTask);
          }
        }
      }
    }

    const developers: DeveloperWorkload[] = TEAM_DEVELOPERS.map((dev) => {
      const tasks = workloadMap.get(dev.email.toLowerCase()) ?? [];
      return {
        email: dev.email,
        name: dev.name,
        openTaskCount: tasks.length,
        tasks,
      };
    });

    return {
      developers,
      source: "zoho",
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar workload";
    return {
      ...empty,
      warning: message,
    };
  }
}
