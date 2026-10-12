export interface WorkflowFile {
  id: string;
  entity_type: "project" | "campaign";
  entity_id: string;
  url: string;
  name: string;
  source: string;
  taskKey?: string;
  updatedAt?: string;
}
export function workflowFiles(
  projects: any[],
  campaigns: any[],
  projectSubtasks: any[],
  campaignSubtasks: any[],
  activities: any[],
): WorkflowFile[] {
  const files: WorkflowFile[] = [];
  const seen = new Set<string>();
  const latest = new Set<string>();
  const add = (
    type: "project" | "campaign",
    id: string,
    url: unknown,
    source: string,
    taskKey?: string,
    updatedAt?: string,
  ) => {
    if (typeof url !== "string") return;
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return;
    }
    if (!["http:", "https:"].includes(u.protocol)) return;
    const key = `${type}:${id}:${u.href}`;
    if (seen.has(key)) return;
    seen.add(key);
    let name = u.pathname.split("/").filter(Boolean).pop() || u.hostname;
    try {
      name = decodeURIComponent(name);
    } catch {}
    files.push({
      id: key,
      entity_type: type,
      entity_id: id,
      url: u.href,
      name,
      source,
      taskKey,
      updatedAt,
    });
  };
  const projectAsset = (
    p: any,
    url: unknown,
    source: string,
    key?: string,
    time?: string,
  ) => {
    add("project", p.id, url, source, key, time);
    if (p.campaign_id && campaigns.some((c) => c.id === p.campaign_id))
      add(
        "campaign",
        p.campaign_id,
        url,
        `Project ${p.name} · ${source}`,
        key,
        time,
      );
  };
  projects.forEach((p) =>
    projectAsset(p, p.assets_url, "Brief / Tài liệu Project"),
  );
  for (const row of [...activities].sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at)),
  )) {
    const m = row.metadata || {};
    if (row.action === "attachment_added") {
      const url = m.strategy_asset || m.url || m.file_url;
      if (
        row.entity_type === "campaign" &&
        campaigns.some((c) => c.id === row.entity_id)
      )
        add(
          "campaign",
          row.entity_id,
          url,
          "Strategy Assets · Campaign",
          undefined,
          row.created_at,
        );
      if (row.entity_type === "project") {
        const p = projects.find((p) => p.id === row.entity_id);
        if (p)
          projectAsset(p, url, "Tài liệu Project", undefined, row.created_at);
      }
    }
    if (
      row.action === "details_updated" &&
      ["project_subtask", "campaign_subtask"].includes(row.entity_type)
    ) {
      const k = `${row.entity_type}:${row.entity_id}`;
      if (latest.has(k)) continue;
      latest.add(k);
      if (row.entity_type === "project_subtask") {
        const s = projectSubtasks.find(
          (s) =>
            s.id === row.entity_id &&
            !["deleted", "archived"].includes(s.status),
        );
        const p = projects.find((p) => p.id === s?.project_id);
        if (s && p)
          projectAsset(
            p,
            m.image_url,
            `Subtask · ${s.title}`,
            k,
            row.created_at,
          );
      } else {
        const s = campaignSubtasks.find(
          (s) =>
            s.id === row.entity_id &&
            !["deleted", "archived"].includes(s.status),
        );
        if (s && campaigns.some((c) => c.id === s.campaign_id))
          add(
            "campaign",
            s.campaign_id,
            m.image_url,
            `Subtask · ${s.title}`,
            k,
            row.created_at,
          );
      }
    }
  }
  return files;
}
