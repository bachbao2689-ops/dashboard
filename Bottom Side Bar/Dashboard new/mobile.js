// Mobile-only presentation controls. Data, desktop layout and actions remain shared.
(() => {
  const mobile = matchMedia('(max-width: 720px)');
  const nav = document.getElementById('mobile-nav');
  const toggles = [];
  function addToggle(host, target, label, initiallyOpen = false) {
    if (!host || !target) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'mobile-disclosure';
    button.setAttribute('aria-controls', target.id);
    let open = initiallyOpen;
    const sync = () => {
      target.classList.toggle('mobile-collapsed', !open);
      button.setAttribute('aria-expanded', String(!mobile.matches || open));
      button.textContent = `${label} ${open ? '−' : '+'}`;
    };
    button.addEventListener('click', () => { open = !open; sync(); });
    host.append(button); toggles.push(sync); sync();
  }
  addToggle(document.querySelector('.context-bar'), document.getElementById('filter-bar'), 'Bộ lọc');
  addToggle(document.querySelector('.activity-panel .panel-heading'), document.getElementById('activity-content'), 'Lịch sử');
  addToggle(document.querySelector('.team-panel .panel-heading'), document.getElementById('team-content'), 'Đội ngũ');
  mobile.addEventListener('change', () => toggles.forEach(sync => sync()));
  nav.addEventListener('click', e => {
    if(e.target.closest('[data-view]')) requestAnimationFrame(() => window.scrollTo({top:0,behavior:'instant'}));
  });
  // Hide the dock and its blur together on downward scroll; restore upward.
  const navMask = document.querySelector('.mobile-nav-mask');
  const setNavHidden = hidden => {
    nav.classList.toggle('nav-scroll-hidden', hidden);
    navMask?.classList.toggle('nav-scroll-hidden', hidden);
  };
  let lastY = Math.max(0, window.scrollY), travel = 0;
  window.addEventListener('scroll', () => {
    const y = Math.max(0, window.scrollY), delta = y - lastY;
    if (!mobile.matches || y <= 20) {
      setNavHidden(false); travel = 0;
    } else {
      if (delta && Math.sign(delta) !== Math.sign(travel)) travel = 0;
      travel += delta;
      if (travel > 15 && y > 60) { setNavHidden(true); travel = 0; }
      else if (travel < -15) { setNavHidden(false); travel = 0; }
    }
    lastY = y;
  }, {passive:true});
  nav.addEventListener('focusin', () => setNavHidden(false));
  mobile.addEventListener('change', () => {setNavHidden(false); travel=0; lastY=Math.max(0,window.scrollY);});
  // Label table fields once after every render, retaining all existing buttons/actions.
  function adaptTables(root) {
    const tables = root.matches?.('table.task-table') ? [root] : [...(root.querySelectorAll?.('table.task-table') || [])];
    for (const table of tables) {
      if (table.classList.contains('mobile-card-table')) continue;
      const labels = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
      table.classList.add('mobile-card-table');
      for (const row of table.querySelectorAll('tbody tr')) {
        [...row.cells].forEach((cell,i) => {cell.dataset.label = labels[i] || '';});
        if(row.dataset.detail) {
          row.tabIndex=0; row.setAttribute('role','button');
          row.setAttribute('aria-label', 'Xem chi tiết '+row.textContent.trim().replace(/\s+/g,' ').slice(0,100));
          row.addEventListener('keydown',e=>{if(e.target===row&&['Enter',' '].includes(e.key)){e.preventDefault();row.click();}});
        }
      }
    }
  }
  const observer = new MutationObserver(records => {
    for(const record of records) for(const node of record.addedNodes) if(node.nodeType===1) adaptTables(node);
  });
  observer.observe(document.getElementById('secondary-view'), {childList:true,subtree:true});
  observer.observe(document.getElementById('dialog-body'), {childList:true,subtree:true});
  adaptTables(document);
  // Hide the dock while typing with a touch keyboard; restore on blur or resize.
  function keyboardState() {
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    const keyboard = window.visualViewport && window.innerHeight-window.visualViewport.height>120;
    nav.classList.toggle('keyboard-hidden', mobile.matches && editing && keyboard);
  }
  window.visualViewport?.addEventListener('resize',keyboardState);
  document.addEventListener('focusin',keyboardState);
  document.addEventListener('focusout',()=>requestAnimationFrame(keyboardState));
})();
