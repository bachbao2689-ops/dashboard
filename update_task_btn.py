import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

task_btn_css = """
html:not(.dark) .btn-new-task-light {
  border-radius: 100px;
  background-color: #2ba8fb;
  color: #ffffff;
  font-weight: bold;
  transition: all 0.5s;
  border: 0;
}

html:not(.dark) .btn-new-task-light:hover {
  background-color: #6fc5ff;
  box-shadow: 0 0 20px #6fc5ff50;
  transform: scale(1.05); /* 1.1 might be too big for our UI, but I'll stick close. Let's use 1.05 so it doesn't break layout too much */
}

html:not(.dark) .btn-new-task-light:active {
  background-color: #3d94cf;
  transition: all 0.25s;
  box-shadow: none;
  transform: scale(0.98);
}
"""

if "btn-new-task-light" not in css:
    css += "\n" + task_btn_css

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

with open('Dev/src/pages/TaskList.tsx', 'r') as f:
    content = f.read()

# Replace bg-primary text-white ... hover:bg-primary/90 with btn-new-task-light dark:bg-primary dark:text-white dark:hover:bg-primary/90
# The button in TaskList is:
# className="flex items-center space-x-1 sm:space-x-2 bg-primary text-white px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm flex-shrink-0"
content = content.replace(
    'className="flex items-center space-x-1 sm:space-x-2 bg-primary text-white px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm flex-shrink-0"',
    'className="flex items-center space-x-1 sm:space-x-2 text-white px-2.5 py-1.5 sm:px-4 sm:py-2.5 transition-all shadow-sm flex-shrink-0 btn-new-task-light dark:bg-primary dark:rounded-xl dark:hover:bg-primary/90"'
)

with open('Dev/src/pages/TaskList.tsx', 'w') as f:
    f.write(content)

print("updated task button")
