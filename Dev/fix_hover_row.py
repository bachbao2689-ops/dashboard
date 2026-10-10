import re

css = """
html:not(.dark) .hover-row-effect:hover {
  background-color: #ffffff !important;
  outline: 1px solid rgba(59, 130, 246, 0.25) !important;
  box-shadow: 0 8px 30px -10px rgba(59, 130, 246, 0.15), 0 -8px 30px -10px rgba(59, 130, 246, 0.15) !important;
  transform: scale(1); /* Forces a stacking context so shadow renders above other rows */
  z-index: 10;
}
"""

with open('src/index.css', 'a') as f:
    f.write(css)

# Inject into CampaignPanel.tsx
with open('src/components/features/projects/CampaignPanel.tsx', 'r') as f:
    c = f.read()
c = c.replace('className={`group border-t border-gray-100 dark:border-slate-800 hover:bg-primary/5 transition-all duration-300 ${onSelect',
              'className={`group border-t border-gray-100 dark:border-slate-800 hover-row-effect hover:bg-primary/5 transition-all duration-300 ${onSelect')
with open('src/components/features/projects/CampaignPanel.tsx', 'w') as f:
    f.write(c)

# Inject into Projects.tsx
with open('src/pages/Projects.tsx', 'r') as f:
    c = f.read()
c = c.replace('className={`group border-t border-gray-100 dark:border-slate-800 cursor-pointer hover:bg-primary/5 transition-all duration-300 ${deletingIds',
              'className={`group border-t border-gray-100 dark:border-slate-800 cursor-pointer hover-row-effect hover:bg-primary/5 transition-all duration-300 ${deletingIds')
with open('src/pages/Projects.tsx', 'w') as f:
    f.write(c)

print("added hover row effect")
