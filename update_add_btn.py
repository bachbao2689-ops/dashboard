import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

btn_css = """
html:not(.dark) .btn-add-new-light {
  will-change: box-shadow, transform;
  background: radial-gradient(100% 100% at 100% 0%, #89E5FF 0%, #5468FF 100%);
  box-shadow: 0px 0.01em 0.01em rgb(45 35 66 / 40%), 0px 0.3em 0.7em -0.01em rgb(45 35 66 / 30%), inset 0px -0.01em 0px rgb(58 65 111 / 50%);
  color: #fff;
  text-shadow: 0 1px 0 rgb(0 0 0 / 40%);
  transition: box-shadow 0.15s ease, transform 0.15s ease;
  border: 0;
  outline: 0;
}

html:not(.dark) .btn-add-new-light:hover {
  box-shadow: 0px 0.1em 0.2em rgb(45 35 66 / 40%), 0px 0.4em 0.7em -0.1em rgb(45 35 66 / 30%), inset 0px -0.1em 0px #3c4fe0;
  transform: translateY(-0.1em);
}

html:not(.dark) .btn-add-new-light:active {
  box-shadow: inset 0px 0.1em 0.6em #3c4fe0;
  transform: translateY(0em);
}
"""

if "btn-add-new-light" not in css:
    css += "\n" + btn_css

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

# Update Projects.tsx
with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# Replace bg-[#002e6d] hover:bg-[#001f4d] with btn-add-new-light dark:bg-[#002e6d] dark:hover:bg-[#001f4d]
content = content.replace(
    'className="flex items-center gap-1 sm:gap-2 bg-[#002e6d] text-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl hover:bg-[#001f4d] transition-colors shadow-sm flex-shrink-0"',
    'className="flex items-center gap-1 sm:gap-2 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl transition-all shadow-sm flex-shrink-0 btn-add-new-light dark:bg-[#002e6d] dark:hover:bg-[#001f4d]"'
)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("updated button")
