export type GateStatus =
  "not_started" | "in_review" | "go" | "on_hold" | "no_go";
export type WorkflowKind = "project" | "campaign";
export interface Criterion {
  id: string;
  title: string;
  weight: number;
  checked: boolean;
  required: boolean;
  evidence?: string;
}
export interface Milestone {
  id: string;
  title: string;
  weight: number;
  done: boolean;
  taskKey: string;
  evidence: string;
}
export interface WorkflowPhase {
  id: string;
  name: string;
  ownerId: string;
  start: string;
  end: string;
  boundary: number;
  investment: number;
  probability: number | null;
  probabilitySource: string;
  sampleSize: number;
  milestones: Milestone[];
  gate: {
    ownerId: string;
    status: GateStatus;
    note: string;
    criteria: Criterion[];
  };
}
export interface WorkflowDocument {
  phases: WorkflowPhase[];
  value: number;
  budget: number;
  valuation: {
    pv: number;
    commercialProbability: number;
    launchCost: number;
    technicalProbability: number;
    developmentCost: number;
  };
}
export interface WorkflowRecord {
  id: string;
  entity_type: WorkflowKind;
  entity_id: string;
  name: string;
  department_id: string | null;
  created_by: number;
  version: number;
  document: WorkflowDocument;
  created_at: string;
  updated_at: string;
}
export interface WorkflowTask {
  key: string;
  title: string;
  status: string;
  entity_type: WorkflowKind;
  entity_id: string;
  assignee_id?: number;
  assigneeName?: string;
}
export const gateLabels: Record<GateStatus, string> = {
  not_started: "Chưa review",
  in_review: "Đang review",
  go: "Go · Đã duyệt",
  on_hold: "On Hold · Tạm giữ",
  no_go: "No-Go · Dừng",
};
export const stages = [
  "IDEA",
  "EVALUATING",
  "APPROVED",
  "IN FLIGHT",
  "LAUNCHING",
  "LIVE",
] as const;
export const doneStatus = (s: string) =>
  ["done", "complete", "completed"].includes(s.toLowerCase());
export const percent = (v: number) => Math.round(v * 10) / 10;
export function weighted(
  items: { weight: number }[],
  passed: (index: number) => boolean,
) {
  const total = items.reduce((n, m) => n + m.weight, 0);
  return total > 0
    ? percent(
        (items.reduce((n, m, i) => n + (passed(i) ? m.weight : 0), 0) / total) *
          100,
      )
    : 0;
}
export function phaseProgress(p: WorkflowPhase, tasks: WorkflowTask[]) {
  if (p.gate.status === "go") return 100;
  return weighted(p.milestones, (i) => {
    const m = p.milestones[i];
    return m.taskKey
      ? doneStatus(tasks.find((t) => t.key === m.taskKey)?.status || "")
      : m.done;
  });
}
export const readiness = (p: WorkflowPhase) =>
  weighted(p.gate.criteria, (i) => p.gate.criteria[i].checked);
