import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowUp, AudioLines, Bot, Check, CheckCircle2, Clock3,
  FileText, LoaderCircle, Paperclip, Plus, Search, Sparkles, Users, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '../i18n/translations';
import { useAuthStore } from '../store/authStore';

type AgentProposal = {
  token: string;
  kind: string;
  summary: string;
  state: 'pending' | 'saving' | 'done' | 'error';
};

type AgentMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  transcript?: string;
  proposals?: AgentProposal[];
};

type AgentResponse = {
  text?: string;
  transcript?: string;
  proposals?: Array<{ token: string; kind: string; summary: string }>;
  error?: string;
};

const UI_COPY = {
  en: {
    title: 'AI Agent', subtitle: 'Ask about work, find projects, and turn notes into task proposals.',
    scope: 'Uses only information you are allowed to see', quick: 'Quick prompts',
    overdue: 'Find my overdue tasks', workload: 'Analyze my workload',
    activity: 'Summarize recent activity', newTask: 'Create tasks from these notes',
    canDo: 'What I can help with', find: 'Find tasks and projects', prioritize: 'Prioritize and review workload',
    summaries: 'Summarize task, project, and recent activity', draft: 'Draft or update tasks and subtasks',
    planning: 'Suggest task order, schedule, and assignees', related: 'Find similar tasks and possible dependencies',
    health: 'Review overdue work, blockers, and project health',
    approval: 'You review every change before it is saved.', chatTitle: 'Work assistant', ready: 'Ready',
    emptyTitle: 'What would you like to work on?', emptyText: 'Ask a question, search your workspace, or add notes and a voice clip to draft a task.',
    userPlaceholder: 'Ask about a task, project, or what to do next…',
    context: 'Notes or document text', contextHint: 'Paste notes or attach a TXT, Markdown, CSV, or JSON file.',
    contextPlaceholder: 'Add notes or paste document text…', addFile: 'Attach text file', addVoice: 'Add voice clip',
    send: 'Ask Agent', thinking: 'Thinking…', limit: 'Up to 2,500 characters',
    transcript: 'Voice transcript', proposal: 'Suggested action', approve: 'Review and apply',
    applying: 'Applying…', applied: 'Applied', retry: 'Try again',
    fileTooLong: 'This file is too large. Use a text file under 32 KB.',
    contextTooLong: 'Notes and document text must be under 16,000 characters.',
    noSession: 'Your session has expired. Sign in again.',
    defaultError: 'The Agent could not complete that request. Try again.',
    apiUnavailable: 'The Agent API did not return JSON. This deployment may be missing the server function; try again after the Develop deployment finishes.',
    emptyQuestion: 'Enter a question or attach a voice clip first.',
    files: 'Attachments', remove: 'Remove attachment',
    taskCreation: 'Create task', work: 'Workload', search: 'Workspace search',
    searchPrompt: 'Find tasks and projects in my workspace',
    healthPrompt: 'Review overdue tasks, blockers, and project health',
    relatedPrompt: 'Find duplicate tasks and possible dependencies',
  },
  vi: {
    title: 'AI Agent', subtitle: 'Hỏi về công việc, tìm dự án và biến ghi chú thành đề xuất task.',
    scope: 'Chỉ dùng dữ liệu bạn được phép xem', quick: 'Gợi ý nhanh',
    overdue: 'Tìm task quá hạn của tôi', workload: 'Phân tích workload của tôi',
    activity: 'Tóm tắt hoạt động gần đây', newTask: 'Tạo task từ ghi chú này',
    canDo: 'Agent có thể hỗ trợ', find: 'Tìm task và project', prioritize: 'Ưu tiên và phân tích workload',
    summaries: 'Tóm tắt task, project và hoạt động gần đây', draft: 'Tạo hoặc cập nhật task và subtask',
    planning: 'Gợi ý thứ tự, lịch và người phù hợp', related: 'Tìm task tương tự và dependency có thể có',
    health: 'Rà task quá hạn, blocker và sức khỏe project',
    approval: 'Bạn duyệt mọi thay đổi trước khi lưu.', chatTitle: 'Trợ lý công việc', ready: 'Sẵn sàng',
    emptyTitle: 'Bạn muốn xử lý việc gì?', emptyText: 'Đặt câu hỏi, tìm trong workspace, hoặc thêm ghi chú và voice clip để tạo đề xuất task.',
    userPlaceholder: 'Hỏi về task, project hoặc việc nên làm tiếp…',
    context: 'Ghi chú hoặc nội dung tài liệu', contextHint: 'Dán nội dung hoặc đính kèm file TXT, Markdown, CSV, JSON.',
    contextPlaceholder: 'Thêm ghi chú hoặc dán nội dung tài liệu…', addFile: 'Đính kèm file text', addVoice: 'Thêm voice clip',
    send: 'Hỏi Agent', thinking: 'Đang xử lý…', limit: 'Tối đa 2.500 ký tự',
    transcript: 'Nội dung voice', proposal: 'Đề xuất thao tác', approve: 'Duyệt và thực hiện',
    applying: 'Đang lưu…', applied: 'Đã thực hiện', retry: 'Thử lại',
    fileTooLong: 'File quá lớn. Hãy dùng file text dưới 32 KB.',
    contextTooLong: 'Ghi chú và tài liệu tối đa 16.000 ký tự.',
    noSession: 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.',
    defaultError: 'Agent chưa xử lý được yêu cầu. Hãy thử lại.',
    apiUnavailable: 'API của Agent không trả dữ liệu hợp lệ. Bản deploy này có thể chưa có server function; hãy thử lại sau khi Develop deploy xong.',
    emptyQuestion: 'Nhập câu hỏi hoặc đính kèm voice clip trước nhé.',
    files: 'Tệp đính kèm', remove: 'Gỡ tệp đính kèm',
    taskCreation: 'Tạo task', work: 'Workload', search: 'Tìm kiếm workspace',
    searchPrompt: 'Tìm task và project trong workspace của tôi',
    healthPrompt: 'Rà task quá hạn, blocker và sức khỏe project',
    relatedPrompt: 'Tìm task trùng và dependency có thể có',
  },
} as const;

