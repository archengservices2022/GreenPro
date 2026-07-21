const seed = {
  customers: [
    {id:1,name:'Mike Thompson',phone:'(615) 555-1234',email:'mike@example.com',address:'123 Maple St, Franklin, TN',service:'Lawn Mowing'},
    {id:2,name:'Emily Davis',phone:'(615) 555-5678',email:'emily@example.com',address:'456 Oak Dr, Franklin, TN',service:'Mulching'},
    {id:3,name:'Robert Johnson',phone:'(615) 555-9012',email:'robert@example.com',address:'789 Pine Ln, Franklin, TN',service:'Hedge Trimming'},
    {id:4,name:'Jessica Wilson',phone:'(615) 555-3456',email:'jessica@example.com',address:'321 Cedar St, Franklin, TN',service:'Spring Cleanup'},
    {id:5,name:'William Anderson',phone:'(615) 555-7880',email:'william@example.com',address:'246 Elm St, Franklin, TN',service:'Irrigation Inspection'}
  ],
  jobs: [
    {id:1021,time:'8:00 AM',date:'2026-07-20',customer:'Mike Thompson',service:'Lawn Mowing',address:'123 Maple St, Franklin, TN',crew:'Mike Johnson',status:'progress',price:125},
    {id:1022,time:'10:30 AM',date:'2026-07-20',customer:'Emily Davis',service:'Mulching',address:'456 Oak Dr, Franklin, TN',crew:'Sarah Williams',status:'scheduled',price:450},
    {id:1023,time:'1:00 PM',date:'2026-07-20',customer:'Robert Johnson',service:'Hedge Trimming',address:'789 Pine Ln, Franklin, TN',crew:'Mike Johnson',status:'scheduled',price:185},
    {id:1024,time:'3:30 PM',date:'2026-07-20',customer:'Jessica Wilson',service:'Spring Cleanup',address:'321 Cedar St, Franklin, TN',crew:'Sarah Williams',status:'scheduled',price:320},
    {id:1025,time:'8:00 AM',date:'2026-07-21',customer:'William Anderson',service:'Irrigation Inspection',address:'246 Elm St, Franklin, TN',crew:'David Brown',status:'scheduled',price:160}
  ],
  estimates: [
    {id:'EST-1007',customer:'Emily Davis',service:'Landscape Bed Refresh',amount:3450,status:'pending'},
    {id:'EST-1008',customer:'Mike Thompson',service:'Seasonal Lawn Plan',amount:1200,status:'pending'},
    {id:'EST-1009',customer:'Robert Johnson',service:'Tree Trimming',amount:680,status:'paid'}
  ],
  invoices: [
    {id:'INV-1003',customer:'Mike Thompson',amount:125,status:'paid',due:'Jul 18, 2026'},
    {id:'INV-1004',customer:'Emily Davis',amount:450,status:'unpaid',due:'Jul 25, 2026'},
    {id:'INV-1005',customer:'Robert Johnson',amount:185,status:'unpaid',due:'Jul 27, 2026'}
  ],
  crew: [
    {name:'Mike Johnson',role:'Team Leader',status:'Working',jobs:2},
    {name:'Sarah Williams',role:'Crew Member',status:'Working',jobs:2},
    {name:'David Brown',role:'Crew Member',status:'Working',jobs:1},
    {name:'James Lee',role:'Crew Member',status:'Off',jobs:0}
  ]
};

