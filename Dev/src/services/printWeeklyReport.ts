import { entryDone, reportBreakdown, reportMetrics, safeReportUrl, type ReportSnapshot } from '../lib/executiveWeeklyReport.ts';
import { reportCopy } from '../components/features/reports/reportCopy.ts';
import { taskDay } from '../lib/taskTracking.ts';

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

export function weeklyReportPrintHtml(snapshot: ReportSnapshot, lang: 'vi' | 'en', submitted: boolean) {
  const c = reportCopy[lang], metrics = reportMetrics(snapshot.entries, [taskDay(snapshot.capturedAt), snapshot.weekEnd].sort()[0]);
  const notes = [[c.summary, snapshot.notes.summary], [c.decisions, snapshot.notes.decisions], [c.nextWeek, snapshot.notes.nextWeek]];
  const table = (title: string, dimension: 'channel' | 'member') => `<section><h2>${escape(title)}</h2><table><thead><tr><th>${escape(dimension === 'member' ? c.byMember : c.channel)}</th><th>${escape(c.done)}</th><th>${escape(c.doing)}</th><th>${escape(c.pending)}</th><th>${escape(c.total)}</th></tr></thead><tbody>${reportBreakdown(snapshot.entries, dimension, dimension === 'member' ? c.unassigned : c.noChannel).map(group => `<tr><td>${escape(group.name)}</td><td>${group.done}</td><td>${group.doing}</td><td>${group.pending}</td><td>${group.total}</td></tr>`).join('')}</tbody></table></section>`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="UTF-8"><title>${escape(c.title)} · ${escape(snapshot.departmentName)} · ${escape(snapshot.weekStart)}</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#123154;margin:0;background:#fff}h1{font-size:25px;margin:8px 0}h2{font-size:16px;margin:22px 0 10px}h3{font-size:13px;margin:8px 0}p{white-space:pre-wrap;overflow-wrap:anywhere}header{border-bottom:2px solid #002e6d;padding-bottom:14px}.muted{color:#64748b}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 0}.kpi{padding:12px;background:#f0f6ff;border-radius:10px}.kpi b{display:block;font-size:26px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0}th{background:#f0f6ff}tr,figure{break-inside:avoid}section{margin-bottom:18px}.gallery{break-before:page}.item{border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:12px 0;break-inside:auto}.evidence{display:grid;grid-template-columns:1fr 1fr;gap:10px}figure{margin:0;padding:8px;background:#f8fafc}img{max-width:100%;max-height:250px;object-fit:contain}a{color:#002e6d;overflow-wrap:anywhere}button{border:0;border-radius:9px;background:#002e6d;color:#fff;padding:10px 20px;cursor:pointer}.toolbar{position:sticky;top:0;background:#fff;padding:12px 0;border-bottom:1px solid #ddd;margin-bottom:12px}@media print{.toolbar{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}a{text-decoration:none}}
    </style></head><body><div class="toolbar"><button id="print">${escape(c.print)}</button> <span class="muted">${escape(c.printHint)}</span></div><header><div>K COFFEE · ${escape(snapshot.departmentName)}</div><h1>${escape(c.title)}</h1><div>${escape(snapshot.weekStart)} – ${escape(snapshot.weekEnd)} · ${escape(submitted ? c.snapshot : c.live)}</div><div class="muted">${escape(snapshot.authorName)} · ${escape(new Date(snapshot.capturedAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB'))}</div></header>
    <div class="kpis">${[[c.total, metrics.total], [c.done, metrics.done], [c.doing, metrics.doing], [c.pending, metrics.pending]].map(([label, count]) => `<div class="kpi"><span>${escape(label)}</span><b>${count}</b></div>`).join('')}</div>
    <p>${escape(c.completion)}: ${metrics.completion}% · ${escape(c.reported)}: ${metrics.reported}/${metrics.total}</p>
    ${notes.filter(([, text]) => text).map(([title, text]) => `<section><h2>${escape(title)}</h2><p>${escape(text)}</p></section>`).join('')}
    <section><h2>${escape(c.outputs)}</h2><p>${Object.entries(metrics.outputTotals).filter(([, n]) => n > 0).map(([unit, count]) => `${count} ${escape(c[unit as 'image'])}`).join(' · ') || escape(c.missingEvidence)}</p></section>
    ${table(c.byChannel, 'channel')}${table(c.byMember, 'member')}
    <section class="gallery"><h2>${escape(c.gallery)}</h2>${snapshot.entries.map(entry => `<article class="item"><div class="muted">${escape(entry.parentName || c.standalone)} · ${escape(entry.memberName || c.unassigned)}</div><h3>${escape(entry.title)}</h3><p class="muted">${escape(entry.completedAfterPeriod ? c.openAtCutoff : entryDone(entry) ? c.done : entry.status)}${entry.dueDate ? ` · ${escape(c.due)}: ${escape(entry.dueDate)}` : ''}</p><p>${escape(entry.body || c.noResult)}</p>${entry.blocker ? `<p>${escape(c.blocker)}: ${escape(entry.blocker)}</p>` : ''}${entry.nextStep ? `<p>${escape(c.nextStep)}: ${escape(entry.nextStep)}</p>` : ''}<div class="evidence">${entry.outputs.map(output => {
      const url = safeReportUrl(output.url);
      return `<figure>${output.kind === 'image' && url ? `<img loading="eager" src="${escape(url)}" alt="${escape(output.name)}">` : ''}<figcaption>${escape(output.name)}${output.quantity ? ` · ${output.quantity} ${escape(c[output.unit])}` : ''}${url ? `<br><a target="_blank" rel="noreferrer" href="${escape(url)}">${escape(c.openEvidence)}</a>` : ''}</figcaption></figure>`;
    }).join('')}</div></article>`).join('')}</section></body></html>`;
}

export function printWeeklyReport(snapshot: ReportSnapshot, lang: 'vi' | 'en', submitted: boolean) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error(reportCopy[lang].printUnavailable);
  popup.opener = null;
  popup.document.open(); popup.document.write(weeklyReportPrintHtml(snapshot, lang, submitted)); popup.document.close();
  popup.document.getElementById('print')?.addEventListener('click', () => popup.print());
  // Let the reader review the captured report and its evidence before opening the system print dialog.
  popup.focus();
}
