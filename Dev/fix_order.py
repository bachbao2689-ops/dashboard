with open('src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Remove the incorrectly placed activeFiltersCount
content = content.replace("  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;\n", "")

# Add it after setFilters
content = content.replace("  });\n", "  });\n\n  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;\n")

with open('src/pages/TaskList.tsx', 'w') as f:
    f.write(content)

print("fixed order")
