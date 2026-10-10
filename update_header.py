import re
with open('Dev/src/components/layouts/Header.tsx', 'r') as f:
    content = f.read()

# Replace the massive button classes with 'btn-header-dropdown-toggle'
# className={cn( 'fixed left-1/2 top-0 z-[120] flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-b-xl border border-t-0 border-blue-100 bg-white text-primary shadow-md transition-[opacity,transform] duration-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700 md:left-[calc(50%+136px)] motion-reduce:transition-none', ... )}

old_str = "'fixed left-1/2 top-0 z-[120] flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-b-xl border border-t-0 border-blue-100 bg-white text-primary shadow-md transition-[opacity,transform] duration-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700 md:left-[calc(50%+136px)] motion-reduce:transition-none'"
new_str = "'btn-header-dropdown-toggle'"

if old_str in content:
    content = content.replace(old_str, new_str)
    with open('Dev/src/components/layouts/Header.tsx', 'w') as f:
        f.write(content)
    print("Header.tsx updated")
else:
    print("Could not find the string in Header.tsx")
