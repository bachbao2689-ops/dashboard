import re
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# I will replace the hardcoded border classes in the subtask wrapper with a conditional
# We have two places (projectSubtasks and campaignSubtasks).

def replace_class(match):
    prefix = match.group(1)
    suffix = match.group(2)
    # the existing class logic has deletingIds, we can add the done logic
    # The condition will be `['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 bg-white/50 dark:bg-slate-900/50 dark:hover:border-slate-700'`
    
    # original had: border border-gray-200 dark:border-slate-700 hover:border-gray-300 bg-white/50 dark:bg-slate-900/50 dark:hover:border-slate-700
    new_class = """group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border transition-all duration-300 text-sm cursor-pointer ${deletingIds.includes(s.id) ? "animate-fade-out" : ""} ${['done', 'complete', 'completed'].includes((s.status || '').toLowerCase()) ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 bg-white/50 dark:bg-slate-900/50 dark:hover:border-slate-700'}"""
    return prefix + new_class + suffix

pattern = re.compile(r'(<div key={s\.id} className={`)group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-gray-300 bg-white/50 dark:bg-slate-900/50 dark:hover:border-slate-700 transition-all duration-300 text-sm cursor-pointer \$\{deletingIds\.includes\(s\.id\) \? "animate-fade-out" : ""\}(`} onClick=\{.*?setSelectedSubtask\(s\)\}>)')

content = pattern.sub(replace_class, content)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("patched subtask border")
