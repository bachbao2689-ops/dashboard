import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCcw, FolderKanban, Megaphone, CheckSquare, Trash2, ChevronDown, ChevronRight, Archive } from "lucide-react";
import { supabase } from "../../../services/supabase";
import toast from "react-hot-toast";

export const TrashModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [deletedProjects, setDeletedProjects] = useState<any[]>([]);
  const [deletedCampaigns, setDeletedCampaigns] = useState<any[]>([]);
  const [deletedTasks, setDeletedTasks] = useState<any[]>([]);

  const [expandProjects, setExpandProjects] = useState(true);
  const [expandCampaigns, setExpandCampaigns] = useState(true);
  const [expandTasks, setExpandTasks] = useState(true);

  const loadData = async () => {
    const [pRes, cRes, tRes, pstRes, cstRes] = await Promise.all([
      supabase.from("projects").select("*").in("status", ["deleted", "archived"]).order("created_at", { ascending: false }),
      supabase.from("campaigns").select("*").in("status", ["deleted", "archived"]).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").in("status", ["deleted", "archived"]).order("created_at", { ascending: false }),
      supabase.from("project_subtasks").select("*, projects(name)").in("status", ["deleted", "archived"]).order("created_at", { ascending: false }),
      supabase.from("campaign_subtasks").select("*, campaigns(name)").in("status", ["deleted", "archived"]).order("created_at", { ascending: false }),
    ]);

    setDeletedProjects(pRes.data || []);
    setDeletedCampaigns(cRes.data || []);

    const allDeletedTasks = [
      ...(tRes.data || []).map((t: any) => ({ ...t, type: "standalone" })),
      ...(pstRes.data || []).map((t: any) => ({ ...t, title: t.title, type: "project", parentName: t.projects?.name })),
      ...(cstRes.data || []).map((t: any) => ({ ...t, title: t.title, type: "campaign", parentName: t.campaigns?.name })),
    ];
    setDeletedTasks(allDeletedTasks);
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const restoreItem = async (table: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Khôi phục mục này?")) return;
    const { error } = await supabase.from(table).update({ status: "active" }).eq("id", id);
    if (!error) {
      toast.success("Đã khôi phục thành công");
      loadData();
      if (table === "projects") window.dispatchEvent(new Event("projects:changed"));
      if (table === "campaigns") window.dispatchEvent(new Event("campaigns:changed"));
      if (table === "tasks" || table === "project_subtasks" || table === "campaign_subtasks") window.dispatchEvent(new Event("tasks:changed"));
    }
  };

  const hardDeleteItem = async (table: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Xóa vĩnh viễn mục này? Hành động này không thể hoàn tác.")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) {
      if (table === "projects") {
        await supabase.from("project_subtasks").delete().eq("project_id", id);
      } else if (table === "campaigns") {
        await supabase.from("campaign_subtasks").delete().eq("campaign_id", id);
      }

      toast.success("Đã xóa vĩnh viễn");
      loadData();
    } else {
      toast.error("Lỗi khi xóa vĩnh viễn");
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[10050] grid place-items-center p-3 sm:p-4 bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div
        data-modal-surface="true"
        onClick={(e) => e.stopPropagation()}
        className="modal-liquid-glass rounded-2xl border border-white/95 dark:border-slate-700/80 w-full max-w-4xl max-h-[85vh] grid grid-rows-[auto_1fr] relative overflow-hidden animate-in zoom-in-95"
      >
        <div className="p-4 sm:p-6 border-b border-slate-200/75 dark:border-slate-800/80 grid grid-cols-[1fr_auto] items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-[#002e6d] dark:text-white inline-grid grid-flow-col auto-cols-max items-center gap-2">
            <Archive className="text-red-500" size={20} /> Log (Đã xóa &amp; Đã ẩn)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-h-[36px] min-w-[36px] grid place-items-center hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
          <div className="space-y-3">
            <button type="button" onClick={() => setExpandProjects(!expandProjects)} className="w-full grid grid-cols-[1fr_auto] items-center p-2 hover:bg-slate-100/70 dark:hover:bg-slate-900 rounded-[8px] transition-colors cursor-pointer">
              <h3 className="font-bold text-slate-900 dark:text-white inline-grid grid-flow-col auto-cols-max items-center gap-2"><FolderKanban className="text-violet-500" size={18} /> Projects đã lưu trữ ({deletedProjects.length})</h3>
              {expandProjects ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
            </button>
            {expandProjects && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                {deletedProjects.length === 0 && <p className="text-sm text-slate-500">Trống</p>}
                {deletedProjects.map((p) => (
                  <div key={p.id} className="p-4 rounded-[10px] border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 grid grid-cols-[1fr_auto] items-center gap-3 group">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 inline-grid grid-flow-col auto-cols-max items-center gap-2">
                        <span className="truncate">{p.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-[6px] font-semibold uppercase ${p.status === "archived" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{p.status === "archived" ? "Đã ẩn" : "Đã xóa"}</span>
                      </h4>
                      <p className="text-xs text-slate-500 truncate mt-1">{p.description || "Không có mô tả"}</p>
                    </div>
                    <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => restoreItem("projects", p.id, e)} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-[6px] transition-colors cursor-pointer" title="Khôi phục"><RefreshCcw size={16} /></button>
                      <button type="button" onClick={(e) => hardDeleteItem("projects", p.id, e)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-[6px] transition-colors cursor-pointer" title="Xóa vĩnh viễn"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button type="button" onClick={() => setExpandCampaigns(!expandCampaigns)} className="w-full grid grid-cols-[1fr_auto] items-center p-2 hover:bg-slate-100/70 dark:hover:bg-slate-900 rounded-[8px] transition-colors cursor-pointer">
              <h3 className="font-bold text-slate-900 dark:text-white inline-grid grid-flow-col auto-cols-max items-center gap-2"><Megaphone className="text-amber-500" size={18} /> Campaigns đã lưu trữ ({deletedCampaigns.length})</h3>
              {expandCampaigns ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
            </button>
            {expandCampaigns && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                {deletedCampaigns.length === 0 && <p className="text-sm text-slate-500">Trống</p>}
                {deletedCampaigns.map((c) => (
                  <div key={c.id} className="p-4 rounded-[10px] border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 grid grid-cols-[1fr_auto] items-center gap-3 group">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 inline-grid grid-flow-col auto-cols-max items-center gap-2">
                        <span className="truncate">{c.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-[6px] font-semibold uppercase ${c.status === "archived" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{c.status === "archived" ? "Đã ẩn" : "Đã xóa"}</span>
                      </h4>
                    </div>
                    <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => restoreItem("campaigns", c.id, e)} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-[6px] transition-colors cursor-pointer" title="Khôi phục"><RefreshCcw size={16} /></button>
                      <button type="button" onClick={(e) => hardDeleteItem("campaigns", c.id, e)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-[6px] transition-colors cursor-pointer" title="Xóa vĩnh viễn"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button type="button" onClick={() => setExpandTasks(!expandTasks)} className="w-full grid grid-cols-[1fr_auto] items-center p-2 hover:bg-slate-100/70 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer">
              <h3 className="font-bold text-slate-900 dark:text-white inline-grid grid-flow-col auto-cols-max items-center gap-2"><CheckSquare className="text-emerald-500" size={18} /> Tasks đã lưu trữ ({deletedTasks.length})</h3>
              {expandTasks ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
            </button>
            {expandTasks && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                {deletedTasks.length === 0 && <p className="text-sm text-slate-500">Trống</p>}
                {deletedTasks.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 grid grid-cols-[1fr_auto] items-center gap-3 group">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 inline-grid grid-flow-col auto-cols-max items-center gap-2">
                        <span className="truncate">{t.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${t.status === "archived" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{t.status === "archived" ? "Đã ẩn" : "Đã xóa"}</span>
                      </h4>
                      <p className="text-[10px] uppercase text-slate-400 font-semibold mt-1">
                        {t.type === "project" ? `Dự án: ${t.parentName}` : t.type === "campaign" ? `Chiến dịch: ${t.parentName}` : "Task lẻ"}
                      </p>
                    </div>
                    <div className="inline-grid grid-flow-col auto-cols-max items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => restoreItem(t.type === "project" ? "project_subtasks" : t.type === "campaign" ? "campaign_subtasks" : "tasks", t.id, e)} className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors cursor-pointer" title="Khôi phục"><RefreshCcw size={16} /></button>
                      <button type="button" onClick={(e) => hardDeleteItem(t.type === "project" ? "project_subtasks" : t.type === "campaign" ? "campaign_subtasks" : "tasks", t.id, e)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer" title="Xóa vĩnh viễn"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