export function currentPhase(doc: WorkflowDocument) {
  const i = doc.phases.findIndex((p) => p.gate.status !== "go");
  return i < 0 ? doc.phases.length - 1 : i;
}
export function overallProgress(doc: WorkflowDocument, tasks: WorkflowTask[]) {
  const i = currentPhase(doc);
  if (doc.phases.every((p) => p.gate.status === "go")) return 100;
  const previous = i ? doc.phases[i - 1].boundary : 0;
  return percent(
    previous +
      (phaseProgress(doc.phases[i], tasks) / 100) *
        (doc.phases[i].boundary - previous),
  );
}
export function cumulativeProbability(doc: WorkflowDocument) {
  const pending = doc.phases.filter((p) => p.gate.status !== "go");
  if (doc.phases.some((p) => p.gate.status === "no_go")) return 0;
  if (pending.some((p) => p.probability === null)) return null;
  return percent(
    pending.reduce((v, p) => (v * (p.probability as number)) / 100, 1) * 100,
  );
}
export function portfolioStage(doc: WorkflowDocument) {
  if (doc.phases.every((p) => p.gate.status === "go")) return 5;
  const i = currentPhase(doc);
  return Math.min(4, Math.floor((i / Math.max(1, doc.phases.length)) * 5));
}
export function canGo(
  doc: WorkflowDocument,
  index: number,
  tasks: WorkflowTask[],
) {
  const p = doc.phases[index];
  return (
    p.gate.status === "in_review" &&
    doc.phases.slice(0, index).every((p) => p.gate.status === "go") &&
    phaseProgress(p, tasks) === 100 &&
    p.gate.criteria.length > 0 &&
    readiness(p) >= 80 &&
    p.gate.criteria.filter((c) => c.required).every((c) => c.checked)
  );
}
export const transitions: Record<GateStatus, GateStatus[]> = {
  not_started: ["in_review"],
  in_review: ["go", "on_hold", "no_go"],
  on_hold: ["in_review"],
  go: [],
  no_go: [],
};
export function validateDocument(doc: WorkflowDocument): string | null {
  if (doc.phases.length < 2 || doc.phases.length > 7)
    return "Cần từ 2 đến 7 phase.";
  if (
    !Number.isFinite(doc.value) ||
    doc.value < 0 ||
    !Number.isFinite(doc.budget) ||
    doc.budget < 0
  )
    return "Giá trị và ngân sách phải là số không âm.";
  if (
    Object.values(doc.valuation).some((v) => !Number.isFinite(v) || v < 0) ||
    doc.valuation.commercialProbability > 100 ||
    doc.valuation.technicalProbability > 100
  )
    return "ECV cần chi phí không âm và xác suất trong khoảng 0–100.";
  const linked = doc.phases
    .flatMap((p) => p.milestones.map((m) => m.taskKey))
    .filter(Boolean);
  if (new Set(linked).size !== linked.length)
    return "Một task chỉ được liên kết vào một milestone.";
  let last = 0;
  const ids = new Set<string>();
  for (const p of doc.phases) {
    if (!Number.isFinite(p.investment) || p.investment < 0)
      return "Chi phí phase phải là số không âm.";
    if (ids.has(p.id)) return "Phase ID bị trùng.";
    ids.add(p.id);
    if (!p.name.trim()) return "Nhập tên cho tất cả phase.";
    if (p.boundary <= last || p.boundary > 100)
      return "Mốc tiến độ phase phải tăng dần đến 100%.";
    last = p.boundary;
    if (p.start && p.end && p.start > p.end)
      return "Ngày kết thúc phải sau ngày bắt đầu.";
    if (
      p.probability !== null &&
      (!Number.isFinite(p.probability) ||
        p.probability < 0 ||
        p.probability > 100)
    )
      return "Xác suất phải trong khoảng 0–100.";
    for (const items of [p.milestones, p.gate.criteria]) {
      if (
        !items.length ||
        items.some(
          (m) => !m.title.trim() || !Number.isFinite(m.weight) || m.weight <= 0,
        ) ||
        Math.abs(items.reduce((n, m) => n + m.weight, 0) - 100) > 0.01
      )
        return `Trọng số milestone và checklist của ${p.name} phải bằng 100%.`;
    }
  }
  return last === 100 ? null : "Mốc phase cuối phải bằng 100%.";
}
export function makeWorkflow(
  kind: WorkflowKind,
  ownerId: string,
  template = "standard",
): WorkflowDocument {
  const names =
    template === "website"
      ? [
          "Discovery & Đặc tả",
          "UI/UX & Prototype",
          "Phát triển",
          "QA & Nghiệm thu",
          "Go-Live",
        ]
      : kind === "campaign"
        ? [
            "Ý tưởng & Brief",
            "Strategy & Ngân sách",
            "Creative & Production",
            "Launch & Tối ưu",
            "Đo lường & Tổng kết",
          ]
        : [
            "Brief & Scope",
            "Research & Concept",
            "Production",
            "Review & Chỉnh sửa",
            "Bàn giao & Nghiệm thu",
          ];
  return {
    value: 0,
    budget: 0,
    valuation: {
      pv: 0,
      commercialProbability: 0,
      launchCost: 0,
      technicalProbability: 0,
      developmentCost: 0,
    },
    phases: names.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      ownerId,
      start: "",
      end: "",
      boundary: (i + 1) * 20,
      investment: 0,
      probability: null,
      probabilitySource: "estimate",
      sampleSize: 0,
      milestones: [
        {
          id: crypto.randomUUID(),
          title: `Đầu ra ${name}`,
          weight: 100,
          done: false,
          taskKey: "",
          evidence: "",
        },
      ],
      gate: {
        ownerId,
        status: "not_started",
        note: "",
        criteria: [
          {
            id: crypto.randomUUID(),
            title: "Đầu ra được nghiệm thu",
            weight: 60,
            checked: false,
            required: true,
          },
          {
            id: crypto.randomUUID(),
            title: "Đủ nguồn lực cho phase sau",
            weight: 40,
            checked: false,
            required: true,
          },
        ],
      },
    })),
  };
}