const SAFE_APP_LINK = /^\/(?:tasks|projects|workflow|ui-dashboard|my-tasks)(?:[/?#]|$)/;
const MARKDOWN_LINK = /\[([^\]]+)\]\((\/[^\s)]+)\)/g;

function MessageText({ text }: { text: string }) {
  const pieces: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARKDOWN_LINK.exec(text)) !== null) {
    if (match.index > lastIndex) pieces.push(text.slice(lastIndex, match.index));
    const [, label, href] = match;
    pieces.push(SAFE_APP_LINK.test(href)
      ? <Link key={`${match.index}-${href}`} className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary dark:text-sky-300" to={href}>{label}</Link>
      : <span key={`${match.index}-${href}`}>{match[0]}</span>);
    lastIndex = match.index + match[0].length;
  }
  if (!pieces.length) return <>{text}</>;
  if (lastIndex < text.length) pieces.push(text.slice(lastIndex));
  return <>{pieces}</>;
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readAgentResponse(response: Response, fallback: string): Promise<AgentResponse> {
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new Error(fallback);
  }
  const result = await response.json().catch(() => ({})) as AgentResponse;
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

export const Agents: React.FC = () => {
  const { lang } = useTranslation();
  const copy = UI_COPY[lang === 'en' ? 'en' : 'vi'];
  const session = useAuthStore(state => state.session);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [message, setMessage] = useState('');
  const [sourceContext, setSourceContext] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [activeProposal, setActiveProposal] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const handleTextFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 32 * 1024) {
      setErrorText(copy.fileTooLong);
      return;
    }
    try {
      const text = await file.text();
      const next = [sourceContext.trim(), `--- ${file.name} ---\n${text}`].filter(Boolean).join('\n\n');
      if (next.length > 16_000) {
        setErrorText(copy.contextTooLong);
        return;
      }
      setSourceContext(next);
      setSourceName(file.name);
      setErrorText('');
    } catch {
      setErrorText(copy.defaultError);
    }
  };

  const handleVoiceFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    if (file.size > 3_500_000) {
      setErrorText(copy.fileTooLong);
      return;
    }
    setVoiceFile(file);
    setErrorText('');
  };

  const sendMessage = async (overrideMessage?: string) => {
    const text = (overrideMessage ?? message).trim();
    if (sending) return;
    if (!text && !voiceFile) {
      setErrorText(copy.emptyQuestion);
      inputRef.current?.focus();
      return;
    }
    if (sourceContext.length > 16_000) {
      setErrorText(copy.contextTooLong);
      return;
    }
    if (!session?.access_token) {
      setErrorText(copy.noSession);
      return;
    }

    const previous = messages.slice(-8).map(item => ({ role: item.role, content: item.content.slice(0, 2500) }));
    const userMessage: AgentMessage = {
      id: crypto.randomUUID(), role: 'user',
      content: text || (voiceFile ? `${copy.addVoice}: ${voiceFile.name}` : ''),
    };
    setMessages(current => [...current, userMessage]);
    setMessage('');
    setSending(true);
    setErrorText('');

    try {
      let body: BodyInit;
      const headers: HeadersInit = { Authorization: `Bearer ${session.access_token}` };
      if (voiceFile) {
        const form = new FormData();
        form.set('action', 'chat');
        if (text) form.set('message', text);
        form.set('history', JSON.stringify(previous));
        if (sourceContext.trim()) {
          form.set('sourceContext', sourceContext.trim());
          form.set('sourceType', sourceName ? 'document' : 'notes');
        }
        form.set('audio', voiceFile, voiceFile.name);
        body = form;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          action: 'chat', message: text, history: previous,
          ...(sourceContext.trim() ? { sourceContext: sourceContext.trim(), sourceType: sourceName ? 'document' : 'notes' } : {}),
        });
      }
      const response = await fetch('/api/agent', { method: 'POST', headers, body });
      const result = await readAgentResponse(response, copy.apiUnavailable);
      if (!result.text?.trim()) throw new Error(copy.defaultError);
      const assistantMessage: AgentMessage = {
        id: crypto.randomUUID(), role: 'assistant', content: result.text || copy.defaultError,
        transcript: result.transcript,
        proposals: (result.proposals || []).map(item => ({ ...item, state: 'pending' })),
      };
      setMessages(current => [...current, assistantMessage]);
      setSourceContext('');
      setSourceName('');
      setVoiceFile(null);
    } catch (error) {
      setMessages(current => [...current, {
        id: crypto.randomUUID(), role: 'assistant', content: error instanceof Error ? error.message : copy.defaultError,
      }]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const executeProposal = async (messageId: string, proposal: AgentProposal) => {
    if (!session?.access_token || activeProposal) return;
    setActiveProposal(proposal.token);
    setMessages(current => current.map(item => item.id === messageId
      ? { ...item, proposals: item.proposals?.map(candidate => candidate.token === proposal.token ? { ...candidate, state: 'saving' } : candidate) }
      : item));
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', approvalToken: proposal.token }),
      });
      await readAgentResponse(response, copy.apiUnavailable);
      setMessages(current => current.map(item => item.id === messageId
        ? { ...item, proposals: item.proposals?.map(candidate => candidate.token === proposal.token ? { ...candidate, state: 'done' } : candidate) }
        : item));
      toast.success(copy.applied);
    } catch (error) {
      setMessages(current => current.map(item => item.id === messageId
        ? { ...item, proposals: item.proposals?.map(candidate => candidate.token === proposal.token ? { ...candidate, state: 'error' } : candidate) }
        : item));
      setErrorText(error instanceof Error ? error.message : copy.defaultError);
    } finally {
      setActiveProposal(null);
    }
  };

  const quickPrompts = [
    { icon: <Search size={16} />, label: copy.search, prompt: copy.searchPrompt },
    { icon: <AlertTriangle size={16} />, label: copy.overdue, prompt: copy.overdue },
    { icon: <Users size={16} />, label: copy.workload, prompt: copy.workload },
    { icon: <Activity size={16} />, label: copy.activity, prompt: copy.activity },
    { icon: <Activity size={16} />, label: lang === 'en' ? 'Project health' : 'Sức khỏe project', prompt: copy.healthPrompt },
    { icon: <CheckCircle2 size={16} />, label: lang === 'en' ? 'Related tasks' : 'Task liên quan', prompt: copy.relatedPrompt },
    { icon: <Plus size={16} />, label: copy.newTask, prompt: copy.newTask },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 pb-3">
      <header className="card-hub flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary dark:text-sky-300"><Sparkles size={22} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{copy.title}</h1>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Beta</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{copy.subtitle}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/60 px-3 py-2 text-xs font-medium text-gray-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />{copy.scope}
        </div>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="card-hub rounded-2xl p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white"><Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />{copy.quick}</h2>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {quickPrompts.map(prompt => (
                <button key={prompt.label} type="button" disabled={sending} onClick={() => void sendMessage(prompt.prompt)} className="flex min-h-11 items-center gap-2.5 rounded-xl border border-gray-200/80 bg-white/55 px-3 py-2.5 text-left text-xs font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50/70 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/35 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:bg-sky-950/30">
                  <span className="text-primary dark:text-sky-300">{prompt.icon}</span><span>{prompt.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card-hub rounded-2xl p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">{copy.canDo}</h2>
            <ul className="space-y-3 text-xs leading-relaxed text-gray-600 dark:text-slate-300">
              <li className="flex gap-2.5"><Search size={15} className="mt-0.5 shrink-0 text-blue-600 dark:text-sky-300" />{copy.find}</li>
              <li className="flex gap-2.5"><Clock3 size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />{copy.prioritize}</li>
              <li className="flex gap-2.5"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-300" />{copy.related}</li>
              <li className="flex gap-2.5"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-300" />{copy.health}</li>
              <li className="flex gap-2.5"><Activity size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" />{copy.summaries}</li>
              <li className="flex gap-2.5"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-300" />{copy.draft}</li>
            </ul>
            <p className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/65 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">{copy.approval}</p>
          </section>
        </aside>

        <section className="card-hub flex min-h-[620px] flex-col overflow-hidden rounded-2xl xl:max-h-[calc(100dvh-112px)]">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200/70 px-4 py-3.5 dark:border-slate-700/70 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm dark:bg-blue-700"><Bot size={19} /></span>
              <div><h2 className="text-sm font-bold text-gray-900 dark:text-white">{copy.chatTitle}</h2><span className="text-[11px] text-gray-500 dark:text-gray-400">{copy.ready}</span></div>
            </div>
            {messages.length > 0 && <button type="button" onClick={() => { setMessages([]); setErrorText(''); }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">{lang === 'en' ? 'New chat' : 'Chat mới'}</button>}
          </div>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite" aria-label={copy.chatTitle}>
            {messages.length === 0 && (
              <div className="grid min-h-[300px] place-items-center px-4 py-10 text-center">
                <div className="max-w-md">
                  <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-primary dark:border-blue-900/70 dark:bg-blue-950/35 dark:text-sky-300"><Sparkles size={25} /></div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{copy.emptyTitle}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{copy.emptyText}</p>
                  <Link to="/tasks" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline dark:text-sky-300"><CheckCircle2 size={14} />{copy.taskCreation}</Link>
                </div>
              </div>
            )}

            {messages.map(item => (
              <article key={item.id} className={`flex gap-2.5 sm:gap-3 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {item.role === 'assistant' && <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 text-white dark:bg-blue-700"><Bot size={16} /></span>}
                <div className={`min-w-0 max-w-[88%] rounded-2xl px-3.5 py-3 sm:max-w-[82%] sm:px-4 ${item.role === 'user' ? 'rounded-br-md bg-primary text-white shadow-sm' : 'rounded-bl-md border border-gray-200/80 bg-white/70 text-gray-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100'}`}>
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed"><MessageText text={item.content} /></div>
                  {item.transcript && <div className="mt-3 rounded-xl border border-gray-200/70 bg-gray-50/75 p-3 dark:border-slate-700 dark:bg-slate-950/40"><div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400"><AudioLines size={13} />{copy.transcript}</div><p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-slate-300">{item.transcript}</p></div>}

                  {item.proposals && item.proposals.length > 0 && <div className="mt-3 space-y-2.5">
                    {item.proposals.map(proposal => (
                      <div key={proposal.token} className="rounded-xl border border-blue-200/70 bg-blue-50/60 p-3 dark:border-blue-900/70 dark:bg-blue-950/25">
                        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300"><CheckCircle2 size={13} />{copy.proposal}</div>
                        <p className="text-xs font-medium leading-relaxed text-gray-800 dark:text-slate-100">{proposal.summary}</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <button type="button" disabled={proposal.state === 'done' || proposal.state === 'saving' || Boolean(activeProposal)} onClick={() => void executeProposal(item.id, proposal)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed ${proposal.state === 'done' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-primary text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600'}`}>
                            {proposal.state === 'saving' ? <LoaderCircle size={14} className="animate-spin" /> : proposal.state === 'done' ? <Check size={14} /> : <CheckCircle2 size={14} />}
                            {proposal.state === 'saving' ? copy.applying : proposal.state === 'done' ? copy.applied : copy.approve}
                          </button>
                          {proposal.state === 'error' && <button type="button" onClick={() => void executeProposal(item.id, proposal)} className="min-h-9 rounded-xl px-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40">{copy.retry}</button>}
                        </div>
                      </div>
                    ))}
                  </div>}
                </div>
                {item.role === 'user' && <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Users size={15} /></span>}
              </article>
            ))}
            {sending && <div className="flex items-center gap-2 pl-1 text-xs text-gray-500 dark:text-gray-400"><LoaderCircle size={15} className="animate-spin" />{copy.thinking}</div>}
          </div>

          <div className="border-t border-gray-200/70 bg-white/30 p-3 dark:border-slate-700/70 dark:bg-slate-950/10 sm:p-4">
            {errorText && <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{errorText}</span><button className="ml-auto shrink-0" type="button" onClick={() => setErrorText('')} aria-label={lang === 'en' ? 'Dismiss error' : 'Đóng thông báo lỗi'}><X size={14} /></button></div>}

            {(sourceContext || sourceName || voiceFile) && <div className="mb-3 flex flex-wrap items-center gap-2">
              {sourceName && <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200"><FileText size={13} /><span className="max-w-[180px] truncate">{sourceName}</span><button type="button" onClick={() => { setSourceName(''); setSourceContext(''); }} aria-label={copy.remove}><X size={13} /></button></span>}
              {voiceFile && <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200"><AudioLines size={13} /><span className="max-w-[160px] truncate">{voiceFile.name}</span><span className="text-violet-600 dark:text-violet-300">{formatBytes(voiceFile.size)}</span><button type="button" onClick={() => setVoiceFile(null)} aria-label={copy.remove}><X size={13} /></button></span>}
            </div>}

            <details className="group mb-3 rounded-xl border border-gray-200/80 bg-white/45 dark:border-slate-700 dark:bg-slate-900/30">
              <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-gray-600 marker:hidden dark:text-slate-300"><Paperclip size={14} className="text-primary dark:text-sky-300" />{copy.context}<span className="ml-auto text-[10px] font-normal text-gray-400">{copy.contextHint}</span></summary>
              <textarea value={sourceContext} onChange={event => { setSourceContext(event.target.value); setSourceName(''); }} maxLength={16_000} rows={4} placeholder={copy.contextPlaceholder} aria-label={copy.context} className="w-full resize-y border-0 border-t border-gray-200/70 bg-transparent px-3 py-2.5 text-xs leading-relaxed text-gray-800 outline-none focus:ring-0 dark:border-slate-700 dark:text-slate-100" />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200/60 px-3 py-2 dark:border-slate-700/70">
                <div className="flex gap-2">
                  <button type="button" onClick={() => textFileRef.current?.click()} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"><FileText size={13} />{copy.addFile}</button>
                  <button type="button" onClick={() => audioFileRef.current?.click()} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"><AudioLines size={13} />{copy.addVoice}</button>
                </div>
                <span className="text-[10px] text-gray-400">{sourceContext.length.toLocaleString()} / 16,000</span>
              </div>
            </details>

            <input ref={textFileRef} type="file" accept=".txt,.md,.csv,.json,.log,text/plain,text/markdown,text/csv,application/json" className="hidden" onChange={event => void handleTextFile(event)} />
            <input ref={audioFileRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.flac,.aac" className="hidden" onChange={handleVoiceFile} />

            <form onSubmit={event => { event.preventDefault(); void sendMessage(); }} className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white/80 p-2 shadow-sm transition focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950/45 dark:focus-within:border-sky-800">
              <textarea ref={inputRef} value={message} maxLength={2500} rows={2} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage(); } }} placeholder={copy.userPlaceholder} aria-label={copy.userPlaceholder} className="max-h-36 min-h-[48px] flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm leading-relaxed text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:border-0 focus:ring-0 dark:text-white" />
              <button type="submit" disabled={sending || (!message.trim() && !voiceFile)} aria-label={copy.send} title={copy.send} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-blue-700 dark:hover:bg-blue-600"><ArrowUp size={19} strokeWidth={2.5} /></button>
            </form>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-gray-400"><span>{copy.limit}</span><span>{message.length} / 2,500</span></div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Agents;
