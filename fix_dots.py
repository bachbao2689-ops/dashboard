import re
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# Fix Project Chat Icon
old_proj_chat = r'\{hasComments\[project\.id\] && <span title="Có thông báo mới" className="relative inline-flex"><MessageSquare size=\{14\} className="text-blue-500" /><span className="absolute -top-0\.5 -right-0\.5 w-1\.5 h-1\.5 bg-red-500 rounded-full shadow-sm"></span></span>\}'

new_proj_chat = r'{hasComments[project.id] && <span title="Có bình luận" className="relative inline-flex"><MessageSquare size={14} className="text-blue-500" />{Number(project.lead_id) === Number(profile?.id) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></span>}</span>}'

content = re.sub(old_proj_chat, new_proj_chat, content)


# Fix Subtask Chat Icon
old_subtask_chat = r'\{subtaskCommentCounts\[s\.id\] > 0 && <span title="\{`\$\{subtaskCommentCounts\[s\.id\]\} bình luận`\}" className="inline-flex items-center gap-1 text-xs text-primary"><span className="relative inline-flex"><MessageSquare size=\{13\}/><span className="absolute -top-0\.5 -right-0\.5 w-1\.5 h-1\.5 bg-red-500 rounded-full shadow-sm border border-white dark:border-slate-900"></span></span>\{subtaskCommentCounts\[s\.id\]\}</span>\}'

new_subtask_chat = r'{subtaskCommentCounts[s.id] > 0 && <span title={`${subtaskCommentCounts[s.id]} bình luận`} className="inline-flex items-center gap-1 text-xs text-primary"><span className="relative inline-flex"><MessageSquare size={13}/>{Number(s.assignee_id) === Number(profile?.id) && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm border border-white dark:border-slate-900"></span>}</span>{subtaskCommentCounts[s.id]}</span>}'

content = content.replace(
    '{subtaskCommentCounts[s.id] > 0 && <span title={`${subtaskCommentCounts[s.id]} bình luận`} className="inline-flex items-center gap-1 text-xs text-primary"><span className="relative inline-flex"><MessageSquare size={13}/><span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm border border-white dark:border-slate-900"></span></span>{subtaskCommentCounts[s.id]}</span>}',
    new_subtask_chat
)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("fixed dots")
