import re

with open("Dashboard new/app.js", "r") as f:
    js = f.read()

# 1. Update renderTeam mapping logic
old_renderTeam_loop = r"""for(const \[dept, members\] of Object\.entries\(depts\)\.sort\(\(a,b\)=>a\[0\]\.localeCompare\(b\[0\]\)\)\) \{
    members\.sort\(\(a,b\)=>\{
      const aL=/(lead|leader|manager)/i\.test\(a\.role\)?1:0;
      const bL=/(lead|leader|manager)/i\.test\(b\.role\)?1:0;
      if\(aL !== bL\) return bL - aL;
      return \(staffTaskMap\[normalize\(b\.pic\)\]\|\|0\) - \(staffTaskMap\[normalize\(a\.pic\)\]\|\|0\);
    \}\);
    html \+= `<div class="team-group">
      <button class="team-group-header" onclick="toggleTeamList\(this\)" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 0;background:none;border:none;border-bottom:1px solid var\(--line\);cursor:pointer;font-weight:700;color:var\(--text\);font-size:12px;text-transform:uppercase;">
        <span>\$\{esc\(dept\)\} <span style="color:var\(--muted\);font-weight:400">\(\$\{members\.length\}\)</span></span>
        <svg class="team-chev".*?</svg>
      </button>
      <div class="team-group-list" style="padding-top:8px;padding-bottom:12px;">
        \$\{members\.map\(p => \{
          const open = staffTaskMap\[normalize\(p\.pic\)\] \|\| 0;
          return `<button class="team-row" data-select-person="\$\{esc\(p\.pic\)\}">\$\{avatar\(p\)\}<span class="team-name"><strong>\$\{esc\(p\.pic\|\|p\.name\)\}</strong><small>\$\{esc\(p\.jobTitle\|\|p\.role\|\|'Thành viên'\)\}</small></span><span class="team-count">\$\{num\(open\)\}<small>mở</small></span></button>`;
        \}\)\.join\(''\)\}
      </div>
    </div>`;
  \}"""

new_renderTeam_loop = r"""for(const [dept, members] of Object.entries(depts).sort((a,b)=>a[0].localeCompare(b[0]))) {
    const grouped=new Map();
    for(const person of members){const key=normalize(person.pic||person.email||person.name);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(person);}
    const uniqueMembers=[...grouped.values()].map(group=>({person:group.find(p=>/lead|leader|manager|trưởng|quản lý/i.test(p.role))||group[0],count:group.length}));
    uniqueMembers.sort((a,b)=>{
       const aL=/(lead|leader|manager)/i.test(a.person.role)?1:0;
       const bL=/(lead|leader|manager)/i.test(b.person.role)?1:0;
       if(aL !== bL) return bL - aL;
       return (staffTaskMap[normalize(b.person.pic)]||0) - (staffTaskMap[normalize(a.person.pic)]||0);
    });
    html += `<div class="team-group">
      <button class="team-group-header" onclick="toggleTeamList(this)" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 0;background:none;border:none;border-bottom:1px solid var(--line);cursor:pointer;font-weight:700;color:var(--text);font-size:12px;text-transform:uppercase;">
        <span>${esc(dept)} <span style="color:var(--muted);font-weight:400">(${uniqueMembers.length} PIC)</span></span>
        <svg class="team-chev" style="transition:transform 0.2s" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="team-group-list" style="padding-top:8px;padding-bottom:12px;">
        ${uniqueMembers.map(({person:p,count}) => {
          const open = staffTaskMap[normalize(p.pic)] || 0;
          return `<button class="team-row" data-select-person="${esc(p.pic)}">${avatar(p)}<span class="team-name"><strong>${esc(p.pic||p.name)}</strong><small>${count>1?esc(count+' hồ sơ · workload PIC chung'):esc(p.jobTitle||p.role||'Thành viên')}</small></span><span class="team-count">${num(open)}<small>mở</small></span></button>`;
        }).join('')}
      </div>
    </div>`;
  }"""

js = re.sub(old_renderTeam_loop, new_renderTeam_loop, js, flags=re.DOTALL)

# 2. Remove Quét QR button
old_qr_btn = r"""<button class="text-button" onclick="openAssetScanner\(\)">\$\{icon\('camera'\)\} Quét QR</button>"""
js = re.sub(old_qr_btn, "", js)

# 3. Update asset modal copy QR action to just an icon
old_copy_qr = r"""<button type="button" class="icon-button" onclick="copyAssetLink\('\$\{esc\(a\.id\|\|a\.key\)\}'\)" title="Copy link thiết bị">\$\{icon\('copy'\)\} Copy Link QR</button>"""
new_copy_qr = r"""<button type="button" class="icon-button" onclick="copyAssetLink('${esc(a.id||a.key)}')" title="Copy link thiết bị">${icon('copy')}</button>"""
js = re.sub(old_copy_qr, new_copy_qr, js)

with open("Dashboard new/app.js", "w") as f:
    f.write(js)
print("Updated app.js")