const state = JSON.parse(localStorage.getItem('greenops-data') || 'null') || seed;
let currentView = 'dashboard';
let selectedJob = state.jobs[0];
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
      <header class="topbar"><h1>${cap(currentView)}</h1><div class="top-actions"><span class="weather">⛅ 72°F · Partly cloudy</span><button class="secondary" id="crewMode">Crew View</button><button class="icon-btn" aria-label="Notifications">🔔</button></div></header>
      <section class="content">${viewTemplate()}</section>
    </main>
    <nav class="mobile-tabs"><button data-view="dashboard" class="${currentView==='dashboard'?'active':''}"><span>⌂</span>Dashboard</button><button data-view="schedule" class="${currentView==='schedule'?'active':''}"><span>▣</span>Schedule</button><button data-view="jobs" class="${currentView==='jobs'?'active':''}"><span>✓</span>Jobs</button><button data-view="customers" class="${currentView==='customers'?'active':''}"><span>👥</span>Customers</button><button data-view="settings" class="${currentView==='settings'?'active':''}"><span>⚙</span>Settings</button></nav>
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
  return `
    <div class="hero"><div><h2>Good morning, John!</h2><p>Here’s what is happening across your landscaping business today.</p></div><button class="primary" id="newJob">+ New Job</button></div>
    <div class="metric-grid">
      ${metric('Revenue This Week',money(revenue),'↑ 12% from last week','💲')}
      ${metric("Today's Jobs",today.length,'3 in progress','📅')}
      ${metric('Pending Estimates',state.estimates.filter(e=>e.status==='pending').length,money(3450),'🧾')}
      ${metric('Unpaid Invoices',state.invoices.filter(i=>i.status==='unpaid').length,money(635),'📄')}
      ${metric('Active Crew','3 / 4','crew members','👥')}
    </div>
    <div class="dashboard-grid">
      <div class="card section-card"><div class="section-head"><h3>Today's Schedule</h3><button class="link-btn" data-view="schedule">View all</button></div><div class="list">
        ${today.map(job=>`<div class="row schedule-row"><strong>${job.time}</strong><div><strong>${job.service}</strong><div class="muted">${job.customer}</div></div><div class="muted address">${job.address}</div><span class="status ${job.status}">${job.status==='progress'?'In Progress':cap(job.status)}</span></div>`).join('')}
      </div></div>
      <div class="card section-card"><div class="section-head"><h3>Crew Status</h3><button class="link-btn" data-view="crew">Manage crew</button></div><div class="list">
        ${state.crew.map((c,i)=>`<div class="row crew-row"><div class="avatar">${c.name.split(' ').map(x=>x[0]).join('')}</div><div><strong>${c.name}</strong><div class="muted">${c.role}</div></div><span class="status ${c.status==='Working'?'progress':'pending'}">${c.status}</span><span class="muted">${c.jobs} jobs</span></div>`).join('')}
      </div></div>
    </div>`;
}
function metric(label,value,sub,icon){ return `<div class="card metric"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div><div class="bubble">${icon}</div></div>`; }

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
function crew(){ return `<div class="hero"><div><h2>Crew</h2><p>Manage team availability and daily assignments.</p></div><button class="primary">+ Add Crew Member</button></div><div class="metric-grid">${state.crew.map(c=>`<div class="card metric"><div class="avatar">${c.name.split(' ').map(x=>x[0]).join('')}</div><div class="value" style="font-size:18px">${c.name}</div><div class="sub">${c.role} · ${c.jobs} jobs today</div><div class="bubble">${c.status==='Working'?'✓':'–'}</div></div>`).join('')}</div>`; }
function reports(){ return `<div class="hero"><div><h2>Reports</h2><p>Simple business performance for the current month.</p></div><button class="secondary">Download CSV</button></div><div class="metric-grid">${metric('Monthly Revenue',money(12680),'↑ 9.4%','💲')}${metric('Jobs Completed','84','↑ 11 jobs','✓')}${metric('Average Job',money(151),'Across all services','📊')}${metric('Repeat Customers','72%','Strong retention','↻')}</div>`; }
function settings(){ return `<div class="hero"><div><h2>Settings</h2><p>Update company information and workflow preferences.</p></div><button class="primary" id="saveSettings">Save Changes</button></div><div class="card section-card"><div class="form-grid"><div class="field"><label>Company Name</label><input value="GreenOps Landscaping"></div><div class="field"><label>Phone</label><input value="(314) 555-0199"></div><div class="field full"><label>Business Address</label><input value="St. Louis, Missouri"></div><div class="field"><label>Default Tax Rate</label><input value="8.25%"></div><div class="field"><label>Schedule Start Time</label><input value="7:00 AM"></div></div></div>`; }

function jobDetail(){ const j=selectedJob; return `<div class="hero"><div><button class="link-btn" data-view="jobs">← Back to Jobs</button><h2>#JOB-${j.id} · ${j.service}</h2><p>${j.customer} · ${j.address}</p></div><span class="status ${j.status}">${j.status==='progress'?'In Progress':cap(j.status)}</span></div><div class="job-detail-grid"><div class="card section-card"><div class="section-head"><h3>Job Details</h3></div><div class="detail-list"><div class="detail-item"><span class="muted">Customer</span><strong>${j.customer}</strong></div><div class="detail-item"><span class="muted">Service</span><strong>${j.service}</strong></div><div class="detail-item"><span class="muted">Date</span><strong>${j.date} at ${j.time}</strong></div><div class="detail-item"><span class="muted">Assigned Crew</span><strong>${j.crew}</strong></div><div class="detail-item"><span class="muted">Price</span><strong>${money(j.price)}</strong></div></div></div><div class="card section-card checklist"><div class="section-head"><h3>Checklist</h3></div><label><input type="checkbox" checked> Mow front yard</label><label><input type="checkbox" checked> Mow backyard</label><label><input type="checkbox"> Edge all areas</label><label><input type="checkbox"> Blow off driveway and walkways</label><div style="display:flex;gap:10px;margin-top:16px"><button class="secondary">Add Photos</button><button class="primary" id="completeJob">Complete Job</button></div></div></div>`; }
function crewView(){ const j=state.jobs[0]; return `<div style="max-width:560px;margin:auto"><div class="hero"><div><h2>My Jobs Today</h2><p>Monday, July 20</p></div><span class="status progress">3 Assigned</span></div><div class="card section-card"><div class="section-head"><div><h3>${j.service}</h3><div class="muted">${j.address}</div></div><span class="status progress">In Progress</span></div><div class="detail-list"><div class="detail-item"><span class="muted">Customer</span><strong>${j.customer}</strong></div><div class="detail-item"><span class="muted">Time</span><strong>${j.time}</strong></div><div class="detail-item"><span class="muted">Crew Lead</span><strong>${j.crew}</strong></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px"><button class="primary">Start Job</button><button class="secondary">Navigate</button></div></div><div class="card section-card checklist" style="margin-top:14px"><h3>Checklist</h3><label><input type="checkbox" checked> Mow front yard</label><label><input type="checkbox" checked> Mow backyard</label><label><input type="checkbox"> Edge all areas</label><label><input type="checkbox"> Blow off walkways</label><button class="primary" style="width:100%;margin-top:14px">Upload Before/After Photos</button></div></div>`; }

function bind(){
  document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{ currentView=el.dataset.view; render(); });
  document.getElementById('crewMode')?.addEventListener('click',()=>{currentView='crewView';render();});
  document.querySelectorAll('[data-job]').forEach(el=>el.onclick=()=>{ selectedJob=state.jobs.find(j=>j.id==el.dataset.job)||state.jobs[0]; currentView='jobDetail'; render(); });
  document.getElementById('newJob')?.addEventListener('click',()=>openJobModal());
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
