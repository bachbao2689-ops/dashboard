import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

# I will recreate the block entirely to be clean.
pattern = re.compile(r'/\* Colored Drawer Styles \*/.*?@keyframes slideUpFade', re.DOTALL)

new_block = """/* Colored Drawer Styles */
.shadow-drawer-campaign {
  border-left: 1px solid rgba(245, 158, 11, 0.25) !important;
  box-shadow: -15px 0 40px -10px rgba(245, 158, 11, 0.12) !important;
}
.shadow-drawer-project {
  border-left: 1px solid rgba(139, 92, 246, 0.25) !important;
  box-shadow: -15px 0 40px -10px rgba(139, 92, 246, 0.12) !important;
}
.shadow-drawer-task {
  border-left: 1px solid rgba(59, 130, 246, 0.25) !important;
  box-shadow: -15px 0 40px -10px rgba(59, 130, 246, 0.12) !important;
}
.shadow-drawer-subtask {
  border-left: 1px solid rgba(16, 185, 129, 0.25) !important;
  box-shadow: -15px 0 40px -10px rgba(16, 185, 129, 0.12) !important;
}

.dark .shadow-drawer-campaign {
  box-shadow: -15px 0 40px -10px rgba(245, 158, 11, 0.25) !important;
  background-image: radial-gradient(circle at 20% 90%, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0) 70%) !important;
}
.dark .shadow-drawer-project {
  box-shadow: -15px 0 40px -10px rgba(139, 92, 246, 0.25) !important;
  background-image: radial-gradient(circle at 20% 90%, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0) 70%) !important;
}
.dark .shadow-drawer-task {
  box-shadow: -15px 0 40px -10px rgba(59, 130, 246, 0.25) !important;
  background-image: radial-gradient(circle at 20% 90%, rgba(59, 130, 246, 0.18) 0%, rgba(59, 130, 246, 0) 70%) !important;
}
.dark .shadow-drawer-subtask {
  box-shadow: -15px 0 40px -10px rgba(16, 185, 129, 0.25) !important;
  background-image: radial-gradient(circle at 20% 90%, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0) 70%) !important;
}

@keyframes slideUpFade"""

css = pattern.sub(new_block, css)

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

print("Fixed drawer styles.")
