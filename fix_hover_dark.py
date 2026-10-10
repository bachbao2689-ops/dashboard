import re
with open('Dev/src/index.css', 'r') as f:
    css = f.read()

dark_css = """
html.dark .hover-row-effect:hover {
  background-color: #0f172a !important; /* deep slate */
  background-image: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 100%) !important;
  outline: 1px solid rgba(59, 130, 246, 0.4) !important;
  box-shadow: 0 8px 30px -10px rgba(59, 130, 246, 0.25), 0 -8px 30px -10px rgba(59, 130, 246, 0.25) !important;
  transform: scale(1);
  position: relative;
  z-index: 10;
}
"""

css += dark_css

with open('Dev/src/index.css', 'w') as f:
    f.write(css)

print("added dark mode hover")
