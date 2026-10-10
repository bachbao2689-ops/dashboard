import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

# First, let's remove the existing hover-row-effect blocks (base, light, dark).
css = re.sub(r'\.hover-row-effect\s*\{.*?\}', '', css, flags=re.DOTALL)
css = re.sub(r'html:not\(\.dark\)\s*\.hover-row-effect:hover\s*\{.*?\}', '', css, flags=re.DOTALL)
css = re.sub(r'html\.dark\s*\.hover-row-effect:hover\s*\{.*?\}', '', css, flags=re.DOTALL)

new_hover_css = """
.hover-row-effect {
  --row-glow-color: 59, 130, 246; /* default blue for tasks */
  outline: 1px solid transparent !important;
}
.hover-row-campaign {
  --row-glow-color: 245, 158, 11; /* amber-500 */
}
.hover-row-project {
  --row-glow-color: 139, 92, 246; /* violet-500 */
}

/* Light mode hover row */
html:not(.dark) .hover-row-effect:hover {
  background-color: #ffffff !important;
  outline: 1px solid rgba(var(--row-glow-color), 0.25) !important;
  box-shadow: 0 8px 30px -10px rgba(var(--row-glow-color), 0.15), 0 -8px 30px -10px rgba(var(--row-glow-color), 0.15) !important;
  transform: scale(1);
  position: relative;
  z-index: 10;
}

/* Dark mode hover row */
html.dark .hover-row-effect:hover {
  background-color: #0f172a !important; /* deep slate */
  background-image: radial-gradient(circle at 50% 50%, rgba(var(--row-glow-color), 0.15) 0%, rgba(var(--row-glow-color), 0) 100%) !important;
  outline: 1px solid rgba(var(--row-glow-color), 0.4) !important;
  box-shadow: 0 8px 30px -10px rgba(var(--row-glow-color), 0.25), 0 -8px 30px -10px rgba(var(--row-glow-color), 0.25) !important;
  transform: scale(1);
  position: relative;
  z-index: 10;
}
"""

css += new_hover_css

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

print("rewrote hover css with vars")
