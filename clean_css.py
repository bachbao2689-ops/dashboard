import re

with open('Dev/src/index.css', 'r') as f:
    css = f.read()

# Let's just find the string block we want to KEEP and replace the rest
# Actually I'll use sed to delete lines 362 to 392 (where the old rules are based on the diff).
