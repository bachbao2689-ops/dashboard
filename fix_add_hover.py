import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

# Remove the old .btn-add-new-light, .btn-add-new-dark blocks (we previously made them !important)
# Since they are quite messy now, I will just strip them out using regex
css = re.sub(r'html:not\(\.dark\) \.btn-add-new-light.*?\}', '', css, flags=re.DOTALL)
css = re.sub(r'html\.dark \.btn-add-new-dark.*?\}', '', css, flags=re.DOTALL)
css = re.sub(r'\.btn-add-new \{.*?\}', '', css, flags=re.DOTALL)

# Add the new unified block
new_css = """
.btn-add-new {
  @apply flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl transition-all shadow-sm flex-shrink-0;
  @apply bg-primary text-white; /* Matches Report button */
  border: 0 !important;
  outline: 0 !important;
  will-change: box-shadow, transform, background;
  transition: all 0.3s ease !important;
}

/* Light Mode Hover */
html:not(.dark) .btn-add-new:hover {
  background: radial-gradient(100% 100% at 100% 0%, #89E5FF 0%, #5468FF 100%) !important;
  box-shadow: 0px 0.1em 0.2em rgb(45 35 66 / 40%), 0px 0.4em 0.7em -0.1em rgb(45 35 66 / 30%), inset 0px -0.1em 0px #3c4fe0 !important;
  transform: translateY(-2px) !important;
  text-shadow: 0 1px 0 rgb(0 0 0 / 40%) !important;
}

html:not(.dark) .btn-add-new:active {
  background: radial-gradient(100% 100% at 100% 0%, #89E5FF 0%, #5468FF 100%) !important;
  box-shadow: inset 0px 0.1em 0.6em #3c4fe0 !important;
  transform: translateY(0px) !important;
}

/* Dark Mode Hover */
html.dark .btn-add-new:hover {
  background: rgb(0,140,255) !important;
  box-shadow: 0 0 5px rgb(0,140,255),
              0 0 25px rgb(0,140,255),
              0 0 50px rgb(0,140,255),
              0 0 100px rgb(0,140,255) !important;
  transform: translateY(-2px) !important;
}

html.dark .btn-add-new:active {
  box-shadow: 0 0 15px rgb(0,140,255) !important;
  transform: translateY(0px) !important;
}
"""

css += new_css

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# Replace <Plus className="w-4 h-4" /> with <FolderKanban className="w-4 h-4" /> inside the btn-add-new
content = re.sub(r'<button([^>]+)className="btn-add-new">.*?<span>', r'<button\1className="btn-add-new"><FolderKanban className="w-4 h-4" /><span>', content)

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("fixed add hover")
