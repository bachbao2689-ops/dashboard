import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

pattern = re.compile(r'/\* Fallback and universal card shape \*/.*?/\* Status-tracked shapes \*/', re.DOTALL)

new_css = """/* Fallback and universal card shape */
div.bg-white.border:is(.rounded-2xl, .rounded-3xl, .rounded-xl.shadow-sm, .rounded-xl:not(input)),
section.bg-white.border,
.glass-panel,
.card-hub {
  background: radial-gradient(circle at 100% 100%, #eff6ff 0%, rgba(239, 246, 255, 0) 50%), #ffffff;
  border-color: #e0eaff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.card-hub, .glass-panel {
  border-width: 1px;
  border-style: solid;
}

.dark div.bg-white.border:is(.rounded-2xl, .rounded-3xl, .rounded-xl.shadow-sm, .rounded-xl:not(input)),
.dark section.bg-white.border,
.dark .glass-panel,
.dark .card-hub {
  background: radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 50%), #0f172a;
  border-color: rgba(59, 130, 246, 0.15);
}

/* Status-tracked shapes */"""

css = pattern.sub(new_css, css)

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

print("Patched.")
