const seed = {
  customers: [
    {id:1,name:'Mike Thompson',phone:'(615) 555-1234',email:'mike@example.com',address:'123 Maple St, Franklin, TN',service:'Lawn Mowing'},
    {id:2,name:'Emily Davis',phone:'(615) 555-5678',email:'emily@example.com',address:'456 Oak Dr, Franklin, TN',service:'Mulching'},
    {id:3,name:'Robert Johnson',phone:'(615) 555-9012',email:'robert@example.com',address:'789 Pine Ln, Franklin, TN',service:'Hedge Trimming'},
    {id:4,name:'Jessica Wilson',phone:'(615) 555-3456',email:'jessica@example.com',address:'321 Cedar St, Franklin, TN',service:'Spring Cleanup'},
    {id:5,name:'William Anderson',phone:'(615) 555-7880',email:'william@example.com',address:'246 Elm St, Franklin, TN',service:'Irrigation Inspection'}
  ],
  jobs: [
    {id:1021,time:'8:00 AM',date:'2026-07-20',customer:'Mike Thompson',service:'Lawn Mowing',address:'123 Maple St, Franklin',crew:'Mike Johnson',status:'progress',price:125},
    {id:1022,time:'10:30 AM',date:'2026-07-20',customer:'Emily Davis',service:'Mulching',address:'456 Oak Dr, Franklin',crew:'Sarah Williams',status:'progress',price:450},
    {id:1023,time:'1:00 PM',date:'2026-07-20',customer:'Robert Johnson',service:'Hedge Trimming',address:'789 Pine Ln, Franklin',crew:'Mike Johnson',status:'progress',price:185},
    {id:1024,time:'3:30 PM',date:'2026-07-20',customer:'Jessica Wilson',service:'Spring Cleanup',address:'321 Cedar St, Franklin',crew:'Sarah Williams',status:'scheduled',price:320},
    {id:1025,time:'9:00 AM',date:'2026-07-20',customer:'William Anderson',service:'Irrigation Check',address:'246 Elm St, Franklin',crew:'David Brown',status:'scheduled',price:160},
    {id:1026,time:'11:00 AM',date:'2026-07-20',customer:'Mike Thompson',service:'Leaf Removal',address:'123 Maple St, Franklin',crew:'James Lee',status:'scheduled',price:95},
    {id:1027,time:'8:00 AM',date:'2026-07-21',customer:'William Anderson',service:'Irrigation Inspection',address:'246 Elm St, Franklin',crew:'David Brown',status:'scheduled',price:160},
    {id:1028,time:'10:30 AM',date:'2026-07-21',customer:'Emily Davis',service:'Leaf Removal',address:'135 Birch Dr, Franklin',crew:'Sarah Williams',status:'scheduled',price:120}
  ],
  estimates: [
    {id:'EST-1007',customer:'Emily Davis',service:'Landscape Bed Refresh',amount:1200,status:'pending'},
    {id:'EST-1008',customer:'Mike Thompson',service:'Seasonal Lawn Plan',amount:850,status:'pending'},
    {id:'EST-1009',customer:'Robert Johnson',service:'Tree Trimming',amount:680,status:'paid'},
    {id:'EST-1010',customer:'Jessica Wilson',service:'Garden Design',amount:1500,status:'pending'},
    {id:'EST-1011',customer:'William Anderson',service:'Irrigation System',amount:2200,status:'pending'}
  ],
  invoices: [
    {id:'INV-1003',customer:'Mike Thompson',amount:125,status:'paid',due:'Jul 18, 2026'},
    {id:'INV-1004',customer:'Emily Davis',amount:850,status:'unpaid',due:'Jul 25, 2026'},
    {id:'INV-1005',customer:'Robert Johnson',amount:750,status:'unpaid',due:'Jul 27, 2026'},
    {id:'INV-1006',customer:'Jessica Wilson',amount:550,status:'unpaid',due:'Jul 30, 2026'}
  ],
  crew: [
    {name:'Mike Johnson',role:'Team Leader',status:'Working',jobs:2},
    {name:'Sarah Williams',role:'Crew Member',status:'Working',jobs:2},
    {name:'David Brown',role:'Crew Member',status:'Working',jobs:1},
    {name:'James Lee',role:'Crew Member',status:'Working',jobs:1},
    {name:'Chris Garcia',role:'Crew Member',status:'Working',jobs:2},
    {name:'Rachel Kim',role:'Crew Member',status:'Off',jobs:0},
    {name:'Tom Wilson',role:'Crew Member',status:'Working',jobs:1},
    {name:'Lisa Chen',role:'Crew Member',status:'Working',jobs:1}
  ]
};

