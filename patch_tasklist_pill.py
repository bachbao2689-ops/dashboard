import re
with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Replace the plain text with pills in the table
old_td = r"<td className=\"p-4 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell\">\{task\.project\?\.name \|\| '--\-'\}</td>"
new_td = """<td className="p-4 text-sm hidden lg:table-cell">
                          {task.project?.name ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 line-clamp-1">{task.project.name}</span>
                          ) : task.campaign?.name ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 line-clamp-1">{task.campaign.name}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">---</span>
                          )}
                        </td>"""

content = re.sub(old_td, new_td, content)

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)

print("patched tasklist pill")
