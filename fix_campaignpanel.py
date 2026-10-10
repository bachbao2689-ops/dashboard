import re

with open('Dev/src/components/features/projects/CampaignPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "className={`group border-t border-gray-100 dark:border-slate-800 hover:bg-primary/5 ${onSelect ? 'cursor-pointer' : ''}`}",
    "className={`group border-t border-gray-100 dark:border-slate-800 hover:bg-primary/5 transition-all duration-300 ${onSelect ? 'cursor-pointer' : ''} ${deletingIds.includes(c.id) ? 'animate-fade-out' : ''}`}"
)

with open('Dev/src/components/features/projects/CampaignPanel.tsx', 'w') as f:
    f.write(content)
