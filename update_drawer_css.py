import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

pattern = re.compile(r'/\* Colored Drawer Shadows \*/.*?(?=\n\n@keyframes)', re.DOTALL)

new_css = """/* Colored Drawer Styles */
.shadow-drawer-campaign {
  border-left: 1px solid rgba(245, 158, 11, 0.25) !important;
  box-shadow: -15px 0 40px -10px rgba(245, 158, 11, 0.12) !important;
  background-image: radial-gradient(circle at 20% 90%, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0) 70%) !important;
}
.shadow-drawer-project {
  border-left: 1px solid rgba(139, 92, 246, 0.25) !important;
  box-shadow: -15px 0 40px -10px rgba(139, 92, 246, 0.12) !important;
  background-image: radial-gradient(circle at 20% 90%, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0) 70%) !important;
}
.shadow-drawer-task {
  border-left: 1px solid rgba(59, 130, 246, 0.25) !important;
  box-shadow: -15px 0 40px -10px rgba(59, 130, 246, 0.12) !important;
  background-image: radial-gradient(circle at 20% 90%, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 70%) !important;
}
.shadow-drawer-subtask {
  border-left: 1px solid rgba(16, 185, 129, 0.25) !important;
  box-shadow: -15px 0 40px -10px rgba(16, 185, 129, 0.12) !important;
  background-image: radial-gradient(circle at 20% 90%, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%) !important;
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
}"""

css = pattern.sub(new_css, css)

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

print("Updated drawer css.")
