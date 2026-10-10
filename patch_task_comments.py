import re

with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'r') as f:
    content = f.read()

# Add onKeyDown to textarea
content = content.replace(
    'onChange={event => setCommentText(event.target.value)} rows={3}',
    'onChange={event => setCommentText(event.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (e.nativeEvent.isComposing) return; if (commentText.trim()) void addComment(); } }} rows={3}'
)

content = content.replace(
    'className={`flex gap-3 ${isMe ? \'flex-row-reverse\' : \'flex-row\'} items-end`}',
    'className={`flex gap-3 ${isMe ? \'flex-row-reverse\' : \'flex-row\'} items-end animate-slide-up`}'
)

with open('Dev/src/components/features/tasks/TaskDetailPanel.tsx', 'w') as f:
    f.write(content)
