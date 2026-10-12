import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";
import { workflowFiles } from "../lib/workflowFiles";
import type { WorkflowFile } from "../lib/workflowFiles";
import type {
  WorkflowKind,
  WorkflowRecord,
  WorkflowTask,
  WorkflowDocument,
} from "../lib/workflow2";
export interface WorkflowEntity {
  id: string;
  type: WorkflowKind;
  name: string;
  department_id: string | null;
  budget?: number;
  workspace_id: string;
}
export interface WorkflowDecision {
  id: string;
  workflow_id: string;
  phase_id: string;
  decision: string;
  probability_at_decision: number | null;
  progress_at_decision: number;
  readiness_at_decision: number;
  decided_by: number;
  decided_at: string;
  note: string;
  version: number;
}
async function all(query: any) {
  const rows: any[] = [];
  for (let i = 0; ; i += 500) {
    const { data, error } = await query.range(i, i + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export function useWorkflow2() {
  const profile = useAuthStore((s) => s.profile);
  const [data, setData] = useState<{
    entities: WorkflowEntity[];
    workflows: WorkflowRecord[];
    tasks: WorkflowTask[];
    people: any[];
    history: WorkflowDecision[];
    files: WorkflowFile[];
  }>({
    entities: [],
    workflows: [],
    tasks: [],
    people: [],
    history: [],
    files: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const role = (profile?.role || "").toLowerCase(),
    level = (profile?.employment_level || "").toLowerCase();
  const global =
    role === "admin" ||
    level === "manager" ||
    (role === "manager" && level !== "leader");
  const canEdit = global || role === "leader" || level === "leader";
  const refresh = useCallback(async () => {
    if (!profile) return;
    try {
      const results = await Promise.all([
        all(
          supabase
            .from("projects")
            .select(
              "id,name,department_id,workspace_id,status,campaign_id,assets_url",
            )
            .order("id"),
        ),
        all(
          supabase
            .from("campaigns")
            .select("id,name,department_id,workspace_id,budget,status")
            .order("id"),
        ),
        all(supabase.from("workflow2_workflows").select("*").order("id")),
        all(
          supabase
            .from("tasks")
            .select("id,title,status,project_id,campaign_id,assignee_id")
            .order("id"),
        ),
        all(
          supabase
            .from("project_subtasks")
            .select("id,title,status,project_id,assignee_id")
            .order("id"),
        ),
        all(
          supabase
            .from("campaign_subtasks")
            .select("id,title,status,campaign_id,assignee_id")
            .order("id"),
        ),
        all(
          supabase
            .from("users")
            .select("id,name,department_id,is_active,role,employment_level")
            .order("id"),
        ),
        all(
          supabase
            .from("workflow2_completion_records")
            .select("*")
            .order("decided_at", { ascending: false }),
        ),
        all(
          supabase
            .from("activity_log")
            .select("id,entity_id,entity_type,action,metadata,created_at")
            .in("action", ["attachment_added", "details_updated"])
            .in("entity_type", [
              "project",
              "campaign",
              "project_subtask",
              "campaign_subtask",
            ])
            .order("created_at", { ascending: false })
            .order("id"),
        ),
      ]);
      const [
        projects,
        campaigns,
        workflows,
        tasks,
        ps,
        cs,
        people,
        history,
        activities,
      ] = results;
      const visible = (r: any) =>
        !["deleted", "archived"].includes(r.status || "") &&
        (global || r.department_id === profile.department_id);
      const entities = [
        ...projects
          .filter(visible)
          .map((r) => ({ ...r, type: "project" as const })),
        ...campaigns
          .filter(visible)
          .map((r) => ({ ...r, type: "campaign" as const })),
      ];
      const keys = new Set(entities.map((r) => `${r.type}:${r.id}`));
      const actual: WorkflowTask[] = [];
      const add = (r: any, kind: WorkflowKind, key: string, id: string) => {
        if (
          keys.has(`${kind}:${id}`) &&
          !["deleted", "archived"].includes(r.status || "")
        )
          actual.push({
            key,
            title: r.title,
            status: r.status || "todo",
            entity_type: kind,
            entity_id: id,
            assignee_id: r.assignee_id,
            assigneeName: people.find((p) => p.id === r.assignee_id)?.name,
          });
      };
      tasks.forEach((r) => {
        if (r.project_id) add(r, "project", `task:${r.id}`, r.project_id);
        else if (r.campaign_id)
          add(r, "campaign", `task:${r.id}`, r.campaign_id);
      });
      ps.forEach((r) =>
        add(r, "project", `project_subtask:${r.id}`, r.project_id),
      );
      cs.forEach((r) =>
        add(r, "campaign", `campaign_subtask:${r.id}`, r.campaign_id),
      );
      if (useAuthStore.getState().profile?.id !== profile.id) return;
      setData({
        entities,
        workflows: workflows.filter((w) =>
          keys.has(`${w.entity_type}:${w.entity_id}`),
        ),
        tasks: actual,
        people: people.filter(
          (p) =>
            p.is_active &&
            (global || p.department_id === profile.department_id),
        ),
        history,
        files: workflowFiles(
          projects.filter(visible),
          campaigns.filter(visible),
          ps,
          cs,
          activities,
        ),
      });
      setError("");
    } catch (e: any) {
      setError(e.message || "Không thể tải Workflow");
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.department_id, global]);
  useEffect(() => {
    void refresh();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 350);
    };
    const ch = supabase.channel(`workflow2-${profile?.id}`);
    [
      "workflow2_workflows",
      "workflow2_completion_records",
      "tasks",
      "project_subtasks",
      "campaign_subtasks",
      "projects",
      "campaigns",
      "activity_log",
    ].forEach((table) =>
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        schedule,
      ),
    );
    ch.subscribe();
    const polling = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    window.addEventListener("focus", schedule);
    return () => {
      clearTimeout(timer);
      clearInterval(polling);
      window.removeEventListener("focus", schedule);
      void supabase.removeChannel(ch);
    };
  }, [refresh]);
  const save = async (
    entity: WorkflowEntity,
    document: WorkflowDocument,
    expected: number,
  ) => {
    const { data: row, error } = await supabase.rpc("workflow2_save", {
      p_kind: entity.type,
      p_entity: entity.id,
      p_document: document,
      p_expected: expected,
    });
    if (error) throw error;
    await refresh();
    return (Array.isArray(row) ? row[0] : row) as WorkflowRecord;
  };
  return { ...data, loading, error, canEdit, global, refresh, save };
}
