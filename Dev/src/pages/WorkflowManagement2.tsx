import { useEffect, useMemo, useState } from "react";
import {
  Layers,
  Plus,
  X,
  Save,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  LockKeyhole,
} from "lucide-react";
import toast from "react-hot-toast";
import { MultiSelect } from "../components/common/MultiSelect";
import { useAuthStore } from "../store/authStore";
import { useWorkflow2 } from "../hooks/useWorkflow2";
import type { WorkflowEntity } from "../hooks/useWorkflow2";
import {
  canGo,
  cumulativeProbability,
  currentPhase,
  doneStatus,
  gateLabels,
  makeWorkflow,
  overallProgress,
  phaseProgress,
  portfolioStage,
  readiness,
  stages,
  transitions,
  validateDocument,
} from "../lib/workflow2";
import type {
  GateStatus,
  WorkflowDocument,
  WorkflowPhase,
} from "../lib/workflow2";

const input =
  "w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white outline-none focus:border-primary";
const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50";
const money = (n: number) => n.toLocaleString("vi-VN");
const fmt = (n: number | null) => (n === null ? "Chưa ước tính" : `${n}%`);
const statusColor = (s: string) =>
  s === "go"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
    : s === "no_go"
      ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
      : s === "on_hold"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
        : s === "not_started"
          ? "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
          : "bg-blue-50 text-primary dark:bg-blue-900/20 dark:text-blue-300";
function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-gray-500">{label}</span>
        <b>{value}%</b>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
function DateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="tw-calendar-picker">
      <input
        id={id}
        className={input + " cursor-pointer"}
        readOnly
        value={value ? value.split("-").reverse().join("/") : ""}
        placeholder="dd/mm/yyyy"
        onChange={(e) =>
          onChange(e.target.value.split("/").reverse().join("-"))
        }
        onClick={(e) =>
          (window as any).openCalendar?.({ displayId: id, mode: "single" }, e)
        }
      />
    </div>
  );
}

