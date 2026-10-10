with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

old_str = '{subtaskCommentCounts[s.id] > 0 && <span title={`${subtaskCommentCounts[s.id]} bình luận`} className="inline-flex items-center gap-1 text-xs text-primary"><MessageSquare size={13}/>{subtaskCommentCounts[s.id]}</span>}'
new_str = '{subtaskCommentCounts[s.id] > 0 && <span title={`${subtaskCommentCounts[s.id]} bình luận`} className="inline-flex items-center gap-1 text-xs text-primary"><span className="relative inline-flex"><MessageSquare size={13}/><span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm border border-white dark:border-slate-900"></span></span>{subtaskCommentCounts[s.id]}</span>}'

content = content.replace(old_str, new_str)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("patched subtask chat")
