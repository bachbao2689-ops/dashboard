import re
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# For Project chat icon
old_proj_chat = r'\{hasComments\[project\.id\] && <span title="Có bình luận"><MessageSquare size=\{14\} className="text-blue-500" /></span>\}'
new_proj_chat = r'{hasComments[project.id] && <span title="Có thông báo mới" className="relative inline-flex"><MessageSquare size={14} className="text-blue-500" /><span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></span></span>}'
content = re.sub(old_proj_chat, new_proj_chat, content)

# For Subtask chat icon
old_subtask_chat = r'\{subtaskCommentCounts\[s\.id\] > 0 && <span title="\{`\$\{subtaskCommentCounts\[s\.id\]\} bình luận`\}" className="inline-flex items-center gap-1 text-xs text-primary"><MessageSquare size=\{13\}/>\{subtaskCommentCounts\[s\.id\]\}</span>\}'
new_subtask_chat = r'{subtaskCommentCounts[s.id] > 0 && <span title={`${subtaskCommentCounts[s.id]} bình luận`} className="relative inline-flex items-center gap-1 text-xs text-primary"><span className="relative inline-flex"><MessageSquare size={13}/><span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm"></span></span>{subtaskCommentCounts[s.id]}</span>}'
content = re.sub(old_subtask_chat, new_subtask_chat, content)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("patched chat dots")