export function WorkflowManagement2() {
  const data = useWorkflow2();
  const profile = useAuthStore((s) => s.profile);
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<WorkflowDocument | null>(null);
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [view, setView] = useState<"board" | "list">("list");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [setup, setSetup] = useState(false);
  const [setupEntity, setSetupEntity] = useState("");
  const [template, setTemplate] = useState("standard");
  const [configure, setConfigure] = useState(false);
  const [valuationOpen, setValuationOpen] = useState(false);
  const entity = data.entities.find((e) => `${e.type}:${e.id}` === selected);
  const record = data.workflows.find(
    (w) => `${w.entity_type}:${w.entity_id}` === selected,
  );
  const sourceFiles = data.files.filter(
    (f) => f.entity_type === entity?.type && f.entity_id === entity?.id,
  );
  const unconfigured = data.entities.filter(
    (e) =>
      !data.workflows.some(
        (w) => w.entity_type === e.type && w.entity_id === e.id,
      ) &&
      (type === "all" || e.type === type) &&
      e.name.toLowerCase().includes(search.toLowerCase()),
  );
  const tasks = useMemo(
    () =>
      data.tasks.filter(
        (t) => t.entity_type === entity?.type && t.entity_id === entity?.id,
      ),
    [data.tasks, entity?.id, entity?.type],
  );
  useEffect(() => {
    if (record && !dirty) {
      setDraft(structuredClone(record.document));
      setVersion(record.version);
      setPhaseIndex((i) => Math.min(i, record.document.phases.length - 1));
    }
  }, [record?.version, selected, dirty]);
  const open = (e: WorkflowEntity) => {
    if (dirty && !window.confirm("Bỏ các thay đổi chưa lưu?")) return;
    const w = data.workflows.find(
      (w) => w.entity_type === e.type && w.entity_id === e.id,
    );
    if (!w) {
      setSelected(`${e.type}:${e.id}`);
      setDraft(null);
      setDirty(false);
      setConfigure(false);
      return;
    }
    setSelected(`${e.type}:${e.id}`);
    setDraft(structuredClone(w.document));
    setVersion(w.version);
    setPhaseIndex(currentPhase(w.document));
    setDirty(false);
    setConfigure(false);
  };
  const update = (fn: (d: WorkflowDocument) => void) => {
    setDraft((d) => {
      if (!d) return d;
      const next = structuredClone(d);
      fn(next);
      return next;
    });
    setDirty(true);
  };
  const updatePhase = (fn: (p: WorkflowPhase) => void) =>
    update((d) => fn(d.phases[phaseIndex]));
  const phase = draft?.phases[phaseIndex];
  const immutable =
    phase?.gate.status === "go" || phase?.gate.status === "no_go";
  const editable = data.canEdit && !immutable && !saving;
  const scoped = data.workflows.filter(
    (w) =>
      (type === "all" || w.entity_type === type) &&
      w.name.toLowerCase().includes(search.toLowerCase()),
  );
  const taskSet = (w: (typeof data.workflows)[number]) =>
    data.tasks.filter(
      (t) => t.entity_type === w.entity_type && t.entity_id === w.entity_id,
    );
  const totals = scoped.reduce(
    (acc, w) => {
      const p = cumulativeProbability(w.document);
      acc.budget += w.document.budget;
      if (p !== null) acc.expected += (w.document.value * p) / 100;
      else acc.unknown++;
      if (w.document.phases.some((p) => p.gate.status === "in_review"))
        acc.review++;
      return acc;
    },
    { budget: 0, expected: 0, unknown: 0, review: 0 },
  );
  async function persist(doc = draft) {
    if (!doc || !entity) return;
    const err = validateDocument(doc);
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const saved = await data.save(entity, doc, version);
      setDraft(structuredClone(saved.document));
      setVersion(saved.version);
      setDirty(false);
      toast.success("Đã lưu Workflow");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }
  async function decide(status: GateStatus) {
    if (!draft || !phase) return;
    if (!transitions[phase.gate.status].includes(status)) return;
    if (status === "go" && !canGo(draft, phaseIndex, tasks))
      return toast.error(
        "Cần 100% milestone, checklist ≥80% và đủ tiêu chí bắt buộc.",
      );
    if (["on_hold", "no_go"].includes(status) && !phase.gate.note.trim())
      return toast.error("Nhập lý do quyết định.");
    const doc = structuredClone(draft);
    doc.phases[phaseIndex].gate.status = status;
    await persist(doc);
  }
  async function create() {
    const e = data.entities.find((e) => `${e.type}:${e.id}` === setupEntity);
    if (!e) return toast.error("Chọn Project hoặc Campaign");
    setSaving(true);
    try {
      const doc = makeWorkflow(e.type, String(profile?.id || ""), template);
      doc.budget = e.budget || 0;
      const saved = await data.save(e, doc, 0);
      setSetup(false);
      setSelected(setupEntity);
      setDraft(saved.document);
      setVersion(saved.version);
      setDirty(false);
      setPhaseIndex(0);
      setConfigure(true);
      toast.success("Đã khởi tạo Workflow");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }
  const used = data.workflows.map((w) => `${w.entity_type}:${w.entity_id}`);
  const ownerOptions = data.people.map((p) => ({
    value: String(p.id),
    label: p.name,
  }));
  const gateOptions = data.people
    .filter(
      (p) =>
        ["admin", "manager", "leader"].includes((p.role || "").toLowerCase()) ||
        ["manager", "leader"].includes(
          (p.employment_level || "").toLowerCase(),
        ),
    )
    .map((p) => ({ value: String(p.id), label: p.name }));
  const manager =
    phase && (data.global || String(profile?.id) === phase.gate.ownerId);
  const gateUnlocked = draft?.phases
    .slice(0, phaseIndex)
    .every((p) => p.gate.status === "go");
  const empirical = phase
    ? data.history.filter(
        (h) =>
          ["go", "no_go"].includes(h.decision) &&
          data.workflows
            .find((w) => w.id === h.workflow_id)
            ?.document.phases.find((p) => p.id === h.phase_id)?.name ===
            phase.name,
      )
    : [];
  const funnel = stages.map((name, index) => {
    const reached = scoped.filter((w) => {
      if (index === 0) return true;
      return (
        portfolioStage(w.document) >= index ||
        data.history.some(
          (h) =>
            h.workflow_id === w.id &&
            h.decision === "go" &&
            Math.floor(
              ((w.document.phases.findIndex((p) => p.id === h.phase_id) + 1) /
                w.document.phases.length) *
                5,
            ) >= index,
        )
      );
    }).length;
    return { name, reached };
  });
  function card(w: (typeof scoped)[number]) {
    const p = w.document.phases[currentPhase(w.document)],
      progress = overallProgress(w.document, taskSet(w)),
      prob = cumulativeProbability(w.document),
      audit = data.history.find(
        (h) => h.workflow_id === w.id && h.phase_id === p.id,
      );
    return (
      <button
        key={w.id}
        onClick={() => {
          const e = data.entities.find(
            (e) => e.type === w.entity_type && e.id === w.entity_id,
          );
          if (e) open(e);
        }}
        className={`card-hub text-left p-4 space-y-3 w-full hover:shadow-md transition-all ${selected === `${w.entity_type}:${w.entity_id}` ? "ring-2 ring-primary/40" : ""}`}
      >
        <div className="flex gap-3 items-start">
          <div
            className="shrink-0 size-10 rounded-full grid place-items-center text-xs font-bold"
            style={{
              background: `conic-gradient(var(--color-primary) ${progress}%, transparent 0)`,
            }}
          >
            <span className="size-8 bg-white dark:bg-slate-800 rounded-full grid place-items-center">
              {progress}
            </span>
          </div>
          <div className="min-w-0">
            <b className="block break-words">{w.name}</b>
            <span className="text-xs text-gray-500">
              {w.entity_type} · {p.name}
            </span>
          </div>
        </div>
        <Meter label="Tiến độ" value={progress} />
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2 py-1 text-xs ${statusColor(p.gate.status)}`}
          >
            {gateLabels[p.gate.status]}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full ${progress >= 80 ? "text-emerald-600" : progress >= 60 ? "text-amber-600" : "text-red-600"}`}
          >
            RAG tiến độ:{" "}
            {progress >= 80 ? "Green" : progress >= 60 ? "Amber" : "Red"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            Xác suất còn lại
            <br />
            <b>{fmt(prob)}</b>
          </div>
          <div>
            Giá trị kỳ vọng
            <br />
            <b>
              {prob === null ? "—" : money((w.document.value * prob) / 100)}
            </b>
          </div>
          <div>
            Ngân sách
            <br />
            <b>{money(w.document.budget)}</b>
          </div>
          <div>
            Drift từ review
            <br />
            <b>
              {audit
                ? `${Math.round(phaseProgress(p, taskSet(w)) - audit.progress_at_decision)} điểm`
                : "Chưa có mốc"}
            </b>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Khởi tạo {new Date(w.created_at).toLocaleDateString("vi-VN")}
        </p>
      </button>
    );
  }
  return (
    <div className="text-gray-900 dark:text-white space-y-6 pb-8 min-w-0">
      <header className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="text-primary" />
            Workflow Management 2
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Phase, gate, tiến độ và dự báo cho Project/Campaign.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={btn}
            aria-label="Làm mới"
            onClick={() => void data.refresh()}
          >
            <RefreshCw size={16} />
          </button>
          {data.canEdit && (
            <button
              className={btn + " bg-[#002e6d] text-white hover:bg-[#001f4d]"}
              onClick={() => setSetup(true)}
            >
              <Plus size={16} />
              Khởi tạo Workflow
            </button>
          )}
        </div>
      </header>
      {data.error && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20"
        >
          {data.error}
          <button
            className="ml-3 underline"
            onClick={() => void data.refresh()}
          >
            Thử lại
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ["Workflow", scoped.length],
          ["Gate chờ duyệt", totals.review],
          ["Ngân sách", money(totals.budget)],
          ["Giá trị kỳ vọng", money(totals.expected)],
        ].map(([label, value]) => (
          <div key={label} className="card-hub p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <b className="block text-xl mt-2 break-words">{value}</b>
            {label === "Giá trị kỳ vọng" && (
              <p className="text-xs text-gray-500 mt-1">
                {totals.unknown} workflow chưa có xác suất
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          className={input + " sm:max-w-xs"}
          placeholder="Tìm Project/Campaign..."
          aria-label="Tìm Workflow"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={input + " sm:w-auto"}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="project">Projects</option>
          <option value="campaign">Campaigns</option>
        </select>
        <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-slate-800 p-1">
          {(["list", "board"] as const).map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              className={`rounded-lg px-3 py-2 text-sm ${view === v ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
              onClick={() => setView(v)}
            >
              {v === "list" ? "Danh sách" : "Portfolio Board"}
            </button>
          ))}
        </div>
      </div>
      {!data.loading && unconfigured.length > 0 && (
        <section
          className="space-y-3"
          aria-label="Dữ liệu từ Dự án và Chiến dịch"
        >
          <h2 className="font-bold">
            Dự án / Chiến dịch đã kết nối{" "}
            <span className="text-gray-500 font-normal">
              ({unconfigured.length} chưa thiết lập phase)
            </span>
          </h2>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {unconfigured.map((e) => (
              <div key={`${e.type}:${e.id}`} className="card-hub p-4 space-y-3">
                <button className="text-left w-full" onClick={() => open(e)}>
                  <b className="block break-words">{e.name}</b>
                  <span className="text-xs text-gray-500">
                    {e.type} · Chưa thiết lập Workflow
                  </span>
                </button>
                <p className="text-xs text-gray-500">
                  {
                    data.tasks.filter(
                      (t) => t.entity_type === e.type && t.entity_id === e.id,
                    ).length
                  }{" "}
                  task/subtask ·{" "}
                  {
                    data.files.filter(
                      (f) => f.entity_type === e.type && f.entity_id === e.id,
                    ).length
                  }{" "}
                  tài liệu
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button className={btn} onClick={() => open(e)}>
                    Xem dữ liệu nguồn
                  </button>
                  {data.canEdit && (
                    <button
                      className={btn + " text-primary"}
                      onClick={() => {
                        setSetupEntity(`${e.type}:${e.id}`);
                        setSetup(true);
                      }}
                    >
                      Thiết lập phase
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {entity && (
        <section className="card-hub p-5 space-y-4" aria-label="Tài liệu nguồn">
          <div className="flex flex-wrap gap-3 justify-between">
            <div>
              <h2 className="font-bold">Tài liệu · {entity.name}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Đồng bộ từ Brief, Strategy Assets và file của subtask. Campaign
                bao gồm tài liệu của Project trực thuộc.
              </p>
            </div>
            <button className={btn} onClick={() => void data.refresh()}>
              <RefreshCw size={15} />
              Đồng bộ
            </button>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {sourceFiles.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <b className="text-sm break-all">
                  {f.name}
                  <ExternalLink size={13} className="inline ml-2" />
                </b>
                <p className="text-xs text-gray-500 mt-2 break-words">
                  {f.source}
                </p>
              </a>
            ))}
          </div>
          {!sourceFiles.length && (
            <p className="text-sm text-gray-400">
              Mục này chưa có file đính kèm.
            </p>
          )}
          {!record && data.canEdit && (
            <button
              className={btn + " bg-[#002e6d] text-white"}
              onClick={() => {
                setSetupEntity(selected);
                setSetup(true);
              }}
            >
              Thiết lập Workflow cho mục này
            </button>
          )}
        </section>
      )}
      {data.loading ? (
        <div className="card-hub h-40 animate-pulse" />
      ) : scoped.length === 0 ? (
        <div className="card-hub p-10 text-center text-gray-400">
          Chưa có Workflow đã thiết lập. Chọn một Project/Campaign phía trên để
          bắt đầu.
        </div>
      ) : view === "list" ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {scoped.map(card)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
          {stages.map((s, i) => (
            <section
              key={s}
              className="rounded-2xl bg-gray-50 dark:bg-slate-900/40 p-3 space-y-3"
            >
              <h3 className="font-bold text-xs">
                {s}{" "}
                <span className="text-gray-500">
                  {
                    scoped.filter((w) => portfolioStage(w.document) === i)
                      .length
                  }
                </span>
              </h3>
              {scoped.filter((w) => portfolioStage(w.document) === i).map(card)}
            </section>
          ))}
        </div>
      )}
      {entity && draft && phase && (
        <section
          className="card-hub overflow-hidden"
          aria-label="Chi tiết Workflow"
        >
          <header className="p-5 border-b border-gray-200 dark:border-slate-700 flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="font-bold text-lg">{entity.name}</h2>
              <p className="text-xs text-gray-500">
                Phiên bản {version} {dirty ? "· Có thay đổi chưa lưu" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {data.canEdit && (
                <button
                  className={btn}
                  onClick={() => setConfigure(!configure)}
                >
                  {configure ? "Đóng cấu hình" : "Cấu hình"}
                </button>
              )}
              <button
                className={btn}
                aria-label="Đóng chi tiết"
                onClick={() => {
                  if (!dirty || window.confirm("Bỏ thay đổi chưa lưu?")) {
                    setSelected("");
                    setDraft(null);
                    setDirty(false);
                  }
                }}
              >
                <X size={18} />
              </button>
            </div>
          </header>
          <div className="p-4 flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-700">
            {draft.phases.map((p, i) => (
              <button
                key={p.id}
                className={`${btn} flex-1 min-w-[140px] ${i === phaseIndex ? "bg-primary text-white" : ""}`}
                onClick={() => setPhaseIndex(i)}
              >
                {p.gate.status === "go" ? "✓" : i + 1}. {p.name}
                {i > 0 && draft.phases[i - 1].gate.status !== "go" && (
                  <LockKeyhole size={13} />
                )}
              </button>
            ))}
            {configure &&
              data.canEdit &&
              draft.phases.length < 7 &&
              !draft.phases.some((p) =>
                ["go", "no_go"].includes(p.gate.status),
              ) && (
                <button
                  className={btn}
                  onClick={() =>
                    update((d) => {
                      const p = makeWorkflow(entity.type, String(profile?.id))
                        .phases[0];
                      p.name = "Phase mới";
                      d.phases.push(p);
                      d.phases.forEach(
                        (p, i) =>
                          (p.boundary = Math.round(
                            ((i + 1) / d.phases.length) * 100,
                          )),
                      );
                    })
                  }
                >
                  <Plus size={16} />
                  Phase
                </button>
              )}
          </div>
          <div className="p-5 grid grid-cols-1 xl:grid-cols-12 gap-6">
            <section className="xl:col-span-3 space-y-4">
              <h3 className="font-bold">Thông tin phase</h3>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs ${statusColor(phase.gate.status)}`}
              >
                {gateLabels[phase.gate.status]}
              </span>
              <p className="text-sm text-gray-500">
                {phase.start || "Chưa đặt ngày"} →{" "}
                {phase.end || "Chưa đặt ngày"}
              </p>
              <p className="text-sm">
                Owner:{" "}
                {data.people.find((p) => String(p.id) === phase.ownerId)
                  ?.name || "Chưa giao"}
              </p>
              <p className="text-sm">
                Gate Manager:{" "}
                {data.people.find((p) => String(p.id) === phase.gate.ownerId)
                  ?.name || "Chưa giao"}
              </p>
              <Meter
                label="Tiến độ phase"
                value={phaseProgress(phase, tasks)}
              />
              <Meter label="Sẵn sàng chuyển phase" value={readiness(phase)} />
              <Meter
                label="Gate-weighted toàn dự án"
                value={overallProgress(draft, tasks)}
              />
              {configure && (
                <fieldset
                  disabled={!editable}
                  className="space-y-3 disabled:opacity-60"
                >
                  <label className="block text-xs">
                    Tên phase
                    <input
                      className={input}
                      value={phase.name}
                      onChange={(e) =>
                        updatePhase((p) => (p.name = e.target.value))
                      }
                    />
                  </label>
                  <label className="block text-xs">
                    Owner / PIC
                    <MultiSelect
                      options={ownerOptions}
                      value={phase.ownerId ? [phase.ownerId] : []}
                      maxSelected={1}
                      onChange={(ids: string[]) =>
                        updatePhase((p) => (p.ownerId = ids[0] || ""))
                      }
                      placeholder="Chọn Owner..."
                    />
                  </label>
                  <label className="block text-xs">
                    Gate Manager
                    <MultiSelect
                      options={gateOptions}
                      value={phase.gate.ownerId ? [phase.gate.ownerId] : []}
                      maxSelected={1}
                      onChange={(ids: string[]) =>
                        updatePhase((p) => (p.gate.ownerId = ids[0] || ""))
                      }
                      placeholder="Chọn người duyệt..."
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs">
                      Bắt đầu
                      <DateField
                        id={`wf-start-${phase.id}`}
                        value={phase.start}
                        onChange={(v) => updatePhase((p) => (p.start = v))}
                      />
                    </label>
                    <label className="text-xs">
                      Kết thúc
                      <DateField
                        id={`wf-end-${phase.id}`}
                        value={phase.end}
                        onChange={(v) => updatePhase((p) => (p.end = v))}
                      />
                    </label>
                  </div>
                  <label className="block text-xs">
                    Chi phí phase (VND)
                    <input
                      className={input}
                      type="number"
                      min="0"
                      value={phase.investment}
                      onChange={(e) =>
                        updatePhase(
                          (p) => (p.investment = Number(e.target.value)),
                        )
                      }
                    />
                  </label>
                  <label className="block text-xs">
                    Mốc hoàn thành toàn dự án (%)
                    <input
                      className={input}
                      type="number"
                      min="1"
                      max="100"
                      value={phase.boundary}
                      onChange={(e) =>
                        updatePhase(
                          (p) => (p.boundary = Number(e.target.value)),
                        )
                      }
                    />
                  </label>
                  {draft.phases.length > 2 &&
                    !draft.phases.some((p) =>
                      ["go", "no_go"].includes(p.gate.status),
                    ) && (
                      <button
                        className={btn + " text-red-600"}
                        onClick={() => {
                          update((d) => {
                            d.phases.splice(phaseIndex, 1);
                            d.phases.forEach(
                              (p, i) =>
                                (p.boundary = Math.round(
                                  ((i + 1) / d.phases.length) * 100,
                                )),
                            );
                          });
                          setPhaseIndex(0);
                        }}
                      >
                        Bỏ phase
                      </button>
                    )}
                </fieldset>
              )}
            </section>
            <section className="xl:col-span-5 space-y-5">
              <div>
                <h3 className="font-bold mb-3">
                  Milestone · Tổng trọng số{" "}
                  {phase.milestones.reduce((n, m) => n + m.weight, 0)}%
                </h3>
                <div className="space-y-3">
                  {phase.milestones.map((m, i) => {
                    const linked = tasks.find((t) => t.key === m.taskKey);
                    const done =
                      phase.gate.status === "go" ||
                      (m.taskKey ? doneStatus(linked?.status || "") : m.done);
                    return (
                      <div
                        key={m.id}
                        className={`rounded-xl border p-3 ${done ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-slate-700"}`}
                      >
                        <div className="flex gap-2 items-start">
                          <input
                            type="checkbox"
                            aria-label={`Hoàn thành ${m.title}`}
                            disabled={!editable || !!m.taskKey}
                            checked={done}
                            onChange={(e) =>
                              updatePhase(
                                (p) =>
                                  (p.milestones[i].done = e.target.checked),
                              )
                            }
                          />
                          <b
                            className={`text-sm flex-1 break-words ${done ? "line-through text-gray-400" : ""}`}
                          >
                            {m.title}
                          </b>
                          <span className="text-xs">{m.weight}%</span>
                        </div>
                        {linked && (
                          <p className="text-xs text-gray-500 mt-2">
                            {linked.title} ·{" "}
                            {linked.assigneeName || "Chưa giao"} ·{" "}
                            {linked.status}
                          </p>
                        )}
                        {m.evidence && /^https?:\/\//.test(m.evidence) && (
                          <a
                            className="text-xs text-primary inline-flex gap-1 mt-2"
                            href={m.evidence}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Minh chứng
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {configure && (
                          <fieldset
                            disabled={!editable}
                            className="space-y-2 mt-3"
                          >
                            <input
                              aria-label="Tên milestone"
                              className={input}
                              value={m.title}
                              onChange={(e) =>
                                updatePhase(
                                  (p) =>
                                    (p.milestones[i].title = e.target.value),
                                )
                              }
                            />
                            <input
                              aria-label="Trọng số milestone"
                              className={input}
                              type="number"
                              value={m.weight}
                              min="1"
                              max="100"
                              onChange={(e) =>
                                updatePhase(
                                  (p) =>
                                    (p.milestones[i].weight = Number(
                                      e.target.value,
                                    )),
                                )
                              }
                            />
                            <select
                              aria-label="Liên kết task"
                              className={input}
                              value={m.taskKey}
                              onChange={(e) =>
                                updatePhase(
                                  (p) =>
                                    (p.milestones[i].taskKey = e.target.value),
                                )
                              }
                            >
                              <option value="">Milestone độc lập</option>
                              {tasks.map((t) => (
                                <option key={t.key} value={t.key}>
                                  {t.title}
                                </option>
                              ))}
                            </select>
                            <input
                              aria-label="Link minh chứng"
                              className={input}
                              value={m.evidence}
                              placeholder="https://... minh chứng"
                              onChange={(e) =>
                                updatePhase(
                                  (p) =>
                                    (p.milestones[i].evidence = e.target.value),
                                )
                              }
                            />
                            {sourceFiles.length > 0 && (
                              <select
                                className={input}
                                aria-label="Chọn minh chứng từ tài liệu nguồn"
                                value={
                                  sourceFiles.some((f) => f.url === m.evidence)
                                    ? m.evidence
                                    : ""
                                }
                                onChange={(e) =>
                                  updatePhase(
                                    (p) =>
                                      (p.milestones[i].evidence =
                                        e.target.value),
                                  )
                                }
                              >
                                <option value="">
                                  Chọn từ file Dự án / Chiến dịch
                                </option>
                                {sourceFiles
                                  .filter(
                                    (f) =>
                                      !m.taskKey ||
                                      !f.taskKey ||
                                      f.taskKey === m.taskKey,
                                  )
                                  .map((f) => (
                                    <option key={f.id} value={f.url}>
                                      {f.name} · {f.source}
                                    </option>
                                  ))}
                              </select>
                            )}
                            {phase.milestones.length > 1 && (
                              <button
                                className="text-xs text-red-600"
                                onClick={() =>
                                  updatePhase((p) => p.milestones.splice(i, 1))
                                }
                              >
                                Bỏ milestone
                              </button>
                            )}
                          </fieldset>
                        )}
                      </div>
                    );
                  })}
                </div>
                {configure && editable && (
                  <button
                    className={btn + " mt-3"}
                    onClick={() =>
                      updatePhase((p) =>
                        p.milestones.push({
                          id: crypto.randomUUID(),
                          title: "Milestone mới",
                          weight: 10,
                          done: false,
                          taskKey: "",
                          evidence: "",
                        }),
                      )
                    }
                  >
                    <Plus size={14} />
                    Milestone
                  </button>
                )}
              </div>
              <div>
                <h3 className="font-bold flex gap-2 mb-3">
                  <ShieldCheck size={18} />
                  Checklist Gate ·{" "}
                  {phase.gate.criteria.reduce((n, c) => n + c.weight, 0)}%
                </h3>
                <div className="space-y-3">
                  {phase.gate.criteria.map((c, i) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-gray-200 dark:border-slate-700 p-3"
                    >
                      <label className="flex gap-2 text-sm items-start">
                        <input
                          type="checkbox"
                          disabled={!editable}
                          checked={c.checked}
                          onChange={(e) =>
                            updatePhase(
                              (p) =>
                                (p.gate.criteria[i].checked = e.target.checked),
                            )
                          }
                        />
                        <span className="flex-1 break-words">
                          {c.title}
                          {c.required && (
                            <span className="text-red-500"> *</span>
                          )}
                        </span>
                        <span className="text-xs">{c.weight}%</span>
                      </label>
                      {c.evidence && /^https?:\/\//.test(c.evidence) && (
                        <a
                          className="text-xs text-primary mt-2 inline-flex gap-1"
                          href={c.evidence}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Minh chứng Gate
                          <ExternalLink size={12} />
                        </a>
                      )}
                      {configure && (
                        <fieldset
                          disabled={!editable}
                          className="space-y-2 mt-3"
                        >
                          <input
                            className={input}
                            aria-label="Tên tiêu chí"
                            value={c.title}
                            onChange={(e) =>
                              updatePhase(
                                (p) =>
                                  (p.gate.criteria[i].title = e.target.value),
                              )
                            }
                          />
                          <select
                            className={input}
                            aria-label="Minh chứng Gate từ tài liệu nguồn"
                            value={c.evidence || ""}
                            onChange={(e) =>
                              updatePhase(
                                (p) =>
                                  (p.gate.criteria[i].evidence =
                                    e.target.value),
                              )
                            }
                          >
                            <option value="">Chưa chọn minh chứng Gate</option>
                            {sourceFiles.map((f) => (
                              <option key={f.id} value={f.url}>
                                {f.name} · {f.source}
                              </option>
                            ))}
                          </select>
                          <input
                            className={input}
                            aria-label="Trọng số tiêu chí"
                            type="number"
                            min="1"
                            max="100"
                            value={c.weight}
                            onChange={(e) =>
                              updatePhase(
                                (p) =>
                                  (p.gate.criteria[i].weight = Number(
                                    e.target.value,
                                  )),
                              )
                            }
                          />
                          <label className="flex gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={c.required}
                              onChange={(e) =>
                                updatePhase(
                                  (p) =>
                                    (p.gate.criteria[i].required =
                                      e.target.checked),
                                )
                              }
                            />
                            Bắt buộc
                          </label>
                          {phase.gate.criteria.length > 1 && (
                            <button
                              className="text-xs text-red-600"
                              onClick={() =>
                                updatePhase((p) => p.gate.criteria.splice(i, 1))
                              }
                            >
                              Bỏ tiêu chí
                            </button>
                          )}
                        </fieldset>
                      )}
                    </div>
                  ))}
                </div>
                {configure && editable && (
                  <button
                    className={btn + " mt-3"}
                    onClick={() =>
                      updatePhase((p) =>
                        p.gate.criteria.push({
                          id: crypto.randomUUID(),
                          title: "Tiêu chí mới",
                          weight: 10,
                          checked: false,
                          required: false,
                        }),
                      )
                    }
                  >
                    <Plus size={14} />
                    Tiêu chí
                  </button>
                )}
                <p className="text-xs text-gray-500 mt-3">
                  Go yêu cầu milestone 100%, checklist ≥80% và đủ tiêu chí bắt
                  buộc.{" "}
                  {immutable
                    ? "Phase đã chốt, không thể sửa."
                    : !gateUnlocked
                      ? "Gate trước chưa được duyệt."
                      : ""}
                </p>
                <textarea
                  className={input + " mt-3"}
                  rows={2}
                  disabled={!editable}
                  placeholder="Lý do giữ lại / dừng, nhận xét review..."
                  value={phase.gate.note}
                  onChange={(e) =>
                    updatePhase((p) => (p.gate.note = e.target.value))
                  }
                />
              </div>
            </section>
            <section className="xl:col-span-4 space-y-4">
              <h3 className="font-bold">Dự báo qua các gate</h3>
              <p className="text-xs text-gray-500">
                Xác suất là ước tính có nguồn; điểm checklist là mức sẵn sàng.
                Dự báo còn lại nhân các xác suất điều kiện của gate chưa duyệt.
              </p>
              {draft.phases.map((p) => (
                <div key={p.id} className="flex justify-between gap-3 text-sm">
                  <span>{p.name}</span>
                  <b>
                    {p.gate.status === "go" ? "Đã qua" : fmt(p.probability)}
                  </b>
                </div>
              ))}
              <div className="rounded-xl bg-gray-50 dark:bg-slate-900 p-4">
                <p className="text-xs text-gray-500">
                  Current Option Value:{" "}
                  {phase.probability === null
                    ? "—"
                    : money((draft.value * phase.probability) / 100)}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Net phase value:{" "}
                  {phase.probability === null
                    ? "—"
                    : money(
                        (draft.value * phase.probability) / 100 -
                          phase.investment,
                      )}
                </p>
                <p className="text-xs text-gray-500">
                  Xác suất hoàn tất còn lại
                </p>
                <b className="text-xl">{fmt(cumulativeProbability(draft))}</b>
                <p className="text-xs text-gray-500 mt-2">
                  Giá trị kỳ vọng:{" "}
                  {cumulativeProbability(draft) === null
                    ? "—"
                    : money(
                        (draft.value *
                          (cumulativeProbability(draft) as number)) /
                          100,
                      )}
                </p>
                <p className="text-xs text-gray-500">
                  Net value:{" "}
                  {cumulativeProbability(draft) === null
                    ? "—"
                    : money(
                        (draft.value *
                          (cumulativeProbability(draft) as number)) /
                          100 -
                          draft.budget,
                      )}
                </p>
              </div>
              {configure && (
                <fieldset disabled={!editable} className="space-y-3">
                  <label className="block text-xs">
                    Xác suất qua gate (%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className={input}
                      value={phase.probability ?? ""}
                      placeholder="Chưa ước tính"
                      onChange={(e) =>
                        updatePhase(
                          (p) =>
                            (p.probability =
                              e.target.value === ""
                                ? null
                                : Number(e.target.value)),
                        )
                      }
                    />
                  </label>
                  <select
                    className={input}
                    aria-label="Nguồn xác suất"
                    value={phase.probabilitySource}
                    onChange={(e) =>
                      updatePhase((p) => (p.probabilitySource = e.target.value))
                    }
                  >
                    <option value="estimate">Leader ước tính</option>
                    <option value="historical">Tỷ lệ lịch sử</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Lịch sử cùng tên phase: {empirical.length} quyết định
                    Go/No-Go.
                  </p>
                  <button
                    className={btn}
                    disabled={!empirical.length}
                    onClick={() =>
                      updatePhase((p) => {
                        p.probability = Math.round(
                          (empirical.filter((h) => h.decision === "go").length /
                            empirical.length) *
                            100,
                        );
                        p.probabilitySource = "historical";
                        p.sampleSize = empirical.length;
                      })
                    }
                  >
                    Dùng tỷ lệ lịch sử
                  </button>
                  <p className="text-xs text-gray-500">
                    Mẫu tại lúc cấu hình: {phase.sampleSize}
                  </p>
                  <label className="block text-xs">
                    Giá trị cơ hội (VND)
                    <input
                      className={input}
                      type="number"
                      min="0"
                      value={draft.value}
                      onChange={(e) =>
                        update((d) => (d.value = Number(e.target.value)))
                      }
                    />
                  </label>
                  <label className="block text-xs">
                    Ngân sách đầu tư (VND)
                    <input
                      className={input}
                      type="number"
                      min="0"
                      value={draft.budget}
                      onChange={(e) =>
                        update((d) => (d.budget = Number(e.target.value)))
                      }
                    />
                  </label>
                </fieldset>
              )}
              <button
                className="text-sm text-primary"
                onClick={() => setValuationOpen(!valuationOpen)}
              >
                ECV nâng cao <ChevronRight size={14} className="inline" />
              </button>
              {valuationOpen && (
                <div className="space-y-2">
                  {(
                    [
                      "pv",
                      "commercialProbability",
                      "launchCost",
                      "technicalProbability",
                      "developmentCost",
                    ] as const
                  ).map((key, i) => (
                    <label key={key} className="block text-xs">
                      {
                        [
                          "Giá trị hiện tại PV",
                          "Xác suất thương mại (%)",
                          "Chi phí launch",
                          "Xác suất kỹ thuật (%)",
                          "Chi phí phát triển",
                        ][i]
                      }
                      <input
                        className={input}
                        disabled={!data.canEdit}
                        type="number"
                        min="0"
                        max={key.includes("Probability") ? 100 : undefined}
                        value={draft.valuation[key]}
                        onChange={(e) =>
                          update(
                            (d) => (d.valuation[key] = Number(e.target.value)),
                          )
                        }
                      />
                    </label>
                  ))}
                  <p className="text-sm font-bold">
                    ECV:{" "}
                    {money(
                      (((draft.valuation.pv *
                        draft.valuation.commercialProbability) /
                        100 -
                        draft.valuation.launchCost) *
                        draft.valuation.technicalProbability) /
                        100 -
                        draft.valuation.developmentCost,
                    )}
                  </p>
                </div>
              )}
            </section>
          </div>
          <footer className="sticky bottom-0 z-20 p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-wrap gap-3 justify-between">
            <div className="flex gap-2">
              {data.canEdit && (
                <button
                  disabled={saving || !dirty}
                  onClick={() => void persist()}
                  className={
                    btn + " bg-[#002e6d] text-white hover:bg-[#001f4d]"
                  }
                >
                  <Save size={16} />
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              )}
              {dirty && (
                <button
                  className={btn}
                  onClick={() => {
                    if (record) {
                      setDraft(structuredClone(record.document));
                      setVersion(record.version);
                      setDirty(false);
                    }
                  }}
                >
                  Bỏ thay đổi
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {manager &&
                gateUnlocked &&
                transitions[phase.gate.status].map((s) => (
                  <button
                    key={s}
                    className={
                      btn +
                      (s === "go"
                        ? " bg-[#002e6d] text-white hover:bg-[#001f4d]"
                        : "")
                    }
                    disabled={
                      saving || (s === "go" && !canGo(draft, phaseIndex, tasks))
                    }
                    onClick={() => void decide(s)}
                  >
                    {gateLabels[s]}
                  </button>
                ))}
            </div>
          </footer>
          <div className="p-5 border-t border-gray-200 dark:border-slate-700">
            <h3 className="font-bold mb-3">Lịch sử review</h3>
            {data.history
              .filter((h) => h.workflow_id === record?.id)
              .map((h) => (
                <div
                  key={h.id}
                  className="text-xs py-2 border-b border-gray-100 dark:border-slate-700"
                >
                  <b>
                    {draft.phases.find((p) => p.id === h.phase_id)?.name} ·{" "}
                    {gateLabels[h.decision as GateStatus]}
                  </b>
                  <p className="text-gray-500">
                    {data.people.find((p) => p.id === h.decided_by)?.name ||
                      "Người duyệt"}{" "}
                    · {new Date(h.decided_at).toLocaleString("vi-VN")} · Tiến độ{" "}
                    {h.progress_at_decision}% · Sẵn sàng{" "}
                    {h.readiness_at_decision}% · Xác suất{" "}
                    {fmt(h.probability_at_decision)}
                  </p>
                  {h.note && <p>{h.note}</p>}
                </div>
              ))}
            {!data.history.some((h) => h.workflow_id === record?.id) && (
              <p className="text-xs text-gray-400">
                Chưa có quyết định review.
              </p>
            )}
          </div>
        </section>
      )}
      <section className="card-hub p-5">
        <h2 className="font-bold mb-4">Funnel · Số workflow từng đạt stage</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {funnel.map((f, i) => (
            <div key={f.name}>
              <p className="text-xs text-gray-500">{f.name}</p>
              <b className="text-lg">{f.reached}</b>
              <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full mt-2">
                <div
                  className="h-2 bg-primary rounded-full"
                  style={{
                    width: `${funnel[0].reached ? (f.reached / funnel[0].reached) * 100 : 0}%`,
                  }}
                />
              </div>
              {i > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Chưa đi tiếp:{" "}
                  {funnel[i - 1].reached
                    ? Math.round((1 - f.reached / funnel[i - 1].reached) * 100)
                    : 0}
                  %
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Cohort: workflow trong bộ lọc hiện tại. Chưa đi tiếp gồm cả đang chờ;
          không đồng nghĩa thất bại. No-Go đã ghi nhận:{" "}
          {
            scoped.filter((w) =>
              w.document.phases.some((p) => p.gate.status === "no_go"),
            ).length
          }
          .
        </p>
      </section>
      {setup && (
        <div className="fixed inset-0 z-[150] bg-black/30 flex justify-end">
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Khởi tạo Workflow"
            className="drawer-slide-in w-full max-w-lg bg-white dark:bg-slate-800 flex flex-col"
          >
            <header className="p-5 border-b border-gray-200 dark:border-slate-700 flex justify-between">
              <h2 className="font-bold">Khởi tạo Workflow</h2>
              <button aria-label="Đóng" onClick={() => setSetup(false)}>
                <X size={20} />
              </button>
            </header>
            <div className="flex-1 overflow-auto p-5 space-y-5">
              <label className="block text-sm">
                Project / Campaign
                <select
                  className={input + " mt-2"}
                  value={setupEntity}
                  onChange={(e) => setSetupEntity(e.target.value)}
                >
                  <option value="">Chọn mục cần quản lý</option>
                  {data.entities
                    .filter((e) => !used.includes(`${e.type}:${e.id}`))
                    .map((e) => (
                      <option
                        key={`${e.type}:${e.id}`}
                        value={`${e.type}:${e.id}`}
                      >
                        {e.type} · {e.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block text-sm">
                Mẫu phase
                <select
                  className={input + " mt-2"}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  <option value="standard">Project/Campaign tiêu chuẩn</option>
                  <option value="website">Xây dựng website</option>
                </select>
              </label>
              <p className="text-xs text-gray-500">
                Khởi tạo tất cả gate ở trạng thái chưa review. Milestone và
                checklist chưa hoàn thành; xác suất chưa ước tính.
              </p>
            </div>
            <footer className="p-4 flex gap-3 border-t border-gray-200 dark:border-slate-700">
              <button
                className={btn + " flex-1"}
                onClick={() => setSetup(false)}
              >
                Hủy
              </button>
              <button
                className={
                  btn + " flex-1 bg-[#002e6d] text-white hover:bg-[#001f4d]"
                }
                disabled={!setupEntity || saving}
                onClick={() => void create()}
              >
                Khởi tạo
              </button>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
