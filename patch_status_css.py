import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

pattern = re.compile(r'/\* Status-tracked shapes \*/.*?\.dark \.card-status-task \{[^}]+\}', re.DOTALL)

new_css = """/* Status-tracked shapes */
.card-status-task {
  background: radial-gradient(circle at 100% 100%, #eff6ff 0%, rgba(239, 246, 255, 0) 50%), #ffffff !important;
  border: 1px solid #bfdbfe !important;
  border-radius: 16px !important;
}
.dark .card-status-task {
  background: radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 50%), #0f172a !important;
  border-color: rgba(59, 130, 246, 0.2) !important;
}"""

css = pattern.sub(new_css, css)

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

print("Patched status.")
