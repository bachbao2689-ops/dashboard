with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Let's find "const [filters, setFilters] = useState({"
idx = content.find("const [filters, setFilters] = useState({")
if idx != -1:
    end_idx = content.find("  });", idx)
    if end_idx != -1:
        insert_pos = end_idx + 5
        content = content[:insert_pos] + "\n  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;\n" + content[insert_pos:]

with open('src/pages/TaskList.tsx', 'w') as f:
    f.write(content)