const SEED_VERSION = 3;
const stored = JSON.parse(localStorage.getItem('greenops-data') || 'null');
const state = (stored && stored._v === SEED_VERSION) ? stored : {...seed, _v: SEED_VERSION};
let currentView = 'dashboard';
let selectedJob = state.jobs[0];
let selectedJobTab = 'details';
let toastTimer;

const icons = {dashboard:'⌂',schedule:'▣',customers:'👥',estimates:'▤',jobs:'✓',invoices:'▧',crew:'♙',reports:'◫',settings:'⚙'};
const navItems = ['dashboard','schedule','customers','estimates','jobs','invoices','crew','reports','settings'];

function save(){ localStorage.setItem('greenops-data', JSON.stringify(state)); }
function money(n){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n); }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function showToast(message){
  clearTimeout(toastTimer); document.querySelector('.toast')?.remove();
  const el=document.createElement('div'); el.className='toast'; el.textContent=message; document.body.appendChild(el);
  toastTimer=setTimeout(()=>el.remove(),2200);
}

function render(){
  document.getElementById('app').innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">🌱</div><span>GreenOps</span></div>
      <nav class="nav">${navItems.map(i=>`<button data-view="${i}" class="${currentView===i?'active':''}"><span>${icons[i]}</span>${cap(i)}</button>`).join('')}</nav>
      <div class="sidebar-footer"><div class="avatar">JS</div><div><strong>John Smith</strong><div class="muted" style="color:#aac1b6">Owner</div></div></div>
    </aside>
    <main class="main">
      <header class="topbar"><button class="ham-btn" id="openDrawer">☰</button><span class="brand-title"><span class="bt-green">Green</span><span class="bt-white">Ops</span></span><h1 class="page-title">${cap(currentView)}</h1><div class="top-actions"><span class="weather">⛅ 72°F · Partly cloudy</span><button class="secondary" id="crewMode">Crew View</button><button class="icon-btn" aria-label="Notifications">🔔</button></div></header>
      <section class="content">${viewTemplate()}</section>
    </main>
    <nav class="mobile-tabs"><button data-view="dashboard" class="${currentView==='dashboard'?'active':''}"><span>⌂</span>Dashboard</button><button data-view="schedule" class="${currentView==='schedule'?'active':''}"><span>▣</span>Schedule</button><button id="mobileNewJob" class="fab-tab" aria-label="New Job"><span>+</span></button><button data-view="jobs" class="${currentView==='jobs'?'active':''}"><span>✓</span>Jobs</button><button id="mobileMore"><span>⋯</span>More</button></nav>
    <div class="drawer-overlay" id="drawerOverlay">
      <aside class="mobile-drawer">
        <div class="drawer-brand"><div class="brand-mark">🌱</div><span>GreenOps</span><button class="drawer-close" id="closeDrawer">✕</button></div>
        <nav class="drawer-nav">
          ${navItems.map(i=>`<button data-view="${i}" class="drawer-item${currentView===i?' active':''}"><span class="drawer-icon">${icons[i]}</span>${cap(i)}</button>`).join('')}
        </nav>
        <div class="drawer-footer"><div class="avatar">JS</div><div><strong>John Smith</strong><div class="muted" style="color:#aac1b6;font-size:12px">Owner</div></div></div>
      </aside>
    </div>
  </div>`;
  bind();
}

function viewTemplate(){
  switch(currentView){
    case 'dashboard': return dashboard();
    case 'customers': return customers();
    case 'schedule': return schedule();
    case 'jobs': return jobs();
    case 'estimates': return estimates();
    case 'invoices': return invoices();
    case 'crew': return crew();
    case 'reports': return reports();
    case 'settings': return settings();
    case 'jobDetail': return jobDetail();
    case 'crewView': return crewView();
    default: return dashboard();
  }
}

function dashboard(){
  const revenue=state.invoices.filter(x=>x.status==='paid').reduce((a,b)=>a+b.amount,0)+8435;
  const today=state.jobs.filter(j=>j.date==='2026-07-20');
  const inProgress=today.filter(j=>j.status==='progress').length;
  const unpaid=state.invoices.filter(i=>i.status==='unpaid');
  const pending=state.estimates.filter(e=>e.status==='pending');
  const workingCrew=state.crew.filter(c=>c.status==='Working').length;
  const upcoming=state.jobs.filter(j=>j.date>'2026-07-20').slice(0,3);
  return `
    <div class="hero"><div><h2>Good morning, John!</h2><p>Here's what's happening today.</p></div><button class="primary" id="newJob">+ New Job</button></div>
    <div class="metric-grid desktop-only">
      ${metric('Revenue This Week',money(revenue),'↑ 12% from last week','💲')}
      ${metric("Today's Jobs",today.length,inProgress+' in progress','📅')}
      ${metric('Pending Estimates',pending.length,money(pending.reduce((a,b)=>a+b.amount,0)),'🧾')}
      ${metric('Unpaid Invoices',unpaid.length,money(unpaid.reduce((a,b)=>a+b.amount,0)),'📄')}
      ${metric('Active Crew',workingCrew+' / '+state.crew.length,'crew members','👥','crew')}
    </div>
    <div class="compact-metrics mobile-only">
      <div class="cmcard"><div class="cmcard-icon cm-green">📅</div><div><div class="cmcard-label">Today's Jobs</div><div class="cmcard-value">${today.length}</div></div></div>
      <div class="cmcard"><div class="cmcard-icon cm-blue">🕐</div><div><div class="cmcard-label">In Progress</div><div class="cmcard-value">${inProgress}</div></div></div>
      <div class="cmcard"><div class="cmcard-icon cm-green">💵</div><div><div class="cmcard-label">Revenue</div><div class="cmcard-value">${money(revenue)}</div></div></div>
      <div class="cmcard"><div class="cmcard-icon cm-red">📄</div><div><div class="cmcard-label">Unpaid</div><div class="cmcard-value">${unpaid.length}</div></div></div>
    </div>
    <div class="dashboard-grid">
      <div class="card section-card"><div class="section-head"><h3>Today's Schedule</h3><button class="link-btn" data-view="schedule">View all</button></div><div class="list">
        ${today.map(job=>`<div class="row schedule-row"><strong class="sched-time">${job.time}</strong><div><strong>${job.service}</strong><div class="muted sched-customer">${job.customer}</div><div class="muted sched-address">${job.address}</div></div><div class="muted address desktop-only">${job.address}</div><span class="status ${job.status}">${job.status==='progress'?'In Progress':cap(job.status)}</span></div>`).join('')}
      </div><button class="link-btn section-footer-link" data-view="schedule">View Full Schedule →</button></div>
      <div class="card section-card desktop-only"><div class="section-head"><h3>Crew Status</h3><button class="link-btn" data-view="crew">View all</button></div><div class="list">
        ${state.crew.map(c=>`<div class="row crew-row"><div class="avatar crew-av">${c.name.split(' ').map(x=>x[0]).join('')}</div><div><strong>${c.name}</strong><div class="muted">${c.role}</div></div><span class="status ${c.status==='Working'?'progress':'pending'}">${c.status}</span><span class="muted">${c.jobs} job${c.jobs!==1?'s':''}</span></div>`).join('')}
      </div><button class="link-btn section-footer-link" data-view="crew">Manage Crew →</button></div>
    </div>
    <div class="dashboard-grid desktop-only second-row">
      <div class="card section-card"><div class="section-head"><h3>Upcoming Jobs</h3><button class="link-btn" data-view="jobs">View all</button></div><div class="list">
        ${upcoming.map(job=>`<div class="row upcoming-row"><div class="muted upcoming-when">Tomorrow, ${job.time}</div><strong>${job.service}</strong><div class="muted">${job.address}</div></div>`).join('')}
      </div></div>
      <div class="card section-card"><div class="section-head"><h3>Recent Activity</h3></div><div class="list">
        <div class="row activity-row"><span class="act-dot green-dot">$</span><span>Invoice #INV-1003 was paid</span></div>
        <div class="row activity-row"><span class="act-dot gold-dot">📋</span><span>Estimate #EST-1007 was approved</span></div>
        <div class="row activity-row"><span class="act-dot green-dot">✓</span><span>Job #JOB-1021 completed</span></div>
      </div></div>
    </div>`;
}
function metric(label,value,sub,icon,view){ const a=view?` data-view="${view}" style="cursor:pointer"`:''; return `<div class="card metric"${a}><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div><div class="bubble">${icon}</div></div>`; }

function customers(){
  return `<div class="hero"><div><h2>Customers</h2><p>Manage customers, properties, and service history.</p></div><button class="primary" id="newCustomer">+ Add Customer</button></div>
  <div class="card table-card"><div class="table-tools"><input class="search" id="customerSearch" placeholder="Search customers..."><button class="secondary">Export</button></div>
  <table><thead><tr><th>Customer</th><th>Phone</th><th>Property</th><th>Primary Service</th><th></th></tr></thead><tbody id="customerRows">${customerRows(state.customers)}</tbody></table></div>`;
}
function customerRows(items){ return items.map(c=>`<tr><td><strong>${c.name}</strong><div class="muted">${c.email}</div></td><td>${c.phone}</td><td>${c.address}</td><td>${c.service}</td><td><button class="secondary">View</button></td></tr>`).join(''); }

function schedule(){
  const days=['Mon 20','Tue 21','Wed 22','Thu 23','Fri 24'];
  const times=['8 AM','10 AM','12 PM','2 PM','4 PM'];
  return `<div class="hero"><div><h2>Schedule</h2><p>Assign crews and manage recurring landscaping jobs.</p></div><button class="primary" id="newJob">+ Schedule Job</button></div>
  <div class="card table-card"><div class="table-tools"><button class="secondary">←</button><button class="secondary">Today</button><button class="secondary">→</button><div style="flex:1"></div><button class="secondary">Week</button><button class="secondary">Month</button></div>
  <div class="calendar"><div class="cal-head"></div>${days.map(d=>`<div class="cal-head">${d}</div>`).join('')}
  ${times.map((t,ri)=>`<div class="cal-time">${t}</div>${days.map((d,ci)=>{ const j=state.jobs[(ri+ci)%state.jobs.length]; return `<div class="cal-cell">${((ri+ci)%3===0)?`<div class="job-block ${['','blue','gold','red'][(ri+ci)%4]}" data-job="${j.id}"><strong>${j.service}</strong><br>${j.customer}</div>`:''}</div>`}).join('')}`).join('')}</div></div>`;
}

function jobs(){
  return `<div class="hero"><div><h2>Jobs</h2><p>Track scheduled, active, and completed field work.</p></div><button class="primary" id="newJob">+ New Job</button></div>
  <div class="card table-card"><div class="table-tools"><input class="search" id="jobSearch" placeholder="Search jobs..."><select class="secondary"><option>All statuses</option><option>Scheduled</option><option>In Progress</option></select></div>
  <table><thead><tr><th>Job</th><th>Customer</th><th>Date & Time</th><th>Crew</th><th>Amount</th><th>Status</th></tr></thead><tbody>${state.jobs.map(j=>`<tr data-job="${j.id}"><td><strong>#JOB-${j.id}</strong><div class="muted">${j.service}</div></td><td>${j.customer}</td><td>${j.date}<div class="muted">${j.time}</div></td><td>${j.crew}</td><td>${money(j.price)}</td><td><span class="status ${j.status}">${j.status==='progress'?'In Progress':cap(j.status)}</span></td></tr>`).join('')}</tbody></table></div>`;
}
function estimates(){ return simpleTable('Estimates','Create and track landscaping estimates.','+ New Estimate',['Estimate','Customer','Service','Amount','Status'],state.estimates.map(e=>[`<strong>${e.id}</strong>`,e.customer,e.service,money(e.amount),`<span class="status ${e.status}">${cap(e.status)}</span>`])); }
function invoices(){ return simpleTable('Invoices','Track billing and payment status.','+ New Invoice',['Invoice','Customer','Due Date','Amount','Status'],state.invoices.map(i=>[`<strong>${i.id}</strong>`,i.customer,i.due,money(i.amount),`<span class="status ${i.status}">${cap(i.status)}</span>`])); }
function simpleTable(title,sub,button,headers,rows){ return `<div class="hero"><div><h2>${title}</h2><p>${sub}</p></div><button class="primary">${button}</button></div><div class="card table-card"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function crew(){
  const working=state.crew.filter(c=>c.status==='Working').length;
  return `
    <div class="hero"><div><h2>Crew Members</h2><p>${working} of ${state.crew.length} members working today.</p></div><button class="primary">+ Add Member</button></div>
    <div class="crew-cards">
      ${state.crew.map(c=>`
        <div class="card crew-member-card">
          <div class="cmc-avatar">${c.name.split(' ').map(x=>x[0]).join('')}</div>
          <div class="cmc-info">
            <strong>${c.name}</strong>
            <span class="muted">${c.role}</span>
          </div>
          <div class="cmc-right">
            <span class="status ${c.status==='Working'?'progress':'pending'}">${c.status}</span>
            <span class="muted">${c.jobs} job${c.jobs!==1?'s':''} today</span>
          </div>
        </div>`).join('')}
    </div>`;
}
function reports(){ return `<div class="hero"><div><h2>Reports</h2><p>Simple business performance for the current month.</p></div><button class="secondary">Download CSV</button></div><div class="metric-grid">${metric('Monthly Revenue',money(12680),'↑ 9.4%','💲')}${metric('Jobs Completed','84','↑ 11 jobs','✓')}${metric('Average Job',money(151),'Across all services','📊')}${metric('Repeat Customers','72%','Strong retention','↻')}</div>`; }
function settings(){ return `<div class="hero"><div><h2>Settings</h2><p>Update company information and workflow preferences.</p></div><button class="primary" id="saveSettings">Save Changes</button></div><div class="card section-card"><div class="form-grid"><div class="field"><label>Company Name</label><input value="GreenOps Landscaping"></div><div class="field"><label>Phone</label><input value="(314) 555-0199"></div><div class="field full"><label>Business Address</label><input value="St. Louis, Missouri"></div><div class="field"><label>Default Tax Rate</label><input value="8.25%"></div><div class="field"><label>Schedule Start Time</label><input value="7:00 AM"></div></div></div>`; }

function jobDetail(){
  const j=selectedJob;
  const tab=selectedJobTab;
  return `
    <div class="hero"><div><button class="link-btn" data-view="jobs">← Back to Jobs</button><h2>#JOB-${j.id} · ${j.service}</h2><p>${j.customer} · ${j.address}</p></div><div style="display:flex;align-items:center;gap:8px"><span class="status ${j.status}">${j.status==='progress'?'In Progress':cap(j.status)}</span></div></div>
    <div class="job-tabs">
      <button class="tab-btn${tab==='details'?' tab-active':''}" data-tab="details">Details</button>
      <button class="tab-btn${tab==='checklist'?' tab-active':''}" data-tab="checklist">Checklist</button>
      <button class="tab-btn${tab==='photos'?' tab-active':''}" data-tab="photos">Photos</button>
      <button class="tab-btn${tab==='notes'?' tab-active':''}" data-tab="notes">Notes</button>
      <button class="tab-btn${tab==='time'?' tab-active':''}" data-tab="time">Time</button>
    </div>
    ${tab==='details'?`<div class="card section-card"><div class="detail-list"><div class="detail-item"><span class="muted">Customer</span><strong>${j.customer}</strong></div><div class="detail-item"><span class="muted">Property</span><strong>${j.address}</strong></div><div class="detail-item"><span class="muted">Service</span><strong>${j.service}</strong></div><div class="detail-item"><span class="muted">Date</span><strong>${j.date}</strong></div><div class="detail-item"><span class="muted">Time</span><strong>${j.time}</strong></div><div class="detail-item"><span class="muted">Assigned Crew</span><strong>${j.crew}</strong></div><div class="detail-item"><span class="muted">Price</span><strong>${money(j.price)}</strong></div></div></div>`
    :tab==='checklist'?`<div class="card section-card checklist"><label><input type="checkbox" checked> Mow front yard</label><label><input type="checkbox" checked> Mow backyard</label><label><input type="checkbox"> Edge all areas</label><label><input type="checkbox"> Blow off driveway and walkways</label></div>`
    :`<div class="card section-card empty">No ${tab} yet.</div>`}
    <div class="job-action-bar"><button class="secondary">Start Break</button><button class="primary" id="completeJob">Complete Job</button></div>`;
}
function crewView(){
  const j=state.jobs[0];
  return `<div class="crew-view-shell">
    <div class="cv-topbar"><button class="link-btn cv-back" data-view="dashboard">‹</button><span class="cv-title">My Job</span><span class="status progress cv-status">In Progress</span><button class="icon-btn cv-add">+</button></div>
    <div class="cv-content">
      <div class="card cv-card"><h2 class="cv-job-title">${j.service}</h2><p class="muted cv-addr">${j.address}, TN</p>
        <div class="cv-actions"><button class="primary cv-start">Start Job</button><button class="secondary cv-nav-btn">▶ Navigate</button></div>
        <div class="cv-tabs"><button class="tab-btn tab-active">Details</button><button class="tab-btn">Checklist</button><button class="tab-btn">Photos</button><button class="tab-btn">Notes</button></div>
        <div class="cv-checklist">
          <label class="cv-check"><span class="cv-circle done">✓</span>Mow front yard</label>
          <label class="cv-check"><span class="cv-circle done">✓</span>Mow backyard</label>
          <label class="cv-check"><span class="cv-circle"></span>Edge all areas</label>
          <label class="cv-check"><span class="cv-circle"></span>Blow off driveway and walkways</label>
        </div>
      </div>
    </div>
    <nav class="cv-nav"><button class="active"><span>⌂</span>Today</button><button data-view="jobs"><span>▤</span>My Jobs</button><button data-view="schedule"><span>▣</span>Schedule</button><button id="mobileMore2"><span>⋯</span>More</button></nav>
  </div>`;
}

function bind(){
  document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{ currentView=el.dataset.view; render(); });
  document.getElementById('openDrawer')?.addEventListener('click',()=>document.getElementById('drawerOverlay')?.classList.add('open'));
  document.getElementById('closeDrawer')?.addEventListener('click',()=>document.getElementById('drawerOverlay')?.classList.remove('open'));
  document.getElementById('drawerOverlay')?.addEventListener('click',e=>{if(e.target.id==='drawerOverlay')e.target.classList.remove('open');});
  document.getElementById('crewMode')?.addEventListener('click',()=>{currentView='crewView';render();});
  document.querySelectorAll('[data-job]').forEach(el=>el.onclick=()=>{ selectedJob=state.jobs.find(j=>j.id==el.dataset.job)||state.jobs[0]; currentView='jobDetail'; render(); });
  document.getElementById('newJob')?.addEventListener('click',()=>openJobModal());
  document.getElementById('mobileNewJob')?.addEventListener('click',()=>openJobModal());
  document.getElementById('mobileMore')?.addEventListener('click',()=>document.getElementById('drawerOverlay')?.classList.add('open'));
  document.getElementById('mobileMore2')?.addEventListener('click',()=>document.getElementById('drawerOverlay')?.classList.add('open'));
  document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>{ selectedJobTab=el.dataset.tab; render(); });
  document.getElementById('newCustomer')?.addEventListener('click',()=>openCustomerModal());
  document.getElementById('customerSearch')?.addEventListener('input',e=>{ const q=e.target.value.toLowerCase(); document.getElementById('customerRows').innerHTML=customerRows(state.customers.filter(c=>Object.values(c).join(' ').toLowerCase().includes(q))); });
  document.getElementById('completeJob')?.addEventListener('click',()=>{selectedJob.status='paid';save();showToast('Job marked complete');currentView='jobs';render();});
  document.getElementById('saveSettings')?.addEventListener('click',()=>showToast('Settings saved'));
}

