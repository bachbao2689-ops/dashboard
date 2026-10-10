with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Remove ALL instances of activeFiltersCount
import re
content = re.sub(r'\s*const activeFiltersCount = Object\.values\(filters\)\.filter\(v => v !== \'all\'\)\.length;\n', '', content)

# Inject it ONCE right after the specific filters useState
target = r"const \[filters, setFilters\] = useState\(\{ \n    status: searchParams\.get\('status'\) \|\| 'all', \n    priority: searchParams\.get\('priority'\) \|\| 'all',\n    assignee: searchParams\.get\('assignee'\) \|\| 'all'\n  \}\);"

if "useState({" in content:
    content = content.replace("  });\n\n  const profileId", "  });\n\n  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;\n\n  const profileId")

with open('src/pages/TaskList.tsx', 'w') as f:
    f.write(content)
