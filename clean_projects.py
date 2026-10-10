import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

# Merge the light and dark button css into .btn-add-new
css = css.replace('.btn-add-new-light', '.btn-add-new')
css = css.replace('.btn-add-new-dark', '.btn-add-new')
# The user's rule says no utility classes in the button. Let's add the layout utilities to the .btn-add-new class
css += """
.btn-add-new {
  @apply flex items-center gap-1 sm:gap-2 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl transition-all shadow-sm flex-shrink-0;
}
"""

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

with open('Dev/src/pages/Projects.tsx', 'r') as f:
    content = f.read()

# Replace the messy button in Projects.tsx with just className="btn-add-new"
content = content.replace('className="flex items-center gap-1 sm:gap-2 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl transition-all shadow-sm flex-shrink-0 btn-add-new-light btn-add-new-dark"', 'className="btn-add-new"')

with open('Dev/src/pages/Projects.tsx', 'w') as f:
    f.write(content)

print("cleaned projects")