function openJobModal(){
  const wrap=document.createElement('div'); wrap.className='modal-backdrop'; wrap.innerHTML=`<div class="modal"><h3>Create New Job</h3><form id="jobForm"><div class="form-grid"><div class="field"><label>Customer</label><select name="customer">${state.customers.map(c=>`<option>${c.name}</option>`).join('')}</select></div><div class="field"><label>Service</label><select name="service"><option>Lawn Mowing</option><option>Mulching</option><option>Hedge Trimming</option><option>Spring Cleanup</option><option>Irrigation Inspection</option></select></div><div class="field"><label>Date</label><input name="date" type="date" value="2026-07-21" required></div><div class="field"><label>Time</label><input name="time" value="9:00 AM" required></div><div class="field"><label>Crew</label><select name="crew">${state.crew.map(c=>`<option>${c.name}</option>`).join('')}</select></div><div class="field"><label>Price</label><input name="price" type="number" value="150" required></div><div class="field full"><label>Notes</label><textarea name="notes" rows="3" placeholder="Gate code, service instructions, materials..."></textarea></div></div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Create Job</button></div></form></div>`;
  document.body.appendChild(wrap); wrap.onclick=e=>{if(e.target===wrap)wrap.remove()}; wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.querySelector('#jobForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const customer=state.customers.find(c=>c.name===f.get('customer'));state.jobs.push({id:Math.max(...state.jobs.map(j=>j.id))+1,time:f.get('time'),date:f.get('date'),customer:f.get('customer'),service:f.get('service'),address:customer.address,crew:f.get('crew'),status:'scheduled',price:Number(f.get('price'))});save();wrap.remove();showToast('Job created');render();};
}

function openCustomerModal(){
  const wrap=document.createElement('div'); wrap.className='modal-backdrop'; wrap.innerHTML=`<div class="modal"><h3>Add Customer</h3><form id="customerForm"><div class="form-grid"><div class="field"><label>Name</label><input name="name" required></div><div class="field"><label>Phone</label><input name="phone" required></div><div class="field"><label>Email</label><input name="email" type="email"></div><div class="field"><label>Primary Service</label><input name="service" value="Lawn Mowing"></div><div class="field full"><label>Property Address</label><input name="address" required></div></div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Add Customer</button></div></form></div>`;
  document.body.appendChild(wrap); wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.querySelector('#customerForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);state.customers.push({id:Date.now(),name:f.get('name'),phone:f.get('phone'),email:f.get('email'),service:f.get('service'),address:f.get('address')});save();wrap.remove();showToast('Customer added');render();};
}

render();
