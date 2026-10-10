import re
with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Let's count active filters
count_logic = """
  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;
"""
content = content.replace("const [showFilters, setShowFilters] = useState(false);", "const [showFilters, setShowFilters] = useState(false);\n" + count_logic)

# Add badge to button
old_btn = r'<button onClick=\{\(\) => setShowFilters\(!showFilters\)\} className=\{`flex items-center space-x-2 border px-4 py-2\.5 rounded-xl transition-colors \$\{showFilters \? \'bg-primary text-white border-primary shadow-sm\' : \'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700\'\}`\}>\n\s*<Filter className="w-4 h-4" />\n\s*<span className="text-sm font-medium">Filters</span>\n\s*</button>'

new_btn = """<button onClick={() => setShowFilters(!showFilters)} className={`flex items-center space-x-2 border px-4 py-2.5 rounded-xl transition-colors ${(showFilters || activeFiltersCount > 0) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              {activeFiltersCount > 0 && <span className="ml-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-white text-primary rounded-full">{activeFiltersCount}</span>}
            </button>"""

content = re.sub(old_btn, new_btn, content)

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)

print("fixed filter badge")
