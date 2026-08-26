const seed = {
  customers: [
    {id:1,name:'Mike Thompson',phone:'(615) 555-1234',email:'mike@example.com',address:'123 Maple St, Franklin, TN',service:'Lawn Mowing'},
    {id:2,name:'Emily Davis',phone:'(615) 555-5678',email:'emily@example.com',address:'456 Oak Dr, Franklin, TN',service:'Mulching'},
    {id:3,name:'Robert Johnson',phone:'(615) 555-9012',email:'robert@example.com',address:'789 Pine Ln, Franklin, TN',service:'Hedge Trimming'},
    {id:4,name:'Jessica Wilson',phone:'(615) 555-3456',email:'jessica@example.com',address:'321 Cedar St, Franklin, TN',service:'Spring Cleanup'},
    {id:5,name:'William Anderson',phone:'(615) 555-7880',email:'william@example.com',address:'246 Elm St, Franklin, TN',service:'Irrigation Inspection'}
  ],
  jobs: [
    {id:1021,time:'8:00 AM',date:'2026-07-20',customer:'Mike Thompson',service:'Lawn Mowing',address:'123 Maple St, Franklin',crew:'Mike Johnson',status:'completed',price:125},
    {id:1022,time:'10:30 AM',date:'2026-07-20',customer:'Emily Davis',service:'Mulching',address:'456 Oak Dr, Franklin',crew:'Sarah Williams',status:'completed',price:450},
    {id:1023,time:'1:00 PM',date:'2026-07-20',customer:'Robert Johnson',service:'Hedge Trimming',address:'789 Pine Ln, Franklin',crew:'Mike Johnson',status:'completed',price:185},
    {id:1024,time:'3:30 PM',date:'2026-07-20',customer:'Jessica Wilson',service:'Spring Cleanup',address:'321 Cedar St, Franklin',crew:'Sarah Williams',status:'invoiced',price:320},
    {id:1025,time:'9:00 AM',date:'2026-07-20',customer:'William Anderson',service:'Irrigation Check',address:'246 Elm St, Franklin',crew:'David Brown',status:'scheduled',price:160},
    {id:1026,time:'11:00 AM',date:'2026-07-20',customer:'Mike Thompson',service:'Leaf Removal',address:'123 Maple St, Franklin',crew:'James Lee',status:'scheduled',price:95},
    {id:1027,time:'8:00 AM',date:'2026-07-21',customer:'William Anderson',service:'Irrigation Inspection',address:'246 Elm St, Franklin',crew:'David Brown',status:'scheduled',price:160},
    {id:1028,time:'10:30 AM',date:'2026-07-21',customer:'Emily Davis',service:'Leaf Removal',address:'135 Birch Dr, Franklin',crew:'Sarah Williams',status:'scheduled',price:120}
  ],
  estimates: [
    {id:'EST-202607001',customer:'Emily Davis',service:'Landscape Bed Refresh',amount:1200,status:'pending'},
    {id:'EST-202607002',customer:'Mike Thompson',service:'Seasonal Lawn Plan',amount:850,status:'pending'},
    {id:'EST-202607003',customer:'Robert Johnson',service:'Tree Trimming',amount:680,status:'paid'},
    {id:'EST-202607004',customer:'Jessica Wilson',service:'Garden Design',amount:1500,status:'pending'},
    {id:'EST-202607005',customer:'William Anderson',service:'Irrigation System',amount:2200,status:'pending'}
  ],
  invoices: [
    {id:'INV-202607001',customer:'Mike Thompson',amount:125,status:'paid',invoiced:'2026-07-15',paid:'2026-07-18',due:'Jul 18, 2026',notes:'Lawn mowing service'},
    {id:'INV-202607002',customer:'Emily Davis',amount:850,status:'unpaid',invoiced:'2026-07-20',paid:null,due:'Jul 25, 2026',notes:'Mulching service'},
    {id:'INV-202607003',customer:'Robert Johnson',amount:750,status:'overdue',invoiced:'2026-07-18',paid:null,due:'Jul 27, 2026',notes:'Hedge trimming'},
    {id:'INV-202607004',customer:'Jessica Wilson',amount:550,status:'paid',invoiced:'2026-07-19',paid:'2026-07-22',due:'Jul 30, 2026',notes:'Spring cleanup'}
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

const USER_KEY = 'greenops_current_user_v1';
const PENDING_ADMIN_VERIFICATION_KEY = 'greenops_pending_admin_verification_v1';
const LEGACY_IMPORT_DONE_KEY = 'greenops_legacy_import_done_v2';
const API_BASE = (
  window.GREENOPS_API_BASE ||
  `${window.location.origin}/api`
).replace(/\/$/, '');
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULE_TEXT = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
const normalizeEmailText = value => String(value || '').trim().toLowerCase();
const defaultSettings = {
  companyName: 'GreenOps Landscaping',
  email: '',
  phone: '(314) 555-0199',
  website: '',
  address: 'St. Louis, Missouri',
  copyright: '© 2026 GreenOps Landscaping. All rights reserved.',
  taxRate: '0%',
  scheduleStart: '7:00 AM',
  theme: 'light'
};
const defaultServiceCatalog = [];
function freshDefaultServices(){
  return defaultServiceCatalog.map(service=>({...service,createdAt:Date.now()}));
}
function emptyData(){
  return {
    customers: [],
    services: freshDefaultServices(),
    jobs: [],
    estimates: [],
    invoices: [],
    crew: [],
    teamAccounts: [],
    notifications: [],
    settings: {
      ...defaultSettings,
      ...(currentUser?.companyName ? {companyName: currentUser.companyName} : {}),
      ...(currentUser?.address ? {address: currentUser.address} : {})
    }
  };
}
function getUsers(){
  try {
    if(typeof state !== 'undefined' && Array.isArray(state.teamAccounts)) return state.teamAccounts;
  } catch (_) {}
  return [];
}
function setUsers(users){
  try {
    if(typeof state !== 'undefined') state.teamAccounts = Array.isArray(users)
      ? users.map(({password, ...user}) => user)
      : [];
  } catch (_) {}
}
let currentUser = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
let startupToastMessage = '';
let backendStorageReady = false;
let backendSaveTimer = null;
let customerWorkspaceSyncTimer = null;
function passwordValidationMessage(password){
  if(String(password || '').length < PASSWORD_MIN_LENGTH) return PASSWORD_RULE_TEXT;
  if(!/[A-Z]/.test(password)) return PASSWORD_RULE_TEXT;
  if(!/[a-z]/.test(password)) return PASSWORD_RULE_TEXT;
  if(!/[0-9]/.test(password)) return PASSWORD_RULE_TEXT;
  if(!/[^A-Za-z0-9]/.test(password)) return PASSWORD_RULE_TEXT;
  return '';
}
async function apiRequest(path, body){
  const token = await window.greenopsAuth?.getToken?.();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {})
      },
      body: JSON.stringify(body || {})
    });
  } catch (_) {
    throw new Error('Cannot connect to the GreenOps server. Restart the app with npm run dev.');
  }
  const data = await response.json().catch(() => ({}));
  if(!response.ok){
    const error = new Error(data.error || 'Backend request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}
async function apiGet(path){
  const token = await window.greenopsAuth?.getToken?.();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: token ? {Authorization: `Bearer ${token}`} : {}
    });
  } catch (_) {
    throw new Error('Cannot connect to the GreenOps server. Restart the app with npm run dev.');
  }
  const data = await response.json().catch(() => ({}));
  if(!response.ok){
    const error = new Error(data.error || 'Backend request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}
function rememberUser(user){
  const normalized = {
    ...user,
    id: user.id || Date.now(),
    name: user.name || '',
    email: String(user.email || '').trim().toLowerCase(),
    role: user.role || 'admin',
    phone: user.phone || '',
    companyName: user.companyName || '',
    address: user.address || '',
    ownerEmail: user.ownerEmail || ''
  };
  currentUser = {
    ...normalized
  };
  localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  return normalized;
}
function ownerUser(){
  if(currentUser?.ownerEmail){
    return {email: currentUser.ownerEmail, role:'admin', name:'Admin'};
  }
  return currentUser;
}
function workspaceOwnerEmail(user=currentUser){
  return normalizeEmailText(user?.ownerEmail || user?.email || ownerUser()?.email || '');
}
function legacyImportMarkerKey(user=currentUser){
  return `${LEGACY_IMPORT_DONE_KEY}:${workspaceOwnerEmail(user) || 'unknown'}`;
}
function workspacePayload(){
  return {
    customers: state.customers || [],
    services: state.services || [],
    jobs: state.jobs || [],
    estimates: state.estimates || [],
    invoices: state.invoices || [],
    crew: state.crew || [],
    teamAccounts: (state.teamAccounts || []).map(({password, ...account}) => account),
    notifications: state.notifications || [],
    settings: state.settings || {...defaultSettings}
  };
}
function workspaceRecordCount(data){
  return ['customers', 'services', 'jobs', 'estimates', 'invoices', 'crew', 'teamAccounts'].reduce((total, key) => {
    return total + (Array.isArray(data?.[key]) ? data[key].length : 0);
  }, 0);
}
function deletedDataRestoreKey(){
  return `greenops-deleted-data-restore:${workspaceOwnerEmail() || 'local'}`;
}
function compactLocalRestoreData(value){
  if(Array.isArray(value)) return value.map(compactLocalRestoreData);
  if(value && typeof value==='object'){
    return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,compactLocalRestoreData(item)]));
  }
  // Photos are already retained in the saved workspace. Omitting large image
  // data from the browser safety copy prevents storage limits from blocking a
  // delete action.
  if(typeof value==='string' && value.startsWith('data:image/')) return '';
  return value;
}
function preserveDeletedDataSnapshot(){
  const key=deletedDataRestoreKey();
  // Keep the state before the first deletion so one restore brings back every
  // record deleted during the current recovery period.
  if(localStorage.getItem(key)) return;
  const snapshot={createdAt:Date.now(),data:workspacePayload()};
  try{
    localStorage.setItem(key,JSON.stringify(snapshot));
  }catch(error){
    // A workspace can contain several large photo uploads. Keep a compact
    // copy of the business records, but never allow a local quota error to
    // prevent the requested deletion.
    try{
      localStorage.removeItem(key);
      localStorage.setItem(key,JSON.stringify({...snapshot,compact:true,data:compactLocalRestoreData(snapshot.data)}));
    }catch(compactError){
      console.warn('Deleted-data safety copy could not be stored:',compactError.message || error.message);
    }
  }
}
function automaticDeletedDataSnapshot(){
  try{
    const saved=JSON.parse(localStorage.getItem(deletedDataRestoreKey()) || '');
    return normalizeWorkspaceCandidate(saved?.data || saved);
  }catch(_){
    return null;
  }
}
const deletedDataCollections={
  customers:{label:'Customers',singular:'Customer',id:record=>record.id ?? record.email ?? record.name},
  jobs:{label:'Jobs',singular:'Job',id:record=>record.id},
  estimates:{label:'Estimates',singular:'Estimate',id:record=>record.id},
  invoices:{label:'Invoices',singular:'Invoice',id:record=>record.id},
  crew:{label:'Crew',singular:'Crew member',id:record=>record.id ?? record.email ?? record.name},
  services:{label:'Services',singular:'Service',id:record=>record.id ?? record.name},
  teamAccounts:{label:'User Logins',singular:'User login',id:record=>record.authUid ?? record.id ?? record.email}
};
function deletedRecordId(type,record){
  return String(deletedDataCollections[type]?.id(record) ?? '');
}
function deletedDataSnapshotRaw(){
  try{return JSON.parse(localStorage.getItem(deletedDataRestoreKey()) || '');}catch(_){return null;}
}
function deletedDataRecords(snapshot=automaticDeletedDataSnapshot()){
  const raw=deletedDataSnapshotRaw() || {};
  const records={};
  Object.keys(deletedDataCollections).forEach(type=>{
    const live=Array.isArray(state[type]) ? state[type] : [];
    const liveIds=new Set(live.map(record=>deletedRecordId(type,record)));
    const saved=Array.isArray(raw.deletedRecords?.[type]) ? raw.deletedRecords[type] : [];
    const baseline=Array.isArray(snapshot?.[type]) ? snapshot[type] : [];
    records[type]=[...saved,...baseline]
      .filter(record=>record && !liveIds.has(deletedRecordId(type,record)))
      .filter((record,index,list)=>list.findIndex(item=>deletedRecordId(type,item)===deletedRecordId(type,record))===index);
  });
  return records;
}
function captureDeletedRecord(type,record){
  preserveDeletedDataSnapshot();
  const raw=deletedDataSnapshotRaw();
  if(!raw || !record || !deletedDataCollections[type]) return;
  raw.deletedRecords=raw.deletedRecords || {};
  const list=raw.deletedRecords[type] || [];
  const id=deletedRecordId(type,record);
  if(!list.some(item=>deletedRecordId(type,item)===id)) list.push(JSON.parse(JSON.stringify(record)));
  raw.deletedRecords[type]=list;
  localStorage.setItem(deletedDataRestoreKey(),JSON.stringify(raw));
}
function removeRestoredDeletedRecord(type,id){
  const raw=deletedDataSnapshotRaw();
  if(!raw) return;
  if(Array.isArray(raw.deletedRecords?.[type])){
    raw.deletedRecords[type]=raw.deletedRecords[type].filter(record=>deletedRecordId(type,record)!==String(id));
  }
  const remaining=deletedDataRecords(automaticDeletedDataSnapshot());
  if(!Object.values(remaining).some(list=>list.length)) localStorage.removeItem(deletedDataRestoreKey());
  else localStorage.setItem(deletedDataRestoreKey(),JSON.stringify(raw));
}
async function restoreDeletedRecord(type,id){
  const records=deletedDataRecords();
  const record=records[type]?.find(item=>deletedRecordId(type,item)===String(id));
  if(!record || !deletedDataCollections[type]) return;
  if((state[type] || []).some(item=>deletedRecordId(type,item)===String(id))){ showToast('This record is already restored','error'); return; }
  if(type==='teamAccounts'){
    const result=await apiRequest('/auth/team/restore',{authUid:record.authUid || '',email:record.email || ''});
    state.teamAccounts.push({...record,...(result.user || {}),password:undefined});
  }else{
    state[type].push(record);
    await saveToFirebase(type,record);
  }
  removeRestoredDeletedRecord(type,id);
  showToast(`${deletedDataCollections[type].singular} restored`);
  render();
}
function deletedRecordDisplay(type,record){
  if(type==='customers') return {primary:record.name || 'Unnamed customer',secondary:[record.email,record.phone].filter(Boolean).join(' · ') || 'Customer record'};
  if(type==='jobs') return {primary:`JOB-${record.id} · ${record.service || 'Service'}`,secondary:[record.customer,displayDate(record.date)].filter(Boolean).join(' · ')};
  if(type==='estimates') return {primary:record.id || 'Estimate',secondary:[record.customer,money(record.amount || 0)].filter(Boolean).join(' · ')};
  if(type==='invoices') return {primary:record.id || 'Invoice',secondary:[record.customer,money(invoiceTotal(record))].filter(Boolean).join(' · ')};
  if(type==='crew') return {primary:record.name || 'Crew member',secondary:[record.role,record.email].filter(Boolean).join(' · ') || 'Crew record'};
  if(type==='teamAccounts') return {primary:record.name || record.email || 'User login',secondary:[roleLabel(record),record.email].filter(Boolean).join(' · ')};
  return {primary:record.name || 'Service',secondary:record.description || record.status || 'Service record'};
}
function deletedArchiveHeaders(type){
  const headers={
    customers:['Customer','Contact','Property','Primary Service','Recent Jobs'],
    jobs:['Job','Customer','Service','Date & Time','Crew','Amount','Paid','Outstanding','Status'],
    estimates:['Estimate','Estimate Date','Customer','Service','Amount','Approved Amount','Status','Progress Date'],
    invoices:['Invoice','Customer','Invoice Date','Due Date','Total','Paid','Outstanding','Status','Paid Date'],
    crew:['Crew Member','Role','Email','Phone','Status','Availability','Skills'],
    services:['Service','Rate','Duration','Usage','Total Amount','Status'],
    teamAccounts:['Name','Email','Account Type','Employment Status']
  };
  return headers[type] || [deletedDataCollections[type]?.singular || 'Record','Details'];
}
function deletedArchiveCells(type,record){
  if(type==='customers'){
    const jobs=state.jobs.filter(job=>recordMatchesCustomer(job,record));
    const recentJob=newestFirst(jobs)[0];
    return `<td><strong>${escapeHtml(record.name || 'Unnamed customer')}</strong><div class="muted archived-cell-sub">${escapeHtml(record.email || 'No email')}</div></td><td><strong>${escapeHtml(record.phone || 'Not added')}</strong></td><td>${escapeHtml(record.address || 'Not added')}</td><td>${escapeHtml(record.service || 'Not selected')}</td><td><strong>${jobs.length}</strong> job${jobs.length===1?'':'s'}${recentJob?`<div class="muted archived-cell-sub">${escapeHtml(recentJob.service || '')}</div>`:''}</td>`;
  }
  if(type==='jobs'){
    const billing=jobBillingSummary(record);
    const displayStatus=jobDisplayedStatus(record,billing);
    return `<td><strong>JOB-${escapeHtml(record.id || '-')}</strong></td><td><strong>${escapeHtml(record.customer || '-')}</strong></td><td>${escapeHtml(record.service || '-')}</td><td>${displayDate(record.date)}<div class="muted archived-cell-sub">${escapeHtml(record.time || 'Time not set')}</div></td><td>${escapeHtml(record.crew || 'Not assigned')}</td><td><strong>${money(record.price || 0)}</strong></td><td class="invoice-paid-value"><strong>${money(billing.paid)}</strong></td><td class="invoice-due-value"><strong>${money(billing.outstanding)}</strong></td><td><span class="status ${displayStatus.cls}">${escapeHtml(displayStatus.label)}</span></td>`;
  }
  if(type==='estimates'){
    return `<td><strong>${escapeHtml(record.id || 'Estimate')}</strong></td><td>${displayDate(estimateCreatedDate(record))}</td><td>${escapeHtml(record.customer || '-')}</td><td>${escapeHtml(record.service || '-')}</td><td><strong>${money(record.amount || 0)}</strong></td><td class="invoice-paid-value"><strong>${money(estimateApprovedAmount(record))}</strong></td><td><span class="status ${escapeHtml(record.status || 'pending')}">${escapeHtml(estimateStatusLabel(record.status))}</span></td><td>${estimateStatusDate(record)}</td>`;
  }
  if(type==='invoices'){
    const displayStatus=invoiceDisplayStatus(record);
    return `<td><strong>${escapeHtml(record.id || 'Invoice')}</strong></td><td>${escapeHtml(record.customer || '-')}</td><td>${displayDate(record.invoiced)}</td><td>${displayDate(record.due)}</td><td><strong>${money(invoiceTotal(record))}</strong></td><td class="invoice-paid-value"><strong>${money(invoicePaidAmount(record))}</strong></td><td class="invoice-due-value"><strong>${money(invoiceDueAmount(record))}</strong></td><td><span class="status ${displayStatus}">${escapeHtml(invoiceStatusLabel(displayStatus))}</span></td><td>${displayDate(record.paid)}</td>`;
  }
  if(type==='crew'){
    const crew=mergedCrewDetails(record);
    return `<td><strong>${escapeHtml(crew.name || 'Crew member')}</strong></td><td>${escapeHtml(crew.role || 'Crew Member')}</td><td>${escapeHtml(crew.email || 'Not added')}</td><td>${escapeHtml(crew.phone || 'Not added')}</td><td><span class="status ${isCrewActive(crew)?'progress':'cancelled'}">${isCrewActive(crew)?'Active':'Inactive'}</span></td><td>${escapeHtml(crew.availability || 'Not added')}</td><td>${escapeHtml(crew.skills || 'Not added')}</td>`;
  }
  if(type==='teamAccounts'){
    return `<td><strong>${escapeHtml(record.name || 'User login')}</strong></td><td>${escapeHtml(record.email || 'Not added')}</td><td>${escapeHtml(roleLabel(record))}</td><td><span class="status ${normalizeText(record.employmentStatus)==='inactive'?'cancelled':'progress'}">${escapeHtml(record.employmentStatus || 'Active')}</span></td>`;
  }
  if(type==='services'){
    const status=normalizeText(record.status)==='inactive'?'inactive':'active';
    const jobs=state.jobs.filter(job=>normalizeText(job.service)===normalizeText(record.name));
    const customers=state.customers.filter(customer=>normalizeText(customer.service)===normalizeText(record.name));
    return `<td><strong>${escapeHtml(record.name || 'Service')}</strong><div class="muted archived-cell-sub">${escapeHtml(record.description || '')}</div></td><td><strong>${money(record.rate || 0)}</strong></td><td>${Number(record.duration || 0)} hr${Number(record.duration || 0)===1?'':'s'}</td><td><strong>${jobs.length}</strong> jobs<div class="muted archived-cell-sub">${customers.length} customers</div></td><td><strong class="service-total-amount">${money(jobs.reduce((sum,job)=>sum+Number(job.price || 0),0))}</strong></td><td><span class="status ${status==='active'?'progress':'cancelled'}">${status==='active'?'Active':'Inactive'}</span></td>`;
  }
  const display=deletedRecordDisplay(type,record);
  return `<td><strong>${escapeHtml(display.primary)}</strong></td><td>${escapeHtml(display.secondary || '-')}</td>`;
}
function normalizeWorkspaceCandidate(raw){
  if(!raw || typeof raw !== 'object') return null;
  const data = raw.data || raw.workspace || raw.state || raw;
  if(!data || typeof data !== 'object') return null;
  if(workspaceRecordCount(data) === 0) return null;
  return {
    customers: Array.isArray(data.customers) ? data.customers : [],
    services: Array.isArray(data.services) ? data.services : freshDefaultServices(),
    jobs: Array.isArray(data.jobs) ? data.jobs : [],
    estimates: Array.isArray(data.estimates) ? data.estimates : [],
    invoices: Array.isArray(data.invoices) ? data.invoices : [],
    crew: Array.isArray(data.crew) ? data.crew : [],
    teamAccounts: Array.isArray(data.teamAccounts) ? data.teamAccounts : [],
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    settings: {...defaultSettings, ...(data.settings || {})}
  };
}
function findLegacyLocalWorkspace(){
  const matches = [];
  for(let index = 0; index < localStorage.length; index += 1){
    const key = localStorage.key(index);
    if(!key || key === USER_KEY || key.startsWith(LEGACY_IMPORT_DONE_KEY)) continue;
    const value = localStorage.getItem(key);
    if(!value || value.length < 10) continue;
    try {
      const candidate = normalizeWorkspaceCandidate(JSON.parse(value));
      if(candidate){
        matches.push({
          key,
          data: candidate,
          count: workspaceRecordCount(candidate)
        });
      }
    } catch (_) {
      // Ignore unrelated browser storage values.
    }
  }
  matches.sort((first, second) => {
    const firstPreferred = first.key === 'greenops-data' ? 1 : 0;
    const secondPreferred = second.key === 'greenops-data' ? 1 : 0;
    return secondPreferred - firstPreferred || second.count - first.count;
  });
  return matches[0] || null;
}
async function restoreLegacyWorkspaceIfNeeded(){
  try {
    const markerKey = legacyImportMarkerKey();
    if(!currentUser || localStorage.getItem(markerKey)) return false;
    if(workspaceRecordCount(state) > 0) return false;
    const legacy = findLegacyLocalWorkspace();
    if(!legacy) return false;
    const sourceValue = localStorage.getItem(legacy.key);
    if(sourceValue){
      const backupKey = `greenops_legacy_backup:${workspaceOwnerEmail()}:${Date.now()}`;
      localStorage.setItem(backupKey, sourceValue);
    }
    applyLoadedData({...emptyData(), ...legacy.data});
    await saveWorkspaceToBackend();
    localStorage.setItem(markerKey, `imported:${legacy.key}`);
    showToast('Previous data restored');
    return true;
  } catch (error) {
    console.warn('Previous data restore failed:', error.message);
    return false;
  }
}
function loadData(user=currentUser){
  return emptyData();
}
function save(){
  scheduleBackendSave();
}
function applyLoadedData(next){
  state.customers = Array.isArray(next?.customers) ? next.customers : [];
  state.services = Array.isArray(next?.services) ? next.services : freshDefaultServices();
  state.jobs = Array.isArray(next?.jobs) ? next.jobs : [];
  // Recalculate multi-crew schedule status after loading existing workspace
  // data so older records also follow the same all-crews-complete rule.
  state.jobs.forEach(job=>{
    if(Object.keys(job?.crewProgress || {}).length) refreshOverallCrewJobStatus(job);
  });
  state.estimates = Array.isArray(next?.estimates) ? next.estimates : [];
  state.invoices = Array.isArray(next?.invoices) ? next.invoices : [];
  state.crew = Array.isArray(next?.crew) ? next.crew : [];
  state.teamAccounts = Array.isArray(next?.teamAccounts)
    ? next.teamAccounts.map(({password, ...account}) => account)
    : [];
  state.notifications = Array.isArray(next?.notifications) ? next.notifications : [];
  state.settings = {...defaultSettings, ...(next?.settings || {})};
  if(currentUser && isAdminUser(currentUser) && state.settings.adminProfile){
    currentUser={...currentUser,...state.settings.adminProfile,email:currentUser.email};
    localStorage.setItem(USER_KEY,JSON.stringify(currentUser));
  }
  selectedJob = state.jobs[0] || null;
  selectedCustomer = null;
  selectedService = null;
  selectedEstimate = null;
  selectedInvoice = null;
}
async function saveWorkspaceToBackend(){
  if(!currentUser) return false;
  const ownerEmail = workspaceOwnerEmail();
  if(!ownerEmail) return false;
  await apiRequest('/workspace/save', {
    ownerEmail,
    updatedBy: currentUser.email || '',
    data: workspacePayload()
  });
  backendStorageReady = true;
  return true;
}
function scheduleBackendSave(){
  if(!currentUser) return;
  clearTimeout(backendSaveTimer);
  backendSaveTimer = setTimeout(() => {
    saveWorkspaceToBackend().catch(error => {
      backendStorageReady = false;
      console.warn('Backend storage save failed:', error.message);
    });
  }, 300);
}
async function loadWorkspaceFromBackend(user=currentUser){
  const ownerEmail = workspaceOwnerEmail(user);
  if(!ownerEmail) return null;
  const result = await apiGet(`/workspace/${encodeURIComponent(ownerEmail)}`);
  return result.data || null;
}
async function syncWorkspaceFromBackend(){
  if(!currentUser) return false;
  try {
    const remote = await loadWorkspaceFromBackend(currentUser);
    if(remote && workspaceRecordCount(remote) > 0){
      applyLoadedData({...emptyData(), ...remote});
    } else {
      // When a signed-in workspace is empty, recover records from this browser's
      // previous GreenOps workspace first. The restore routine creates a local
      // backup before it writes anything to the signed-in workspace.
      applyLoadedData(emptyData());
      const restored = await restoreLegacyWorkspaceIfNeeded();
      // Do not create or save an empty workspace automatically. It will be
      // created only when this account saves actual records.
      if(!restored) backendStorageReady = true;
    }
    backendStorageReady = true;
    return true;
  } catch (error) {
    backendStorageReady = false;
    console.warn('Backend storage load failed:', error.message);
    return false;
  }
}
function switchUserData(){
  applyLoadedData(emptyData());
  currentView = defaultViewForCurrentUser();
  syncWorkspaceFromBackend().then(success => {
    if(success) render();
  });
}
const state = loadData();
async function initializeApp(){
  const authenticatedUser = window.greenopsAuth?.currentUser?.();
  if(!authenticatedUser){
    currentUser = null;
    localStorage.removeItem(USER_KEY);
    return true;
  }
  let isCompletingAdminRegistration = false;
  try {
    await authenticatedUser.reload();
    const pendingAdminEmail = normalizeEmailText(localStorage.getItem(PENDING_ADMIN_VERIFICATION_KEY));
    isCompletingAdminRegistration = pendingAdminEmail
      && pendingAdminEmail === normalizeEmailText(authenticatedUser.email);
    try {
      const result = await apiGet('/auth/me');
      if(result?.user) rememberUser(result.user);
    } catch (error) {
      if(error.status !== 404) throw error;
      const result = await apiRequest('/auth/register-profile', {});
      if(result?.user) rememberUser(result.user);
    }
  } catch (error) {
    try { await window.greenopsAuth?.signOut?.(); } catch (_) {}
    currentUser = null;
    localStorage.removeItem(USER_KEY);
    console.warn('Profile load failed:', error.message);
    return true;
  }
  await syncWorkspaceFromBackend();
  if(isCompletingAdminRegistration){
    localStorage.removeItem(PENDING_ADMIN_VERIFICATION_KEY);
    startupToastMessage = 'Email verified. Your Admin account is ready';
  }
  return true;
}
function startCustomerWorkspaceSync(){
  clearInterval(customerWorkspaceSyncTimer);
  if(!isCustomerUser()) return;
  // Customer accounts are read-only. Refresh their shared records regularly
  // so a newly sent job, estimate, invoice, or notification appears without a
  // separate sign-out/sign-in step.
  customerWorkspaceSyncTimer=setInterval(async()=>{
    if(document.hidden || !isCustomerUser()) return;
    if(await syncWorkspaceFromBackend()) render();
  },20000);
}

// Global event delegation for modals
document.addEventListener('click', (e) => {
  const editOwnCustomerProfileBtn = e.target.closest('#editCustomerOwnProfile');
  const deleteOwnCustomerProfileBtn = e.target.closest('#deleteCustomerOwnProfile');
  if(editOwnCustomerProfileBtn || deleteOwnCustomerProfileBtn){
    if(!isCustomerUser()) return;
    e.preventDefault();
    const customer=state.customers.find(item=>String(item.id || '')===String(currentUser.customerId || '') || normalizeEmailText(item.email)===normalizeEmailText(currentUser.email));
    if(!customer){ showToast('Your customer profile is not linked yet.','error'); return; }
    if(editOwnCustomerProfileBtn) openCustomerOwnProfileModal(customer);
    else deleteCustomerOwnProfile(customer);
    return;
  }
  const editCustomerBtn = e.target.closest('[data-edit-customer]');
  const deleteCustomerBtn = e.target.closest('[data-delete-customer]');
  const viewCustomerBtn = e.target.closest('[data-customer]');
  const editServiceBtn = e.target.closest('[data-edit-service]');
  const deleteServiceBtn = e.target.closest('[data-delete-service]');
  const viewServiceRow = e.target.closest('[data-service-detail]');
  const editJobBtn = e.target.closest('[data-edit-job]');
  const deleteJobBtn = e.target.closest('[data-delete-job]');
  const editEstimateBtn = e.target.closest('[data-edit-estimate]');
  const deleteEstimateBtn = e.target.closest('[data-delete-estimate]');
  const viewInvoiceBtn = e.target.closest('[data-view-invoice]');
  const editInvoiceBtn = e.target.closest('[data-edit-invoice]');
  const deleteInvoiceBtn = e.target.closest('[data-delete-invoice]');
  const viewCrewBtn = e.target.closest('[data-crew-detail]');
  const editCrewBtn = e.target.closest('[data-edit-crew]');
  const deleteCrewBtn = e.target.closest('[data-delete-crew]');

  if((isCrewUser() || isCustomerUser()) && (editCustomerBtn || deleteCustomerBtn || viewCustomerBtn || editServiceBtn || deleteServiceBtn || viewServiceRow || editEstimateBtn || deleteEstimateBtn || viewInvoiceBtn || editInvoiceBtn || deleteInvoiceBtn || viewCrewBtn || editCrewBtn || deleteCrewBtn)){ e.preventDefault(); e.stopPropagation(); showToast(isCustomerUser() ? 'Customer accounts can only view their own profile' : 'Crew can only access assigned jobs'); return; }
  if(editCustomerBtn){ e.preventDefault(); e.stopPropagation(); const customer = state.customers.find(c => c.id == editCustomerBtn.dataset.editCustomer); if(customer) openEditCustomerModal(customer); return; }
  if(deleteCustomerBtn){ e.preventDefault(); e.stopPropagation(); deleteCustomerById(deleteCustomerBtn.dataset.deleteCustomer); return; }
  if(viewCustomerBtn && e.target.closest('a')) return;
  if(viewCustomerBtn){ e.preventDefault(); e.stopPropagation(); selectedCustomer = viewCustomerBtn.dataset.customer; currentView = 'customerProfile'; render(); return; }
  if(editServiceBtn){ e.preventDefault(); e.stopPropagation(); const service=state.services.find(item=>String(item.id)===String(editServiceBtn.dataset.editService)); if(service) openServiceModal(service); return; }
  if(deleteServiceBtn){ e.preventDefault(); e.stopPropagation(); deleteServiceById(deleteServiceBtn.dataset.deleteService); return; }
  if(viewServiceRow){ e.preventDefault(); e.stopPropagation(); selectedService=viewServiceRow.dataset.serviceDetail; currentView='serviceDetail'; render(); return; }
  if(editJobBtn){ e.preventDefault(); e.stopPropagation(); const job = state.jobs.find(j => j.id == editJobBtn.dataset.editJob); if(job) openEditJobModal(job); return; }
  if(deleteJobBtn){ e.preventDefault(); e.stopPropagation(); deleteJobById(deleteJobBtn.dataset.deleteJob); return; }
  if(editEstimateBtn){ e.preventDefault(); e.stopPropagation(); const estimate = state.estimates.find(x => x.id === editEstimateBtn.dataset.editEstimate); if(estimate) openEditEstimateModal(estimate); return; }
  if(deleteEstimateBtn){ e.preventDefault(); e.stopPropagation(); deleteEstimateById(deleteEstimateBtn.dataset.deleteEstimate); return; }
  if(viewInvoiceBtn){ e.preventDefault(); e.stopPropagation(); selectedInvoice = viewInvoiceBtn.dataset.viewInvoice; currentView = 'invoiceDetail'; render(); return; }
  if(editInvoiceBtn){ e.preventDefault(); e.stopPropagation(); const invoice = state.invoices.find(x => x.id === editInvoiceBtn.dataset.editInvoice); if(invoice) openEditInvoiceModal(invoice); return; }
  if(deleteInvoiceBtn){ e.preventDefault(); e.stopPropagation(); deleteInvoiceById(deleteInvoiceBtn.dataset.deleteInvoice); return; }
  if(editCrewBtn){ e.preventDefault(); e.stopPropagation(); openEditCrewModal(Number(editCrewBtn.dataset.editCrew)); return; }
  if(deleteCrewBtn){ e.preventDefault(); e.stopPropagation(); deleteCrewByIndex(Number(deleteCrewBtn.dataset.deleteCrew)); return; }
  if(viewCrewBtn){ e.preventDefault(); e.stopPropagation(); selectedCrewIndex = Number(viewCrewBtn.dataset.crewDetail); currentView = 'crewDetail'; render(); return; }

  if(e.target.id === 'newJob' || e.target.id === 'mobileNewJob') { e.preventDefault(); e.stopPropagation(); if(isCrewUser()) showToast('Crew cannot create jobs'); else openJobModal(); return; }
  if(e.target.id === 'newCustomer') { e.preventDefault(); e.stopPropagation(); if(hasManagementAccess()) openCustomerModal(); else showToast('Crew cannot add customers'); return; }
  if(e.target.id === 'newService') { e.preventDefault(); e.stopPropagation(); if(hasManagementAccess()) openServiceModal(); else showToast('Crew cannot add services'); return; }
  if(e.target.id === 'newEstimate') { e.preventDefault(); e.stopPropagation(); if(hasManagementAccess()) openEstimateModal(); else showToast('Crew cannot create estimates'); return; }
  if(e.target.id === 'newInvoice') { e.preventDefault(); e.stopPropagation(); if(hasManagementAccess()) openInvoiceModal(); else showToast('Crew cannot create invoices'); return; }
  if(e.target.id === 'addMember') { e.preventDefault(); e.stopPropagation(); if(hasManagementAccess()) openCrewModal(); else showToast('Crew cannot add members'); return; }
}, true);
document.addEventListener('invalid', e=>{
  const input=e.target;
  if(!input.matches?.('input,select,textarea')) return;
  input.classList.add('field-invalid');
  const field=input.closest('.field,label');
  if(field && !field.querySelector('.field-error')){
    const error=document.createElement('small');
    error.className='field-error';
    error.textContent=input.validity.valueMissing ? 'This field is required.' : 'Please enter a valid value.';
    field.appendChild(error);
  }
}, true);
document.addEventListener('input',e=>{
  const input=e.target;
  if(!input.matches?.('input,select,textarea')) return;
  input.classList.remove('field-invalid');
  input.closest('.field,label')?.querySelector('.field-error')?.remove();
}, true);
let currentView = 'dashboard';
let selectedJob = state.jobs[0] || null;
let selectedJobTab = 'details';
let crewPageTab = 'profile';
let crewJobListFilter = 'all';
let crewJobSearchQuery = '';
let customerPortalTab = 'overview';
let customerPortalSearchQuery = '';
let customerPortalListFilter = 'all';
let customerPortalSelectedRecord = null;
let selectedSettingsTab = 'company';
let selectedCustomer = null;
let selectedService = null;
let serviceHistoryJobsExpandedFor = '';
let serviceHistoryEstimatesExpandedFor = '';
let customerHistoryExpanded = {customerId:'',jobs:false,estimates:false,paidInvoices:false,invoices:false,payments:false};
let selectedEstimate = null;
let selectedInvoice = null;
let selectedDeletedDataType = '';
let selectedCrewIndex = null;
let toastTimer;
window.openServiceHistory = (event, serviceId) => {
  event?.preventDefault();
  event?.stopPropagation();
  selectedService = serviceId;
  serviceHistoryJobsExpandedFor = '';
  serviceHistoryEstimatesExpandedFor = '';
  currentView = 'serviceDetail';
  render();
  return false;
};
window.openScheduleDetails = (jobId, crewName='') => {
  const job=state.jobs.find(item=>String(item.id)===String(jobId));
  if(!job) return false;
  selectedDate=job.date;
  selectedScheduleJobId=job.id;
  selectedScheduleCrewName=crewName || '';
  currentView='scheduleDetail';
  render();
  return false;
};
window.deleteSchedule = async (jobId) => {
  const job=state.jobs.find(item=>String(item.id)===String(jobId));
  if(!job || !hasManagementAccess()) return false;
  const label=scheduleJobNumber(job);
  if(!window.confirm(`Delete the schedule for ${label}? The job record, billing, and history will be kept.`)) return false;

  // This removes only the calendar assignment; the underlying job remains.
  Object.assign(job,{isScheduled:false,scheduledAt:null,assignedCrews:[],crew:'',crewProgress:{},status:'notstarted',statusDate:todayISO()});
  recordAudit(job,'Schedule deleted','Removed the crew assignment and calendar schedule.');
  addWorkspaceNotification({audience:'management',kind:'job',id:job.id,severity:'info',title:'Schedule deleted',detail:`${label} was removed from the calendar.`});
  save();
  await saveToFirebase('jobs',job);
  selectedDate=null;
  selectedScheduleJobId=null;
  currentView='schedule';
  showToast(`${label} removed from the schedule`);
  render();
  return true;
};
let scheduleDate = new Date();
let scheduleView = 'week';
let selectedDate = null;
let selectedScheduleJobId = null;
// A calendar block represents one crew assignment.  Keep that selection so
// its dedicated details page never shows a different crew's progress.
let selectedScheduleCrewName = '';
let scheduleSearchQuery = '';
let scheduleTableStatusFilter = 'all';
let jobListFilter = 'all';
let jobSearchQuery = '';
let estimateListFilter = 'all';
let estimateSearchQuery = '';
let invoiceListFilter = 'all';
let invoiceSearchQuery = '';
const TABLE_PAGE_SIZE = 15;
const tablePaginationPages = Object.create(null);
const tablePaginationSignatures = Object.create(null);
let jobServiceFilter = '';
let estimateServiceFilter = '';
let jobCustomerFilter = '';
let jobCrewFilter = '';
let estimateCustomerFilter = '';
let invoiceCustomerFilter = '';
let jobDateRange = {start:'',end:''};
let estimateDateRange = {start:'',end:''};
let crewListFilter = 'all';
let crewSearchQuery = '';
let reportRange = 'week';
let reportCustomStart = '';
let reportCustomEnd = '';
let invoiceDrilldown = {service:'',start:'',end:'',aging:''};
let liveWeatherState = { temperature: null, condition: 'Loading weather', location: '', loaded: false };
let liveWidgetTimer = null;
let liveWeatherTimer = null;
let activeSaveCount = 0;

function recordAudit(record, action, details=''){
  if(!record || record.deleted) return;
  const entry = {
    id:`AUD-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    action,
    details,
    user:currentUser?.name || currentUser?.email || 'System',
    at:new Date().toISOString()
  };
  const history = Array.isArray(record.history) ? record.history : [];
  const last = history[history.length - 1];
  if(last && last.action === action && last.user === entry.user && Date.now() - new Date(last.at).getTime() < 1500) return;
  record.history = [...history, entry].slice(-50);
}

function auditTrail(record){
  const history = newestFirst(Array.isArray(record?.history) ? record.history : []);
  return `<div class="audit-timeline">
    ${history.length ? history.slice(0,8).map(entry=>`<div class="audit-entry">
      <span class="audit-dot"></span><div><strong>${escapeHtml(entry.action || 'Updated')}</strong>
      <p>${escapeHtml(entry.details || '')}</p><small>${escapeHtml(entry.user || 'System')} &middot; ${displayDateTime(entry.at)}</small></div>
    </div>`).join('') : `<div class="empty-state compact"><span class="empty-state-icon">${icon('history')}</span><div><strong>No activity yet</strong><p>Changes to this record will appear here.</p></div></div>`}
  </div>`;
}

function updateSavingIndicator(){
  document.body.classList.toggle('is-saving', activeSaveCount > 0);
  const indicator = document.getElementById('saveIndicator');
  if(indicator) indicator.textContent = activeSaveCount > 0 ? 'Saving…' : 'Saved';
}

async function saveToFirebase(docType, data) {
  if(docType==='jobs' && data?.crew && hasManagementAccess() && !data.assignmentNotifiedAt && Date.now()-Number(data.createdAt || 0)<5000){
    data.assignmentNotifiedAt=Date.now();
    addWorkspaceNotification({audience:`crew:${data.crew}`,kind:'job',id:data.id,severity:'info',title:`New job assigned: ${data.service}`,detail:`${data.customer} · ${displayDate(data.date)} · ${data.time || 'Time not set'}`});
  }
  if(['jobs','estimates','invoices'].includes(docType) && data && !data.deleted){
    const label = docType.slice(0,-1);
    const lastAudit = Array.isArray(data.history) ? data.history[data.history.length - 1] : null;
    const hasFreshSpecificAudit = lastAudit && Date.now() - new Date(lastAudit.at).getTime() < 1500;
    if(!hasFreshSpecificAudit) recordAudit(data, data.history?.length ? `${cap(label)} updated` : `${cap(label)} created`);
  }
  save();
  activeSaveCount += 1;
  updateSavingIndicator();
  try {
    await saveWorkspaceToBackend();
  } catch (error) {
    backendStorageReady = false;
    console.warn(`${docType || 'Workspace'} backend save failed:`, error.message);
  } finally {
    activeSaveCount = Math.max(0, activeSaveCount - 1);
    updateSavingIndicator();
  }
  return data?.id || null;
}

const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const icons = {
  dashboard: icon('layout-dashboard'),
  customers: icon('users'),
  services: icon('wrench'),
  schedule: icon('calendar-days'),
  estimates: icon('file-text'),
  jobs: icon('briefcase-business'),
  invoices: icon('receipt-text'),
  crew: icon('hard-hat'),
  teamAccounts: icon('user-round-check'),
  reports: icon('chart-no-axes-combined'),
  subscription: icon('credit-card'),
  settings: icon('settings'),
  myProfile: icon('circle-user-round'),
  crewProfile: icon('circle-user-round'),
  crewView: icon('clipboard-list'),
  customerProfile: icon('user-round'),
  customerEstimates: icon('file-text'),
  customerJobs: icon('briefcase-business'),
  customerInvoices: icon('receipt-text'),
  clock: icon('clock-3')
};
const navItems = ['dashboard','schedule','customers','services','estimates','jobs','invoices','crew','reports','settings'];
const adminNavItems = ['dashboard','schedule','customers','services','estimates','jobs','invoices','crew','reports','subscription','myProfile','settings'];
const administratorNavItems = ['myProfile','schedule','customers','services','estimates','jobs','invoices','crew'];
const crewNavItems = ['crewProfile','crewView'];
const customerNavItems = ['customerProfile','customerEstimates','customerJobs','customerInvoices'];
function navLabel(view){
  if(view === 'customerProfile') return 'My Profile';
  if(view === 'customerEstimates') return 'Estimates';
  if(view === 'customerJobs') return 'Jobs';
  if(view === 'customerInvoices') return 'Invoices';
  if(view === 'customerRecordDetail') return 'Record Details';
  if(view === 'crewProfile') return 'Profile';
  if(view === 'crewView') return 'My Jobs';
  if(view === 'crewJobDetail') return 'Job Details';
  if(view === 'scheduleDetail') return selectedScheduleCrewName ? `${selectedScheduleCrewName} Schedule Details` : 'Job Schedule Details';
  if(view === 'myProfile') return 'My Profile';
  if(view === 'serviceDetail') return 'Service History';
  return cap(view);
}

function todayISO(){ return toISODate(new Date()); }
function toISODate(date){
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function startOfWeek(date){
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0,0,0,0);
  return d;
}
function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function parseJobHour(time){
  const raw = String(time || '').trim();
  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?(?:\s*-\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)?$/i);
  if(!match) return 8;
  let hour = Number(match[1]);
  const period = (match[3] || '').toUpperCase();
  if(period === 'PM' && hour !== 12) hour += 12;
  if(period === 'AM' && hour === 12) hour = 0;
  return hour;
}
function scheduleBucketFor(time){
  const hour = parseJobHour(time);
  if(hour < 6) return 6;
  if(hour >= 20) return 20;
  // The calendar is organised into two-hour work windows, from 6 AM to 10 PM.
  return Math.floor(hour / 2) * 2;
}
function scheduleBlockClass(job){
  const text = normalizeText(`${job.service || ''} ${scheduleDisplayStatus(job)}`);
  if(text.includes('cleanup') || text.includes('spring')) return 'pink';
  if(text.includes('irrigation') || text.includes('inspection')) return 'yellow';
  if(text.includes('completed')) return 'purple';
  return 'green';
}
function scheduleDisplayStatus(job){
  if(job?.assignmentScheduleStatus) return job.assignmentScheduleStatus;
  // Assignment entries carry an explicit (possibly blank) crew-level status.
  // Do not let another crew's reschedule label leak into this calendar card.
  if(Object.prototype.hasOwnProperty.call(job || {},'assignmentScheduleStatus')){
    return job?.status === 'invoiced' ? 'completed' : (job?.status || 'scheduled');
  }
  // Invoicing is a billing state, not a scheduling state.  Once invoiced,
  // the calendar continues to show the completed work state.
  if(job?.status === 'invoiced') return 'completed';
  // Rescheduled is a calendar state. It remains visible until a crew member
  // starts work, after which the live crew progress becomes the job status.
  if(job?.status === 'scheduled' && job?.scheduleStatus === 'rescheduled') return 'rescheduled';
  return job?.status || 'scheduled';
}
function canRescheduleJob(job){
  // A reschedule is only valid before any work starts or finishes. Completed
  // (and in-progress) jobs keep their actual work history unchanged.
  return Boolean(job?.isScheduled) && job?.status==='scheduled';
}
function scheduleJobNumber(job){
  return `JOB-${String(job?.id || '').replace(/^#?JOB-/i,'')}`;
}
function uniqueScheduleJobs(jobs){
  const statusRank={cancelled:0,scheduled:1,progress:2,completed:3,invoiced:4};
  const unique=new Map();
  (Array.isArray(jobs) ? jobs : []).forEach(job=>{
    const key=[job.date,job.time,job.customer,job.service,job.address,job.crew]
      .map(value=>normalizeText(value))
      .join('|');
    const existing=unique.get(key);
    const jobRank=statusRank[job.status] ?? 0;
    const existingRank=statusRank[existing?.status] ?? -1;
    if(!existing || jobRank>existingRank || (jobRank===existingRank && Number(job.id || 0)>Number(existing.id || 0))){
      unique.set(key,job);
    }
  });
  return [...unique.values()];
}
function assignedCrewNames(job){
  const assigned=Array.isArray(job?.assignedCrews) ? job.assignedCrews.filter(Boolean) : [];
  return assigned.length ? [...new Set(assigned)] : (job?.crew ? [job.crew] : []);
}
function mergeAssignedCrewNames(...crewLists){
  const seen=new Set();
  return crewLists.flat().filter(Boolean).reduce((names,name)=>{
    const normalized=normalizeText(name);
    if(normalized && !seen.has(normalized)){
      seen.add(normalized);
      names.push(String(name).trim());
    }
    return names;
  },[]);
}
function crewProgressKey(name){ return normalizeText(name); }
function crewScheduleForJob(job, crewName){
  const saved=job?.crewSchedules?.[crewProgressKey(crewName)] || {};
  // Older jobs had one appointment shared by every crew member. Retain that
  // appointment as the fallback while newer schedules are stored per crew.
  return {
    name:crewName,
    date:saved.date || job?.date || '',
    time:saved.time || job?.time || '',
    scheduleStatus:saved.scheduleStatus || ''
  };
}
function crewJobProgress(job, crewName){
  const saved=job?.crewProgress?.[crewProgressKey(crewName)] || {};
  // A crew member's progress is individual. Another crew member starting a
  // job must not make this crew member appear to have started too.
  const fallbackStatus=['completed','invoiced'].includes(job?.status) ? 'completed' : 'scheduled';
  const status=saved.status || fallbackStatus;
  const startedAt=saved.startedAt || (['progress','completed'].includes(status) ? (job?.startedAt || job?.statusDate || '') : '');
  const completedAt=saved.completedAt || (status==='completed' ? (job?.completedAt || job?.completedDate || job?.statusDate || '') : '');
  return {name:crewName, status, startedAt, completedAt};
}
function crewProgressRows(job){ return assignedCrewNames(job).map(name=>crewJobProgress(job,name)); }
function overallCrewProgressStatus(job){
  const progress=crewProgressRows(job);
  if(!progress.length) return '';
  if(progress.every(item=>item.status==='completed')) return 'completed';
  // A job must stay scheduled while any assigned crew member has not begun.
  // It becomes in progress only after every assigned crew member has started.
  if(progress.some(item=>item.status==='scheduled')) return 'scheduled';
  if(progress.some(item=>item.status==='progress')) return 'progress';
  return 'scheduled';
}
function sendIncompleteJobReminders(){
  // A single daily reminder is created by a management account for each crew
  // member whose scheduled job has not been completed. The date marker keeps
  // dashboard refreshes from creating duplicate notifications.
  if(!hasManagementAccess()) return;
  const today=todayISO();
  let changed=false;
  state.jobs.filter(isJobScheduled).forEach(job=>{
    if(!job.date || String(job.date)>today || ['completed','invoiced','cancelled'].includes(job.status)) return;
    crewProgressRows(job).filter(row=>row.status!=='completed').forEach(row=>{
      job.incompleteReminderDates ||= {};
      const key=crewProgressKey(row.name);
      if(job.incompleteReminderDates[key]===today) return;
      job.incompleteReminderDates[key]=today;
      addWorkspaceNotification({audience:`crew:${key}`,kind:'job',id:job.id,severity:'warning',title:'Job not finished',detail:`${scheduleJobNumber(job)} · ${job.service || 'Job'} is still ${jobStatusLabel(row.status).toLowerCase()}. Please update or complete it.`});
      changed=true;
    });
  });
  if(changed) save();
}
function refreshOverallCrewJobStatus(job){
  const progress=crewProgressRows(job);
  const overallStatus=overallCrewProgressStatus(job);
  if(!overallStatus) return;
  job.status=overallStatus;
  if(overallStatus==='completed'){
    job.completedAt=progress.map(item=>item.completedAt).filter(Boolean).sort().at(-1) || job.completedAt || new Date().toISOString();
  }
}
function updateCrewJobProgress(job, crewName, status){
  if(!job || !crewName) return;
  const now=new Date().toISOString();
  job.crewProgress ||= {};
  const previous=crewJobProgress(job,crewName);
  job.crewProgress[crewProgressKey(crewName)]={...previous,name:crewName,status,startedAt:status==='progress' ? (previous.startedAt || now) : previous.startedAt,completedAt:status==='completed' ? (previous.completedAt || now) : previous.completedAt};
  refreshOverallCrewJobStatus(job);
  // Keep an explicit crew action from being replaced by the calendar's
  // time-based automatic status calculation.
  job.crewStatusManaged=true;
  job.statusDate=todayISO();
}
function isCrewAssignedToJob(job, crewName){
  return assignedCrewNames(job).some(name=>normalizeText(name)===normalizeText(crewName));
}
// A job can be created before it is placed on the crew calendar.  Keep that
// distinction explicit so the Schedule page shows only jobs scheduled by an
// administrator through the "Schedule Job" action.
function isJobScheduled(job){
  if(!job) return false;
  if(job.isScheduled === true || job.scheduledAt) return true;
  if(job.isScheduled === false) return false;
  // Preserve visibility for older records created before this flag existed.
  return assignedCrewNames(job).length > 0;
}
function scheduleAssignmentEntries(jobs){
  return (Array.isArray(jobs) ? jobs : []).filter(isJobScheduled).flatMap(job=>{
    const crews=assignedCrewNames(job);
    return (crews.length ? crews : ['Crew not assigned']).map(crew=>{
      const assignment=crewScheduleForJob(job,crew);
      return {...job,crew,assignmentCrew:crew,date:assignment.date,time:assignment.time,assignmentScheduleStatus:assignment.scheduleStatus};
    });
  });
}
function localTodayISO(){
  const now = localNowParts();
  return `${now.year}-${String(now.month).padStart(2,'0')}-${String(now.day).padStart(2,'0')}`;
}
function nextNumericId(items, start=1001){ const ids = items.map(x => Number(x.id)).filter(Number.isFinite); return ids.length ? Math.max(...ids) + 1 : start; }
function initials(name){ return (name || 'User').split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase(); }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }
function userRole(user=currentUser){ return (user?.role || 'admin').toLowerCase(); }
function roleLabel(user=currentUser){ const role=userRole(user); return role==='crew' ? 'Crew' : role==='administrator' ? 'Administrator' : role==='customer' ? 'Customer' : 'Admin'; }
function isCrewUser(user=currentUser){ return userRole(user)==='crew'; }
function isCustomerUser(user=currentUser){ return userRole(user)==='customer'; }
function isAdministratorUser(user=currentUser){ return userRole(user)==='administrator'; }
function isAdminUser(user=currentUser){ return userRole(user)==='admin'; }
function hasManagementAccess(user=currentUser){ return userRole(user)==='admin' || userRole(user)==='administrator'; }
function navForCurrentUser(){ return isCrewUser() ? crewNavItems : isCustomerUser() ? customerNavItems : isAdministratorUser() ? administratorNavItems : adminNavItems; }
function defaultViewForCurrentUser(){ return isCrewUser() ? 'crewProfile' : isCustomerUser() ? 'customerProfile' : isAdministratorUser() ? 'schedule' : 'dashboard'; }
function canOpenView(view){ return navForCurrentUser().includes(view) || (isCustomerUser() && view==='customerRecordDetail') || (isCrewUser() && ['jobDetail','crewJobDetail'].includes(view)) || (hasManagementAccess() && ['customerProfile','serviceDetail','estimateDetail','invoiceDetail','jobDetail','crewDetail','scheduleDetail'].includes(view)); }
function assignedJobs(){
  if(!isCrewUser()) return state.jobs;
  const crewName = String(currentUser?.name || '').trim();
  // A scheduled job can have more than one crew member. Use assignedCrews
  // (with the legacy primary crew as fallback) so every assigned person sees it.
  return uniqueScheduleJobs(state.jobs).filter(j => isCrewAssignedToJob(j,crewName)).sort((a,b) => {
    const aDone = ['completed','invoiced'].includes(a.status) ? 1 : 0;
    const bDone = ['completed','invoiced'].includes(b.status) ? 1 : 0;
    if(aDone !== bDone) return aDone - bDone;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}
function jobByIdAnyStorage(id){
  return state.jobs.find(j => String(j.id) === String(id)) || null;
}
function normalizeJobNumber(value){
  return String(value || '').trim().replace(/^#?\s*JOB\s*[-:#]?\s*/i,'').trim();
}
function jobByEnteredNumber(value){
  const number=normalizeJobNumber(value);
  return number ? state.jobs.find(job=>normalizeJobNumber(job.id)===number) || null : null;
}
function displayJobNumber(value){
  const number=normalizeJobNumber(value);
  return number ? `JOB-${number}` : '';
}
function normalizeText(value){
  return String(value || '').trim().toLowerCase();
}
function recordMatchesCustomer(record,customer){
  if(!record || !customer) return false;
  if(customer.id && record.customerId && String(record.customerId)===String(customer.id)) return true;
  return Boolean(normalizeText(record.customer) && normalizeText(record.customer)===normalizeText(customer.name));
}
function customerForFilter(value){
  return state.customers.find(customer=>String(customer.id)===String(value) || normalizeText(customer.name)===normalizeText(value)) || null;
}
function recordMatchesCustomerFilter(record,value){
  if(!value) return true;
  const customer=customerForFilter(value);
  return customer ? recordMatchesCustomer(record,customer) : normalizeText(record?.customer)===normalizeText(value);
}
function findCustomerForJob(job){
  if(!job?.customer) return null;
  const customerName = normalizeText(job.customer);
  return state.customers.find(c => normalizeText(c.name) === customerName) || null;
}
function findCrewRecordForUser(user=currentUser){
  const crewName = normalizeText(user?.name);
  const crewEmail = normalizeEmailText(user?.email);
  return state.crew.find(c => normalizeText(c.name) === crewName || (crewEmail && normalizeEmailText(c.email) === crewEmail)) || null;
}
function findCrewUserForRecord(crew={}){
  const crewName = normalizeText(crew.name);
  const crewEmail = normalizeEmailText(crew.email);
  const ownerEmail = normalizeEmailText(workspaceOwnerEmail());
  return getUsers().find(user => {
    if(userRole(user) !== 'crew') return false;
    const samePerson = (crewEmail && normalizeEmailText(user.email) === crewEmail) || (crewName && normalizeText(user.name) === crewName);
    const sameWorkspace = !user.ownerEmail || normalizeEmailText(user.ownerEmail) === ownerEmail;
    return samePerson && sameWorkspace;
  }) || null;
}
function mergedCrewDetails(crew={}){
  const user = findCrewUserForRecord(crew) || {};
  return {
    ...crew,
    name: crew.name || user.name || '',
    email: crew.email || user.email || '',
    phone: crew.phone || user.phone || '',
    address: crew.address || user.address || '',
    emergencyContact: crew.emergencyContact || user.emergencyContact || '',
    skills: crew.skills || user.skills || '',
    availability: crew.availability || user.availability || '',
    profileNotes: crew.profileNotes || user.profileNotes || '',
    photo: crew.photo || user.photo || ''
  };
}
function scheduledCrewRecipients(names=[]){
  return mergeAssignedCrewNames(names).map(name=>{
    const crew=state.crew.find(item=>normalizeText(item.name)===normalizeText(name)) || {name};
    const details=mergedCrewDetails(crew);
    return {name:details.name || name,email:details.email || '',phone:details.phone || ''};
  }).filter(recipient=>recipient.name);
}
async function notifyScheduledCrew(job,names=[]){
  const recipients=scheduledCrewRecipients(names);
  if(!recipients.length) return null;
  const result=await apiRequest('/jobs/notify-crew',{
    job:{id:job.id,customer:job.customer,service:job.service,date:job.date,time:job.time,address:job.address,notes:job.notes},
    company:{name:settings.companyName || 'GreenOps',email:settings.email || '',address:settings.address || '',phone:settings.phone || '',website:settings.website || ''},
    recipients
  });
  const delivered=Number(result.emailSent || 0) + Number(result.smsSent || 0) + Number(result.callSent || 0);
  if(delivered) showToast(`Crew notified: ${result.emailSent || 0} email${result.emailSent===1?'':'s'}, ${result.smsSent || 0} SMS, ${result.callSent || 0} call${result.callSent===1?'':'s'}`);
  return result;
}
function openPhoneAction(action,phone,name=''){
  const number=String(phone || '').trim();
  if(!number){
    showToast(`No phone number is available for ${name || 'this contact'}.`,'error');
    return;
  }
  const safeNumber=number.replace(/[^\d+]/g,'');
  if(action==='text'){
    const company=settings.companyName || 'GreenOps';
    window.location.href=`sms:${safeNumber}?body=${encodeURIComponent(`Hello ${name || ''}, this is ${company}.`)}`;
    return;
  }
  window.location.href=`tel:${safeNumber}`;
}
function phoneContactControls(phone,name='',showActions=true){
  const value=String(phone || '').trim();
  if(!value) return '<strong>Not added</strong>';
  const safeName=escapeHtml(name || 'contact');
  const actions=showActions ? `<span class="contact-quick-actions" aria-label="Contact ${safeName}"><button type="button" class="secondary contact-icon-button" data-phone-action="call" data-phone="${escapeHtml(value)}" data-contact-name="${safeName}" aria-label="Call ${safeName}" title="Call"><span aria-hidden="true">&#9742;</span></button><button type="button" class="secondary contact-icon-button" data-phone-action="text" data-phone="${escapeHtml(value)}" data-contact-name="${safeName}" aria-label="Text ${safeName}" title="Text message"><span aria-hidden="true">&#128172;</span></button></span>` : '';
  return `<div class="phone-value-with-actions"><strong><a href="tel:${escapeHtml(value)}" class="phone-number-link">${escapeHtml(value)}</a></strong>${actions}</div>`;
}
function localNowParts(){
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? 0 : parts.hour),
    minute: Number(parts.minute)
  };
}
function localComparableMinutes(parts){
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) / 60000);
}
function parseJobDateParts(dateValue){
  const text = String(dateValue || '').trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(match) return { year:Number(match[1]), month:Number(match[2]), day:Number(match[3]) };
  match = text.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})$/);
  if(match) return { year:Number(match[3]), month:Number(match[2]), day:Number(match[1]) };
  return null;
}
function parseJobTimeParts(timeValue){
  const text = String(timeValue || '').trim().toUpperCase();
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if(!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];
  if(meridiem === 'PM' && hour < 12) hour += 12;
  if(meridiem === 'AM' && hour === 12) hour = 0;
  if(hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}
function jobDurationMinutes(job){
  const text = normalizeText(job?.duration || '');
  const number = Number((text.match(/\d+(\.\d+)?/) || [])[0]);
  if(text.includes('full') || text.includes('day')) return 8 * 60;
  if(text.includes('min')) return Number.isFinite(number) && number > 0 ? Math.round(number) : 60;
  if(text.includes('hour') || text.includes('hr')) return Number.isFinite(number) && number > 0 ? Math.round(number * 60) : 120;
  return 120;
}
function autoJobStatus(job){
  if(!job) return 'scheduled';
  // Individual crew progress is authoritative for scheduled multi-crew jobs.
  // Check it before a prior overall "Completed" value can be retained.
  if(Object.keys(job.crewProgress || {}).length){
    const crewStatus=overallCrewProgressStatus(job);
    if(crewStatus) return crewStatus;
  }
  if(job.status === 'invoiced') return 'invoiced';
  if(job.status === 'completed') return 'completed';
  if(job.crewStatusManaged && ['scheduled','progress','completed'].includes(job.status)) return job.status;
  if(job.sourceEstimateId && job.status === 'scheduled') return 'scheduled';
  const date = parseJobDateParts(job.date);
  const time = parseJobTimeParts(job.time);
  if(!date || !time) return job.status || 'scheduled';
  const now = localComparableMinutes(localNowParts());
  const start = localComparableMinutes({...date, ...time});
  const end = start + jobDurationMinutes(job);
  if(now < start) return 'scheduled';
  if(now < end) return 'progress';
  return 'completed';
}
function syncJobStatuses(){
  let changed = false;
  state.jobs.forEach(job => {
    const next = autoJobStatus(job);
    if(job.status !== next){
      job.status = next;
      changed = true;
    }
  });
  if(changed) save();
}
function defaultCrewChecklist(){
  return [
    {text:'Mow front yard', done:true},
    {text:'Mow backyard', done:true},
    {text:'Edge all areas', done:false},
    {text:'Blow off driveway and walkways', done:false}
  ];
}
function ensureCrewJobFields(job){
  if(!job) return job;
  if(!Array.isArray(job.checklist)) job.checklist = defaultCrewChecklist();
  if(typeof job.notes !== 'string') job.notes = '';
  if(!Array.isArray(job.issues)) job.issues = [];
  if(!Array.isArray(job.photos)) job.photos = [];
  return job;
}
function saveAssignedJob(updatedJob){
  if(!updatedJob) return;
  updatedJob = ensureCrewJobFields(updatedJob);
  const idx = state.jobs.findIndex(j => j.id == updatedJob.id);
  if(idx >= 0){
    state.jobs[idx] = ensureCrewJobFields({...state.jobs[idx], ...updatedJob});
  } else {
    state.jobs.push(updatedJob);
  }
  save();
  // Persist crew changes immediately so every account receives the updated
  // overall job status from the shared workspace.
  void saveToFirebase('jobs',state.jobs[idx >= 0 ? idx : state.jobs.length - 1]);
  selectedJob = jobByIdAnyStorage(updatedJob.id) || updatedJob;
}
function readJobPhoto(file){
  return new Promise((resolve,reject)=>{
    if(!file?.type?.startsWith('image/')){ reject(new Error('Choose an image file')); return; }
    if(file.size > 5 * 1024 * 1024){ reject(new Error('Each photo must be 5 MB or smaller')); return; }
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('Unable to read this photo'));
    reader.readAsDataURL(file);
  });
}
function cleanCrewName(name){
  return String(name || '')
    .replace(/\s+Role:\s*.*$/i, '')
    .replace(/\s+Status:\s*.*$/i, '')
    .trim();
}
function normalizeState(){
  state.customers = state.customers.map(c => ({
    ...c,
    notes: c.notes || ''
  }));
  if(!Array.isArray(state.services)) state.services=freshDefaultServices();
  state.services=state.services.map((service,index)=>({
    ...service,
    id:service.id || `SRV-${Date.now()}-${index+1}`,
    name:String(service.name || 'Unnamed Service').trim(),
    category:'',
    description:service.description || '',
    rate:Math.max(0,Number(service.rate || 0)),
    duration:Math.max(0,Number(service.duration ?? 0) || 0),
    unit:'Per job',
    status:normalizeText(service.status)==='inactive' ? 'inactive' : 'active',
    taxable:false,
    createdAt:service.createdAt || Date.now()+index
  }));
  normalizeEstimateIds();
  normalizeInvoiceIds();
  state.invoices = state.invoices.map(invoice => normalizeInvoicePayment(invoice));
  state.jobs = state.jobs.map(job => ensureCrewJobFields({
    ...job,
    priority: job.priority || 'Medium',
    duration: job.duration || '2 hours',
    equipment: job.equipment || '',
    materials: job.materials || '',
    status: autoJobStatus(job)
  }));
  state.crew = state.crew.map(c => ({
    ...c,
    name: cleanCrewName(c.name),
    role: c.role || 'Crew Member',
    status: c.status || 'Working',
    jobs: Number(c.jobs || 0)
  }));
  save();
}
function recordTimestamp(item, index = 0){
  if(!item) return index;
  if(item.createdAt) return Number(item.createdAt) || new Date(item.createdAt).getTime() || index;
  const digits = String(item.id || '').replace(/\D/g, '');
  if(digits) return Number(digits);
  return index;
}
function newestFirst(items){
  return [...(items || [])].sort((a,b)=>recordTimestamp(b) - recordTimestamp(a));
}
function jobsForCrewToday(crew){
  const name = normalizeText(crew?.name);
  return uniqueScheduleJobs(state.jobs.filter(job => job.date === todayISO())).filter(job => isCrewAssignedToJob(job,name));
}
function isCrewWorkingToday(crew){
  return jobsForCrewToday(crew).length > 0;
}
function isCrewInactive(crew){
  return ['inactive','left','off'].includes(normalizeText(crew?.status || ''));
}
function isCrewActive(crew){
  return !isCrewInactive(crew);
}
function getSettings(){ return {...defaultSettings, ...(state.settings || {})}; }
function companyLogoMarkup(className='brand-mark'){
  const logo=String(getSettings().companyLogoDataUrl || '').trim();
  return `<div class="${className}">${logo ? `<img src="${escapeHtml(logo)}" alt="Company logo">` : '&#127793;'}</div>`;
}
function resizeCompanyLogo(file){
  return new Promise((resolve,reject)=>{
    if(!file || !file.type.startsWith('image/')) return reject(new Error('Choose an image file for the company logo.'));
    if(file.size > 4 * 1024 * 1024) return reject(new Error('Logo image must be smaller than 4 MB.'));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Unable to read the logo image.'));
    reader.onload=()=>{
      const image=new Image();
      image.onerror=()=>reject(new Error('Unable to load the logo image.'));
      image.onload=()=>{
        const longest=Math.max(image.width,image.height);
        const scale=Math.min(1,320/longest);
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.width*scale)); canvas.height=Math.max(1,Math.round(image.height*scale));
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.src=String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
function serviceCatalog(activeOnly=true){
  return newestFirst(state.services || [])
    .filter(service=>!activeOnly || service.status==='active')
    .sort((a,b)=>a.name.localeCompare(b.name));
}
function serviceNames(activeOnly=true){
  return [...new Set(serviceCatalog(activeOnly).map(service=>service.name).filter(Boolean))];
}
function serviceByName(name){
  return (state.services || []).find(service=>normalizeText(service.name)===normalizeText(name)) || null;
}
function currencyValue(n){
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}
function money(n){
  return new Intl.NumberFormat('en-US',{
    style:'currency',
    currency:'USD',
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }).format(currencyValue(n));
}
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function jobStatusLabel(status){
  return ({
    notstarted:'Not Started',
    pending:'Pending',
    scheduled:'Scheduled',
    rescheduled:'Rescheduled',
    progress:'In Progress',
    onhold:'On Hold',
    completed:'Completed',
    invoiced:'Invoiced',
    cancelled:'Cancelled'
  })[status] || cap(String(status || 'scheduled'));
}
function jobDisplayedStatus(job,billing=jobBillingSummary(job)){
  if(job?.status==='invoiced' && billing.status!=='Not invoiced'){
    const statusMap={
      Paid:{label:'Invoiced - Fully paid',cls:'paid'},
      'Partially Paid':{label:'Invoiced - Partially paid',cls:'partial'},
      Unpaid:{label:'Invoiced - Not paid yet',cls:'unpaid'},
      Overdue:{label:'Overdue',cls:'overdue'}
    };
    return statusMap[billing.status] || {label:'Invoiced',cls:'invoiced'};
  }
  return {label:jobStatusLabel(job?.status),cls:job?.status || 'scheduled'};
}
function splitJobTime(value){
  const match = String(value || '').trim().toUpperCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  return {
    hour: match ? String(Math.max(1, Math.min(12, Number(match[1])))) : '9',
    minute: match ? (match[2] || '00') : '00',
    period: match ? match[3] : 'AM'
  };
}
function jobTimeFields(value = '9:00 AM'){
  const parts = splitJobTime(value);
  const hours = Array.from({length: 12}, (_, i) => String(i + 1));
  const minutes = Array.from({length: 12}, (_, i) => String(i * 5).padStart(2, '0'));
  return `<div class="field"><label>Time</label><div class="time-select-row">
    <select name="jobHour" required>${hours.map(hour=>`<option value="${hour}" ${parts.hour===hour?'selected':''}>${hour}</option>`).join('')}</select>
    <select name="jobMinute" required>${minutes.map(minute=>`<option value="${minute}" ${parts.minute===minute?'selected':''}>${minute}</option>`).join('')}</select>
    <select name="jobPeriod" required><option value="AM" ${parts.period==='AM'?'selected':''}>AM</option><option value="PM" ${parts.period==='PM'?'selected':''}>PM</option></select>
  </div></div>`;
}
function jobTimeFromForm(formData){
  return `${formData.get('jobHour') || '9'}:${formData.get('jobMinute') || '00'} ${formData.get('jobPeriod') || 'AM'}`;
}
function scheduleTimeSlotFields(value = '9:00 AM'){
  const raw=String(value || '').trim().split(/\s*-\s*/)[0];
  const parts=splitJobTime(/(AM|PM)$/i.test(raw) ? raw : '9:00 AM');
  const hours=Array.from({length:12},(_,index)=>String(index+1));
  const minutes=Array.from({length:12},(_,index)=>String(index*5).padStart(2,'0'));
  return `<div class="field"><label>Time</label><div class="time-select-row">
    <select name="scheduleHour" required aria-label="Hour">${hours.map(hour=>`<option value="${hour}" ${parts.hour===hour?'selected':''}>${hour}</option>`).join('')}</select>
    <select name="scheduleMinute" required aria-label="Minute">${minutes.map(minute=>`<option value="${minute}" ${parts.minute===minute?'selected':''}>${minute}</option>`).join('')}</select>
    <select name="schedulePeriod" required aria-label="AM or PM"><option value="AM" ${parts.period==='AM'?'selected':''}>AM</option><option value="PM" ${parts.period==='PM'?'selected':''}>PM</option></select>
  </div></div>`;
}
function scheduleTimeFromForm(formData){
  return `${formData.get('scheduleHour') || '9'}:${formData.get('scheduleMinute') || '00'} ${formData.get('schedulePeriod') || 'AM'}`;
}
function bindServiceDefaults(form,{amountName='price',durationName='duration'}={}){
  const serviceSelect=form?.querySelector('[name="service"]');
  if(!serviceSelect) return;
  serviceSelect.addEventListener('change',()=>{
    const service=serviceByName(serviceSelect.value);
    if(!service) return;
    const amountInput=form.querySelector(`[name="${amountName}"]`);
    const durationInput=durationName ? form.querySelector(`[name="${durationName}"]`) : null;
    if(amountInput) amountInput.value=Number(service.rate || 0);
    if(durationInput) durationInput.value=Number(service.duration ?? 0);
  });
}
function requireManualService(){
  if(serviceCatalog(true).length) return true;
  showToast('Add a service from the Services tab first','error');
  currentView='services';
  render();
  return false;
}
function estimateStatusLabel(status){
  const labels = {
    pending: 'Pending',
    followup1: 'Follow Up 1',
    followup2: 'Follow Up 2',
    paid: 'Proceeding',
    approved: 'Proceeding',
    converted: 'Converted to Job',
    rejected: 'Not Proceeding'
  };
  return labels[status] || cap(String(status || 'pending'));
}
function estimateStatusDateLabel(status){
  const labels = {
    pending: 'Pending Date',
    followup1: 'Follow Up 1 Date',
    followup2: 'Follow Up 2 Date',
    paid: 'Proceeding Date',
    approved: 'Proceeding Date',
    converted: 'Converted Date',
    rejected: 'Not Proceeding Date'
  };
  return labels[status] || 'Progress Date';
}
function displayDate(value){
  if(!value) return '-';
  const date = parseBusinessDate(value);
  if(!date || Number.isNaN(date.getTime())) return '-';
  return `${String(date.getDate()).padStart(2,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${date.getFullYear()}`;
}
function displayDateTime(value){
  const date=parseBusinessDate(value);
  if(!date || Number.isNaN(date.getTime())) return '-';
  return `${displayDate(date)} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
function displayClockTime(value){
  const date=parseBusinessDate(value);
  if(!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',hour12:true});
}
function dateInputValue(value){
  if(!value) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date=parseBusinessDate(value);
  return !date || Number.isNaN(date.getTime()) ? '' : toISODate(date);
}
function estimateStatusDate(estimate){
  if(!estimate) return '-';
  return displayDate(estimate.statusDate || estimate.convertedAt || estimate.updatedAt || estimate.createdDate || estimate.createdAt);
}
function estimateApprovedAmount(estimate){
  if(!estimate) return 0;
  if(estimate.approvedAmount !== undefined && estimate.approvedAmount !== null && estimate.approvedAmount !== '') return Number(estimate.approvedAmount || 0);
  return ['paid','approved','converted'].includes(estimate.status) ? Number(estimate.amount || 0) : 0;
}
function estimateCreatedDate(estimate){
  const value=estimate?.createdDate || estimate?.createdAt;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : value ? toISODate(value) : todayISO();
}
function workspaceAdminRecordName(){
  const configuredName=String(state?.settings?.adminProfile?.name || '').trim();
  if(configuredName) return configuredName;
  const ownerEmail=workspaceOwnerEmail();
  const owner=getUsers().find(user=>normalizeText(user.email)===normalizeText(ownerEmail) && userRole(user)==='admin');
  if(owner?.name) return String(owner.name);
  return isAdminUser() ? String(currentUser?.name || '') : '';
}
function recordCreatedBy(record){
  const ownerEmail=String(record?.createdByEmail || record?.ownerEmail || '').trim();
  const users=getUsers();
  const owner=ownerEmail ? users.find(user=>normalizeText(user.email)===normalizeText(ownerEmail)) : null;
  if(owner?.name) return String(owner.name);
  // Older records did not retain a creator email. Attribute these legacy
  // workspace records to the workspace admin instead of a stale display name.
  if(!ownerEmail){
    const workspaceAdmin=workspaceAdminRecordName();
    if(workspaceAdmin) return workspaceAdmin;
  }
  const savedName=record?.createdBy || record?.createdByName;
  if(savedName) return String(savedName);
  const administrator=users.find(user=>['admin','administrator'].includes(userRole(user)) && !normalizeText(user.employmentStatus || user.status || 'active').includes('inactive'));
  return String(administrator?.name || currentUser?.name || ownerEmail || currentUser?.email || 'Administrator');
}
function currentCreatorName(){
  return String(currentUser?.name || currentUser?.email || 'Workspace Admin');
}
function estimateExpirationDate(estimate){
  if(estimate?.expirationDate) return estimate.expirationDate;
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(estimate?.validUntil || ''))) return estimate.validUntil;
  const days=Math.max(1,Number(estimate?.validDays || estimate?.validUntil || 30));
  return toISODate(addDays(`${estimateCreatedDate(estimate)}T00:00:00`,days));
}
function estimateDaysUntilExpiration(estimate){
  const expiry=new Date(`${estimateExpirationDate(estimate)}T00:00:00`);
  const today=new Date(`${todayISO()}T00:00:00`);
  return Math.ceil((expiry-today)/86400000);
}
function estimateLastFollowupDate(estimate){
  return estimate?.lastFollowUpDate || estimate?.followup2Date || estimate?.followup1Date || '';
}
function convertedJobForEstimate(estimate){
  if(!estimate) return null;
  return state.jobs.find(job => String(job.id) === String(estimate.convertedJobId)) ||
    state.jobs.find(job => String(job.sourceEstimateId) === String(estimate.id)) ||
    null;
}
function nextEstimateId(){
  const now = new Date();
  const prefix = `EST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const highest = state.estimates.reduce((max, estimate) => {
    const id = String(estimate.id || '');
    if(!id.startsWith(prefix)) return max;
    const number = Number(id.slice(prefix.length));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}
function normalizeEstimateIds(){
  const now = new Date();
  const prefix = `EST-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const validPattern = /^EST-\d{9}$/;
  let highest = state.estimates.reduce((max, estimate) => {
    const id = String(estimate.id || '');
    if(!id.startsWith(prefix)) return max;
    const number = Number(id.slice(prefix.length));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  const idMap = {};
  state.estimates = state.estimates.map(estimate => {
    const currentId = String(estimate.id || '');
    let id = currentId;
    if(!validPattern.test(currentId)){
      highest += 1;
      id = `${prefix}${String(highest).padStart(3, '0')}`;
      idMap[currentId] = id;
    }
    return {
      ...estimate,
      id,
      createdDate: estimateCreatedDate(estimate),
      statusDate: estimate.statusDate || estimate.createdDate || estimate.createdAt || todayISO(),
      validDays: Number(estimate.validDays || (/^\d+$/.test(String(estimate.validUntil || '')) ? estimate.validUntil : 30)),
      expirationDate: estimateExpirationDate(estimate)
    };
  });
  if(Object.keys(idMap).length){
    state.jobs = state.jobs.map(job => (
      job.sourceEstimateId && idMap[job.sourceEstimateId]
        ? {...job, sourceEstimateId:idMap[job.sourceEstimateId]}
        : job
    ));
  }
}
function nextInvoiceId(){
  const now = new Date();
  const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const highest = state.invoices.reduce((max, invoice) => {
    const id = String(invoice.id || '');
    if(!id.startsWith(prefix)) return max;
    const number = Number(id.slice(prefix.length));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}
function normalizeInvoiceIds(){
  const now = new Date();
  const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const validPattern = /^INV-\d{9}$/;
  let highest = state.invoices.reduce((max, invoice) => {
    const id = String(invoice.id || '');
    if(!id.startsWith(prefix)) return max;
    const number = Number(id.slice(prefix.length));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  const idMap = {};
  state.invoices = state.invoices.map(invoice => {
    const currentId = String(invoice.id || '');
    let id = currentId;
    if(!validPattern.test(currentId)){
      highest += 1;
      id = `${prefix}${String(highest).padStart(3, '0')}`;
      idMap[currentId] = id;
    }
    return {
      ...invoice,
      id,
      createdAt: invoice.createdAt || Date.now()
    };
  });
  if(Object.keys(idMap).length && selectedInvoice && idMap[selectedInvoice]){
    selectedInvoice = idMap[selectedInvoice];
  }
}
function priorityClass(priority){
  return `priority-${normalizeText(priority || 'medium').replace(/\s+/g,'-')}`;
}
function jobDurationLabel(duration){
  const value = String(duration || '').trim();
  if(!value || value === '0' || value === '0 hrs' || value === '0 hours') return '';
  return value;
}
function dueInfo(invoice){
  if(!invoice || invoicePaymentStatus(invoice) === 'paid' || !invoice.due) return {label:'', cls:''};
  const dueText = String(invoice.due);
  const due = new Date(/^\d{4}-\d{2}-\d{2}/.test(dueText) ? `${dueText.slice(0,10)}T00:00:00` : dueText);
  if(Number.isNaN(due.getTime())) return {label:'', cls:''};
  const today = new Date(`${todayISO()}T00:00:00`);
  const diff = Math.ceil((due - today) / 86400000);
  if(diff < 0) return {label:'Overdue', cls:'overdue'};
  if(diff <= 3) return {label:`Due in ${diff} day${diff===1?'':'s'}`, cls:'pending'};
  return {label:'', cls:'scheduled'};
}
function invoiceLineItems(invoice){
  return Array.isArray(invoice?.lineItems)
    ? invoice.lineItems.map((item,index)=>({
        id:item.id || `ITEM-${index+1}`,
        jobId:item.jobId || '',
        description:String(item.description || 'Landscaping service'),
        quantity:Math.max(.01,Math.round(Number(item.quantity || 1) * 100) / 100),
        rate:currencyValue(Math.max(0,Number(item.rate || 0)))
      })).filter(item=>item.rate >= 0)
    : [];
}
function invoiceSubtotal(invoice){
  const items=invoiceLineItems(invoice);
  return currencyValue(items.length
    ? items.reduce((sum,item)=>sum+currencyValue(item.quantity*item.rate),0)
    : Math.max(0,Number(invoice?.amount || 0)));
}
function invoiceTaxAmount(invoice){
  const taxRate=Math.min(100,Math.max(0,Number(invoice?.taxRate || 0)));
  return currencyValue(invoiceSubtotal(invoice) * taxRate / 100);
}
function invoiceTotal(invoice){
  const subtotal=invoiceSubtotal(invoice);
  return currencyValue(Math.max(0,subtotal + invoiceTaxAmount(invoice)));
}
function invoicePaymentRecords(invoice){
  return Array.isArray(invoice?.payments) ? invoice.payments : [];
}
function invoicePaidAmount(invoice){
  const total = invoiceTotal(invoice);
  if(!invoice) return 0;
  const payments = invoicePaymentRecords(invoice);
  if(payments.length){
    const paymentTotal = currencyValue(payments.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount || 0)), 0));
    return currencyValue(Math.max(0, Math.min(total, paymentTotal)));
  }
  if(invoice.paidAmount === undefined || invoice.paidAmount === null || invoice.paidAmount === ''){
    return invoice.status === 'paid' ? total : 0;
  }
  return currencyValue(Math.max(0, Math.min(total, Number(invoice.paidAmount || 0))));
}
function invoiceDueAmount(invoice){
  return currencyValue(Math.max(0, invoiceTotal(invoice) - invoicePaidAmount(invoice)));
}
function invoicePaymentStatus(invoice){
  if(!invoice) return 'draft';
  if(invoice.status === 'cancelled') return 'cancelled';
  const total = invoiceTotal(invoice);
  const paid = invoicePaidAmount(invoice);
  if(total > 0 && paid >= total) return 'paid';
  if(paid > 0) return 'partial';
  return invoice.status || 'draft';
}
function invoiceDisplayStatus(invoice){
  const paymentStatus = invoicePaymentStatus(invoice);
  if(paymentStatus === 'paid' || paymentStatus === 'cancelled' || paymentStatus === 'draft') return paymentStatus;
  return dueInfo({...invoice, status: paymentStatus}).cls === 'overdue' ? 'overdue' : paymentStatus;
}
function invoiceStatusLabel(status){
  const labels={
    draft:'Draft',
    sent:'Sent',
    pending:'Pending',
    unpaid:'Unpaid',
    partial:'Partially Paid',
    paid:'Paid',
    overdue:'Overdue',
    cancelled:'Cancelled'
  };
  return labels[status] || cap(status || 'draft');
}
function normalizeInvoicePayment(invoice){
  let lineItems=invoiceLineItems(invoice);
  if(!lineItems.length && Number(invoice?.amount || 0)>0){
    lineItems=[{
      id:'ITEM-1',
      description:String(invoice?.service || invoice?.notes || 'Landscaping services').slice(0,120),
      quantity:1,
      rate:Math.max(0,Number(invoice.amount || 0))
    }];
  }
  const normalizedInvoice={
    ...invoice,
    lineItems,
    taxRate:Math.min(100,Math.max(0,Number(invoice?.taxRate || 0))),
    discount:currencyValue(Math.max(0,Number(invoice?.discount || 0)))
  };
  const total = invoiceTotal(normalizedInvoice);
  let payments = invoicePaymentRecords(invoice).map((payment, index) => ({
    id: payment.id || `PAY-${String(invoice?.id || 'INVOICE').replace(/[^A-Za-z0-9]/g,'')}-${String(index + 1).padStart(3,'0')}`,
    amount: currencyValue(Math.max(0, Number(payment.amount || 0))),
    method: payment.method || 'Other',
    date: payment.date || invoice?.paid || todayISO(),
    reference: payment.reference || '',
    notes: payment.notes || '',
    createdAt: payment.createdAt || Date.now() + index
  })).filter(payment => payment.amount > 0);
  const legacyPaidAmount = currencyValue(Math.max(0, Number(invoice?.paidAmount || 0)));
  if(!payments.length && legacyPaidAmount > 0){
    payments = [{
      id: `PAY-${String(invoice?.id || 'INVOICE').replace(/[^A-Za-z0-9]/g,'')}-001`,
      amount: currencyValue(Math.min(total, legacyPaidAmount)),
      method: invoice?.paymentMethod || 'Other',
      date: invoice?.paid || invoice?.invoiced || todayISO(),
      reference: invoice?.paymentReference || '',
      notes: 'Previously recorded payment',
      createdAt: invoice?.createdAt || Date.now()
    }];
  }
  let paidAmount = currencyValue(payments.length
    ? payments.reduce((sum, payment) => sum + payment.amount, 0)
    : legacyPaidAmount);
  if(invoice?.status === 'paid' && paidAmount === 0) paidAmount = total;
  paidAmount = currencyValue(Math.min(total, paidAmount));
  let status = invoice?.status || 'unpaid';
  if(status !== 'cancelled'){
    if(total > 0 && paidAmount >= total) status = 'paid';
    else if(paidAmount > 0) status = 'partial';
    else if(status === 'partial' || status === 'paid') status = 'unpaid';
  }
  return {
    ...normalizedInvoice,
    amount: total,
    payments,
    paidAmount,
    status,
    paid: paidAmount > 0
      ? (payments.map(payment => payment.date).filter(Boolean).sort().slice(-1)[0] || invoice?.paid || todayISO())
      : null
  };
}
function recalculateInvoiceFromPayments(invoice){
  const payments = invoicePaymentRecords(invoice);
  const paidAmount = currencyValue(Math.min(
    invoiceTotal(invoice),
    payments.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount || 0)), 0)
  ));
  invoice.paidAmount = paidAmount;
  invoice.paid = paidAmount > 0
    ? (payments.map(payment => payment.date).filter(Boolean).sort().slice(-1)[0] || todayISO())
    : null;
  if(invoice.status !== 'cancelled'){
    const unpaidDocumentStatus=['draft','sent','pending','unpaid','overdue'].includes(invoice.status)
      ? invoice.status
      : 'unpaid';
    invoice.status = paidAmount >= invoiceTotal(invoice) && invoiceTotal(invoice) > 0
      ? 'paid'
      : paidAmount > 0 ? 'partial' : unpaidDocumentStatus;
  }
  Object.assign(invoice, normalizeInvoicePayment(invoice));
  return invoice;
}
function updateInvoicePaidAmount(invoice, targetAmount, paymentDate){
  const total=invoiceTotal(invoice);
  const target=currencyValue(Math.max(0,Math.min(total,Number(targetAmount || 0))));
  const date=paymentDate || invoice.paid || todayISO();
  const payments=invoicePaymentRecords(invoice).map(payment=>({...payment}));
  const current=currencyValue(payments.reduce((sum,payment)=>sum+Math.max(0,Number(payment.amount || 0)),0));
  const difference=Number((target-current).toFixed(2));
  if(difference>0){
    payments.push({
      id:`PAY-ADJUST-${Date.now()}`,
      amount:difference,
      date,
      method:'Manual Adjustment',
      reference:'',
      notes:'Paid amount updated from invoice edit',
      createdAt:Date.now()
    });
  } else if(difference<0){
    let reduction=Math.abs(difference);
    for(let index=payments.length-1;index>=0 && reduction>0;index--){
      const amount=Math.max(0,Number(payments[index].amount || 0));
      const removed=Math.min(amount,reduction);
      payments[index].amount=Number((amount-removed).toFixed(2));
      reduction=Number((reduction-removed).toFixed(2));
    }
  }
  invoice.payments=payments.filter(payment=>Number(payment.amount || 0)>0);
  if(invoice.payments.length && paymentDate){
    invoice.payments[invoice.payments.length-1].date=paymentDate;
  }
  invoice.paidAmount=target;
  invoice.paid=target>0 ? date : null;
  return recalculateInvoiceFromPayments(invoice);
}
function downloadTextFile(filename, text, type='text/plain'){
  const blob = new Blob([text], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function downloadWorkspaceBackup(prefix='greenops-backup'){
  const backup={
    format:'greenops-workspace-backup',
    version:1,
    exportedAt:new Date().toISOString(),
    ownerEmail:workspaceOwnerEmail(),
    data:workspacePayload()
  };
  downloadTextFile(`${prefix}-${todayISO()}.json`,JSON.stringify(backup,null,2),'application/json;charset=utf-8');
}
function openWorkspaceRestoreConfirm(candidate,fileName,{clearAutomaticSnapshot=false}={}){
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  const count=workspaceRecordCount(candidate);
  wrap.innerHTML=`<div class="modal confirm-modal backup-confirm-modal">
    <div class="backup-confirm-icon">${icon('archive-restore')}</div>
    <h3>Restore this backup?</h3>
    <p class="muted"><strong>${escapeHtml(fileName || 'Selected backup')}</strong> contains ${count} record${count===1?'':'s'}. Current workspace data will be replaced.</p>
    <div class="modal-actions"><button type="button" class="secondary" id="cancelRestore">Cancel</button><button type="button" class="primary danger-primary" id="confirmRestore">Restore Backup</button></div>
  </div>`;
  document.body.appendChild(wrap);
  window.lucide?.createIcons?.({attrs:{'stroke-width':2}});
  wrap.onclick=event=>{ if(event.target===wrap) wrap.remove(); };
  wrap.querySelector('#cancelRestore').onclick=()=>wrap.remove();
  wrap.querySelector('#confirmRestore').onclick=async()=>{
    const confirmButton=wrap.querySelector('#confirmRestore');
    confirmButton.disabled=true;
    confirmButton.textContent='Restoring...';
    const previous=workspacePayload();
    try{
      applyLoadedData({...emptyData(),...candidate});
      await saveWorkspaceToBackend();
      if(clearAutomaticSnapshot) localStorage.removeItem(deletedDataRestoreKey());
      wrap.remove();
      selectedSettingsTab='data';
      currentView='settings';
      showToast('Workspace restored successfully');
      render();
    }catch(error){
      applyLoadedData(previous);
      confirmButton.disabled=false;
      confirmButton.textContent='Restore Backup';
      showToast(error.message || 'Unable to restore this backup','error');
    }
  };
}
function exportFilteredReportCsv(){
  const invoices=state.invoices.filter(invoiceMatchesReportRange);
  const csvValue=value=>`"${String(value ?? '').replace(/"/g,'""')}"`;
  const rows=[
    ['Invoice','Customer','Service','Invoice Date','Due Date','Total','Paid','Outstanding','Status','Days Overdue'],
    ...invoices.map(invoice=>[
      invoice.id,
      invoice.customer,
      invoiceServiceName(invoice),
      displayDate(invoice.invoiced || invoice.invoiceDate),
      displayDate(invoice.due),
      invoiceTotal(invoice).toFixed(2),
      invoicePaidAmount(invoice).toFixed(2),
      invoiceDueAmount(invoice).toFixed(2),
      invoiceStatusLabel(invoiceDisplayStatus(invoice)),
      invoiceOverdueDays(invoice)
    ])
  ];
  const csv='\uFEFF'+rows.map(row=>row.map(csvValue).join(',')).join('\r\n');
  const suffix=reportRange==='custom'
    ? `${reportCustomStart || 'start'}-to-${reportCustomEnd || 'today'}`
    : reportRange;
  downloadTextFile(`greenops-report-${suffix}.csv`,csv,'text/csv;charset=utf-8');
  showToast(`${invoices.length} filtered invoice${invoices.length===1?'':'s'} exported`);
}
function pdfTable(headers, rows){
  const safeRows = rows.length ? rows : [headers.map((_, index)=>index === 0 ? 'No data available' : '')];
  return `<table><thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${safeRows.map(row=>`<tr>${row.map(cell=>`<td>${escapeHtml(cell ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function openPdfReport(title, sections){
  const win = window.open('', '_blank', 'width=1100,height=800');
  if(!win){ showToast('Please allow popups to open the PDF report'); return; }
  const settings = getSettings();
  const company = settings.companyName || settings.company || 'GreenOps';
  const logo=String(settings.companyLogoDataUrl || '').trim();
  const brandLogo=logo ? `<img class="pdf-brand-logo" src="${escapeHtml(logo)}" alt="Company logo">` : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:32px;color:#10251d;background:#fff}
      .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #12854d;padding-bottom:16px;margin-bottom:24px}
      .pdf-brand{display:flex;gap:13px;align-items:flex-start}.pdf-brand-logo{width:42px;height:42px;object-fit:contain;border-radius:8px}
      h1{margin:0;color:#0b3d2e;font-size:28px}.meta{color:#60756b;font-size:13px;line-height:1.6}
      h2{font-size:18px;margin:28px 0 10px;color:#0b3d2e}
      table{width:100%;border-collapse:collapse;margin-top:10px;page-break-inside:auto}
      th,td{border:1px solid #dfe8e2;padding:9px 10px;text-align:left;font-size:12px;vertical-align:top}
      th{background:#e8f5ee;color:#0b3d2e;text-transform:uppercase;font-size:11px;letter-spacing:.04em}
      tr:nth-child(even) td{background:#fbfdfb}.print-btn{border:0;background:#12854d;color:#fff;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
      @media print{.print-btn{display:none}body{margin:18px}}
    </style></head><body>
    <div class="top"><div class="pdf-brand">${brandLogo}<div><h1>${escapeHtml(title)}</h1><div class="meta"><strong>${escapeHtml(company)}</strong><br>${escapeHtml(settings.address || '')}<br>${escapeHtml(settings.phone || '')}<br>Generated on ${displayDateTime(new Date())}</div></div></div><button class="print-btn" onclick="window.print()">Save / Print PDF</button></div>
    ${sections.map(section=>`<section><h2>${escapeHtml(section.title)}</h2>${section.html}</section>`).join('')}
    <script>setTimeout(()=>window.print(),500)</script></body></html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  showToast('PDF report opened');
}
function openInvoicePdf(invoice){
  if(!invoice) return;
  const win=window.open('','_blank','width=1000,height=900');
  if(!win){ showToast('Please allow popups to open the invoice PDF','error'); return; }
  const settings=getSettings();
  const company=settings.companyName || settings.company || 'GreenOps';
  const logo=String(settings.companyLogoDataUrl || '').trim();
  const customer=state.customers.find(item=>normalizeText(item.name)===normalizeText(invoice.customer));
  const items=invoiceLineItems(invoice);
  const taxRate=Math.min(100,Math.max(0,Number(invoice.taxRate || 0)));
  const isPaid=invoiceTotal(invoice)>0 && invoiceDueAmount(invoice)<=0;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.id)}</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#eef2f3;color:#27343a;font-family:Arial,Helvetica,sans-serif}.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:18mm 18mm 14mm;position:relative;overflow:hidden}.header,.bill-meta,.invoice-heading,.items,.totals,.balance,.terms{position:relative;z-index:1}.paid-watermark{position:absolute;z-index:0;left:50%;top:48%;transform:translate(-50%,-50%) rotate(-32deg);font-size:104px;font-weight:900;letter-spacing:12px;color:rgba(18,133,77,.11);border:9px solid rgba(18,133,77,.09);border-radius:18px;padding:8px 24px;pointer-events:none}.print{position:fixed;right:20px;top:18px;border:0;border-radius:9px;background:#12854d;color:#fff;padding:11px 16px;font-weight:700;cursor:pointer}.header{display:flex;justify-content:space-between;gap:30px;align-items:flex-start}.company-brand{display:flex;gap:13px;align-items:flex-start}.company-logo{width:42px;height:42px;object-fit:contain;border-radius:8px}.company h1{margin:0 0 14px;font-size:31px;color:#50636b;letter-spacing:.01em}.company p,.bill p{margin:4px 0;font-size:12px;line-height:1.45}.bill-meta{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:28px 0 24px}.eyebrow{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#74868d;font-weight:800;margin-bottom:9px}.invoice-heading{display:flex;align-items:end;justify-content:space-between;border-bottom:2px solid #61727a;padding-bottom:10px;margin-bottom:0}.invoice-heading h2{font-size:28px;color:#60727a;margin:0}.invoice-meta{display:grid;grid-template-columns:1fr 1fr;gap:7px 22px;font-size:12px}.invoice-meta strong{text-align:right}.items{width:100%;border-collapse:collapse;margin-top:0;font-size:12px}.items th{background:#62747c;color:#fff;padding:10px;text-align:left}.items th:not(:first-child),.items td:not(:first-child){text-align:right}.items td{padding:10px;border-bottom:2px solid #fff;background:#f0f4f6}.items tr:nth-child(even) td{background:#e7edf0}.totals{width:45%;margin:20px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:6px 0;font-size:12px}.totals .grand{border-top:2px solid #62747c;margin-top:7px;padding-top:13px;font-size:18px;color:#44565e}.balance{margin:16px 0 0 auto;width:45%;background:#edf7f1;border-left:4px solid #12854d;padding:11px 12px;display:flex;justify-content:space-between;font-weight:800}.terms{position:absolute;left:18mm;right:18mm;bottom:16mm;border-top:1px solid #d9e1e4;padding-top:12px;display:flex;justify-content:space-between;gap:35px;font-size:11px;color:#62747c}.terms strong{color:#35464d}.notes{max-width:55%}@media print{body{background:#fff}.page{margin:0}.print{display:none}}
  </style></head><body><button class="print" onclick="window.print()">Save / Print PDF</button><main class="page">
    ${isPaid?'<div class="paid-watermark" aria-hidden="true">PAID</div>':''}
    <header class="header"><div class="company-brand">${logo?`<img class="company-logo" src="${escapeHtml(logo)}" alt="Company logo">`:''}<div class="company"><h1>${escapeHtml(company)}</h1><p>${escapeHtml(settings.address || '')}</p><p>${escapeHtml(settings.phone || '')}</p><p>${escapeHtml(currentUser?.email || '')}</p></div></div></header>
    <section class="bill-meta"><div class="bill"><div class="eyebrow">Billed To</div><p><strong>${escapeHtml(invoice.customer)}</strong></p><p>${escapeHtml(customer?.address || '')}</p><p>${escapeHtml(customer?.phone || '')}</p><p>${escapeHtml(customer?.email || '')}</p></div><div><div class="eyebrow">Invoice Details</div><div class="invoice-meta"><span>Invoice number</span><strong>${escapeHtml(invoice.id)}</strong><span>Date of issue</span><strong>${displayDate(invoice.invoiced)}</strong><span>Due date</span><strong>${displayDate(invoice.due)}</strong>${invoice.jobId?`<span>Job number</span><strong>#JOB-${escapeHtml(invoice.jobId)}</strong>`:''}<span>Status</span><strong>${escapeHtml(invoiceStatusLabel(invoiceDisplayStatus(invoice)))}</strong></div></div></section>
    <div class="invoice-heading"><h2>Invoice</h2>${invoice.projectName?`<span>${escapeHtml(invoice.projectName)}</span>`:''}</div>
    <table class="items"><thead><tr><th>Description</th><th>Unit cost</th><th>QTY</th><th>Amount</th></tr></thead><tbody>${items.map(item=>`<tr><td>${escapeHtml(item.description)}</td><td>${money(item.rate)}</td><td>${item.quantity}</td><td>${money(item.quantity*item.rate)}</td></tr>`).join('')}</tbody></table>
    <section class="totals"><div><span>Subtotal</span><strong>${money(invoiceSubtotal(invoice))}</strong></div><div><span>Tax rate</span><strong>${Number(taxRate.toFixed(2))}%</strong></div><div><span>Tax</span><strong>${money(invoiceTaxAmount(invoice))}</strong></div><div class="grand"><span>Invoice total</span><strong>${money(invoiceTotal(invoice))}</strong></div><div><span>Paid</span><strong>${money(invoicePaidAmount(invoice))}</strong></div></section>
    <div class="balance"><span>Balance due</span><span>${money(invoiceDueAmount(invoice))}</span></div>
    <footer class="terms"><div class="notes"><strong>Notes & Terms</strong><br>${escapeHtml(invoice.notes || `Please pay by ${displayDate(invoice.due)}. Thank you for your business.`)}</div><div><strong>${escapeHtml(company)}</strong><br>${escapeHtml(settings.phone || '')}<br>${escapeHtml(currentUser?.email || '')}</div></footer>
  </main><script>setTimeout(()=>window.print(),500)</script></body></html>`;
  win.document.open();win.document.write(html);win.document.close();win.focus();
  showToast('Invoice PDF opened');
}
function exportPdfReport(type){
  const reportDate = displayDate(new Date());
  if(type === 'customers'){
    const customerTotals=state.customers.map(customer=>{
      const invoices=state.invoices.filter(invoice=>recordMatchesCustomer(invoice,customer));
      return {customer,invoices,jobs:state.jobs.filter(job=>recordMatchesCustomer(job,customer)),estimates:state.estimates.filter(estimate=>recordMatchesCustomer(estimate,customer))};
    });
    const billed=customerTotals.reduce((total,item)=>total+item.invoices.reduce((sum,invoice)=>sum+invoiceTotal(invoice),0),0);
    const paid=customerTotals.reduce((total,item)=>total+item.invoices.reduce((sum,invoice)=>sum+invoicePaidAmount(invoice),0),0);
    openPdfReport(`Customers Report - ${reportDate}`, [
      {title:'Customer Summary',html:pdfTable(['Customers','Active Customers','Billed','Paid','Outstanding'],[[state.customers.length,customerTotals.filter(item=>item.jobs.length>0).length,money(billed),money(paid),money(billed-paid)]])},
      {title:'Customer Directory',html:pdfTable(['Customer','Contact','Property','Primary Service','Jobs','Estimates','Invoices'],customerTotals.map(({customer,invoices,jobs,estimates})=>[
        customer.name,customer.phone || customer.email || '-',customer.address || '-',customer.service || '-',jobs.length,estimates.length,invoices.length
      ]))},
      {title:'Customer Account Totals',html:pdfTable(['Customer','Billed','Paid','Outstanding'],customerTotals.map(({customer,invoices})=>{
        const total=invoices.reduce((sum,invoice)=>sum+invoiceTotal(invoice),0);
        const received=invoices.reduce((sum,invoice)=>sum+invoicePaidAmount(invoice),0);
        return [customer.name,money(total),money(received),money(total-received)];
      }))}
    ]);
  } else if(type === 'services'){
    openPdfReport(`Services Report - ${reportDate}`,[{
      title:'Service Catalog',
      html:pdfTable(['Service','Rate','Duration','Linked Jobs','Total Amount','Status'],serviceCatalog(false).map(service=>[
        service.name,money(service.rate),`${service.duration} hours`,serviceLinkedJobs(service).length,money(serviceTotalAmount(service)),cap(service.status)
      ]))
    }]);
  } else if(type === 'jobs'){
    openPdfReport(`Jobs Report - ${reportDate}`, [{
      title: 'Jobs',
      html: pdfTable(['Job','Customer','Service','Date','Time','Crew','Priority','Duration','Status','Amount'], state.jobs.map(j=>[
        `JOB-${j.id}`, j.customer, j.service, displayDate(j.date), j.time, j.crew, j.priority || 'Medium', j.duration || '2 hours', j.status, money(j.price)
      ]))
    }]);
  } else if(type === 'schedule'){
    const sortedJobs = [...state.jobs].sort((a,b)=>String(a.date || '').localeCompare(String(b.date || '')) || String(a.time || '').localeCompare(String(b.time || '')));
    openPdfReport(`Schedule Report - ${reportDate}`, [{
      title: 'Scheduled Jobs',
      html: pdfTable(['Date','Time','Customer','Service','Property','Crew','Status','Amount'], sortedJobs.map(j=>[
        displayDate(j.date), j.time || '-', j.customer, j.service, j.address, j.crew, j.status, money(j.price)
      ]))
    }]);
  } else if(type === 'estimates'){
    openPdfReport(`Estimates Report - ${reportDate}`, [{
      title: 'Estimates',
      html: pdfTable(['Estimate','Customer','Service','Amount','Status','Notes'], state.estimates.map(e=>[
        e.id, e.customer, e.service, money(e.amount), estimateStatusLabel(e.status), e.notes || ''
      ]))
    }]);
  } else if(type === 'invoices'){
    openPdfReport(`Invoices Report - ${reportDate}`, [{
      title: 'Invoices',
      html: pdfTable(['Invoice','Customer','Invoiced','Due','Paid Date','Total','Paid Amount','Due Amount','Status'], state.invoices.map(i=>[
        i.id, i.customer, displayDate(i.invoiced), displayDate(i.due), displayDate(i.paid), money(invoiceTotal(i)), money(invoicePaidAmount(i)), money(invoiceDueAmount(i)), invoiceStatusLabel(invoiceDisplayStatus(i))
      ]))
    }]);
  } else if(type === 'crew'){
    openPdfReport(`Crew Report - ${reportDate}`, [{
      title: 'Crew Members',
      html: pdfTable(['Name','Role','Status','Jobs Today'], state.crew.map(c=>[
        c.name, c.role, c.status, c.jobs
      ]))
    }]);
  } else if(type === 'reports'){
    const totalRevenue = state.invoices.reduce((a,b)=>a+invoiceTotal(b),0);
    const paidRevenue = state.invoices.reduce((a,b)=>a+invoicePaidAmount(b),0);
    const unpaidRevenue = state.invoices.reduce((a,b)=>a+invoiceDueAmount(b),0);
    openPdfReport(`Business Report - ${reportDate}`, [
      {title:'Business Summary', html: pdfTable(['Metric','Value'], [
        ['Customers', state.customers.length],
        ['Active Services', serviceCatalog(true).length],
        ['Jobs', state.jobs.length],
        ['Completed Jobs', state.jobs.filter(j=>j.status==='completed'||j.status==='invoiced').length],
        ['Estimates', state.estimates.length],
        ['Invoices', state.invoices.length],
        ['Total Revenue', money(totalRevenue)],
        ['Paid Revenue', money(paidRevenue)],
        ['Due Revenue', money(unpaidRevenue)]
      ])},
      {title:'Recent Jobs', html: pdfTable(['Job','Customer','Service','Status','Amount'], state.jobs.slice(-10).map(j=>[`JOB-${j.id}`, j.customer, j.service, j.status, money(j.price)]))}
    ]);
  }
}
function safeExportName(value){
  return String(value || 'greenops-export').trim().replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase() || 'greenops-export';
}
function excelXmlEscape(value){
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function excelCell(value,style=''){
  const numeric=typeof value==='number' && Number.isFinite(value);
  const type=numeric ? 'Number' : 'String';
  const styleAttr=style ? ` ss:StyleID="${style}"` : '';
  return `<Cell${styleAttr}><Data ss:Type="${type}">${excelXmlEscape(numeric ? value : (value ?? ''))}</Data></Cell>`;
}
function downloadExcelWorkbook(fileName,sheets){
  const worksheetXml=sheets.map((sheet,index)=>{
    const safeName=String(sheet.name || `Sheet ${index+1}`).replace(/[\\/?*\[\]:]/g,' ').slice(0,31) || `Sheet ${index+1}`;
    const headers=Array.isArray(sheet.headers) ? sheet.headers : [];
    const rows=Array.isArray(sheet.rows) ? sheet.rows : [];
    const columns=headers.map(header=>`<Column ss:AutoFitWidth="1" ss:Width="${Math.min(220,Math.max(80,String(header).length*8+24))}"/>`).join('');
    return `<Worksheet ss:Name="${excelXmlEscape(safeName)}"><Table>${columns}<Row>${headers.map(header=>excelCell(header,'Header')).join('')}</Row>${rows.map(row=>`<Row>${row.map(value=>excelCell(value)).join('')}</Row>`).join('')}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;
  }).join('');
  const xml=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style><Style ss:ID="Header"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#12854D" ss:Pattern="Solid"/></Style></Styles>${worksheetXml}</Workbook>`;
  const blob=new Blob([xml],{type:'application/vnd.ms-excel;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`${safeExportName(fileName)}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast('Excel report downloaded');
}
function listExportSheet(type){
  if(type==='customers') return {name:'Customers',headers:['Customer','Phone','Email','Property','Service','Jobs','Estimates','Invoices','Billed (USD)','Paid (USD)','Due (USD)'],rows:state.customers.map(customer=>{
    const invoices=state.invoices.filter(invoice=>recordMatchesCustomer(invoice,customer));
    return [customer.name,customer.phone,customer.email,customer.address,customer.service,state.jobs.filter(job=>recordMatchesCustomer(job,customer)).length,state.estimates.filter(estimate=>recordMatchesCustomer(estimate,customer)).length,invoices.length,invoices.reduce((sum,invoice)=>sum+invoiceTotal(invoice),0),invoices.reduce((sum,invoice)=>sum+invoicePaidAmount(invoice),0),invoices.reduce((sum,invoice)=>sum+invoiceDueAmount(invoice),0)];
  })};
  if(type==='services') return {name:'Services',headers:['Service','Description','Rate (USD)','Estimated Duration (hours)','Linked Jobs','Total Amount (USD)','Status'],rows:serviceCatalog(false).map(service=>[
    service.name,service.description || '',Number(service.rate || 0),Number(service.duration || 0),serviceLinkedJobs(service).length,serviceTotalAmount(service),cap(service.status)
  ])};
  if(type==='schedule'){
    const jobs=[...state.jobs].sort((a,b)=>String(a.date || '').localeCompare(String(b.date || '')) || String(a.time || '').localeCompare(String(b.time || '')));
    return {name:'Schedule',headers:['Date','Time','Customer','Service','Property','Crew','Status','Amount (USD)'],rows:jobs.map(job=>[
      displayDate(job.date),job.time || '',job.customer,job.service,job.address || '',job.crew || '',jobStatusLabel(job.status),Number(job.price || 0)
    ])};
  }
  if(type==='jobs') return {name:'Jobs',headers:['Job','Customer','Service','Date','Time','Crew','Priority','Duration','Status','Amount (USD)'],rows:state.jobs.map(job=>[`JOB-${job.id}`,job.customer,job.service,displayDate(job.date),job.time,job.crew,job.priority || 'Medium',job.duration || '0 hours',jobStatusLabel(job.status),Number(job.price || 0)])};
  if(type==='estimates') return {name:'Estimates',headers:['Estimate','Customer','Service','Amount (USD)','Approved Amount (USD)','Status','Created','Expiration','Notes'],rows:state.estimates.map(estimate=>[estimate.id,estimate.customer,estimate.service,Number(estimate.amount || 0),estimateApprovedAmount(estimate),estimateStatusLabel(estimate.status),displayDate(estimateCreatedDate(estimate)),displayDate(estimateExpirationDate(estimate)),estimate.notes || ''])};
  if(type==='invoices') return {name:'Invoices',headers:['Invoice','Customer','Project','Service','Invoice Date','Due Date','Paid Date','Total (USD)','Paid (USD)','Due (USD)','Status'],rows:state.invoices.map(invoice=>[invoice.id,invoice.customer,invoice.projectName || '',invoiceServiceName(invoice),displayDate(invoice.invoiced),displayDate(invoice.due),displayDate(invoice.paid),invoiceTotal(invoice),invoicePaidAmount(invoice),invoiceDueAmount(invoice),invoiceStatusLabel(invoiceDisplayStatus(invoice))])};
  if(type==='crew') return {name:'Crew',headers:['Name','Role','Email','Phone','Status','Availability','Skills','Assigned Jobs','Completed Jobs'],rows:state.crew.map(raw=>{
    const crew=mergedCrewDetails(raw);
    const jobs=state.jobs.filter(job=>normalizeText(job.crew)===normalizeText(crew.name));
    return [crew.name,crew.role || 'Crew Member',crew.email || '',crew.phone || '',isCrewActive(crew)?'Active':'Inactive',crew.availability || '',crew.skills || '',jobs.length,jobs.filter(job=>job.status==='completed'||job.status==='invoiced').length];
  })};
  if(type==='reports'){
    const invoices=state.invoices.filter(invoiceMatchesReportRange);
    const jobs=state.jobs.filter(job=>recordMatchesReportRange(job.date || job.createdAt));
    const estimates=state.estimates.filter(estimate=>recordMatchesReportRange(estimate.createdDate || estimate.createdAt));
    const totalRevenue=invoices.reduce((sum,invoice)=>sum+invoiceTotal(invoice),0);
    const paidRevenue=state.invoices.filter(invoice=>invoicePaymentStatus(invoice)!=='cancelled').reduce((sum,invoice)=>{
      const payments=invoicePaymentRecords(invoice);
      if(payments.length) return sum+payments.reduce((paymentSum,payment)=>{
        const amount=Number(payment.amount || 0);
        const date=payment.date || invoice.paid || invoice.invoiced || '';
        return paymentSum+(amount>0 && recordMatchesReportRange(date) ? amount : 0);
      },0);
      const amount=invoicePaidAmount(invoice);
      return sum+(amount>0 && recordMatchesReportRange(invoice.paid || invoice.invoiced || '') ? amount : 0);
    },0);
    const dueRevenue=invoices.reduce((sum,invoice)=>sum+invoiceDueAmount(invoice),0);
    return {name:'Business Summary',headers:['Metric','Value'],rows:[
      ['Report Range',({week:'This Week',month:'This Month',quarter:'Last 3 Months',year:'This Year',all:'All Time',custom:'Custom Range'})[reportRange] || 'This Year'],
      ['Customers',state.customers.length],
      ['Active Services',serviceCatalog(true).length],
      ['Jobs',jobs.length],
      ['Completed Jobs',jobs.filter(job=>job.status==='completed'||job.status==='invoiced').length],
      ['Estimates',estimates.length],
      ['Invoices',invoices.length],
      ['Total Revenue (USD)',totalRevenue],
      ['Paid Revenue (USD)',paidRevenue],
      ['Due Revenue (USD)',dueRevenue],
      ['Collection Rate (%)',totalRevenue>0 ? Math.round((paidRevenue/totalRevenue)*100) : 0]
    ]};
  }
  return {name:'Data',headers:['Message'],rows:[['No data available']]};
}
function exportExcelReport(type){
  downloadExcelWorkbook(`greenops-${type}-${todayISO()}`,[listExportSheet(type)]);
}
function selectedRecordExportBundle(type){
  if(type==='service'){
    const service=state.services.find(item=>String(item.id)===String(selectedService));
    if(!service) return null;
    const jobs=newestFirst(serviceLinkedJobs(service));
    const jobIds=new Set(jobs.map(job=>String(job.id)));
    const estimates=newestFirst(state.estimates.filter(estimate=>normalizeText(estimate.service)===normalizeText(service.name)));
    const invoices=newestFirst(state.invoices.filter(invoice=>invoiceIncludesService(invoice,service.name) || jobIds.has(String(invoice.jobId || ''))));
    return {title:`Service - ${service.name}`,fileName:`service-${service.name}`,sheets:[
      {name:'Service Summary',headers:['Field','Value'],rows:[['Service',service.name],['Description',service.description || ''],['Rate (USD)',Number(service.rate || 0)],['Duration',`${Number(service.duration || 0)} hours`],['Status',cap(service.status)],['Linked Jobs',jobs.length],['Total Job Amount (USD)',serviceTotalAmount(service)],['Estimates',estimates.length],['Invoices',invoices.length],['Invoice Total (USD)',invoices.reduce((sum,invoice)=>sum+invoiceTotal(invoice),0)]]},
      {name:'Jobs',headers:['Job','Customer','Date','Crew','Amount (USD)','Status'],rows:jobs.map(job=>[`JOB-${job.id}`,job.customer,displayDate(job.date),job.crew || '',Number(job.price || 0),jobStatusLabel(job.status)])},
      {name:'Estimates',headers:['Estimate','Customer','Amount (USD)','Status','Created'],rows:estimates.map(estimate=>[estimate.id,estimate.customer,Number(estimate.amount || 0),estimateStatusLabel(estimate.status),displayDate(estimateCreatedDate(estimate))])},
      {name:'Invoices',headers:['Invoice','Customer','Total (USD)','Paid (USD)','Due (USD)','Status'],rows:invoices.map(invoice=>[invoice.id,invoice.customer,invoiceTotal(invoice),invoicePaidAmount(invoice),invoiceDueAmount(invoice),invoiceStatusLabel(invoiceDisplayStatus(invoice))])}
    ]};
  }
  if(type==='customer'){
    const customer=state.customers.find(item=>item.id==selectedCustomer || item.name===selectedCustomer);
    if(!customer) return null;
    const jobs=newestFirst(state.jobs.filter(job=>recordMatchesCustomer(job,customer)));
    const estimates=newestFirst(state.estimates.filter(estimate=>recordMatchesCustomer(estimate,customer)));
    const invoices=newestFirst(state.invoices.filter(invoice=>recordMatchesCustomer(invoice,customer)));
    return {title:`Customer - ${customer.name}`,fileName:`customer-${customer.name}`,sheets:[
      {name:'Customer',headers:['Field','Value'],rows:[['Name',customer.name],['Phone',customer.phone || ''],['Email',customer.email || ''],['Property',customer.address || ''],['Primary Service',customer.service || ''],['Notes',customer.notes || ''],['Jobs',jobs.length],['Estimates',estimates.length],['Invoices',invoices.length],['Billed (USD)',invoices.reduce((sum,invoice)=>sum+invoiceTotal(invoice),0)],['Paid (USD)',invoices.reduce((sum,invoice)=>sum+invoicePaidAmount(invoice),0)],['Due (USD)',invoices.reduce((sum,invoice)=>sum+invoiceDueAmount(invoice),0)]]},
      {name:'Jobs',headers:['Job','Service','Date','Time','Crew','Amount (USD)','Status'],rows:jobs.map(job=>[`JOB-${job.id}`,job.service,displayDate(job.date),job.time,job.crew,Number(job.price || 0),jobStatusLabel(job.status)])},
      {name:'Estimates',headers:['Estimate','Service','Amount (USD)','Status','Created','Expiration'],rows:estimates.map(estimate=>[estimate.id,estimate.service,Number(estimate.amount || 0),estimateStatusLabel(estimate.status),displayDate(estimateCreatedDate(estimate)),displayDate(estimateExpirationDate(estimate))])},
      {name:'Invoices',headers:['Invoice','Invoice Date','Due Date','Total (USD)','Paid (USD)','Due (USD)','Status'],rows:invoices.map(invoice=>[invoice.id,displayDate(invoice.invoiced),displayDate(invoice.due),invoiceTotal(invoice),invoicePaidAmount(invoice),invoiceDueAmount(invoice),invoiceStatusLabel(invoiceDisplayStatus(invoice))])}
    ]};
  }
  if(type==='job'){
    const job=selectedJob;
    if(!job) return null;
    return {title:`Job JOB-${job.id}`,fileName:`job-${job.id}`,sheets:[
      {name:'Job',headers:['Field','Value'],rows:[['Job',`JOB-${job.id}`],['Customer',job.customer],['Service',job.service],['Property',job.address || ''],['Date',displayDate(job.date)],['Time',job.time || ''],['Crew',job.crew || ''],['Priority',job.priority || 'Medium'],['Duration',job.duration || '0 hours'],['Amount (USD)',Number(job.price || 0)],['Status',jobStatusLabel(job.status)],['Equipment',job.equipment || ''],['Materials',job.materials || ''],['Notes',job.notes || '']]},
      {name:'Checklist',headers:['Task','Completed'],rows:(job.checklist || []).map(item=>[item.text,item.done?'Yes':'No'])}
    ]};
  }
  if(type==='estimate'){
    const estimate=state.estimates.find(item=>item.id===selectedEstimate);
    if(!estimate) return null;
    return {title:`Estimate ${estimate.id}`,fileName:`estimate-${estimate.id}`,sheets:[{name:'Estimate',headers:['Field','Value'],rows:[['Estimate',estimate.id],['Customer',estimate.customer],['Service',estimate.service],['Amount (USD)',Number(estimate.amount || 0)],['Approved Amount (USD)',estimateApprovedAmount(estimate)],['Status',estimateStatusLabel(estimate.status)],['Created',displayDate(estimateCreatedDate(estimate))],['Expiration',displayDate(estimateExpirationDate(estimate))],['Progress Date',estimateStatusDate(estimate)],['Notes',estimate.notes || '']]}]};
  }
  if(type==='invoice'){
    const invoice=state.invoices.find(item=>item.id===selectedInvoice);
    if(!invoice) return null;
    return {title:`Invoice ${invoice.id}`,fileName:`invoice-${invoice.id}`,sheets:[
      {name:'Invoice',headers:['Field','Value'],rows:[['Invoice',invoice.id],['Customer',invoice.customer],['Project',invoice.projectName || ''],['Service',invoiceServiceName(invoice)],['Invoice Date',displayDate(invoice.invoiced)],['Due Date',displayDate(invoice.due)],['Paid Date',displayDate(invoice.paid)],['Subtotal (USD)',invoiceSubtotal(invoice)],['Tax (USD)',invoiceTaxAmount(invoice)],['Total (USD)',invoiceTotal(invoice)],['Paid (USD)',invoicePaidAmount(invoice)],['Due (USD)',invoiceDueAmount(invoice)],['Status',invoiceStatusLabel(invoiceDisplayStatus(invoice))],['Notes',invoice.notes || '']]},
      {name:'Line Items',headers:['Job No.','Service Name','Quantity','Rate (USD)','Amount (USD)'],rows:invoiceLineItems(invoice).map(item=>[item.jobId ? displayJobNumber(item.jobId) : '',item.description,Number(item.quantity || 0),Number(item.rate || 0),Number(item.quantity || 0)*Number(item.rate || 0)])},
      {name:'Payments',headers:['Payment','Date','Amount (USD)','Method','Reference','Notes'],rows:invoicePaymentRecords(invoice).map(payment=>[payment.id || '',displayDate(payment.date),Number(payment.amount || 0),payment.method || '',payment.reference || '',payment.notes || ''])}
    ]};
  }
  if(type==='crew'){
    const raw=state.crew[selectedCrewIndex] || state.crew[0];
    if(!raw) return null;
    const crew=mergedCrewDetails(raw);
    const jobs=newestFirst(uniqueScheduleJobs(state.jobs).filter(job=>normalizeText(job.crew)===normalizeText(crew.name)));
    return {title:`Crew - ${crew.name}`,fileName:`crew-${crew.name}`,sheets:[
      {name:'Crew Member',headers:['Field','Value'],rows:[['Name',crew.name],['Role',crew.role || 'Crew Member'],['Email',crew.email || ''],['Phone',crew.phone || ''],['Address',crew.address || ''],['Status',isCrewActive(crew)?'Active':'Inactive'],['Availability',crew.availability || ''],['Skills',crew.skills || ''],['Emergency Contact',crew.emergencyContact || ''],['Assigned Jobs',jobs.length],['Completed Jobs',jobs.filter(job=>job.status==='completed'||job.status==='invoiced').length]]},
      {name:'Assigned Jobs',headers:['Job','Customer','Service','Date','Time','Amount (USD)','Status'],rows:jobs.map(job=>[`JOB-${job.id}`,job.customer,job.service,displayDate(job.date),job.time,Number(job.price || 0),jobStatusLabel(job.status)])}
    ]};
  }
  return null;
}
function jobLinkedInvoices(job){
  if(!job) return [];
  return state.invoices.filter(invoice=>String(invoice.jobId || '')===String(job.id) || invoiceLineItems(invoice).some(item=>String(item.jobId || '')===String(job.id)));
}
function invoiceContainsJob(invoice,jobId){
  const target=normalizeJobNumber(jobId);
  if(!target || !invoice) return false;
  return [invoice.jobId,...invoiceLineItems(invoice).map(item=>item.jobId)]
    .filter(Boolean)
    .some(value=>normalizeJobNumber(value)===target);
}
function activeInvoiceForJob(jobId,excludeInvoiceId=''){
  return state.invoices.find(invoice=>
    !invoice.deleted &&
    normalizeText(invoice.id)!==normalizeText(excludeInvoiceId) &&
    invoiceDisplayStatus(invoice)!=='cancelled' &&
    invoiceContainsJob(invoice,jobId)
  ) || null;
}
function unavailableInvoiceJob(jobId,currentInvoiceId=''){
  const invoice=activeInvoiceForJob(jobId,currentInvoiceId);
  if(invoice) return {invoice};
  const job=jobByEnteredNumber(jobId);
  const currentInvoice=currentInvoiceId ? state.invoices.find(item=>normalizeText(item.id)===normalizeText(currentInvoiceId)) : null;
  const belongsToCurrent=Boolean(currentInvoice && invoiceContainsJob(currentInvoice,jobId));
  return job?.status==='invoiced' && !belongsToCurrent ? {invoice:null} : null;
}
function invoiceLinePaymentAllocations(invoice){
  let remaining=invoicePaidAmount(invoice);
  const items=invoiceLineItems(invoice);
  const subtotal=invoiceSubtotal(invoice);
  const invoiceTax=invoiceTaxAmount(invoice);
  let allocatedTax=0;
  return items.map((item,index)=>{
    const lineSubtotal=currencyValue(item.quantity*item.rate);
    const tax=index===items.length-1
      ? currencyValue(Math.max(0,invoiceTax-allocatedTax))
      : currencyValue(subtotal>0 ? invoiceTax*(lineSubtotal/subtotal) : 0);
    allocatedTax=currencyValue(allocatedTax+tax);
    const total=currencyValue(lineSubtotal+tax);
    const paid=currencyValue(Math.min(total,Math.max(0,remaining)));
    remaining=currencyValue(Math.max(0,remaining-paid));
    return {...item,subtotal:lineSubtotal,tax,total,paid,due:currencyValue(total-paid)};
  });
}
function jobInvoiceBilling(invoice,job){
  const matching=invoiceLinePaymentAllocations(invoice).filter(item=>String(item.jobId || '')===String(job?.id || ''));
  const items=matching.length ? matching : String(invoice?.jobId || '')===String(job?.id || '')
    ? [{total:invoiceTotal(invoice),paid:invoicePaidAmount(invoice),due:invoiceDueAmount(invoice)}]
    : [];
  const total=currencyValue(items.reduce((sum,item)=>sum+Number(item.total || 0),0));
  const paid=currencyValue(items.reduce((sum,item)=>sum+Number(item.paid || 0),0));
  const due=currencyValue(Math.max(0,total-paid));
  const status=total>0 && due===0 ? 'paid' : paid>0 ? 'partial' : invoiceDisplayStatus(invoice)==='overdue' ? 'overdue' : 'unpaid';
  return {total,paid,due,status};
}
function jobPaymentHistory(job){
  return newestFirst(jobLinkedInvoices(job).flatMap(invoice=>{
    const payments=invoicePaymentRecords(invoice).length ? invoicePaymentRecords(invoice) : invoicePaidAmount(invoice)>0
      ? [{date:invoice.paid || invoice.invoiced,method:'Recorded payment',reference:'',amount:invoicePaidAmount(invoice)}]
      : [];
    const lineBalances=invoiceLineItems(invoice).map(item=>({...item,remaining:currencyValue(item.quantity*item.rate)}));
    if(!lineBalances.some(item=>String(item.jobId || '')===String(job?.id || '')) && String(invoice.jobId || '')===String(job?.id || '')){
      let remaining=jobInvoiceBilling(invoice,job).paid;
      return payments.map(payment=>{
        const amount=currencyValue(Math.min(remaining,Math.max(0,Number(payment.amount || 0))));
        remaining=currencyValue(Math.max(0,remaining-amount));
        return amount>0 ? {...payment,amount,invoiceId:invoice.id} : null;
      }).filter(Boolean);
    }
    return payments.flatMap(payment=>{
      let available=Math.max(0,Number(payment.amount || 0));
      return lineBalances.map(item=>{
        const amount=currencyValue(Math.min(item.remaining,available));
        item.remaining=currencyValue(Math.max(0,item.remaining-amount));
        available=currencyValue(Math.max(0,available-amount));
        return amount>0 && String(item.jobId || '')===String(job?.id || '') ? {...payment,amount,invoiceId:invoice.id} : null;
      }).filter(Boolean);
    });
  }));
}
function serviceInvoiceBilling(invoice,serviceName){
  const serviceKey=normalizeText(serviceName);
  const matching=invoiceLinePaymentAllocations(invoice).filter(item=>{
    const linkedJob=state.jobs.find(job=>String(job.id)===String(item.jobId));
    return normalizeText(item.description)===serviceKey || normalizeText(linkedJob?.service)===serviceKey;
  });
  const fallback=matching.length ? [] : invoiceIncludesService(invoice,serviceName)
    ? [{total:invoiceTotal(invoice),paid:invoicePaidAmount(invoice),due:invoiceDueAmount(invoice)}]
    : [];
  const items=matching.length ? matching : fallback;
  const total=currencyValue(items.reduce((sum,item)=>sum+Number(item.total || 0),0));
  const paid=currencyValue(items.reduce((sum,item)=>sum+Number(item.paid || 0),0));
  const due=currencyValue(Math.max(0,total-paid));
  const status=total>0 && due===0 ? 'paid' : paid>0 ? 'partial' : invoiceDisplayStatus(invoice)==='overdue' ? 'overdue' : 'unpaid';
  return {total,paid,due,status};
}
function jobBillingSummary(job){
  const invoices=jobLinkedInvoices(job);
  const jobAmount=Math.max(0,Number(job?.price || 0));
  const recordedPaid=invoices.reduce((sum,invoice)=>sum+jobInvoiceBilling(invoice,job).paid,0);
  const paid=Math.min(jobAmount,recordedPaid);
  const outstanding=Math.max(0,jobAmount-paid);
  const status=invoices.length
    ? (outstanding===0 && jobAmount>0 ? 'Paid' : paid>0 ? 'Partially Paid' : invoices.some(invoice=>invoiceDisplayStatus(invoice)==='overdue') ? 'Overdue' : 'Unpaid')
    : 'Not invoiced';
  return {invoices,paid,outstanding,status};
}
function jobInvoicePaymentSummary(job,invoices=jobLinkedInvoices(job)){
  const invoiceAmounts=invoices.map(invoice=>jobInvoiceBilling(invoice,job));
  const total=invoices.length
    ? currencyValue(invoiceAmounts.reduce((sum,item)=>sum+Number(item.total || 0),0))
    : currencyValue(Math.max(0,Number(job?.price || 0)));
  const paid=currencyValue(invoiceAmounts.reduce((sum,item)=>sum+Number(item.paid || 0),0));
  const outstanding=currencyValue(Math.max(0,total-paid));
  const status=invoices.length
    ? (total>0 && outstanding===0
      ? 'Paid'
      : paid>0
        ? 'Partially Paid'
        : invoices.some(invoice=>invoiceDisplayStatus(invoice)==='overdue')
          ? 'Overdue'
          : 'Unpaid')
    : 'Not invoiced';
  return {total,paid,outstanding,status};
}
function openJobPdf(job){
  if(!job) return;
  const win=window.open('','_blank','width=1000,height=900');
  if(!win){ showToast('Please allow popups to open the job PDF','error'); return; }
  const settings=getSettings();
  const company=String(settings.companyName || settings.company || 'GreenOps');
  const logo=String(settings.companyLogoDataUrl || '').trim();
  const customer=state.customers.find(item=>(job.customerId && String(item.id)===String(job.customerId)) || normalizeText(item.name)===normalizeText(job.customer));
  const customerName=job.customer || customer?.name || 'Customer';
  const address=job.customerAddress || job.address || customer?.address || '';
  const jobNo=displayJobNumber(job.id);
  const status=jobStatusLabel(job.status || 'scheduled');
  const statusClass=normalizeText(status).replace(/\s+/g,'-');
  const notes=String(job.notes || 'No additional instructions were provided for this service visit.').replace(/[\r\n]+/g,' ').slice(0,280);
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(jobNo)} New Job</title><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#082b21;font-family:Arial,Helvetica,sans-serif}.page{width:100%;padding:12mm 14mm 10mm;background:#fff;page-break-after:avoid}.print{position:fixed;top:16px;right:18px;border:0;border-radius:9px;background:#0f8a50;color:#fff;padding:10px 14px;font-weight:700;cursor:pointer}.brand{height:17mm;padding:4mm;display:flex;align-items:center;justify-content:space-between;background:#eef8f2;border-radius:10px;border-bottom:3px solid #e6ac21}.brand-left{display:flex;align-items:center;gap:10px;min-width:0}.logo{width:31px;height:31px;object-fit:contain;border-radius:7px;background:#fff}.company{font-size:15px;font-weight:800;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.company-meta{color:#61776d;font-size:8px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.document-label{background:#0f8a50;color:#fff;border-radius:8px;padding:10px 16px;font-size:11px;font-weight:800;white-space:nowrap}.headline{display:flex;justify-content:space-between;align-items:flex-end;margin:11mm 0 7mm}.headline h1{margin:0;font-size:28px;letter-spacing:.02em}.headline p{margin:5px 0 0;color:#61776d;font-size:10px}.reference{text-align:right;font-size:9px;line-height:1.8;color:#61776d}.reference strong{color:#082b21}.status{display:inline-block;border-radius:99px;padding:3px 9px;font-weight:800;font-size:8px;margin-left:6px}.scheduled{background:#fff1d5;color:#9a6200}.in-progress{background:#ddf5e6;color:#0f8a50}.completed{background:#eadcf3;color:#71349b}.customer-row{display:grid;grid-template-columns:1fr 1fr;gap:7mm;margin-bottom:7mm}.card{border:1px solid #d7e7df;border-radius:10px;background:#eef8f2;padding:5mm;min-height:29mm}.eyebrow{font-size:8px;font-weight:800;color:#0f8a50;letter-spacing:.04em}.customer-name{font-size:15px;font-weight:800;margin:7px 0 5px}.minor{font-size:9px;color:#61776d;line-height:1.4}.schedule{font-size:14px;font-weight:800;margin:7px 0 6px}.section-title{font-size:13px;font-weight:800;border-bottom:1px solid #d7e7df;padding-bottom:4mm;margin:0 0 3mm}.details{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #d7e7df}.detail{padding:4mm 0 5mm}.detail:nth-child(4n+2),.detail:nth-child(4n+3),.detail:nth-child(4n+4){padding-left:4mm}.detail-label{font-size:7.5px;font-weight:800;color:#61776d;text-transform:uppercase}.detail-value{font-size:10px;font-weight:800;margin-top:5px;word-break:break-word}.notes{margin-top:7mm;border:1px solid #d7e7df;border-radius:10px;padding:5mm;background:#fbfdfc;min-height:28mm}.notes h2{font-size:11px;margin:0 0 7px}.notes p{font-size:9px;line-height:1.55;color:#61776d;margin:0}.footer{margin-top:7mm;min-height:17mm;background:#082b21;border-top:4px solid #e6ac21;color:#dcefe5;padding:4mm 14mm;font-size:8px;display:flex;justify-content:space-between;align-items:center}.footer strong{color:#fff;font-size:9px}@media print{.print{display:none}html,body{width:auto;height:auto;overflow:visible}.page{width:auto;min-height:0;height:auto;padding:12mm 14mm 10mm;overflow:visible}.brand,.headline,.customer-row,.details,.notes,.footer{break-inside:avoid;page-break-inside:avoid}}
  </style></head><body><button class="print" onclick="window.print()">Save / Print PDF</button><main class="page">
    <header class="brand"><div class="brand-left">${logo?`<img class="logo" src="${escapeHtml(logo)}" alt="Company logo">`:''}<div><div class="company">${escapeHtml(company)}</div><div class="company-meta">${escapeHtml(settings.address || '')}</div></div></div><div class="document-label">NEW JOB</div></header>
    <section class="headline"><div><h1>NEW JOB</h1><p>Your scheduled service details</p></div><div class="reference"><div>JOB NO. &nbsp; <strong>${escapeHtml(jobNo)}</strong></div><div>STATUS <span class="status ${escapeHtml(statusClass)}">${escapeHtml(status)}</span></div></div></section>
    <section class="customer-row"><article class="card"><div class="eyebrow">SERVICE FOR</div><div class="customer-name">${escapeHtml(customerName)}</div><div class="minor">${escapeHtml(address || 'Property details will be confirmed by the service team.')}</div></article><article class="card"><div class="eyebrow">SCHEDULED FOR</div><div class="schedule">${escapeHtml(displayDate(job.date))}${job.time?` · ${escapeHtml(job.time)}`:''}</div><div class="minor">Service appointment details</div></article></section>
    <section><h2 class="section-title">Visit details</h2><div class="details"><div class="detail"><div class="detail-label">Service</div><div class="detail-value">${escapeHtml(job.service || 'Not provided')}</div></div><div class="detail"><div class="detail-label">Duration</div><div class="detail-value">${escapeHtml(job.duration ? `${job.duration} hour${Number(job.duration)===1?'':'s'}` : 'Not provided')}</div></div><div class="detail"><div class="detail-label">Priority</div><div class="detail-value">${escapeHtml(job.priority || 'Medium')}</div></div><div class="detail"><div class="detail-label">Job status</div><div class="detail-value">${escapeHtml(status)}</div></div><div class="detail"><div class="detail-label">Job date</div><div class="detail-value">${escapeHtml(displayDate(job.date))}</div></div><div class="detail"><div class="detail-label">Time</div><div class="detail-value">${escapeHtml(job.time || 'To be confirmed')}</div></div><div class="detail"><div class="detail-label">Equipment</div><div class="detail-value">${escapeHtml(job.equipment || 'Not provided')}</div></div><div class="detail"><div class="detail-label">Materials</div><div class="detail-value">${escapeHtml(job.materials || 'Not provided')}</div></div></div></section>
    <section class="notes"><h2>Notes for your visit</h2><p>${escapeHtml(notes)}</p></section><footer class="footer"><div><strong>${escapeHtml(company)}</strong><br>Thank you for choosing our service.</div><div>${escapeHtml(settings.phone || '')}<br>${escapeHtml(settings.email || currentUser?.email || '')}</div></footer>
  </main><script>setTimeout(()=>window.print(),500)</script></body></html>`;
  win.document.open();win.document.write(html);win.document.close();win.focus();
  showToast('New Job PDF opened');
}
function exportSelectedRecord(type,format){
  if(type==='job' && format==='pdf'){
    if(!selectedJob){ showToast('Job not found','error'); return; }
    openJobPdf(selectedJob);
    recordAudit(selectedJob,'Job PDF generated',`One-page new job PDF opened for printing`);
    saveToFirebase('jobs',selectedJob);
    return;
  }
  if(type==='invoice' && format==='pdf'){
    const invoice=state.invoices.find(item=>item.id===selectedInvoice);
    if(!invoice){ showToast('Invoice not found','error'); return; }
    openInvoicePdf(invoice);
    recordAudit(invoice,'Invoice PDF generated',`Invoice ${invoice.id} opened for printing`);
    save();
    saveToFirebase('invoices',invoice);
    return;
  }
  const bundle=selectedRecordExportBundle(type);
  if(!bundle){ showToast('Record not found','error'); return; }
  if(format==='excel'){
    downloadExcelWorkbook(bundle.fileName,bundle.sheets);
    return;
  }
  openPdfReport(bundle.title,bundle.sheets.map(sheet=>({title:sheet.name,html:pdfTable(sheet.headers,sheet.rows)})));
}
function showToast(message, type=''){
  clearTimeout(toastTimer); document.querySelector('.toast')?.remove();
  const inferredType = type || (/error|invalid|unable|failed|required|cannot|denied|not found/i.test(String(message)) ? 'error' : 'success');
  const el=document.createElement('div');
  el.className=`toast toast-${inferredType}`;
  el.setAttribute('role', inferredType === 'error' ? 'alert' : 'status');
  el.setAttribute('aria-live','polite');
  el.innerHTML=`<span class="toast-icon">${inferredType==='error'?icon('circle-alert'):icon('circle-check')}</span><span>${escapeHtml(message)}</span>`;
  document.body.appendChild(el);
  window.lucide?.createIcons?.({attrs:{'stroke-width':2}});
  toastTimer=setTimeout(()=>el.remove(),3200);
}

function currentTimeText(){
  return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
function currentDateText(){
  return displayDate(new Date());
}
function addWorkspaceNotification({audience='management',kind='job',id='',severity='info',title,detail}){
  state.notifications=Array.isArray(state.notifications)?state.notifications:[];
  state.notifications.unshift({id:`NOTICE-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,audience,kind,recordId:String(id),severity,title,detail,createdAt:Date.now()});
  state.notifications=state.notifications.slice(0,40);
  save();
}
function customerNotificationTarget(customer){
  return String(customer?.id || normalizeEmailText(customer?.email) || normalizeText(customer?.name) || '').trim();
}
function shareRecordWithCustomer(record,customer,kind){
  if(!record || !customer) return;
  // Keep an explicit immutable sharing link. Older records may only contain a
  // customer name, while invoices can be assembled from several jobs.
  if(customer.id){
    record.customerId=String(customer.id);
    record.sharedCustomerId=String(customer.id);
  }
  record.sentAt=todayISO();
  record.sentToCustomerAt=Date.now();
}
async function publishRecordToCustomerAccount(record, customer, kind){
  const response=await apiRequest('/customer-records/share',{
    kind,
    recordId:record?.id,
    customerEmail:customer?.email || ''
  });
  shareRecordWithCustomer(record,customer,kind);
  return response;
}
function openCustomerDeliveryOptions(buttonId, recordLabel){
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal send-options-modal"><h3>Send ${escapeHtml(recordLabel)} PDF</h3><p class="muted">Choose where the customer should receive this PDF and record.</p><div class="send-options"><button type="button" class="send-option" data-delivery="email"><span class="send-option-icon">&#9993;</span><span><strong>Email PDF</strong><small>Send the PDF to the customer’s email address.</small></span></button><button type="button" class="send-option" data-delivery="account"><span class="send-option-icon">&#128274;</span><span><strong>Customer account</strong><small>Share the record and make its PDF available in the customer portal.</small></span></button><button type="button" class="send-option send-option-both" data-delivery="both"><span class="send-option-icon">&#10003;</span><span><strong>Email PDF and customer account</strong><small>Email the PDF and make the same document available in their portal.</small></span></button></div><div class="modal-actions"><button type="button" class="secondary" id="cancelDeliveryOptions">Cancel</button></div></div>`;
  document.body.appendChild(wrap);
  wrap.onclick=event=>{if(event.target===wrap) wrap.remove();};
  wrap.querySelector('#cancelDeliveryOptions').onclick=()=>wrap.remove();
  wrap.querySelectorAll('[data-delivery]').forEach(option=>option.addEventListener('click',()=>{
    const button=document.getElementById(buttonId);
    if(!button) return;
    button.dataset.deliveryMode=option.dataset.delivery;
    wrap.remove();
    button.click();
  }));
}
async function openCustomerPortalPdf(kind, recordId){
  const token=await window.greenopsAuth?.getToken?.();
  let response;
  try {
    response=await fetch(`${API_BASE}/customer-records/${encodeURIComponent(kind)}/${encodeURIComponent(recordId)}/pdf`,{headers:token?{Authorization:`Bearer ${token}`}:{}});
  } catch (_) {
    throw new Error('Cannot connect to the GreenOps server. Restart the app with npm run dev.');
  }
  if(!response.ok){
    const data=await response.json().catch(()=>({}));
    throw new Error(data.error || 'Unable to open this PDF.');
  }
  const url=URL.createObjectURL(await response.blob());
  const popup=window.open(url,'_blank','noopener');
  if(!popup){
    const link=document.createElement('a');
    link.href=url;
    link.download=`${String(recordId || kind).replace(/[^A-Za-z0-9_-]/g,'-')}.pdf`;
    link.click();
  }
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function notificationIsVisible(item){
  if(item.audience==='management') return hasManagementAccess();
  if(String(item.audience || '').startsWith('crew:')) return isCrewUser() && normalizeText(item.audience.slice(5))===normalizeText(currentUser?.name);
  if(String(item.audience || '').startsWith('customer:')){
    if(!isCustomerUser()) return false;
    const target=String(item.audience).slice('customer:'.length);
    const identities=[currentUser?.customerId,currentUser?.email,currentUser?.customerName,currentUser?.name]
      .map(value=>String(value || '').trim())
      .filter(Boolean);
    return identities.some(identity=>identity===target || normalizeText(identity)===normalizeText(target));
  }
  return false;
}
function notificationReadKey(){
  const identity = currentUser?.email || currentUser?.uid || currentUser?.name || 'guest';
  return `greenops-notifications-read:${normalizeText(identity)}`;
}
function lastNotificationsReadAt(){
  return Number(localStorage.getItem(notificationReadKey()) || 0);
}
function unreadNotificationCount(){
  const lastReadAt=lastNotificationsReadAt();
  return (state.notifications || []).filter(item=>notificationIsVisible(item) && Number(item.createdAt || 0)>lastReadAt).length;
}
function markNotificationsRead(){
  localStorage.setItem(notificationReadKey(),String(Date.now()));
}
function notificationItems(){
  const items=[];
  (state.notifications || []).filter(notificationIsVisible).forEach(item=>items.push({kind:item.kind,id:item.recordId,severity:item.severity || 'info',title:item.title || 'Update',detail:item.detail || '',date:item.createdAt || 0}));
  const today=new Date(`${todayISO()}T00:00:00`);
  const daysFromToday=value=>{
    const date=parseBusinessDate(value);
    return date && !Number.isNaN(date.getTime()) ? Math.ceil((date-today)/86400000) : null;
  };
  if(hasManagementAccess()){
    state.invoices.forEach(invoice=>{
      if(invoiceDisplayStatus(invoice)!=='overdue' || invoiceDueAmount(invoice)<=0) return;
      items.push({kind:'invoice',id:invoice.id,severity:'critical',title:`${invoice.id} is overdue`,detail:`${invoice.customer} · ${money(invoiceDueAmount(invoice))} due`,date:invoice.due});
    });
    state.invoices.forEach(invoice=>{
      const days=daysFromToday(invoice.due);
      if(invoiceDueAmount(invoice)<=0 || invoicePaymentStatus(invoice)==='cancelled' || days===null || days<0 || days>7) return;
      items.push({kind:'invoice',id:invoice.id,severity:'warning',title:`${invoice.id} is due soon`,detail:`${invoice.customer} · ${money(invoiceDueAmount(invoice))} due ${days===0?'today':`in ${days} days`}`,date:invoice.due});
    });
    state.estimates.forEach(estimate=>{
      if(!['pending','followup1','followup2'].includes(estimate.status)) return;
      const followUpDays=estimate.nextFollowUpDate ? daysFromToday(estimate.nextFollowUpDate) : null;
      const expiration=estimateExpirationDate(estimate);
      const expirationDays=daysFromToday(expiration);
      if(followUpDays!==null && followUpDays<=0){
        items.push({kind:'estimate',id:estimate.id,severity:'warning',title:`Follow up on ${estimate.id}`,detail:`${estimate.customer} · ${money(estimate.amount)}`,date:estimate.nextFollowUpDate});
      } else if(expirationDays!==null && expirationDays>=0 && expirationDays<=7){
        items.push({kind:'estimate',id:estimate.id,severity:'warning',title:`${estimate.id} expires soon`,detail:`${estimate.customer} · ${expirationDays===0?'expires today':`${expirationDays} day${expirationDays===1?'':'s'} left`}`,date:expiration});
      }
    });
  }
  const visibleJobs=isCrewUser() ? assignedJobs() : state.jobs;
  visibleJobs.forEach(job=>{
    if(!['pending','scheduled','progress'].includes(job.status)) return;
    const days=daysFromToday(job.date);
    if(days===null || days<0) return;
    const jobTitle=days===0
      ? `Job today: ${job.service}`
      : days===1
        ? `Job tomorrow: ${job.service}`
        : `Upcoming job: ${job.service}`;
    const scheduleText=days<=1 ? (job.time || 'Time not set') : `${displayDate(job.date)} · ${job.time || 'Time not set'}`;
    items.push({kind:'job',id:job.id,severity:'info',title:jobTitle,detail:`${job.customer} · ${scheduleText}`,date:job.date});
  });
  const rank={critical:0,warning:1,info:2};
  return items.sort((first,second)=>(rank[first.severity]-rank[second.severity]) || String(first.date || '').localeCompare(String(second.date || ''))).slice(0,15);
}
function globalSearchResults(query){
  const text=normalizeText(query);
  if(!text || text.length<2) return [];
  const matched=[];
  state.customers.filter(customer=>normalizeText([customer.name,customer.email,customer.phone,customer.address,customer.service].join(' ')).includes(text)).forEach(customer=>matched.push({kind:'customer',id:customer.id,title:customer.name,detail:customer.service || customer.email || 'Customer'}));
  state.jobs.filter(job=>normalizeText([job.id,job.customer,job.service,job.address,job.crew].join(' ')).includes(text)).forEach(job=>matched.push({kind:'job',id:job.id,title:`#JOB-${job.id}`,detail:`${job.customer} · ${job.service}`}));
  state.estimates.filter(estimate=>normalizeText([estimate.id,estimate.customer,estimate.service].join(' ')).includes(text)).forEach(estimate=>matched.push({kind:'estimate',id:estimate.id,title:estimate.id,detail:`${estimate.customer} · ${estimate.service}`}));
  state.invoices.filter(invoice=>normalizeText([invoice.id,invoice.customer,invoice.projectName,invoice.service].join(' ')).includes(text)).forEach(invoice=>matched.push({kind:'invoice',id:invoice.id,title:invoice.id,detail:`${invoice.customer} · ${money(invoiceTotal(invoice))}`}));
  return matched.slice(0,8);
}
function globalSearchMarkup(results,query=''){
  if(!query) return '';
  return `<div class="global-search-results">${results.length?results.map(item=>`<button type="button" data-global-result-kind="${item.kind}" data-global-result-id="${escapeHtml(item.id)}"><span class="global-result-kind">${escapeHtml(item.kind)}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span></button>`).join(''):'<div class="global-search-empty">No records found</div>'}</div>`;
}
function notificationPanel(items){
  const unreadCount=unreadNotificationCount();
  return `<div class="notification-shell">
    <button type="button" class="notification-button" id="notificationButton" aria-label="Notifications" aria-expanded="false">${icon('bell')}${unreadCount?`<span class="notification-count">${unreadCount}</span>`:''}</button>
    <div class="notification-panel" id="notificationPanel" hidden>
      <div class="notification-head"><div><strong>Notifications</strong><span>${items.length ? `${items.length} notification${items.length===1?'':'s'}` : 'You are all caught up'}</span></div></div>
      <div class="notification-list">${items.length ? items.map(item=>`<button type="button" class="notification-item ${item.severity}" data-notification-kind="${item.kind}" data-notification-id="${escapeHtml(item.id)}"><span class="notification-dot"></span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span><span class="notification-arrow">&rsaquo;</span></button>`).join('') : `<div class="notification-empty">${icon('circle-check')}<strong>No new notifications</strong><span>Upcoming work and payment alerts will appear here.</span></div>`}</div>
    </div>
  </div>`;
}
function weatherCondition(code){
  const map = {
    0:'Clear',
    1:'Mostly clear',
    2:'Partly cloudy',
    3:'Cloudy',
    45:'Fog',
    48:'Fog',
    51:'Light drizzle',
    53:'Drizzle',
    55:'Heavy drizzle',
    61:'Light rain',
    63:'Rain',
    65:'Heavy rain',
    71:'Light snow',
    73:'Snow',
    75:'Heavy snow',
    80:'Rain showers',
    81:'Rain showers',
    82:'Heavy showers',
    95:'Thunderstorm',
    96:'Storm with hail',
    99:'Storm with hail'
  };
  return map[Number(code)] || 'Live weather';
}
function liveWeatherText(){
  const temp = liveWeatherState.temperature === null ? '--°C' : `${Math.round(liveWeatherState.temperature)}°C`;
  return `${currentTimeText()} · ${temp} · ${liveWeatherState.condition}`;
}
function liveTempText(){
  return liveWeatherState.temperature === null ? '--°C' : `${Math.round(liveWeatherState.temperature)}°C`;
}
function liveConditionIcon(){
  const condition = normalizeText(liveWeatherState.condition);
  if(condition.includes('rain') || condition.includes('drizzle')) return '🌧️';
  if(condition.includes('storm')) return '⛈️';
  if(condition.includes('cloud')) return '🌥️';
  if(condition.includes('fog')) return '🌫️';
  if(condition.includes('snow')) return '❄️';
  return '🌤️';
}
function updateLiveWeatherElement(){
  const el = document.getElementById('liveWeather');
  if(el) el.textContent = liveWeatherText();
  const timeEl = document.getElementById('liveTime');
  if(timeEl) timeEl.textContent = currentTimeText();
  const dateEl = document.getElementById('liveDate');
  if(dateEl) dateEl.textContent = currentDateText();
  const tempEl = document.getElementById('liveTemp');
  if(tempEl) tempEl.textContent = liveTempText();
  const weatherIcon = document.getElementById('liveWeatherIcon');
  if(weatherIcon) weatherIcon.textContent = liveConditionIcon();
}
function getBrowserPosition(){
  return new Promise(resolve => {
    if(!navigator.geolocation){
      resolve({latitude:38.627, longitude:-90.199, location:'St. Louis'});
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({latitude:position.coords.latitude, longitude:position.coords.longitude, location:'Current location'}),
      () => resolve({latitude:38.627, longitude:-90.199, location:'St. Louis'}),
      {enableHighAccuracy:false, timeout:5000, maximumAge:15 * 60 * 1000}
    );
  });
}
async function refreshLiveWeather(){
  try {
    const {latitude, longitude, location} = await getBrowserPosition();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,weather_code&temperature_unit=celsius`;
    const response = await fetch(url);
    if(!response.ok) throw new Error('Weather unavailable');
    const data = await response.json();
    liveWeatherState = {
      temperature: data?.current?.temperature_2m ?? null,
      condition: weatherCondition(data?.current?.weather_code),
      location,
      loaded: true
    };
  } catch (_) {
    liveWeatherState = { temperature: null, condition: 'Weather unavailable', location: '', loaded: false };
  }
  updateLiveWeatherElement();
}
function startLiveWeatherWidget(){
  updateLiveWeatherElement();
  if(!liveWidgetTimer){
    liveWidgetTimer = setInterval(updateLiveWeatherElement, 30000);
  }
  if(!liveWeatherTimer){
    refreshLiveWeather();
    liveWeatherTimer = setInterval(refreshLiveWeather, 15 * 60 * 1000);
  }
}


function renderAuth(mode='login', presetEmail=''){
  const isCreate = mode === 'create';
  const isForgot = mode === 'forgot';
  const title = isForgot ? 'Reset password' : isCreate ? 'Create account' : 'Sign in';
  const subtitle = isForgot
    ? 'Enter the email for an existing GreenOps account to receive a secure reset link.'
    : '';
  const authBadge = isForgot ? 'Account recovery' : isCreate ? 'Start your workspace' : 'GreenOps workspace';
  document.getElementById('app').innerHTML = `
    <main class="auth-page ${isCreate ? 'auth-create-page' : ''}">
      <section class="auth-card card ${isCreate ? 'auth-create-card' : ''}">
        <div class="auth-glow"></div>
        <div class="brand auth-brand"><div class="brand-mark">&#127793;</div><span>GreenOps</span></div>
        <div class="auth-badge">${authBadge}</div>
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
        <form id="authForm" class="auth-form ${isCreate ? 'auth-create-form' : ''}" autocomplete="off" data-form-mode="${mode}">
          ${isCreate ? '<label>User name<input name="name" required minlength="2" maxlength="60" placeholder="Enter user name" autocomplete="name"></label><label>Company name<input name="companyName" required maxlength="100" placeholder="Enter company name" autocomplete="organization"></label>' : ''}
          <label>Email<input name="email" type="email" inputmode="email" required placeholder="you@example.com" value="${isForgot ? escapeHtml(presetEmail) : ''}" autocomplete="${isForgot ? 'email' : 'off'}" autocapitalize="none" spellcheck="false" data-lpignore="true" data-1p-ignore ${!isCreate && !isForgot ? 'readonly data-manual-auth' : ''}></label>
          ${!isForgot ? `<label>Password<span class="password-field"><input id="authPassword" name="password" type="password" required placeholder="Enter your password" autocomplete="new-password" data-lpignore="true" data-1p-ignore ${!isCreate ? 'readonly data-manual-auth' : ''}><button type="button" class="password-toggle" data-toggle-password="authPassword" aria-label="Show password">&#128065;</button></span></label>` : ''}
          ${isCreate ? '<label class="auth-field-full">Company address<textarea name="address" required rows="3" placeholder="Street, city, state, ZIP" autocomplete="street-address"></textarea></label>' : ''}
          <button class="primary auth-submit" type="submit">${isForgot ? 'Send Reset Link' : isCreate ? 'Create Admin Account' : 'Login to GreenOps'}</button>
        </form>
        <div class="auth-links">
          <button class="link-btn auth-switch" id="authSwitch">${isCreate || isForgot ? 'Back to Login' : 'New user? Create account'}</button>
          ${!isCreate && !isForgot ? '<button class="link-btn auth-switch" id="forgotPassword">Forgot password?</button>' : ''}
        </div>
      </section>
    </main>`;
  const authForm = document.getElementById('authForm');
  let authTouched = false;
  authForm?.addEventListener('input', () => { authTouched = true; }, {once:true});
  if(!isForgot){
    const clearAuthFields = () => {
      if(authTouched || !document.body.contains(authForm)) return;
      authForm.querySelectorAll('input, textarea').forEach(input => {
        input.value = '';
        input.setAttribute('value', '');
      });
    };
    [0, 80, 350, 900].forEach(delay => setTimeout(clearAuthFields, delay));
  }
  document.querySelectorAll('[data-manual-auth]').forEach(input => {
    const enableManualEntry = () => {
      input.readOnly = false;
      input.value = '';
      input.setAttribute('value', '');
    };
    input.addEventListener('pointerdown', enableManualEntry, {once:true});
    input.addEventListener('focus', enableManualEntry, {once:true});
  });
  document.getElementById('authSwitch').onclick = () => renderAuth(isCreate || isForgot ? 'login' : 'create');
  document.getElementById('forgotPassword')?.addEventListener('click', async () => {
    const email = String(document.querySelector('[name="email"]')?.value || '').trim().toLowerCase();
    renderAuth('forgot', email);
  });
  document.querySelectorAll('[data-toggle-password]').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.togglePassword);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.classList.toggle('is-visible', show);
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }));
  document.getElementById('authForm').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const email = String(f.get('email')).trim().toLowerCase();
    const password = String(f.get('password') || '');
    if(isCreate){
      const passwordMessage = passwordValidationMessage(password);
      if(passwordMessage){ showToast(passwordMessage); return; }
    }
    const submit = e.target.querySelector('.auth-submit');
    const previousText = submit?.textContent;
    if(submit){ submit.disabled = true; submit.textContent = 'Please wait...'; }
    try {
      if(isForgot){
        try {
          await apiRequest('/auth/account-exists', {email});
          await window.greenopsAuth.sendPasswordReset(email);
        } catch (error) {
          const message=error?.status===404
            ? 'No GreenOps account exists for this email. Create an account first.'
            : (error?.message || 'Unable to send reset email');
          showToast(message);
          return;
        }
        showToast('Password reset link sent to your email');
        renderAuth('login');
      } else if(isCreate){
        const name = String(f.get('name')).trim();
        const companyName = String(f.get('companyName')).trim();
        const address = String(f.get('address')).trim();
        try {
          const accountResult = await window.greenopsAuth.createAccount(email, password);
          await apiRequest('/auth/register-profile', {name, companyName, address});
          localStorage.setItem(PENDING_ADMIN_VERIFICATION_KEY, email);
          showToast(accountResult.verificationEmailSent
            ? `Verification email sent to ${email}. Open the link to activate your Admin account`
            : 'Registration saved, but the verification email could not be sent. Log in to request a new link');
        } catch (error) {
          try { await window.greenopsAuth.signOut(); } catch (_) {}
          showToast(error.message || 'Unable to start Admin registration');
          return;
        }
        renderAuth('login');
      } else {
        let user;
        try {
          const credential = await window.greenopsAuth.signIn(email, password);
          try {
            const result = await apiGet('/auth/me');
            user = result.user;
          } catch (error) {
            if(error.status !== 404) throw error;
            const result = await apiRequest('/auth/register-profile', {});
            user = result.user;
          }
        } catch (error) {
          const inactiveAccount = error?.code === 'auth/user-disabled' || /user-disabled|account is inactive/i.test(String(error?.message || ''));
          showToast(inactiveAccount ? 'This account is inactive. Please contact your administrator.' : (error.message || 'Invalid email or password'));
          return;
        }
        rememberUser(user);
        switchUserData();
        const completedAdminRegistration = normalizeEmailText(localStorage.getItem(PENDING_ADMIN_VERIFICATION_KEY)) === email;
        if(completedAdminRegistration){
          localStorage.removeItem(PENDING_ADMIN_VERIFICATION_KEY);
          showToast('Email verified. Your Admin account is ready');
        } else {
          showToast('Logged in');
        }
        render();
      }
    } finally {
      if(submit && document.body.contains(submit)){
        submit.disabled = false;
        submit.textContent = previousText;
      }
    }
  };
}

function render(){
  if(!currentUser){ renderAuth(); return; }
  normalizeState();
  document.body.classList.remove('dark-theme');
  const visibleNav = navForCurrentUser();
  const configuredCompanyName=String(getSettings().companyName || currentUser?.companyName || '').trim();
  const companyBrandName=configuredCompanyName
    ? (normalizeText(configuredCompanyName).includes('greenops') ? configuredCompanyName : `${configuredCompanyName} GreenOps`)
    : 'GreenOps';
  const copyrightNotice=String(getSettings().copyright || '').trim() || `© ${new Date().getFullYear()} ${configuredCompanyName || 'GreenOps'}. All rights reserved.`;
  if(!canOpenView(currentView)) currentView = defaultViewForCurrentUser();
  const currentRoleLabel = roleLabel();
  const currentPageTitle = navLabel(currentView);
  const notifications=notificationItems();
  const mobileTabs = isCrewUser()
    ? ``
    : isCustomerUser()
      ? customerNavItems.map(view=>`<button data-view="${view}" class="${currentView===view?'active':''}"><span class="nav-icon">${icons[view]}</span>${navLabel(view)}</button>`).join('')
      : `<button data-view="dashboard" class="${currentView==='dashboard'?'active':''}"><span class="nav-icon">${icons.dashboard}</span>Dashboard</button><button data-view="schedule" class="${currentView==='schedule'?'active':''}"><span class="nav-icon">${icons.schedule}</span>Schedule</button><button id="mobileNewJob" class="fab-tab" aria-label="New Job"><span>+</span></button><button data-view="jobs" class="${currentView==='jobs'?'active':''}"><span class="nav-icon">${icons.jobs}</span>Jobs</button><button id="mobileMore"><span>•••</span>More</button>`;
  document.getElementById('app').innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">${companyLogoMarkup('brand-mark')}<span class="brand-name">${escapeHtml(companyBrandName)}</span></div>
      <nav class="nav">${visibleNav.map(i=>`<button data-view="${i}" class="${currentView===i?'active':''}"><span class="nav-icon">${icons[i] || '&#8226;'}</span>${navLabel(i)}</button>`).join('')}</nav>
      <div class="sidebar-footer"><div class="avatar">${initials(currentUser.name)}</div><div><strong>${escapeHtml(currentUser.name)}</strong><div class="muted">${currentRoleLabel}</div></div></div>
    </aside>
    <main class="main">
      <header class="topbar"><button class="ham-btn" id="openDrawer">&#9776;</button><span class="brand-title"><span class="bt-green">Green</span><span class="bt-white">Ops</span></span><h1 class="page-title">${currentPageTitle}</h1><div class="top-actions"><div class="global-search"><input id="globalSearch" type="search" placeholder="Search records..." aria-label="Search customers, jobs, estimates, and invoices"><div id="globalSearchResults"></div></div><span class="top-chip date-chip"><span id="liveDate">${currentDateText()}</span></span><span class="top-chip time-chip"><span class="chip-icon svg-chip">${icons.clock}</span><span id="liveTime">${currentTimeText()}</span></span><span class="top-chip weather-chip"><span id="liveWeatherIcon">${liveConditionIcon()}</span><span id="liveTemp">${liveTempText()}</span></span>${notificationPanel(notifications)}<button class="secondary" id="logoutBtn">Logout</button></div></header>
      <section class="content">${viewTemplate()}</section>
      <footer class="app-copyright-footer"><span class="app-copyright-mark">&copy;</span><span>${escapeHtml(copyrightNotice)}</span></footer>
    </main>
    ${mobileTabs ? `<nav class="mobile-tabs">${mobileTabs}</nav>` : ''}
    <div class="drawer-overlay" id="drawerOverlay">
      <aside class="mobile-drawer">
        <div class="drawer-brand">${companyLogoMarkup('brand-mark')}<span class="brand-name">${escapeHtml(companyBrandName)}</span><button class="drawer-close" id="closeDrawer">&times;</button></div>
        <nav class="drawer-nav">
          ${visibleNav.map(i=>`<button data-view="${i}" class="drawer-item${currentView===i?' active':''}"><span class="drawer-icon">${icons[i] || '&#8226;'}</span>${navLabel(i)}</button>`).join('')}
        </nav>
        <div class="drawer-footer"><div class="avatar">${initials(currentUser.name)}</div><div><strong>${escapeHtml(currentUser.name)}</strong><div class="muted" style="color:#aac1b6;font-size:12px">${currentRoleLabel}</div></div></div>
      </aside>
    </div>
  </div>`;
  const jobPrefixWalker=document.createTreeWalker(document.getElementById('app'),NodeFilter.SHOW_TEXT);
  const jobPrefixNodes=[];
  while(jobPrefixWalker.nextNode()) jobPrefixNodes.push(jobPrefixWalker.currentNode);
  jobPrefixNodes.forEach(node=>{ node.nodeValue=node.nodeValue.replace(/#JOB-/g,'JOB-'); });
  window.lucide?.createIcons?.({attrs:{'stroke-width':2}});
  bind();
  startLiveWeatherWidget();
}

function viewTemplate(){
  if(!canOpenView(currentView)) currentView = defaultViewForCurrentUser();
  switch(currentView){
    case 'dashboard': return dashboard();
    case 'customers': return customers();
    case 'services': return services();
    case 'serviceDetail': return serviceDetail();
    // The customer sidebar's My Profile item must always return to the
    // profile overview, rather than retaining the last shared-record tab.
    case 'customerProfile': customerPortalTab='overview'; return customerProfile();
    case 'customerEstimates': customerPortalTab='estimates'; return customerProfile();
    case 'customerJobs': customerPortalTab='jobs'; return customerProfile();
    case 'customerInvoices': customerPortalTab='invoices'; return customerProfile();
    case 'customerRecordDetail': return customerPortalRecordDetail();
    case 'schedule': return schedule();
    case 'scheduleDetail': return scheduleDetailPage();
    case 'jobs': return jobs();
    case 'estimates': return estimates();
    case 'estimateDetail': return estimateDetail();
    case 'invoices': return invoices();
    case 'invoiceDetail': return invoiceDetail();
    case 'crew': return crew();
    case 'crewDetail': return crewDetail();
    case 'reports': return reports();
    case 'subscription': return subscription();
    case 'settings': return settings();
    case 'myProfile': return myProfile();
    case 'jobDetail': return jobDetail();
    case 'crewProfile': crewPageTab = 'profile'; return crewView();
    case 'crewView': crewPageTab = 'jobs'; return crewView();
    case 'crewJobDetail': return crewView();
    default: return dashboard();
  }
}

function dashboard(){
  sendIncompleteJobReminders();
  const todayKey=todayISO();
  const dashboardYear=String(todayKey).slice(0,4);
  const isDashboardYear=value=>String(value || '').slice(0,4)===dashboardYear;
  const thisYearJobs=state.jobs.filter(job=>isDashboardYear(job.date || job.createdAt || job.createdDate));
  const thisYearEstimates=state.estimates.filter(estimate=>isDashboardYear(estimate.createdDate || estimate.createdAt || estimate.statusDate));
  const thisYearInvoices=state.invoices.filter(invoice=>isDashboardYear(invoice.invoiced || invoice.invoiceDate || invoice.createdAt));
  const collectedRevenue=thisYearInvoices.reduce((a,b)=>a+invoicePaidAmount(b),0);
  const today=uniqueScheduleJobs(thisYearJobs.filter(j=>j.date===todayKey));
  const inProgress=today.filter(j=>j.status==='progress').length;
  const unpaid=thisYearInvoices.filter(i=>invoiceDueAmount(i)>0 && invoicePaymentStatus(i)!=='cancelled');
  const paidInvoices=thisYearInvoices.filter(i=>invoicePaymentStatus(i)==='paid');
  const paidInvoiceAmount=paidInvoices.reduce((sum,invoice)=>sum+invoicePaidAmount(invoice),0);
  const overdue=thisYearInvoices.filter(i=>invoiceDisplayStatus(i)==='overdue');
  const pending=thisYearEstimates.filter(e=>e.status==='pending');
  const workingCrew=state.crew.filter(c=>isCrewWorkingToday(c)).length;
  const upcoming=uniqueScheduleJobs(thisYearJobs.filter(j=>j.date>=todayISO())).slice(0,3);
  const totalRevenue=thisYearInvoices.reduce((a,b)=>a+invoiceTotal(b),0);
  const paidPercent=totalRevenue ? Math.round((collectedRevenue/totalRevenue)*100) : 0;
  const activities=recentActivities(dashboardYear);
  // Keep the dashboard concise: show the current month and five months before it.
  const dashboardMonth=Number(todayKey.slice(5,7));
  const revenueTrend=monthlyRevenueSeries(dashboardYear).slice(Math.max(0,dashboardMonth-6),dashboardMonth);
  const maxTrend=Math.max(1,...revenueTrend.map(item=>item.value));
  const statuses=['scheduled','progress','completed','invoiced'];
  const todayDate=new Date(`${todayKey}T00:00:00`);
  const weekStart=toISODate(startOfWeek(todayDate));
  const weeklyRevenue=paidRevenueBetween(weekStart,todayKey);
  const revenueChangeLabel=weeklyRevenue===0 ? 'No revenue received this week' : 'Payments received this week';
  return `
    <div class="hero"><div><h2>Welcome, ${escapeHtml(currentUser.name)}!</h2></div><button class="primary" id="newJob">+ New Job</button></div>
    ${overdue.length ? `<div class="professional-alert"><div><strong>${overdue.length} overdue invoice${overdue.length===1?'':'s'} need attention</strong><p>${money(overdue.reduce((sum,invoice)=>sum+invoiceDueAmount(invoice),0))} is currently past due.</p></div><button class="secondary" data-view="invoices" data-dashboard-filter="overdue">Review overdue invoices</button></div>` : ''}
    <div class="metric-grid dashboard-metric-grid desktop-only">
      <button class="metric metric-button" data-dashboard-card="reports" data-report-range="week"><div class="label">Revenue This Week</div><div class="value">${money(weeklyRevenue)}</div><div class="sub">${revenueChangeLabel}</div><div class="bubble">${icons.reports}</div></button>
      <button class="metric metric-button" data-dashboard-card="schedule"><div class="label">Today's Jobs</div><div class="value">${today.length}</div><div class="sub">${inProgress} in progress</div><div class="bubble">${icons.schedule}</div></button>
      <button class="metric metric-button" data-dashboard-card="estimates" data-filter="pending"><div class="label">Pending Estimates</div><div class="value">${pending.length}</div><div class="sub">${money(pending.reduce((a,b)=>a+b.amount,0))}</div><div class="bubble">${icons.estimates}</div></button>
      <button class="metric metric-button" data-dashboard-card="invoices" data-filter="open"><div class="label">Outstanding Invoices</div><div class="value">${unpaid.length}</div><div class="sub">${money(unpaid.reduce((a,b)=>a+invoiceDueAmount(b),0))}</div><div class="bubble">${icons.invoices}</div></button>
      <button class="metric metric-button" data-dashboard-card="invoices" data-filter="paid"><div class="label">Paid Invoices</div><div class="value">${paidInvoices.length}</div><div class="sub">${money(paidInvoiceAmount)} received</div><div class="bubble">&#10003;</div></button>
      <button class="metric metric-button" data-dashboard-card="crew" data-filter="working"><div class="label">Crew Working Today</div><div class="value">${workingCrew} / ${state.crew.length}</div><div class="sub">crew members</div><div class="bubble">${icons.crew}</div></button>
    </div>
    <div class="mob-metrics mobile-only">
      <div class="mob-card" data-dashboard-card="reports" data-report-range="week" style="cursor:pointer"><div class="mob-card-top"><span class="mob-card-label">Revenue This Week</span><span class="mob-icon cm-green">${icons.reports}</span></div><div class="mob-card-value">${money(weeklyRevenue)}</div><div class="mob-card-sub">${revenueChangeLabel}</div></div>
      <div class="mob-card"><div class="mob-card-top"><span class="mob-card-label">Today's Jobs</span><span class="mob-icon cm-blue">${icons.schedule}</span></div><div class="mob-card-value">${today.length}</div><div class="mob-card-sub">${inProgress} in progress</div></div>
      <div class="mob-card"><div class="mob-card-top"><span class="mob-card-label">Pending Estimates</span><span class="mob-icon cm-gold">${icons.estimates}</span></div><div class="mob-card-value">${pending.length}</div><div class="mob-card-sub">${money(pending.reduce((a,b)=>a+b.amount,0))}</div></div>
      <div class="mob-card"><div class="mob-card-top"><span class="mob-card-label">Outstanding Invoices</span><span class="mob-icon cm-red">${icons.invoices}</span></div><div class="mob-card-value">${unpaid.length}</div><div class="mob-card-sub">${money(unpaid.reduce((a,b)=>a+invoiceDueAmount(b),0))}</div></div>
      <div class="mob-card" data-dashboard-card="invoices" data-filter="paid" style="cursor:pointer"><div class="mob-card-top"><span class="mob-card-label">Paid Invoices</span><span class="mob-icon cm-green">&#10003;</span></div><div class="mob-card-value">${paidInvoices.length}</div><div class="mob-card-sub">${money(paidInvoiceAmount)} received</div></div>
      <div class="mob-card mob-card-full" data-view="crew" style="cursor:pointer"><div class="mob-card-top"><span class="mob-card-label">Crew Working Today</span><span class="mob-icon cm-green">${icons.crew}</span></div><div class="mob-card-value">${workingCrew} / ${state.crew.length}</div><div class="mob-card-sub">crew members</div></div>
    </div>
    <div class="analytics-grid desktop-only">
      <div class="card section-card chart-card">
        <div class="section-head"><h3>Job Status Overview</h3><button class="link-btn" data-view="jobs">Manage</button></div>
        <div class="bar-list">
          ${statuses.map(s=>chartBar(s==='progress'?'In Progress':cap(s), thisYearJobs.filter(j=>j.status===s).length, Math.max(1,thisYearJobs.length), s)).join('')}
        </div>
      </div>
      <div class="card section-card chart-card">
        <div class="section-head"><h3>Six-Month Revenue</h3><button class="link-btn" data-view="reports" data-report-range="year">Reports</button></div>
        <div class="six-month-bar-chart">
          ${revenueTrend.map(item=>`<div class="revenue-bar-column"><strong>${money(item.value)}</strong><div class="revenue-bar-track"><span style="height:${item.value?Math.max(5,Math.round(item.value/maxTrend*100)):0}%"></span></div><small>${item.label}</small></div>`).join('')}
        </div>
      </div>
      <div class="card section-card chart-card">
        <div class="section-head"><h3>Collections</h3><button class="link-btn" data-view="invoices">Invoices</button></div>
        <div class="donut-wrap">
          <div class="donut" style="--pct:${paidPercent}"><span>${paidPercent}%</span></div>
          <div><strong>${money(collectedRevenue)} collected</strong><div class="muted">${money(Math.max(0,totalRevenue-collectedRevenue))} still open</div></div>
        </div>
      </div>
    </div>
    <div class="dashboard-grid">
      <div class="card section-card"><div class="section-head"><h3>Today's Schedule</h3><button class="link-btn" data-view="schedule">View all</button></div><div class="list">
        ${today.length ? today.map(job=>`<div class="row schedule-row"><strong class="sched-time">${job.time}</strong><div><strong>${job.service}</strong><div class="muted sched-customer">${job.customer}</div><div class="muted sched-address">${job.address}</div></div><div class="muted address desktop-only">${job.address}</div><span class="status ${job.status}">${jobStatusLabel(job.status)}</span></div>`).join('') : emptyState('No jobs scheduled today', 'Create a job or open Schedule to plan the crew calendar.', '📅')}
      </div><button class="link-btn section-footer-link" data-view="schedule">View Full Schedule &rarr;</button></div>
      <div class="card section-card desktop-only"><div class="section-head"><h3>Crew Status</h3><button class="link-btn" data-view="crew">View all</button></div><div class="list">
        ${state.crew.length ? state.crew.map(c=>{ const todayCount = jobsForCrewToday(c).length; return `<div class="row crew-row"><div class="avatar crew-av">${c.name.split(' ').map(x=>x[0]).join('')}</div><div><strong>${c.name}</strong><div class="muted">${c.role}</div></div><span class="status ${todayCount?'progress':'pending'}">${todayCount?'Working Today':'Idle Today'}</span><span class="muted">${todayCount} job${todayCount!==1?'s':''}</span></div>`; }).join('') : emptyState('No crew members yet', 'Add crew members to see availability and job assignments here.', '👷')}
      </div><button class="link-btn section-footer-link" data-view="crew">Manage Crew &rarr;</button></div>
    </div>
    <div class="dashboard-grid desktop-only second-row">
      <div class="card section-card"><div class="section-head"><h3>Upcoming Jobs</h3><button class="link-btn" data-view="jobs">View all</button></div><div class="list">
        ${upcoming.length ? upcoming.map(job=>`<div class="row upcoming-row"><div class="muted upcoming-when">${displayDate(job.date)}, ${job.time}</div><strong>${job.service}</strong><div class="muted">${job.address}</div></div>`).join('') : emptyState('No upcoming jobs', 'Proceeding estimates or new jobs will appear here once scheduled.', '🧰')}
      </div></div>
      <div class="card section-card"><div class="section-head"><h3>Recent Activity</h3></div><div class="list">
        ${activities.length ? activities.map(a=>`<div class="row activity-row"><span class="act-dot ${a.color}">${a.icon}</span><span>${a.text}</span></div>`).join('') : emptyState('No activity yet', 'New customers, jobs, estimates and payments will be tracked here automatically.', '📊')}
      </div></div>
    </div>`;
}
function metric(label,value,sub,icon,view){ const a=view?` data-view="${view}" style="cursor:pointer"`:''; return `<div class="card metric"${a}><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div><div class="bubble">${icon}</div></div>`; }
function emptyState(title, message, icon='🌱'){
  return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><div><strong>${title}</strong><p>${message}</p></div></div>`;
}
function tableEmpty(colspan, title, message, icon='🌱'){
  return `<tr class="table-empty"><td colspan="${colspan}">${emptyState(title, message, icon)}</td></tr>`;
}
function setupTablePagination(){
  document.querySelectorAll('table[data-paginate]').forEach(table=>{
    const key=table.dataset.paginate;
    const body=table.tBodies[0];
    if(!key || !body) return;
    const container=table.closest('.table-card, .crew-jobs-table-card') || table.parentElement;
    const rows=Array.from(body.rows).filter(row=>!row.classList.contains('table-empty'));
    const signature=rows.map(row=>row.dataset.job || row.dataset.invoice || row.dataset.estimate || row.dataset.customer || row.dataset.serviceDetail || row.dataset.scheduleJob || row.dataset.recordId || row.dataset.crewJob || row.textContent.trim()).join('|');
    if(tablePaginationSignatures[key] !== undefined && tablePaginationSignatures[key] !== signature) tablePaginationPages[key]=1;
    tablePaginationSignatures[key]=signature;
    const totalPages=Math.max(1,Math.ceil(rows.length/TABLE_PAGE_SIZE));
    const currentPage=Math.min(Math.max(Number(tablePaginationPages[key]) || 1,1),totalPages);
    tablePaginationPages[key]=currentPage;
    rows.forEach((row,index)=>{ row.hidden=Math.floor(index/TABLE_PAGE_SIZE)!==currentPage-1; });
    container?.querySelector(`.table-pagination[data-pagination-for="${key}"]`)?.remove();
    if(rows.length<=TABLE_PAGE_SIZE) return;
    const start=(currentPage-1)*TABLE_PAGE_SIZE+1;
    const end=Math.min(currentPage*TABLE_PAGE_SIZE,rows.length);
    const controls=document.createElement('div');
    controls.className='table-pagination';
    controls.dataset.paginationFor=key;
    controls.innerHTML=`<div class="table-pagination-actions" aria-label="Showing ${start} to ${end} of ${rows.length} records"><button type="button" class="secondary compact" data-table-page="${key}" data-page-direction="previous" ${currentPage===1?'disabled':''}>← Previous</button><span>Page ${currentPage} of ${totalPages}</span><button type="button" class="secondary compact" data-table-page="${key}" data-page-direction="next" ${currentPage===totalPages?'disabled':''}>Next →</button></div>`;
    controls.querySelectorAll('[data-table-page]').forEach(button=>button.addEventListener('click',()=>{
      tablePaginationPages[key]=currentPage+(button.dataset.pageDirection==='next'?1:-1);
      setupTablePagination();
      table.scrollIntoView({block:'start',behavior:'smooth'});
    }));
    container?.appendChild(controls);
  });
}
function chartBar(label,value,total,type='progress',display=value){
  const pct=Math.min(100, Math.round((Number(value||0)/Math.max(1,Number(total||1)))*100));
  return `<div class="chart-row"><div class="chart-row-top"><strong>${label}</strong><span>${display}</span></div><div class="bar-track"><div class="bar-fill ${type}" style="width:${pct}%"></div></div></div>`;
}
function paidRevenueBetween(startDate,endDate){
  return state.invoices.reduce((sum,invoice)=>{
    const payments=invoicePaymentRecords(invoice);
    if(payments.length){
      return sum+payments.reduce((paymentSum,payment)=>{
        const date=String(payment.date || '').slice(0,10);
        return paymentSum+(date>=startDate && date<=endDate ? Number(payment.amount || 0) : 0);
      },0);
    }
    const paidDate=String(invoice.paid || invoice.invoiced || '').slice(0,10);
    return sum+(paidDate>=startDate && paidDate<=endDate ? invoicePaidAmount(invoice) : 0);
  },0);
}
function monthlyRevenueSeries(year=''){
  const requestedYear=Number(year || new Date().getFullYear());
  const months=Array.from({length:12},(_,index)=>{
    const date=new Date(requestedYear,index,1);
    return {key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`,label:date.toLocaleDateString([],{month:'short'}),value:0};
  });
  const byKey=Object.fromEntries(months.map(month=>[month.key,month]));
  state.invoices.forEach(invoice=>{
    const payments=invoicePaymentRecords(invoice);
    if(payments.length){
      payments.forEach(payment=>{
        const key=String(payment.date || '').slice(0,7);
        if(byKey[key]) byKey[key].value+=Number(payment.amount || 0);
      });
    } else if(invoicePaidAmount(invoice)>0){
      const key=String(invoice.paid || invoice.invoiced || '').slice(0,7);
      if(byKey[key]) byKey[key].value+=invoicePaidAmount(invoice);
    }
  });
  return months;
}
function revenueByService({paidOnly=false,invoices=state.invoices,fallbackJobs=true}={}){
  const rows = {};
  const eligibleInvoices = invoices.filter(i => invoicePaymentStatus(i) !== 'cancelled' && (!paidOnly || invoicePaidAmount(i) > 0));
  eligibleInvoices.forEach(invoice => {
    const job = state.jobs.find(j => String(j.id) === String(invoice.jobId)) || [...state.jobs].reverse().find(j => j.customer === invoice.customer);
    const service = invoice.service || job?.service || invoiceLineItems(invoice)[0]?.description || 'General Service';
    rows[service] = (rows[service] || 0) + (paidOnly ? invoicePaidAmount(invoice) : invoiceTotal(invoice));
  });
  if(fallbackJobs && !Object.keys(rows).length){
    state.jobs.forEach(job => {
      rows[job.service] = (rows[job.service] || 0) + Number(job.price || 0);
    });
  }
  return rows;
}
function parseBusinessDate(value){
  if(!value) return null;
  if(typeof value==='number'){
    const numericDate=new Date(value);
    return Number.isNaN(numericDate.getTime()) ? null : numericDate;
  }
  const text=String(value);
  const dayFirst=text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  const date=dayFirst
    ? new Date(Number(dayFirst[3]),Number(dayFirst[2])-1,Number(dayFirst[1]))
    : new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text);
  return Number.isNaN(date.getTime()) ? null : date;
}
function matchesDateRange(value,start='',end=''){
  if(!start && !end) return true;
  const date=parseBusinessDate(value);
  if(!date) return false;
  const from=start ? parseBusinessDate(start) : null;
  const to=end ? parseBusinessDate(end) : null;
  if(to) to.setHours(23,59,59,999);
  return (!from || date>=from) && (!to || date<=to);
}
function dateRangeControls(prefix,range){
  const hasOtherFilters=(prefix==='job' && (jobListFilter!=='all' || jobSearchQuery || jobServiceFilter || jobCustomerFilter)) ||
    (prefix==='estimate' && (estimateListFilter!=='all' || estimateSearchQuery || estimateServiceFilter || estimateCustomerFilter)) ||
    (prefix==='invoice' && (invoiceListFilter!=='all' || invoiceSearchQuery || invoiceCustomerFilter || invoiceDrilldown.service || invoiceDrilldown.aging));
  return `<div class="date-range-filter" aria-label="Date range filter">
    <label><span>From</span><input id="${prefix}DateFrom" type="date" value="${escapeHtml(range.start || '')}"></label>
    <label><span>To</span><input id="${prefix}DateTo" type="date" value="${escapeHtml(range.end || '')}"></label>
    <button type="button" class="secondary date-reset" id="reset${cap(prefix)}Dates" aria-label="Clear all filters" ${range.start || range.end || hasOtherFilters ? '' : 'disabled'}>Clear</button>
  </div>`;
}
function reportDateBounds(){
  const now=new Date();
  now.setHours(23,59,59,999);
  let start=null;
  let end=new Date(now);
  if(reportRange==='week'){
    const daysSinceSunday=now.getDay();
    start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-daysSinceSunday,0,0,0,0);
    end=new Date(start);
    end.setDate(end.getDate()+6);
    end.setHours(23,59,59,999);
  }
  if(reportRange==='month') start=new Date(now.getFullYear(),now.getMonth(),1);
  if(reportRange==='quarter') start=new Date(now.getFullYear(),now.getMonth()-2,1);
  if(reportRange==='year') start=new Date(now.getFullYear(),0,1);
  if(reportRange==='custom'){
    start=parseBusinessDate(reportCustomStart);
    end=parseBusinessDate(reportCustomEnd) || new Date(now);
    end.setHours(23,59,59,999);
  }
  return {start,end,now};
}
function invoiceBusinessDate(invoice){
  return parseBusinessDate(invoice?.invoiced || invoice?.invoiceDate || invoice?.createdAt);
}
function recordMatchesReportRange(value){
  const {start,end}=reportDateBounds();
  const date=parseBusinessDate(value);
  if(!date) return reportRange==='all';
  return (!start || date>=start) && (!end || date<=end);
}
function reportJobAmount(value){
  const amount=typeof value==='number'
    ? value
    : Number(String(value ?? '').replace(/[^0-9.-]/g,''));
  return Number.isFinite(amount) ? Math.max(0,amount) : 0;
}
function reportRecordTimestamp(record){
  const value=record?.updatedAt ?? record?.scheduledAt ?? record?.createdAt ?? 0;
  if(value && typeof value.toMillis==='function') return value.toMillis();
  if(value && typeof value==='object'){
    const seconds=Number(value.seconds ?? value._seconds);
    if(Number.isFinite(seconds)) return seconds*1000;
  }
  const date=parseBusinessDate(value);
  return date?.getTime() || Number(value) || 0;
}
function invoiceMatchesReportRange(invoice){
  return recordMatchesReportRange(invoiceBusinessDate(invoice));
}
function invoiceServiceName(invoice){
  const job=state.jobs.find(j=>String(j.id)===String(invoice?.jobId)) || [...state.jobs].reverse().find(j=>j.customer===invoice?.customer);
  return invoice?.service || job?.service || invoiceLineItems(invoice)[0]?.description || 'General Service';
}
function invoiceIncludesService(invoice,serviceName){
  const serviceKey=normalizeText(serviceName);
  if(!serviceKey) return true;
  const job=state.jobs.find(item=>String(item.id)===String(invoice?.jobId));
  return normalizeText(invoice?.service)===serviceKey ||
    normalizeText(job?.service)===serviceKey ||
    invoiceLineItems(invoice).some(item=>normalizeText(item.description)===serviceKey);
}
function invoiceOverdueDays(invoice){
  if(invoiceDueAmount(invoice)<=0 || invoicePaymentStatus(invoice)==='cancelled') return 0;
  const due=parseBusinessDate(invoice?.due);
  if(!due) return 0;
  const today=parseBusinessDate(todayISO());
  return Math.max(0,Math.floor((today-due)/86400000));
}
function recentActivities(year=''){
  const audited=[...state.jobs,...state.estimates,...state.invoices].flatMap(record=>
    (Array.isArray(record.history)?record.history:[]).map(entry=>({
      icon:icon('activity'),
      color:'green-dot',
      text:`${entry.action}${entry.details?` — ${entry.details}`:''}`,
      id:new Date(entry.at).getTime() || recordTimestamp(record)
    }))
  );
  const rows=[
    ...audited,
    ...state.customers.map(c=>({icon:icon('user-round-plus'),color:'green-dot',text:`Customer ${c.name} was added`,id:recordTimestamp(c)})),
    ...state.services.map(service=>({icon:icon('wrench'),color:'green-dot',text:`Service ${service.name} is ${service.status}`,id:recordTimestamp(service)})),
    ...state.jobs.map(j=>({icon:'&#10003;',color:'green-dot',text:`Job #JOB-${j.id} ${j.status==='completed'?'completed':'scheduled'} for ${j.customer}`,id:recordTimestamp(j)})),
    ...state.estimates.map(e=>({icon:'$',color:'gold-dot',text:`Estimate ${e.id} is ${estimateStatusLabel(e.status)} for ${e.customer}`,id:recordTimestamp(e)})),
    ...state.invoices.map(i=>({icon:'$',color:invoicePaymentStatus(i)==='paid'?'green-dot':'red-dot',text:`Invoice ${i.id} is ${invoiceStatusLabel(invoiceDisplayStatus(i))} for ${i.customer}`,id:recordTimestamp(i)}))
  ];
  const yearText=String(year || '').trim();
  return rows
    .filter(row=>!yearText || new Date(row.id).getFullYear()===Number(yearText))
    .sort((a,b)=>b.id-a.id)
    .slice(0,7);
}

function exportMenu(type){
  return `<details class="export-menu">
    <summary class="secondary export-trigger"><span>Export</span><span class="export-trigger-icon" aria-hidden="true">&#8681;</span></summary>
    <div class="export-menu-panel" role="menu" aria-label="Export options">
      <div class="export-menu-heading"><strong>Download this view</strong><span>Choose a file format</span></div>
      <button type="button" role="menuitem" data-tab-export="${type}" data-export-format="pdf"><span class="export-option-icon pdf" aria-hidden="true">PDF</span><span><strong>PDF document</strong><small>Print-ready report</small></span></button>
      <button type="button" role="menuitem" data-tab-export="${type}" data-export-format="excel"><span class="export-option-icon excel" aria-hidden="true">XLS</span><span><strong>Excel spreadsheet</strong><small>Editable data file</small></span></button>
    </div>
  </details>`;
}

function customers(){
  const totalCustomers = state.customers.length;
  const activeCustomers = state.customers.filter(c => state.jobs.some(j => recordMatchesCustomer(j,c))).length;
  const inactiveCustomers = Math.max(0, totalCustomers - activeCustomers);
  const customerJobs = state.jobs.filter(j => state.customers.some(c => recordMatchesCustomer(j,c)));
  const customersWithJobs = state.customers.filter(c => state.jobs.some(j => recordMatchesCustomer(j,c))).length;
  const topService = state.customers.reduce((acc,c)=>{ acc[c.service] = (acc[c.service] || 0) + 1; return acc; }, {});
  const mostUsedService = Object.entries(topService).sort((a,b)=>b[1]-a[1])[0];
  return `<div class="hero"><div><h2>Customers</h2><p>Manage customers, properties, and service history. Total: ${totalCustomers} | Active: ${activeCustomers}</p></div><div class="hero-actions">${exportMenu('customers')}<button class="primary" id="newCustomer">+ Add Customer</button></div></div>
  <div class="metric-grid customer-metric-grid">
    <button class="metric metric-button" data-customer-filter="all"><div class="label">Total Customers</div><div class="value">${totalCustomers}</div><div class="sub">customers added</div><div class="bubble">&#128101;</div></button>
    <button class="metric metric-button" data-customer-filter="active"><div class="label">Active Customers</div><div class="value">${activeCustomers}</div><div class="sub">with job history</div><div class="bubble">&#10003;</div></button>
    <button class="metric metric-button" data-customer-filter="inactive"><div class="label">Inactive Customers</div><div class="value">${inactiveCustomers}</div><div class="sub">no jobs yet</div><div class="bubble">&#9200;</div></button>
    <button class="metric metric-button" data-view="jobs" aria-label="Open all customer jobs"><div class="label">Total Jobs</div><div class="value">${customerJobs.length}</div><div class="sub">across ${customersWithJobs} customer${customersWithJobs===1?'':'s'}</div><div class="bubble">&#9635;</div></button>
    <button class="metric metric-button" data-customer-filter="top-service" data-service="${escapeHtml(mostUsedService ? mostUsedService[0] : '')}"><div class="label">Top Service</div><div class="value">${mostUsedService ? mostUsedService[0] : 'N/A'}</div><div class="sub">${mostUsedService ? `${mostUsedService[1]} customers` : 'add customers'}</div><div class="bubble">&#9733;</div></button>
  </div>
  <div class="card table-card">
    <div class="table-tools">
      <input class="search" id="customerSearch" placeholder="Search customers by name, email, or service...">
    </div>
    <table data-paginate="customers">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Property</th>
          <th>Primary Service</th>
          <th>Recent Jobs</th>
        </tr>
      </thead>
      <tbody id="customerRows">${state.customers.length ? customerRows(newestFirst(state.customers), state.jobs) : tableEmpty(6, 'No customers yet', 'Add your first customer to start tracking properties, service history, jobs and invoices.', '👥')}</tbody>
    </table>
  </div>`;
}
function customerRows(items, jobs){
  if(!items.length) return tableEmpty(6, 'No matching customers', 'Try a different search or add a new customer record.', '👥');
  return newestFirst(items).map(c=>{
    const customerJobs = (jobs || state.jobs).filter(j => recordMatchesCustomer(j,c));
    const recentJob = customerJobs[customerJobs.length - 1];
    return `<tr class="record-row" data-customer="${c.id}" tabindex="0" role="link" aria-label="Open customer ${escapeHtml(c.name)}">
      <td>
        <strong>${escapeHtml(c.name || 'Not provided')}</strong>
      </td>
      <td>
        <strong>${escapeHtml(c.phone || 'Not provided')}</strong>
        ${c.phone ? `<div class="contact-links"><a href="tel:${escapeHtml(c.phone)}" class="contact-link"><span class="contact-icon">&#9742;</span>Call</a></div>` : ''}
      </td>
      <td>${c.email ? `<a href="mailto:${escapeHtml(c.email)}" class="customer-email-link">${escapeHtml(c.email)}</a>` : '<span class="muted">Not provided</span>'}</td>
      <td><strong>${escapeHtml(c.address || 'Not provided')}</strong></td>
      <td>${escapeHtml(c.service || 'Not provided')}</td>
      <td><span class="muted">${customerJobs.length} jobs</span>${recentJob ? `<div style="font-size:11px">${recentJob.service}</div>` : ''}</td>
    </tr>`;
  }).join('');
}

function services(){
  const catalog=serviceCatalog(false);
  const active=catalog.filter(service=>service.status==='active');
  const inactive=catalog.filter(service=>service.status==='inactive');
  const averageRate=catalog.length ? catalog.reduce((sum,service)=>sum+Number(service.rate || 0),0)/catalog.length : 0;
  const linkedJobs=state.jobs.filter(job=>serviceByName(job.service));
  return `<div class="hero"><div><h2>Services</h2><p>Manage the services used across customers, estimates, jobs, and invoices.</p></div><div class="hero-actions">${exportMenu('services')}<button class="primary" id="newService">+ Add Service</button></div></div>
    <div class="metric-grid service-metric-grid">
      <button class="metric metric-button" data-service-filter="all"><div class="label">Total Services</div><div class="value">${catalog.length}</div><div class="sub">catalog items</div><div class="bubble">${icons.services}</div></button>
      <button class="metric metric-button" data-service-filter="active"><div class="label">Active</div><div class="value">${active.length}</div><div class="sub">available in forms</div><div class="bubble">&#10003;</div></button>
      <button class="metric metric-button" data-service-filter="inactive"><div class="label">Inactive</div><div class="value">${inactive.length}</div><div class="sub">hidden from new work</div><div class="bubble">&#8212;</div></button>
      <div class="card metric"><div class="label">Average Rate</div><div class="value">${money(averageRate)}</div><div class="sub">catalog average</div><div class="bubble">&#36;</div></div>
      <button class="metric metric-button" data-view="jobs" aria-label="Open jobs linked to catalog services"><div class="label">Linked Jobs</div><div class="value">${linkedJobs.length}</div><div class="sub">Open linked jobs &rarr;</div><div class="bubble">${icons.jobs}</div></button>
    </div>
    <div class="card table-card">
      <div class="table-tools">
        <input class="search" id="serviceSearch" placeholder="Search services by name...">
        <select class="secondary" id="serviceStatusFilter"><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </div>
      <table data-paginate="services">
        <thead><tr><th>Service</th><th>Price</th><th>Duration</th><th>Usage</th><th>Total Amount</th><th>Status</th></tr></thead>
        <tbody id="serviceRows">${serviceRows(catalog)}</tbody>
      </table>
    </div>`;
}
function serviceRows(items){
  if(!items.length) return tableEmpty(6,'No services found','Add a service to make it available in customer, estimate, job, and invoice forms.','🌿');
  return items.map(service=>{
    const jobs=serviceLinkedJobs(service);
    const customers=state.customers.filter(customer=>normalizeText(customer.service)===normalizeText(service.name));
    return `<tr class="record-row" data-service-detail="${escapeHtml(service.id)}" data-service-status="${service.status}" tabindex="0" role="link" aria-label="Open service history for ${escapeHtml(service.name)}" onclick="return window.openServiceHistory(event, this.dataset.serviceDetail)">
      <td><strong>${escapeHtml(service.name)}</strong></td>
      <td><strong>${money(service.rate)}</strong></td>
      <td>${Number(service.duration)} hr${Number(service.duration)===1?'':'s'}</td>
      <td><strong>${jobs.length}</strong> jobs<div class="muted">${customers.length} customers</div></td>
      <td><strong class="service-total-amount">${money(serviceTotalAmount(service))}</strong></td>
      <td><span class="status ${service.status==='active'?'progress':'cancelled'}">${service.status==='active'?'Active':'Inactive'}</span></td>
    </tr>`;
  }).join('');
}
function serviceLinkedJobs(service){
  return state.jobs.filter(job=>normalizeText(job.service)===normalizeText(service?.name));
}
function serviceTotalAmount(service){
  return serviceLinkedJobs(service).reduce((sum,job)=>sum+Number(job.price || 0),0);
}

function serviceDetail(){
  const service=state.services.find(item=>String(item.id)===String(selectedService));
  if(!service) return services();
  const serviceKey=normalizeText(service.name);
  const jobs=newestFirst(state.jobs.filter(job=>normalizeText(job.service)===serviceKey));
  const estimates=newestFirst(state.estimates.filter(estimate=>normalizeText(estimate.service)===serviceKey));
  const jobIds=new Set(jobs.map(job=>String(job.id)));
  const invoices=newestFirst(state.invoices.filter(invoice=>invoiceIncludesService(invoice,service.name) || jobIds.has(String(invoice.jobId || ''))));
  const serviceBilledTotal=invoices.reduce((total,invoice)=>total+serviceInvoiceBilling(invoice,service.name).total,0);
  const customerNames=new Set([
    ...state.customers.filter(customer=>normalizeText(customer.service)===serviceKey).map(customer=>customer.name),
    ...jobs.map(job=>job.customer),
    ...estimates.map(estimate=>estimate.customer)
  ].filter(Boolean));
  const customers=newestFirst(state.customers.filter(customer=>customerNames.has(customer.name)));
  const crewNames=[...new Set(jobs.map(job=>job.crew).filter(Boolean))];
  const completedJobs=jobs.filter(job=>job.status==='completed'||job.status==='invoiced').length;
  const convertedEstimates=estimates.filter(estimate=>estimate.status==='converted').length;
  const displayedJobs=jobs.slice(0,3);
  const displayedEstimates=estimates.slice(0,3);
  const displayedInvoices=invoices.slice(0,3);
  const serviceHistoryCard=(label,value,sub,icon,target)=>`<button class="metric metric-button" data-service-history-target="${target}" aria-label="Show ${label.toLowerCase()} for this service"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub} &rarr;</div><div class="bubble">${icon}</div></button>`;

  return `<div class="hero service-detail-hero"><div><button class="link-btn" id="backToServices">&larr; Back to Services</button><h2>${escapeHtml(service.name)}</h2><p>${escapeHtml(service.description || 'Service history and connected business records.')}</p></div><div class="hero-actions"><span class="status ${service.status==='active'?'progress':'cancelled'}">${service.status==='active'?'Active':'Inactive'}</span><button class="secondary" id="exportServicePdf">Export PDF</button>${hasManagementAccess()?`<button class="secondary" data-edit-service="${escapeHtml(service.id)}">Edit Service</button><button class="secondary" data-delete-service="${escapeHtml(service.id)}" style="background:#dc3545;color:#fff">Delete Service</button>`:''}</div></div>
  <div class="metric-grid service-history-metrics">
    ${serviceHistoryCard('Customers',customers.length,'using this service',icons.customers,'customers')}
    ${serviceHistoryCard('Jobs',jobs.length,`${completedJobs} completed`,icons.jobs,'jobs')}
    ${serviceHistoryCard('Estimates',estimates.length,`${convertedEstimates} converted`,icons.estimates,'estimates')}
    ${serviceHistoryCard('Invoices',invoices.length,`${money(serviceBilledTotal)} billed`,icons.invoices,'invoices')}
  </div>
  <div class="dashboard-grid service-detail-overview">
    <div class="card section-card"><div class="section-head"><h3>Service Overview</h3></div><div class="detail-list">
      <div class="detail-item"><span class="muted">Price</span><strong>${money(service.rate)}</strong></div>
      <div class="detail-item"><span class="muted">Estimated Duration</span><strong>${Number(service.duration || 0)} hour${Number(service.duration || 0)===1?'':'s'}</strong></div>
      <div class="detail-item"><span class="muted">Status</span><strong>${cap(service.status)}</strong></div>
      <div class="detail-item"><span class="muted">Created Date</span><strong>${displayDate(service.createdAt)}</strong></div>
      <div class="detail-item"><span class="muted">Created By</span><strong>${escapeHtml(recordCreatedBy(service))}</strong></div>
    </div></div>
    <div class="card section-card"><div class="section-head"><h3>Quick Summary</h3></div><div class="detail-list">
      <div class="detail-item"><span class="muted">Assigned Crew</span><strong>${crewNames.length}</strong></div>
      <div class="detail-item"><span class="muted">Completed Jobs</span><strong>${completedJobs}</strong></div>
      <div class="detail-item"><span class="muted">Estimate Conversion</span><strong>${estimates.length?Math.round((convertedEstimates/estimates.length)*100):0}%</strong></div>
      <div class="detail-item"><span class="muted">Latest Job</span><strong>${jobs[0] ? displayDate(jobs[0].date) : '-'}</strong></div>
    </div></div>
  </div>
  <div class="customer-record-sections service-history-sections">
    <div class="card table-card customer-linked-card" id="service-history-customers"><div class="section-head"><div><h3>Customers</h3><p class="muted">Select a customer to open their complete profile.</p></div></div><table><thead><tr><th>Customer</th><th>Contact</th><th>Property</th><th>Jobs</th></tr></thead><tbody>${customers.length?customers.map(customer=>{
      const customerJobs=jobs.filter(job=>recordMatchesCustomer(job,customer));
      return `<tr class="record-row" data-customer="${customer.id}" tabindex="0" role="link"><td><strong>${escapeHtml(customer.name)}</strong></td><td>${escapeHtml(customer.phone || '-')}<div class="muted">${escapeHtml(customer.email || '-')}</div></td><td>${escapeHtml(customer.address || '-')}</td><td>${customerJobs.length}</td></tr>`;
    }).join(''):tableEmpty(4,'No customers linked','Customers connected to this service will appear here.','👥')}</tbody></table></div>

    <div class="card table-card customer-linked-card"><div class="section-head"><div><h3>Crew & Customer Assignments</h3><p class="muted">See who delivered this service and for which customers.</p></div></div><table><thead><tr><th>Crew Member</th><th>Role</th><th>Jobs</th><th>Customers Served</th><th>Completed</th></tr></thead><tbody>${crewNames.length?crewNames.map(name=>{
      const crewIndex=state.crew.findIndex(member=>normalizeText(member.name)===normalizeText(name));
      const crew=crewIndex>=0?mergedCrewDetails(state.crew[crewIndex]):{name,role:'Crew Member'};
      const crewJobs=jobs.filter(job=>normalizeText(job.crew)===normalizeText(name));
      const served=[...new Set(crewJobs.map(job=>job.customer).filter(Boolean))];
      return `<tr class="${crewIndex>=0?'record-row':''}" ${crewIndex>=0?`data-crew-detail="${crewIndex}" tabindex="0" role="link"`:''}><td><strong>${escapeHtml(crew.name)}</strong></td><td>${escapeHtml(crew.role || 'Crew Member')}</td><td>${crewJobs.length}</td><td>${escapeHtml(served.join(', ') || '-')}</td><td>${crewJobs.filter(job=>job.status==='completed'||job.status==='invoiced').length}</td></tr>`;
    }).join(''):tableEmpty(5,'No crew assignments','Crew members assigned to matching jobs will appear here.','👷')}</tbody></table></div>

    <div class="card table-card customer-linked-card" id="service-history-jobs"><div class="section-head"><div><h3>Recent Job History</h3><p class="muted">The three most recent jobs for this service.</p></div>${jobs.length>3?`<button class="secondary compact" data-service-history-view-all="jobs">View All Jobs</button>`:''}</div><table><thead><tr><th>Job</th><th>Customer</th><th>Date & Time</th><th>Crew</th><th>Amount</th><th>Status</th></tr></thead><tbody>${jobs.length?displayedJobs.map(job=>`<tr class="record-row" data-job="${job.id}" tabindex="0" role="link"><td><strong>#JOB-${job.id}</strong><div class="muted">${escapeHtml(job.service)}</div></td><td>${escapeHtml(job.customer)}</td><td>${displayDate(job.date)}<div class="muted">${escapeHtml(job.time || '-')}</div></td><td>${escapeHtml(job.crew || '-')}</td><td><strong>${money(job.price)}</strong></td><td><span class="status ${job.status}">${jobStatusLabel(job.status)}</span></td></tr>`).join(''):tableEmpty(6,'No jobs yet','Jobs using this service will appear here.','🧰')}</tbody></table></div>

    <div class="card table-card customer-linked-card" id="service-history-estimates"><div class="section-head"><div><h3>Recent Estimate History</h3><p class="muted">The three most recent estimates for this service.</p></div>${estimates.length>3?`<button class="secondary compact" data-service-history-view-all="estimates">View All Estimates</button>`:''}</div><table><thead><tr><th>Estimate</th><th>Customer</th><th>Created</th><th>Amount</th><th>Status</th></tr></thead><tbody>${estimates.length?displayedEstimates.map(estimate=>`<tr class="record-row view-estimate-btn" data-estimate="${escapeHtml(estimate.id)}" tabindex="0" role="link"><td><strong>${escapeHtml(estimate.id)}</strong></td><td>${escapeHtml(estimate.customer)}</td><td>${displayDate(estimate.createdDate || estimate.createdAt)}</td><td><strong>${money(estimate.amount)}</strong></td><td><span class="status ${estimate.status}">${estimateStatusLabel(estimate.status)}</span></td></tr>`).join(''):tableEmpty(5,'No estimates yet','Estimates for this service will appear here.','🧾')}</tbody></table></div>
    <div class="card table-card customer-linked-card" id="service-history-invoices"><div class="section-head"><div><h3>Recent Invoices</h3><p class="muted">Payment totals are calculated for this service’s jobs only.</p></div>${invoices.length>3?`<button class="secondary compact" data-service-history-view-all="invoices">View All Invoices</button>`:''}</div><table><thead><tr><th>Invoice</th><th>Customer</th><th>Invoiced</th><th>Service Total</th><th>Paid</th><th>Due</th><th>Payment Status</th></tr></thead><tbody>${invoices.length?displayedInvoices.map(invoice=>{ const billing=serviceInvoiceBilling(invoice,service.name); return `<tr class="record-row" data-invoice="${escapeHtml(invoice.id)}" tabindex="0" role="link"><td><strong>${escapeHtml(invoice.id)}</strong></td><td>${escapeHtml(invoice.customer)}</td><td>${displayDate(invoice.invoiced)}</td><td><strong>${money(billing.total)}</strong></td><td style="color:#12854d"><strong>${money(billing.paid)}</strong></td><td style="color:${billing.due>0?'#ba4a00':'#087a45'}"><strong>${money(billing.due)}</strong></td><td><span class="status ${billing.status}">${invoiceStatusLabel(billing.status)}</span></td></tr>`; }).join(''):tableEmpty(7,'No invoices yet','Invoices for this service will appear here.','💵')}</tbody></table></div>
  </div>`;
}

function schedule(){
  if(selectedDate) return scheduleDayView();
  return scheduleView === 'week' ? scheduleWeekView() : scheduleMonthView();
}

function scheduleWeekView(){
  const startDate = startOfWeek(scheduleDate);
  const todayDateStr = todayISO();
  const todayLabel = `Today, ${displayDate(new Date())}`;
  const days = Array.from({length: 7}, (_, i) => {
    const date = addDays(startDate, i);
    const dateStr = toISODate(date);
    return {
      date,
      dateStr,
      label: `${date.toLocaleDateString([], {weekday:'short'})} ${displayDate(date)}`,
      jobs: uniqueScheduleJobs(scheduleAssignmentEntries(state.jobs).filter(job => job.date === dateStr))
    };
  });
  const timeSlots = [
    {hour:6, label:'6 AM - 8 AM'},
    {hour:8, label:'8 AM - 10 AM'},
    {hour:10, label:'10 AM - 12 PM'},
    {hour:12, label:'12 PM - 2 PM'},
    {hour:14, label:'2 PM - 4 PM'},
    {hour:16, label:'4 PM - 6 PM'},
    {hour:18, label:'6 PM - 8 PM'},
    {hour:20, label:'8 PM - 10 PM'}
  ];
  const weekEnd=toISODate(addDays(startDate,6));
  const weekJobs=scheduleAssignmentEntries(state.jobs).filter(job=>job.date>=toISODate(startDate) && job.date<=weekEnd);
  const scheduledCount=weekJobs.filter(job=>scheduleDisplayStatus(job)==='scheduled').length;
  const progressCount=weekJobs.filter(job=>scheduleDisplayStatus(job)==='progress').length;
  const completedCount=weekJobs.filter(job=>scheduleDisplayStatus(job)==='completed').length;

  return `<div class="schedule-page">
    <div class="schedule-hero">
      <div>
        <h2>Schedule</h2>
        <p>Assign crews and manage recurring landscaping jobs.</p>
      </div>
      <div class="hero-actions">
        ${exportMenu('schedule')}
        <button class="secondary" id="viewScheduledJobs">View Scheduled Jobs</button>
        <button class="primary schedule-primary" id="newJob">+ Schedule Job</button>
      </div>
    </div>

    <div class="schedule-status-metrics" aria-label="Schedule status summary">
      <div class="schedule-status-card scheduled"><span class="schedule-status-icon">&#128197;</span><div><span>Scheduled</span><strong>${scheduledCount}</strong><small>planned jobs</small></div></div>
      <div class="schedule-status-card progress"><span class="schedule-status-icon">&#9654;</span><div><span>In Progress</span><strong>${progressCount}</strong><small>active jobs</small></div></div>
      <div class="schedule-status-card completed"><span class="schedule-status-icon">&#10003;</span><div><span>Completed</span><strong>${completedCount}</strong><small>finished jobs</small></div></div>
    </div>

    <div class="card schedule-calendar-card">
      <div class="schedule-toolbar">
        <div class="schedule-nav-controls">
          <button class="schedule-control" id="schedPrev" aria-label="Previous week">&larr;</button>
          <button class="schedule-control today" id="schedToday">${todayLabel}</button>
          <button class="schedule-control" id="schedNext" aria-label="Next week">&rarr;</button>
        </div>
        <div class="schedule-view-controls">
          <button class="schedule-control ${scheduleView==='week'?'active':''}" id="schedWeek">Week</button>
          <button class="schedule-control ${scheduleView==='month'?'active':''}" id="schedMonth">Month</button>
        </div>
      </div>

      <div class="schedule-grid-wrap">
        <div class="schedule-grid-board">
          <div class="schedule-grid-corner">Time</div>
          ${days.map(d=>`<button class="schedule-day-head month-day ${d.dateStr === todayDateStr ? 'is-today' : ''}" data-date="${d.dateStr}"><span>${d.label}</span>${d.dateStr === todayDateStr ? '<small>Today</small>' : ''}</button>`).join('')}
          ${timeSlots.map(slot=>`
            <div class="schedule-time-cell">${slot.label}</div>
            ${days.map(day=>{
              const slotJobs = day.jobs.filter(job => scheduleBucketFor(job.time) === slot.hour);
              const dayIsToday = day.dateStr === todayDateStr;
              return `<div class="schedule-slot ${dayIsToday ? 'is-today-slot' : ''}">
                ${slotJobs.map(job=>`
                  <div class="schedule-job-wrap">
                  <button class="schedule-job-block ${scheduleBlockClass(job)} ${['completed','invoiced'].includes(scheduleDisplayStatus(job)) ? 'is-completed' : ''} ${dayIsToday ? 'is-today-job' : ''}" data-schedule-calendar-job="${job.id}" data-schedule-crew="${escapeHtml(job.assignmentCrew || job.crew || '')}" aria-label="View this day’s schedule for ${escapeHtml(scheduleJobNumber(job))}, ${escapeHtml(job.assignmentCrew || job.crew || 'Crew not assigned')}">
                    <strong>${escapeHtml(job.service || 'Job')}</strong>
                    <span class="schedule-job-number">${escapeHtml(scheduleJobNumber(job))}</span>
                    <span class="schedule-crew-name">${escapeHtml(job.crew || 'Crew not assigned')}</span>
                    <small>${escapeHtml(job.time || '')}</small>
                    <span class="schedule-job-status ${escapeHtml(scheduleDisplayStatus(job))}">${escapeHtml(jobStatusLabel(scheduleDisplayStatus(job)))}</span>
                  </button>
                  </div>
                `).join('')}
              </div>`;
            }).join('')}
          `).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function scheduleDayView(){
  const calendarJobs=scheduleAssignmentEntries(state.jobs).sort((a,b)=>`${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
  const scheduleQuery=normalizeText(scheduleSearchQuery);
  const displayedJobs=calendarJobs.filter(job=>{
    const status=scheduleDisplayStatus(job);
    const matchesStatus=scheduleTableStatusFilter==='all' || status===scheduleTableStatusFilter;
    return matchesStatus && (!scheduleQuery || normalizeText([
    scheduleJobNumber(job), job.id, job.customer, job.service, job.crew,
    job.assignmentCrew, job.address, job.status, job.date, job.time
    ].join(' ')).includes(scheduleQuery));
  });
  const statusCount=status=>calendarJobs.filter(job=>scheduleDisplayStatus(job)===status).length;
  const scheduleTableCard=(filter,label,count,sub,icon)=>`<button type="button" class="schedule-status-card ${filter==='all'?'all':filter}${scheduleTableStatusFilter===filter?' active':''}" data-schedule-table-filter="${filter}"><span class="schedule-status-icon">${icon}</span><div><span>${label}</span><strong>${count}</strong><small>${sub}</small></div></button>`;

  return `<div class="hero"><div><button class="link-btn" id="backToMonth">&larr; Back to Schedule</button><h2>All Scheduled Jobs</h2><p>${displayedJobs.length}${scheduleQuery ? ` of ${calendarJobs.length}` : ''} scheduled assignment${displayedJobs.length===1?'':'s'} shown. Select a row to view its schedule details.</p></div><div class="hero-actions">${exportMenu('schedule')}<button class="primary" id="newJob">+ Schedule Job</button></div></div>

  <div class="schedule-status-metrics schedule-table-status-metrics" aria-label="All scheduled jobs summary">
    ${scheduleTableCard('all','All Assignments',calendarJobs.length,'all calendar assignments',icons.jobs)}
    ${scheduleTableCard('scheduled','Scheduled',statusCount('scheduled'),'upcoming assignments','&#128197;')}
    ${scheduleTableCard('progress','In Progress',statusCount('progress'),'work underway','&#9654;')}
    ${scheduleTableCard('completed','Completed',statusCount('completed'),'finished assignments','&#10003;')}
  </div>

  <div class="card table-card schedule-details-table-card">
    <div class="section-head"><div><h3>Job Schedule Details</h3><p class="muted">A clear view of every scheduled job in the calendar.</p></div><span class="schedule-day-count">${displayedJobs.length} assignment${displayedJobs.length===1?'':'s'}</span></div>
    <div class="table-tools schedule-table-tools"><input class="search" id="scheduleSearch" value="${escapeHtml(scheduleSearchQuery)}" placeholder="Search by job no., customer, service, crew, or status..."><button type="button" class="secondary date-reset" id="clearScheduleSearch" ${scheduleSearchQuery || scheduleTableStatusFilter!=='all' ? '' : 'disabled'}>Clear</button></div>
    <div class="table-scroll"><table class="schedule-details-table" data-paginate="schedule"><thead><tr><th>Job No.</th><th>Date</th><th>Time</th><th>Service</th><th>Customer</th><th>Location</th><th>Crew</th><th>Price</th><th>Status</th></tr></thead><tbody>
      ${displayedJobs.length ? displayedJobs.map(job=>`<tr class="record-row ${String(job.id)===String(selectedScheduleJobId)?'schedule-row-selected':''}" data-schedule-job="${escapeHtml(job.id)}" data-schedule-crew="${escapeHtml(job.assignmentCrew || job.crew || '')}" tabindex="0" role="link" aria-label="View schedule details for ${escapeHtml(scheduleJobNumber(job))}"><td><strong>${escapeHtml(scheduleJobNumber(job))}</strong></td><td>${displayDate(job.date)}</td><td><strong>${escapeHtml(job.time || '-')}</strong></td><td>${escapeHtml(job.service || '-')}</td><td><strong>${escapeHtml(job.customer || '-')}</strong></td><td>${escapeHtml(job.address || '-')}</td><td>${escapeHtml(job.assignmentCrew || job.crew || 'Crew not assigned')}</td><td><strong class="schedule-price">${money(job.price || 0)}</strong></td><td><span class="status ${scheduleDisplayStatus(job)}">${jobStatusLabel(scheduleDisplayStatus(job))}</span></td></tr>`).join('') : tableEmpty(9,'No matching scheduled jobs','Try another job number, customer, service, crew, or status.','&#128269;')}
    </tbody></table></div>
  </div>`;
}

function scheduleDetailPage(){
  const job=state.jobs.find(item=>String(item.id)===String(selectedScheduleJobId));
  if(!job) return `<div class="hero"><div><button class="link-btn" data-view="schedule">&larr; Back to Schedule</button><h2>Job Schedule Details</h2><p>The selected schedule could not be found.</p></div></div>`;
  const allProgress=crewProgressRows(job);
  const selectedCrewKey=crewProgressKey(selectedScheduleCrewName);
  const progress=selectedCrewKey ? allProgress.filter(member=>crewProgressKey(member.name)===selectedCrewKey) : allProgress;
  const scheduleStatus=scheduleDisplayStatus(job);
  const scheduleDetails=[
    ['Job No.',escapeHtml(scheduleJobNumber(job))],
    ['Customer',escapeHtml(job.customer || 'Not added')],
    ['Service',escapeHtml(job.service || 'Not added')],
    ['Status',`<span class="status ${scheduleStatus}">${jobStatusLabel(scheduleStatus)}</span>`],
    ['Price',money(job.price || 0),'amount'],
    ['Priority',escapeHtml(job.priority || 'Medium')],
    ['Duration (hours)',escapeHtml(job.duration || 'Not added')],
    ['Equipment',escapeHtml(job.equipment || 'Not assigned')],
    ['Materials',escapeHtml(job.materials || 'Not assigned')]
  ];
  const detailRow=([label,value,kind])=>`<div class="schedule-info-row${kind==='amount'?' is-amount':''}"><span>${label}</span><strong>${value}</strong></div>`;
  const crewCards=progress.length ? progress.map(member=>{
    const startedDate=member.startedAt ? displayDate(member.startedAt) : '-';
    const startedTime=member.startedAt ? displayClockTime(member.startedAt) : '-';
    const completedDate=member.completedAt ? displayDate(member.completedAt) : '-';
    const completedTime=member.completedAt ? displayClockTime(member.completedAt) : '-';
    return `<article class="schedule-crew-progress-card"><div class="schedule-crew-progress-head"><strong>${escapeHtml(member.name)}</strong><span class="status ${member.status}">${jobStatusLabel(member.status)}</span></div><div class="schedule-crew-progress-meta schedule-crew-progress-dates"><div><span>Start Date</span><strong>${startedDate}</strong></div><div><span>Start Time</span><strong>${startedTime}</strong></div><div><span>Completed Date</span><strong>${completedDate}</strong></div><div><span>Completed Time</span><strong>${completedTime}</strong></div></div></article>`;
  }).join('') : `<div class="schedule-empty-crew">No crew assigned to this schedule.</div>`;
  const detailTitle=progress.length===1 ? `${escapeHtml(progress[0].name)}'s Schedule Details` : 'Job Schedule Details';
  return `<div class="hero"><div><button class="link-btn" data-view="schedule">&larr; Back to Schedule</button><h2>${detailTitle}</h2><p>JOB-${escapeHtml(job.id)} &middot; ${escapeHtml(job.service || 'Service')}</p></div><div class="hero-actions">${hasManagementAccess()?`${canRescheduleJob(job)?`<button type="button" class="secondary" data-edit-schedule="${escapeHtml(job.id)}">Edit Schedule</button>`:''}<button type="button" class="danger-outline" data-delete-schedule="${escapeHtml(job.id)}">Delete Schedule</button>`:''}</div></div>
    <section class="card schedule-selected-details schedule-detail-page-card"><div class="section-head"><div><span class="schedule-detail-eyebrow">Crew assignment</span><h3>Job information</h3><p class="muted">${progress.length===1 ? `Assignment and progress information for ${escapeHtml(progress[0].name)}.` : 'Schedule details and crew progress for this job.'}</p></div></div><div class="schedule-info-list">${scheduleDetails.map(detailRow).join('')}</div><div class="schedule-crew-progress-section"><div class="schedule-crew-progress-title"><div><span class="schedule-detail-eyebrow">Assignment progress</span><h3>Crew progress</h3></div><span>${progress.length} crew member${progress.length===1?'':'s'}</span></div><div class="schedule-crew-progress-grid">${crewCards}</div></div><div class="schedule-selected-notes"><span>Notes / Description</span><strong>${escapeHtml(job.notes || 'No notes added.')}</strong></div></section>`;
}

function customerPortal(customer,jobs,estimates,invoices){
  const tabs=['overview','estimates','jobs','invoices'];
  if(!tabs.includes(customerPortalTab)) customerPortalTab='overview';
  const paid=invoices.reduce((total,invoice)=>total+invoicePaidAmount(invoice),0);
  const due=invoices.reduce((total,invoice)=>total+invoiceDueAmount(invoice),0);
  const allJobs=[...jobs], allEstimates=[...estimates], allInvoices=[...invoices];
  const portalQuery=normalizeText(customerPortalSearchQuery);
  const matchesPortalSearch=(item,status)=>!portalQuery || normalizeText([item.id,item.customer,item.service,status].join(' ')).includes(portalQuery);
  if(customerPortalTab==='estimates') estimates=allEstimates.filter(item=>{
    const portalStatus=['approved','converted'].includes(item.status) ? 'paid' : item.status;
    return matchesPortalSearch(item,estimateStatusLabel(portalStatus)) && (customerPortalListFilter==='all' || (customerPortalListFilter==='approved' ? ['paid','approved','converted'].includes(item.status) : item.status===customerPortalListFilter));
  });
  if(customerPortalTab==='jobs') jobs=allJobs.filter(item=>matchesPortalSearch(item,jobStatusLabel(item.status)) && (customerPortalListFilter==='all' || item.status===customerPortalListFilter));
  if(customerPortalTab==='invoices') invoices=allInvoices.filter(item=>{const rawStatus=invoiceDisplayStatus(item); const status=rawStatus==='paid'?'paid':rawStatus==='partial'?'partial':'unpaid'; const portalStatusLabel=status==='unpaid'?'Pending':invoiceStatusLabel(status); return matchesPortalSearch(item,portalStatusLabel) && (customerPortalListFilter==='all' || status===customerPortalListFilter);});
  const metricCard=(filter,label,value,sub,icon)=>`<button type="button" class="customer-portal-card${customerPortalListFilter===filter?' active':''}" data-customer-portal-filter="${filter}"><span class="portal-card-icon">${icon}</span><span class="portal-card-label">${label}</span><strong>${value}</strong><small>${sub}</small></button>`;
  const summaryCard=(label,value,sub,icon)=>`<div class="customer-portal-card customer-portal-summary-card"><span class="portal-card-icon">${icon}</span><span class="portal-card-label">${label}</span><strong>${value}</strong><small>${sub}</small></div>`;
  const totalApproved=allEstimates.filter(item=>['paid','approved','converted'].includes(item.status)).reduce((total,item)=>total+estimateApprovedAmount(item),0);
  const tabMetrics=customerPortalTab==='estimates'
    ? `${metricCard('all','All Estimates',allEstimates.length,'shared estimates',icons.estimates)}${metricCard('pending','Pending',allEstimates.filter(item=>item.status==='pending').length,'awaiting response','&#9200;')}${metricCard('approved','Proceeding',allEstimates.filter(item=>['paid','approved','converted'].includes(item.status)).length,'proceeding estimates','&#10003;')}${summaryCard('Total Approved Amount',money(totalApproved),'approved value','&#36;')}`
    : customerPortalTab==='jobs'
      ? `${metricCard('all','All Jobs',allJobs.length,'shared jobs',icons.jobs)}${metricCard('scheduled','Scheduled',allJobs.filter(item=>item.status==='scheduled').length,'upcoming visits','&#9200;')}${metricCard('progress','In Progress',allJobs.filter(item=>item.status==='progress').length,'work underway','&#9654;')}${metricCard('completed','Completed',allJobs.filter(item=>item.status==='completed'||item.status==='invoiced').length,'finished visits','&#10003;')}`
      : `${metricCard('all','All Invoices',allInvoices.length,'shared statements',icons.invoices)}${metricCard('unpaid','Pending',allInvoices.filter(item=>!['paid','partial'].includes(invoiceDisplayStatus(item))).length,'awaiting payment','!')}${metricCard('partial','Partially Paid',allInvoices.filter(item=>invoiceDisplayStatus(item)==='partial').length,'partially received','&#9681;')}${metricCard('paid','Paid',allInvoices.filter(item=>invoiceDisplayStatus(item)==='paid').length,'fully paid','&#10003;')}${summaryCard('Total Paid',money(paid),'received payments','&#10003;')}${summaryCard('Balance Due',money(due),'amount outstanding','!')}`;
  const filterOptions=customerPortalTab==='estimates'
    ? [['all','All status'],['pending','Pending'],['followup1','Follow Up 1'],['followup2','Follow Up 2'],['approved','Proceeding'],['rejected','Not Proceeding']]
    : customerPortalTab==='jobs'
      ? [['all','All status'],['scheduled','Scheduled'],['progress','In Progress'],['completed','Completed']]
      : [['all','All status'],['unpaid','Pending'],['partial','Partially Paid'],['paid','Paid']];
  const portalFilters=customerPortalTab==='overview' ? '' : `<div class="customer-portal-filter-bar"><input id="customerPortalSearch" class="search" type="search" value="${escapeHtml(customerPortalSearchQuery)}" placeholder="Search ${customerPortalTab} by number, service, or status..."><select id="customerPortalStatusFilter" class="secondary">${filterOptions.map(([value,label])=>`<option value="${value}" ${customerPortalListFilter===value?'selected':''}>${label}</option>`).join('')}</select><button type="button" class="secondary" id="clearCustomerPortalFilters">Clear</button></div>`;
  const tabButton=(tab,label,count,icon)=>`<button type="button" class="customer-portal-card${customerPortalTab===tab?' active':''}" data-customer-portal-tab="${tab}"><span class="portal-card-icon">${icon}</span><span class="portal-card-label">${label}</span><strong>${count}</strong><small>${tab==='overview'?'Your shared records':tab==='invoices'?'View statements':`View ${label.toLowerCase()}`}</small></button>`;
  const noRecords=(title,body)=>`<div class="customer-portal-no-records"><div class="empty-icon">&#10003;</div><h3>${title}</h3><p>${body}</p></div>`;
  const customerAccountStatus=String(currentUser.employmentStatus || currentUser.status || 'Active');
  const customerProfileDetails=`<div class="customer-profile-actions"><button type="button" class="primary customer-profile-edit-button" id="editCustomerOwnProfile">Edit Profile</button></div><div class="customer-profile-grid"><section class="card customer-profile-card"><div class="section-head"><div><h3>Contact Details</h3><p class="muted">Keep your contact and property details up to date.</p></div></div><div class="profile-info-list"><div><span>Full Name</span><strong>${escapeHtml(customer.name || currentUser.name || 'Not added')}</strong></div><div><span>Email</span><strong>${escapeHtml(customer.email || currentUser.email || 'Not added')}</strong></div><div><span>Phone</span>${phoneContactControls(customer.phone || currentUser.phone,customer.name || currentUser.name,false)}</div><div><span>Property Address</span><strong>${escapeHtml(customer.address || currentUser.address || 'Not added')}</strong></div><div><span>Customer Notes</span><strong>${escapeHtml(customer.notes || 'No notes added')}</strong></div></div></section><section class="card customer-profile-card"><div class="section-head"><div><h3>Account Details</h3><p class="muted">Your private customer account.</p></div></div><div class="profile-info-list"><div><span>Account Type</span><strong>Customer</strong></div><div><span>Account Status</span><strong><span class="status ${normalizeText(customerAccountStatus).includes('inactive')?'cancelled':'progress'}">${escapeHtml(customerAccountStatus)}</span></strong></div><div><span>Member Since</span><strong>${displayDate(customer.createdAt || currentUser.createdAt || todayISO())}</strong></div><div><span>Record Access</span><strong>Only records shared by your service team</strong></div></div></section></div>`;
  const tabContent=customerPortalTab==='overview'
    ? `<div class="customer-portal-overview">${customerProfileDetails}<div class="customer-portal-message"><span class="portal-message-icon">&#9993;</span><div><h3>Records shared by your service team</h3><p>Estimates, jobs, and invoices appear here only after your administrator sends them to you.</p></div></div><div class="customer-portal-recent-grid"><section class="card"><div class="section-head"><h3>Latest Job</h3></div>${jobs[0]?`<div class="portal-record-preview"><strong>#JOB-${escapeHtml(jobs[0].id)} · ${escapeHtml(jobs[0].service)}</strong><span>${displayDate(jobs[0].date)}${jobs[0].time?` · ${escapeHtml(jobs[0].time)}`:''}</span><span class="status ${jobs[0].status}">${jobStatusLabel(jobs[0].status)}</span></div>`:noRecords('No jobs shared yet','Your scheduled work will appear here after it is sent to you.')}</section><section class="card"><div class="section-head"><h3>Latest Invoice</h3></div>${invoices[0]?`<div class="portal-record-preview"><strong>${escapeHtml(invoices[0].id)}</strong><span>Due ${displayDate(invoices[0].due)}</span><strong>${money(invoiceDueAmount(invoices[0]))} due</strong></div>`:noRecords('No invoices shared yet','Invoices sent by your administrator will appear here.')}</section></div></div>`
    : customerPortalTab==='estimates'
      ? `<div class="customer-portal-section-intro"><div><span class="portal-section-kicker">Shared with you</span><h3>Your estimates</h3><p>Review quotes your administrator has sent. Select a row to view its details.</p></div><span class="portal-count-pill">${estimates.length} estimate${estimates.length===1?'':'s'}</span></div><div class="card table-card customer-portal-table"><div class="section-head"><div><h3>Estimate details</h3><p class="muted">Amounts and approval details are kept up to date by your service team.</p></div></div><div class="table-scroll"><table data-paginate="customer-estimates"><thead><tr><th>Estimate</th><th>Service</th><th>Estimated Date</th><th>Estimate Amount</th><th>Approved Amount</th><th>Approved Date</th><th>Status</th><th>PDF</th></tr></thead><tbody>${estimates.length?estimates.map(item=>{const isApproved=['paid','approved','converted'].includes(item.status);const displayStatus=['approved','converted'].includes(item.status)?'paid':item.status;return `<tr class="portal-clickable-row" data-customer-portal-record="estimate" data-record-id="${escapeHtml(item.id)}" tabindex="0"><td><strong class="portal-record-id">${escapeHtml(item.id)}</strong></td><td>${escapeHtml(item.service || '-')}</td><td>${displayDate(estimateCreatedDate(item))}</td><td><strong class="portal-amount">${money(item.amount)}</strong></td><td class="portal-paid">${isApproved?money(estimateApprovedAmount(item)):'-'}</td><td>${isApproved?displayDate(item.approvedAt || item.statusDate):'-'}</td><td><span class="status ${displayStatus}">${estimateStatusLabel(displayStatus)}</span></td><td><button type="button" class="secondary compact" data-customer-portal-pdf="estimate" data-record-id="${escapeHtml(item.id)}">PDF</button></td></tr>`}).join(''):tableEmpty(8,'No estimates shared','An estimate will appear once your administrator sends it to you.','&#9993;')}</tbody></table></div></div>`
      : customerPortalTab==='jobs'
        ? `<div class="card table-card customer-portal-table"><div class="section-head"><div><h3>Shared Jobs</h3><p class="muted">Your service visits sent by the administrator. Select a row to view its details.</p></div></div><div class="table-scroll"><table data-paginate="customer-jobs"><thead><tr><th>Job No.</th><th>Service</th><th>Price</th><th>Scheduled</th><th>Due Date</th><th>Status</th><th>PDF</th></tr></thead><tbody>${jobs.length?jobs.map(item=>`<tr class="portal-clickable-row" data-customer-portal-record="job" data-record-id="${escapeHtml(item.id)}" tabindex="0"><td><strong>#JOB-${escapeHtml(item.id)}</strong></td><td>${escapeHtml(item.service || '-')}</td><td><strong class="portal-amount">${money(item.price || 0)}</strong></td><td>${displayDate(item.date)}${item.time?`<small>${escapeHtml(item.time)}</small>`:''}</td><td>${displayDate(item.due || item.date)}</td><td><span class="status ${item.status}">${jobStatusLabel(item.status)}</span></td><td><button type="button" class="secondary compact" data-customer-portal-pdf="job" data-record-id="${escapeHtml(item.id)}">PDF</button></td></tr>`).join(''):tableEmpty(7,'No jobs shared','Scheduled jobs will appear after your administrator sends them to you.','&#128197;')}</tbody></table></div></div>`
        : `<div class="card table-card customer-portal-table"><div class="section-head"><div><h3>Shared Invoices</h3><p class="muted">Invoices and balances sent by the administrator. Select a row to view its details.</p></div></div><div class="table-scroll"><table data-paginate="customer-invoices"><thead><tr><th>Invoice</th><th>Invoice Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance Due</th><th>Status</th><th>PDF</th></tr></thead><tbody>${invoices.length?invoices.map(item=>{const rawStatus=invoiceDisplayStatus(item);const status=rawStatus==='paid'?'paid':rawStatus==='partial'?'partial':'unpaid';const portalStatusLabel=status==='unpaid'?'Pending':invoiceStatusLabel(status);return `<tr class="portal-clickable-row" data-customer-portal-record="invoice" data-record-id="${escapeHtml(item.id)}" tabindex="0"><td><strong>${escapeHtml(item.id)}</strong></td><td>${displayDate(item.invoiced)}</td><td>${displayDate(item.due)}</td><td><strong>${money(invoiceTotal(item))}</strong></td><td class="portal-paid">${money(invoicePaidAmount(item))}</td><td class="portal-due">${money(invoiceDueAmount(item))}</td><td><span class="status ${status}">${portalStatusLabel}</span></td><td><button type="button" class="secondary compact" data-customer-portal-pdf="invoice" data-record-id="${escapeHtml(item.id)}">PDF</button></td></tr>`}).join(''):tableEmpty(8,'No invoices shared','Invoices will appear after your administrator sends them to you.','&#9993;')}</tbody></table></div></div>`;
  const overviewCards=`${tabButton('overview','Overview',allJobs.length+allEstimates.length+allInvoices.length,icons.dashboard)}${tabButton('estimates','Estimates',allEstimates.length,icons.estimates)}${tabButton('jobs','Jobs',allJobs.length,icons.jobs)}${tabButton('invoices','Invoices',allInvoices.length,icons.invoices)}`;
  const profileHero=`<div class="customer-portal-hero"><div><h2>Welcome, ${escapeHtml(customer.name)}</h2><p>${escapeHtml(customer.address || 'Your service records')}</p></div></div>`;
  return `<div class="customer-portal">${customerPortalTab==='overview'?profileHero:''}${portalFilters}${customerPortalTab==='overview'?'':`<div class="customer-invoice-cards customer-tab-start-cards ${customerPortalTab}">${tabMetrics}</div>`}<div class="customer-portal-content">${tabContent}</div></div>`;
}

function customerPortalRecordDetail(){
  if(!isCustomerUser() || !customerPortalSelectedRecord) return customerProfile();
  const {kind,id}=customerPortalSelectedRecord;
  const source={estimate:state.estimates,job:state.jobs,invoice:state.invoices}[kind] || [];
  const record=source.find(item=>String(item.id)===String(id));
  if(!record) return `<div class="card empty-state"><h3>Record unavailable</h3><p>This record is no longer shared with your account.</p><button type="button" class="secondary" data-customer-portal-back>Back</button></div>`;
  const backView={estimate:'customerEstimates',job:'customerJobs',invoice:'customerInvoices'}[kind] || 'customerProfile';
  const heading=kind==='estimate'?'Estimate Details':kind==='job'?'Job Details':'Invoice Details';
  const pdfButton=`<button type="button" class="secondary" data-customer-portal-pdf="${kind}" data-record-id="${escapeHtml(record.id)}">Open PDF</button>`;
  let content='';
  if(kind==='estimate'){
    const approved=['paid','approved','converted'].includes(record.status);
    const displayStatus=['approved','converted'].includes(record.status)?'paid':record.status;
    content=`<div class="customer-record-detail-stack"><section class="card section-card"><div class="section-head"><h3>Estimate Details</h3></div><div class="detail-list"><div class="detail-item"><span>Estimate No.</span><strong>${escapeHtml(record.id)}</strong></div><div class="detail-item"><span>Service</span><strong>${escapeHtml(record.service || '-')}</strong></div><div class="detail-item"><span>Estimate Date</span><strong>${displayDate(estimateCreatedDate(record))}</strong></div><div class="detail-item"><span>Valid Until</span><strong>${displayDate(estimateExpirationDate(record))}</strong></div><div class="detail-item"><span>Estimated Amount</span><strong class="portal-amount">${money(record.amount)}</strong></div>${approved?`<div class="detail-item"><span>Approved Amount</span><strong class="portal-paid">${money(estimateApprovedAmount(record))}</strong></div><div class="detail-item"><span>Approved Date</span><strong>${displayDate(record.approvedAt || record.statusDate)}</strong></div>`:''}<div class="detail-item"><span>Status</span><strong><span class="status ${displayStatus}">${estimateStatusLabel(displayStatus)}</span></strong></div></div></section><section class="card section-card"><div class="section-head"><h3>Notes</h3></div><p class="note-box">${escapeHtml(record.notes || 'No notes added.')}</p></section></div>`;
  } else if(kind==='job'){
    content=`<div class="customer-record-detail-stack"><section class="card section-card"><div class="section-head"><h3>Job Details</h3></div><div class="detail-list"><div class="detail-item"><span>Job No.</span><strong>JOB-${escapeHtml(record.id)}</strong></div><div class="detail-item"><span>Service</span><strong>${escapeHtml(record.service || '-')}</strong></div><div class="detail-item"><span>Scheduled Date</span><strong>${displayDate(record.date)}</strong></div><div class="detail-item"><span>Due Date</span><strong>${displayDate(record.due || record.date)}</strong></div><div class="detail-item"><span>Property</span><strong>${escapeHtml(record.address || 'Not added')}</strong></div><div class="detail-item"><span>Job Value</span><strong class="portal-amount">${money(record.price || 0)}</strong></div><div class="detail-item"><span>Status</span><strong><span class="status ${record.status}">${jobStatusLabel(record.status)}</span></strong></div></div></section><section class="card section-card"><div class="section-head"><h3>Notes</h3></div><p class="note-box">${escapeHtml(record.notes || 'No notes added.')}</p></section></div>`;
  } else {
    const rawStatus=invoiceDisplayStatus(record);
    const status=rawStatus==='paid'?'paid':rawStatus==='partial'?'partial':'unpaid';
    const items=invoiceLinePaymentAllocations(record);
    const subtotal=invoiceSubtotal(record);
    const taxAmount=invoiceTaxAmount(record);
    const totalAmount=invoiceTotal(record);
    const paidAmount=invoicePaidAmount(record);
    const dueAmount=invoiceDueAmount(record);
    const portalStatusLabel=status==='unpaid'?'Pending':invoiceStatusLabel(status);
    content=`<div class="dashboard-grid"><section class="card section-card"><div class="section-head"><h3>Invoice Details</h3></div><div class="detail-list"><div class="detail-item"><span>Invoice No.</span><strong>${escapeHtml(record.id)}</strong></div><div class="detail-item"><span>Invoice Date</span><strong>${displayDate(record.invoiced)}</strong></div><div class="detail-item"><span>Due Date</span><strong>${displayDate(record.due)}</strong></div><div class="detail-item"><span>Total Amount</span><strong class="portal-amount">${money(totalAmount)}</strong></div><div class="detail-item"><span>Amount Paid</span><strong class="portal-paid">${money(paidAmount)}</strong></div><div class="detail-item"><span>Balance Due</span><strong class="portal-due">${money(dueAmount)}</strong></div><div class="detail-item"><span>Status</span><strong><span class="status ${status}">${portalStatusLabel}</span></strong></div></div></section></div><section class="card section-card invoice-breakdown-card invoice-detail-breakdown-card customer-portal-invoice-summary"><div class="section-head"><h3>Invoice Summary</h3></div><div class="invoice-breakdown-table-wrap invoice-detail-line-items"><table class="invoice-breakdown-table"><thead><tr><th>Job No.</th><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total Amount</th></tr></thead><tbody>${items.length?items.map(item=>`<tr><td><strong>${escapeHtml(item.jobId ? displayJobNumber(item.jobId) : '-')}</strong></td><td>${escapeHtml(item.description || '-')}</td><td>${Number(item.quantity || 0)}</td><td>${money(item.rate)}</td><td class="invoice-line-total"><strong>${money(item.subtotal)}</strong></td></tr>`).join(''):tableEmpty(5,'No line items','No billing items were added.','')}</tbody></table></div><div class="invoice-totals"><div><span>Subtotal Amount</span><strong>${money(subtotal)}</strong></div><div class="invoice-tax-line"><span>Tax (${Number(Number(record.taxRate || 0).toFixed(2))}%)</span><strong>${money(taxAmount)}</strong></div><div class="invoice-summary-total"><span>Total Amount</span><strong>${money(totalAmount)}</strong></div><div class="invoice-summary-paid"><span>Amount Paid</span><strong>${money(paidAmount)}</strong></div><div class="invoice-total-line ${dueAmount>0?'has-balance':'is-settled'}"><span>Balance Due</span><strong class="invoice-due-value">${money(dueAmount)}</strong></div></div></section>`;
  }
  return `<div class="hero"><div><button class="link-btn" data-customer-portal-back>&larr; Back to ${kind==='estimate'?'Estimates':kind==='job'?'Jobs':'Invoices'}</button><h2>${escapeHtml(record.id)}</h2><p>${escapeHtml(record.service || record.customer || '')}</p></div><div class="hero-actions">${pdfButton}</div></div>${content}`;
}

function customerProfile(){
  if(isCustomerUser()) selectedCustomer=currentUser.customerId || currentUser.customerName || currentUser.email || currentUser.name;
  if(!selectedCustomer) return customers();
  let customer = state.customers.find(c => isCustomerUser()
    ? (String(c.id || '')===String(currentUser.customerId || '') || normalizeEmailText(c.email)===normalizeEmailText(currentUser.email) || normalizeText(c.name)===normalizeText(currentUser.customerName || currentUser.name))
    : (c.id == selectedCustomer || normalizeText(c.name) === normalizeText(selectedCustomer)));
  // Never block a valid customer login on a legacy/missing customer row. The
  // portal can safely show the contact details stored with that login while
  // the backend restores its workspace link in the background.
  if(!customer && isCustomerUser()){
    customer={
      id:String(currentUser.customerId || currentUser.email || currentUser.id || 'customer'),
      name:currentUser.customerName || currentUser.name || 'Customer',
      email:currentUser.email || '',
      phone:currentUser.phone || '',
      address:currentUser.address || '',
      notes:currentUser.profileNotes || '',
      createdAt:currentUser.createdAt || Date.now(),
      pendingProfileRestore:true
    };
  }
  if(!customer) return customers();

  const customerId=String(customer.id || '');
  const customerAddress=normalizeText(customer.address);
  const customerAliases=new Set([customer.name,...(Array.isArray(customer.aliases)?customer.aliases:[])].map(normalizeText).filter(Boolean));
  // Customer workspaces are filtered securely by the backend before they get
  // here. Do not apply a second legacy sent-date filter: earlier shared jobs
  // already have a customer notification but may not have that old field.
  const visibleInCustomerPortal=record=>!isCustomerUser() || Boolean(record);
  const customerJobs = newestFirst(state.jobs.filter(job=>{
    if(isCustomerUser()) return visibleInCustomerPortal(job);
    const idMatch=customerId && (String(job.customerId || '')===customerId || String(job.sharedCustomerId || '')===customerId);
    const nameMatch=customerAliases.has(normalizeText(job.customer));
    const addressMatch=customerAddress && normalizeText(job.address)===customerAddress;
    return (idMatch || nameMatch || addressMatch) && visibleInCustomerPortal(job);
  }));
  customerJobs.forEach(job=>{ if(job.customer) customerAliases.add(normalizeText(job.customer)); });
  const customerJobIds=new Set(customerJobs.map(job=>String(job.id)));
  const customerEstimateIds=new Set(customerJobs.map(job=>String(job.sourceEstimateId || '')).filter(Boolean));
  const customerEstimates = newestFirst(state.estimates.filter(estimate=>{
    if(isCustomerUser()) return visibleInCustomerPortal(estimate);
    const idMatch=customerId && (String(estimate.customerId || '')===customerId || String(estimate.sharedCustomerId || '')===customerId);
    const nameMatch=customerAliases.has(normalizeText(estimate.customer));
    const jobMatch=customerJobIds.has(String(estimate.convertedJobId || '')) || customerEstimateIds.has(String(estimate.id || ''));
    return (idMatch || nameMatch || jobMatch) && visibleInCustomerPortal(estimate);
  }));
  const customerInvoices = newestFirst(state.invoices.filter(invoice=>{
    if(isCustomerUser()) return visibleInCustomerPortal(invoice);
    const idMatch=customerId && (String(invoice.customerId || '')===customerId || String(invoice.sharedCustomerId || '')===customerId);
    const nameMatch=customerAliases.has(normalizeText(invoice.customer));
    const jobMatch=customerJobIds.has(String(invoice.jobId || ''));
    return (idMatch || nameMatch || jobMatch) && visibleInCustomerPortal(invoice);
  }));
  const paidCustomerInvoices = customerInvoices.filter(i => invoicePaymentStatus(i) === 'paid');
  const customerPayments = newestFirst(customerInvoices.flatMap(invoice => invoicePaymentRecords(invoice).map(payment => ({
    ...payment,
    invoiceId:invoice.id,
    customer:invoice.customer,
    createdAt:payment.createdAt || invoice.createdAt || invoice.invoiced
  }))));
  const totalBilled = customerInvoices.reduce((sum,invoice) => sum + invoiceTotal(invoice),0);
  const totalPaid = customerInvoices.reduce((sum,invoice) => sum + invoicePaidAmount(invoice),0);
  const totalDue = customerInvoices.reduce((sum,invoice) => sum + invoiceDueAmount(invoice),0);
  const estimateValue = customerEstimates.reduce((sum,estimate) => sum + Number(estimate.amount || 0),0);
  const totalJobValue = customerJobs.reduce((sum,job) => sum + Number(job.price || 0),0);
  const lastJob = customerJobs[0];
  const completedJobs = customerJobs.filter(j => j.status === 'completed' || j.status === 'invoiced').length;
  const avgJobValue = customerJobs.length > 0 ? totalJobValue / customerJobs.length : 0;
  const unpaidInvoices = customerInvoices.filter(i => invoiceDueAmount(i) > 0 && invoicePaymentStatus(i) !== 'cancelled');
  const customerSince = displayDate(customer.createdDate || customer.createdAt) || '-';
  const displayedHistory=records => records.slice(0,3);
  const historyViewAll=(section,records,label) => records.length>3 ? `<button class="secondary compact" data-customer-history-view-all="${section}">View All ${label}</button>` : '';

  if(isCustomerUser()) return customerPortal(customer,customerJobs,customerEstimates,customerInvoices);

  const invoiceRowsForCustomer = (invoices, {showDueDate=false, showPaidDate=false}={}) => invoices.length ? invoices.map(invoice=>{
    const displayStatus=invoiceDisplayStatus(invoice);
    return `<tr data-invoice="${escapeHtml(invoice.id)}" style="cursor:pointer">
      <td><strong>${escapeHtml(invoice.id)}</strong><div class="muted">${escapeHtml(invoice.projectName || invoice.service || 'Invoice')}</div></td>
      <td>${displayDate(invoice.invoiced)}</td>
      ${showDueDate ? `<td>${displayDate(invoice.due)}</td>` : ''}
      ${showPaidDate ? `<td>${displayDate(invoice.paid)}</td>` : ''}
      <td><strong>${money(invoiceTotal(invoice))}</strong></td>
      <td><strong style="color:#16834b">${money(invoicePaidAmount(invoice))}</strong></td>
      <td><strong style="color:${invoiceDueAmount(invoice)>0?'#b4233c':'#16834b'}">${money(invoiceDueAmount(invoice))}</strong></td>
      <td><span class="status ${displayStatus}">${invoiceStatusLabel(displayStatus)}</span></td>
      <td class="table-actions"><button class="action-btn view">Open Invoice</button></td>
    </tr>`;
  }).join('') : tableEmpty(7 + Number(showDueDate) + Number(showPaidDate),'No invoices yet','Invoices created for this customer will appear here.','💵');

  return `<div class="hero">
    <div>
      <button class="link-btn" id="backToCustomers">&larr; Back to Customers</button>
      <h2>${escapeHtml(customer.name)}</h2>
      <p>${escapeHtml(customer.service || 'No primary service')} &middot; ${escapeHtml(customer.address || 'No address added')}</p>
    </div>
    ${hasManagementAccess()?`<div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="secondary" id="exportCustomerPdf">Export PDF</button>
      <button class="secondary" id="newJobCustomer" style="background:#007bff;color:white">+ New Job</button>
      <button class="secondary" id="editCustomer">Edit</button>
      <button class="secondary" id="deleteCustomer" style="background:#dc3545;color:white">Delete</button>
    </div>`:''}
  </div>

  <div class="metric-grid customer-connected-metrics">
    <button class="metric metric-button" data-customer-target="jobs"><div class="label">Jobs</div><div class="value">${customerJobs.length}</div><div class="sub">${completedJobs} completed</div><div class="bubble">${icons.jobs}</div></button>
    <button class="metric metric-button" data-customer-target="estimates"><div class="label">Estimates</div><div class="value">${customerEstimates.length}</div><div class="sub">${money(estimateValue)} total value</div><div class="bubble">${icons.estimates}</div></button>
    <button class="metric metric-button" data-customer-target="invoices"><div class="label">All Invoices</div><div class="value">${customerInvoices.length}</div><div class="sub">${money(totalBilled)} billed</div><div class="bubble">${icons.invoices}</div></button>
    <button class="metric metric-button" data-customer-target="paidInvoices"><div class="label">Paid Invoices</div><div class="value">${paidCustomerInvoices.length}</div><div class="sub">${money(totalPaid)} received</div><div class="bubble">&#10003;</div></button>
    <button class="metric metric-button" data-customer-target="invoices"><div class="label">Due Amount</div><div class="value">${money(totalDue)}</div><div class="sub">${unpaidInvoices.length} open invoices</div><div class="bubble">&#36;</div></button>
  </div>

  <div class="dashboard-grid">
    <div class="card section-card">
      <div class="section-head"><h3>Contact Information</h3></div>
      <div class="detail-list">
        <div class="detail-item">
          <span class="muted">Full Name</span>
          <strong>${escapeHtml(customer.name)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Email</span>
          <strong><a href="mailto:${escapeHtml(customer.email || '')}" style="color:#1a7f3d;text-decoration:none">&#9993; ${escapeHtml(customer.email || 'Not added')}</a></strong>
        </div>
        <div class="detail-item">
          <span class="muted">Phone</span>
          ${phoneContactControls(customer.phone,customer.name)}
        </div>
        <div class="detail-item">
          <span class="muted">Property Address</span>
          <strong>${escapeHtml(customer.address || 'Not added')}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Primary Service</span>
          <strong>${escapeHtml(customer.service || 'Not selected')}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Created Date</span>
          <strong>${displayDate(customer.createdDate || customer.createdAt)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Created By</span>
          <strong>${escapeHtml(recordCreatedBy(customer))}</strong>
        </div>
        <div class="detail-item full">
          <span class="muted">Customer Notes</span>
          <strong>${customer.notes ? escapeHtml(customer.notes) : 'No notes added yet'}</strong>
        </div>
      </div>
    </div>

    <div class="card section-card">
      <div class="section-head"><h3>Service History & Metrics</h3></div>
      <div class="detail-list">
        <div class="detail-item">
          <span class="muted">Total Jobs</span>
          <strong style="font-size:18px">${customerJobs.length}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Completed Jobs</span>
          <strong style="font-size:16px;color:#28a745">${completedJobs}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Total Paid</span>
          <strong style="font-size:18px;color:#1a7f3d">${money(totalPaid)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Average Job Value</span>
          <strong>${money(avgJobValue)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Last Service</span>
          <strong>${lastJob ? displayDate(lastJob.date) + ' - ' + lastJob.service : 'No jobs yet'}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Unpaid Invoices</span>
          <strong style="color:#dc3545">${unpaidInvoices.length > 0 ? unpaidInvoices.length + ' ('+money(unpaidInvoices.reduce((a,b)=>a+invoiceDueAmount(b),0))+')' : 'None'}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Customer Since</span>
          <strong>${escapeHtml(customerSince)}</strong>
        </div>
      </div>
    </div>
  </div>

  <div class="customer-record-sections">
    <div class="card table-card customer-linked-card" id="customer-history-jobs">
      <div class="section-head"><div><h3>Recent Job History</h3><p class="muted">The three most recent jobs for this customer.</p></div>${historyViewAll('jobs',customerJobs,'Jobs')}</div>
      <table><thead><tr><th>Job</th><th>Service</th><th>Date & Time</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${customerJobs.length ? displayedHistory(customerJobs).map(job=>`<tr class="record-row" data-job="${job.id}" tabindex="0" role="link" aria-label="Open job JOB-${job.id}"><td><strong>#JOB-${job.id}</strong></td><td>${escapeHtml(job.service || '-')}</td><td>${displayDate(job.date)}<div class="muted">${escapeHtml(job.time || '-')}</div></td><td><strong>${money(job.price)}</strong></td><td><span class="status ${job.status}">${jobStatusLabel(job.status)}</span></td></tr>`).join('') : tableEmpty(5,'No jobs yet','Create a job for this customer to begin their service history.','🧰')}</tbody></table>
    </div>

    <div class="card table-card customer-linked-card" id="customer-history-estimates">
      <div class="section-head"><div><h3>Recent Estimate History</h3><p class="muted">The three most recent estimates for this customer.</p></div>${historyViewAll('estimates',customerEstimates,'Estimates')}</div>
      <table><thead><tr><th>Estimate</th><th>Service</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead>
      <tbody>${customerEstimates.length ? displayedHistory(customerEstimates).map(estimate=>`<tr class="record-row view-estimate-btn" data-estimate="${escapeHtml(estimate.id)}" tabindex="0" role="link" aria-label="Open estimate ${escapeHtml(estimate.id)}"><td><strong>${escapeHtml(estimate.id)}</strong></td><td>${escapeHtml(estimate.service || '-')}</td><td><strong>${money(estimate.amount)}</strong></td><td><span class="status ${estimate.status}">${estimateStatusLabel(estimate.status)}</span></td><td>${escapeHtml(displayDate(estimate.createdDate || estimate.createdAt))}</td></tr>`).join('') : tableEmpty(5,'No estimates yet','Create an estimate to start tracking quotes for this customer.','🧾')}</tbody></table>
    </div>

    <div class="card table-card customer-linked-card" id="customer-history-paidInvoices">
      <div class="section-head"><div><h3>Recent Paid Invoices</h3><p class="muted">The three most recently paid invoices for this customer.</p></div>${historyViewAll('paidInvoices',paidCustomerInvoices,'Paid Invoices')}</div>
      <table><thead><tr><th>Invoice</th><th>Invoice Date</th><th>Paid Date</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th class="actions-col">Open</th></tr></thead><tbody>${invoiceRowsForCustomer(displayedHistory(paidCustomerInvoices),{showPaidDate:true})}</tbody></table>
    </div>

    <div class="card table-card customer-linked-card" id="customer-history-invoices">
      <div class="section-head"><div><h3>Recent Invoices</h3><p class="muted">The three most recent invoices for this customer.</p></div>${historyViewAll('invoices',customerInvoices,'Invoices')}</div>
      <table><thead><tr><th>Invoice</th><th>Invoice Date</th><th>Due Date</th><th>Paid Date</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th class="actions-col">Open</th></tr></thead><tbody>${invoiceRowsForCustomer(displayedHistory(customerInvoices),{showDueDate:true,showPaidDate:true})}</tbody></table>
    </div>

    <div class="card table-card customer-linked-card" id="customer-history-payments">
      <div class="section-head"><div><h3>Recent Payment History</h3><p class="muted">The three most recent payments received from this customer.</p></div>${historyViewAll('payments',customerPayments,'Payments')}</div>
      <table><thead><tr><th>Date</th><th>Invoice</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>${customerPayments.length?displayedHistory(customerPayments).map(payment=>`<tr class="record-row" data-invoice="${escapeHtml(payment.invoiceId)}" tabindex="0" role="link"><td>${displayDate(payment.date || payment.createdAt)}</td><td><strong>${escapeHtml(payment.invoiceId)}</strong></td><td>${escapeHtml(payment.method || 'Other')}</td><td>${escapeHtml(payment.reference || '-')}</td><td style="color:#12854d"><strong>${money(payment.amount)}</strong></td></tr>`).join(''):tableEmpty(5,'No payments yet','Payments received from this customer will appear here.','✓')}</tbody></table>
    </div>
  </div>`;
}

function estimateDetail(){
  if(!selectedEstimate) return estimates();
  const estimate = state.estimates.find(e => e.id === selectedEstimate);
  if(!estimate) return estimates();

  const customer = state.customers.find(c =>
    (estimate.customerId && String(c.id)===String(estimate.customerId)) || normalizeText(c.name)===normalizeText(estimate.customer)
  );
  const customerEstimates = state.estimates.filter(e => normalizeText(e.customer) === normalizeText(estimate.customer));
  const approvalRate = customerEstimates.length > 0 ? Math.round((customerEstimates.filter(e => e.status === 'paid' || e.status === 'converted').length / customerEstimates.length) * 100) : 0;
  const convertedJob = convertedJobForEstimate(estimate);

  return `<div class="hero">
    <div>
      <button class="link-btn" id="backToEstimates">&larr; Back to Estimates</button>
      <h2>${estimate.id}</h2>
      <p>${estimate.customer} &middot; ${estimate.service}</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${['pending','followup1','followup2'].includes(estimate.status) ? `
        <button class="secondary" id="sendReminder" style="background:#ffc107;color:black">Send Reminder</button>
      ` : ''}
      ${estimate.status === 'paid' ? `
        <button class="secondary" id="convertToJob" style="background:#007bff;color:white">&rarr; Convert to Job</button>
      ` : ''}
      ${convertedJob ? `
        <button class="secondary" id="viewConvertedJob" style="background:#28a745;color:white">&#10003; Job: #JOB-${convertedJob.id}</button>
      ` : ''}
      <button class="secondary" id="exportEstimatePdf">Export PDF</button>
      <button class="secondary" id="editEstimate">Edit</button>
      <button class="secondary" id="deleteEstimate" style="background:#dc3545;color:white">Delete</button>
    </div>
  </div>

  <div class="dashboard-grid">
    <div class="card section-card">
      <div class="section-head"><h3>Estimate Details</h3></div>
      <div class="detail-list">
        <div class="detail-item">
          <span class="muted">Estimate ID</span>
          <strong>${estimate.id}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Customer</span>
          <strong>${estimate.customer}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Service</span>
          <strong>${estimate.service}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Estimated Amount</span>
          <strong style="font-size:18px;color:#1a7f3d">${money(estimate.amount)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Status</span>
          <span class="status ${estimate.status}" style="display:inline-block">${estimateStatusLabel(estimate.status)}</span>
        </div>
        ${convertedJob ? `<div class="detail-item">
          <span class="muted">Job Number</span>
          <strong>#JOB-${convertedJob.id}</strong>
        </div>` : ''}
        <div class="detail-item">
          <span class="muted">Created Date</span>
          <strong>${displayDate(estimateCreatedDate(estimate))}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Created By</span>
          <strong>${escapeHtml(recordCreatedBy(estimate))}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Valid Until</span>
          <strong>${displayDate(estimateExpirationDate(estimate))}</strong>
        </div>
      </div>
    </div>

    <div class="card section-card">
      <div class="section-head"><h3>Quick Actions</h3></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="secondary" id="printEstimate" style="width:100%">Print/PDF</button>
        <button class="secondary" id="emailEstimate" style="width:100%">&#9993; Send Estimate PDF</button>
        ${customer ? `<button class="secondary" id="customerProfile" style="width:100%">View Customer Profile</button>` : ''}
      </div>
    </div>

    <div class="card section-card">
      <div class="section-head"><h3>Customer Estimate History</h3></div>
      <div class="detail-list">
        <div class="detail-item">
          <span class="muted">Total Estimates</span>
          <strong>${customerEstimates.length}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Approved</span>
          <strong>${customerEstimates.filter(e => e.status === 'paid' || e.status === 'converted').length}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Pending</span>
          <strong style="color:#ffc107">${customerEstimates.filter(e => e.status === 'pending').length}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Approval Rate</span>
          <strong style="color:#28a745">${approvalRate}%</strong>
        </div>
      </div>
    </div>

    <div class="card section-card">
      <div class="section-head"><h3>Progress Information</h3></div>
      <div class="detail-list">
        <div class="detail-item">
          <span class="muted">Estimate Date</span>
          <strong>${displayDate(estimateCreatedDate(estimate))}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Status</span>
          <strong>${escapeHtml(estimateStatusLabel(estimate.status))}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">${escapeHtml(estimateStatusDateLabel(estimate.status))}</span>
          <strong>${escapeHtml(estimateStatusDate(estimate))}</strong>
        </div>
        ${convertedJob ? `<div class="detail-item">
          <span class="muted">Converted Job</span>
          <strong>#JOB-${convertedJob.id}</strong>
        </div>` : ''}
        <div class="detail-item">
          <span class="muted">Expiration Date</span>
          <strong>${displayDate(estimateExpirationDate(estimate))}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Days Until Expiration</span>
          <strong id="daysUntilExpiration">${estimateDaysUntilExpiration(estimate) >= 0 ? estimateDaysUntilExpiration(estimate) : `Expired ${Math.abs(estimateDaysUntilExpiration(estimate))} days ago`}</strong>
        </div>
      </div>
    </div>

  <div class="card section-card">
    <div class="section-head"><h3>Notes</h3></div>
    <textarea id="estimateNotes" placeholder="Add internal notes..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:4px;font-family:inherit;min-height:100px;resize:vertical">${escapeHtml(estimate.notes || '')}</textarea>
    <button class="secondary" id="saveEstimateNotes" style="margin-top:10px">Save Notes</button>
  </div>
  <div class="card section-card record-activity-card">
    <div class="section-head"><h3>Activity History</h3></div>
    ${auditTrail(estimate)}
  </div>`;
}

function scheduleMonthView(){
  const year = scheduleDate.getFullYear();
  const month = scheduleDate.getMonth();
  const todayDateStr = todayISO();
  const todayLabel = `Today, ${displayDate(new Date())}`;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][month];
  const weeks = [];
  let currentDate = new Date(startDate);

  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = toISODate(currentDate);
      const dayJobs = uniqueScheduleJobs(scheduleAssignmentEntries(state.jobs).filter(job => job.date === dateStr));
      week.push({ date: currentDate.getDate(), month: currentDate.getMonth(), jobs: dayJobs });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return `<div class="schedule-page">
    <div class="schedule-hero">
      <div>
        <h2>Schedule</h2>
        <p>Assign crews and manage recurring landscaping jobs.</p>
      </div>
      <div class="hero-actions">
        ${exportMenu('schedule')}
        <button class="secondary" id="viewScheduledJobs">View Scheduled Jobs</button>
        <button class="primary schedule-primary" id="newJob">+ Schedule Job</button>
      </div>
    </div>
    <div class="card schedule-calendar-card">
      <div class="schedule-toolbar">
        <div class="schedule-nav-controls">
          <button class="schedule-control" id="schedPrev">&larr;</button>
          <button class="schedule-control today" id="schedToday">${todayLabel}</button>
          <button class="schedule-control" id="schedNext">&rarr;</button>
        </div>
        <div class="schedule-view-controls">
          <button class="schedule-control ${scheduleView==='week'?'active':''}" id="schedWeek">Week</button>
          <button class="schedule-control ${scheduleView==='month'?'active':''}" id="schedMonth">Month</button>
        </div>
      </div>
      <div class="schedule-month-title">${monthName} ${year}</div>
      <div class="schedule-month-grid">
        ${dayNames.map(d=>`<div class="schedule-month-head">${d}</div>`).join('')}
        ${weeks.map(week=>week.map(day=>{
          const currentDate = new Date(year, day.month, day.date);
          const dateStr = toISODate(currentDate);
          const isTodayCell = dateStr === todayDateStr && day.month === month;
          return `<div class="schedule-month-cell month-day ${day.month !== month ? 'muted-month' : ''} ${isTodayCell ? 'is-today-month' : ''}" data-date="${day.month===month?dateStr:''}">
            <strong>${day.month === month ? day.date : ''}${isTodayCell ? '<small>Today</small>' : ''}</strong>
            <span>${day.jobs.slice(0,3).map(j=>{
              const completed=scheduleDisplayStatus(j)==='completed';
              return `<button type="button" class="schedule-month-job ${scheduleBlockClass(j)} ${completed?'is-completed':''}" data-schedule-calendar-job="${escapeHtml(j.id)}" data-schedule-crew="${escapeHtml(j.assignmentCrew || j.crew || '')}" title="${escapeHtml(`${scheduleJobNumber(j)} · ${j.service || 'Job'} · ${j.crew || 'Crew not assigned'}`)}"><b>${escapeHtml(scheduleJobNumber(j))}</b><small>${escapeHtml(j.service || 'Job')} · ${escapeHtml(j.crew || 'Crew not assigned')}</small></button>`;
            }).join('')}</span>
          </div>`;
        }).join('')).join('')}
      </div>
    </div>
  </div>`;
}

function jobs(){
  const crewRestricted=isCrewUser();
  const allVisibleJobs = assignedJobs();
  const jobQuery=normalizeText(jobSearchQuery);
  const visibleJobs=allVisibleJobs.filter(job=>{
    const matchesContext=(!jobServiceFilter || normalizeText(job.service)===normalizeText(jobServiceFilter)) && recordMatchesCustomerFilter(job,jobCustomerFilter) && (!jobCrewFilter || isCrewAssignedToJob(job,jobCrewFilter));
    // Search accepts the job number exactly as it is shown to the user
    // (JOB-1047 or #JOB-1047), as well as the stored numeric id (1047).
    const displayedJobNumber=displayJobNumber(job.id);
    const matchesSearch=!jobQuery || normalizeText([
      job.id,
      displayedJobNumber,
      displayedJobNumber ? `#${displayedJobNumber}` : '',
      job.customer,
      job.service,
      job.crew,
      job.address
    ].join(' ')).includes(jobQuery);
    return matchesContext && matchesDateRange(job.date,jobDateRange.start,jobDateRange.end) && matchesSearch;
  });
  let filteredJobs = [...visibleJobs];
  const statusFilter = jobListFilter || 'all';
  if(statusFilter !== 'all') {
    filteredJobs = filteredJobs.filter(j => j.status === statusFilter);
  }
  const activeJobs=filteredJobs;
  filteredJobs = newestFirst(filteredJobs);
  const scheduledJobs = activeJobs.filter(j=>j.status==='scheduled').length;
  const progressJobs = activeJobs.filter(j=>j.status==='progress').length;
  const completedJobs = activeJobs.filter(j=>j.status==='completed').length;
  const invoicedJobs = activeJobs.filter(j=>j.status==='invoiced').length;
  const jobRevenue = activeJobs.reduce((a,b)=>a + Number(b.price || 0), 0);
  const visibleJobIds = new Set(activeJobs.map(job=>String(job.id)));
  const invoicedAmount = state.invoices
    .filter(invoice=>visibleJobIds.has(String(invoice.jobId || '')) || invoiceLineItems(invoice).some(item=>visibleJobIds.has(String(item.jobId || ''))))
    .reduce((sum,invoice)=>sum + invoiceTotal(invoice),0);

  return `<div class="hero"><div><h2>${isCrewUser()?'My Jobs':'Jobs'}</h2><p>${isCrewUser()?'Only jobs assigned to you are shown.':'Track scheduled, active, completed, and invoiced field work.'} Total: ${activeJobs.length} | Scheduled: ${scheduledJobs} | In Progress: ${progressJobs} | Completed: ${completedJobs} | Invoiced: ${invoicedJobs}</p></div><div class="hero-actions">${crewRestricted?'':exportMenu('jobs')}${hasManagementAccess()?'<button class="primary" id="newJob">+ New Job</button>':''}</div></div>
  ${(jobServiceFilter || jobCustomerFilter || jobCrewFilter)?`<div class="service-filter-banner"><span>Showing jobs for <strong>${escapeHtml(jobCustomerFilter ? (customerForFilter(jobCustomerFilter)?.name || jobCustomerFilter) : (jobCrewFilter || jobServiceFilter))}</strong></span><button class="secondary compact" id="clearJobServiceFilter">Clear filter</button></div>`:''}
  <div class="metric-grid jobs-metric-grid">
    <button class="metric metric-button" data-job-filter="all"><div class="label">Total Jobs</div><div class="value">${activeJobs.length}</div><div class="sub">all field work</div><div class="bubble">&#9635;</div></button>
    <button class="metric metric-button" data-job-filter="scheduled"><div class="label">Scheduled</div><div class="value">${scheduledJobs}</div><div class="sub">upcoming jobs</div><div class="bubble">&#9200;</div></button>
    <button class="metric metric-button" data-job-filter="progress"><div class="label">In Progress</div><div class="value">${progressJobs}</div><div class="sub">active right now</div><div class="bubble">&#9654;</div></button>
    <button class="metric metric-button" data-job-filter="completed"><div class="label">Completed</div><div class="value">${completedJobs}</div><div class="sub">finished jobs</div><div class="bubble">&#10003;</div></button>
    <button class="metric metric-button" data-job-filter="invoiced"><div class="label">Invoiced Jobs</div><div class="value">${invoicedJobs}</div><div class="sub">${crewRestricted?'completed billing':money(invoicedAmount)}</div><div class="bubble">&#9638;</div></button>
    ${crewRestricted?'':`<button class="metric metric-button" data-job-filter="all"><div class="label">Total Amount</div><div class="value">${money(jobRevenue)}</div><div class="bubble">&#36;</div></button>`}
  </div>
  <div class="card table-card">
    <div class="table-tools">
      <input class="search" id="jobSearch" value="${escapeHtml(jobSearchQuery)}" placeholder="Search jobs by customer or service...">
      ${dateRangeControls('job',jobDateRange)}
      <select class="secondary" id="jobStatusFilter">
        <option value="all" ${statusFilter==='all'?'selected':''}>All status</option>
        <option value="notstarted" ${statusFilter==='notstarted'?'selected':''}>Not Started</option>
        <option value="pending" ${statusFilter==='pending'?'selected':''}>Pending</option>
        <option value="scheduled" ${statusFilter==='scheduled'?'selected':''}>Scheduled</option>
        <option value="progress" ${statusFilter==='progress'?'selected':''}>In Progress</option>
        <option value="onhold" ${statusFilter==='onhold'?'selected':''}>On Hold</option>
        <option value="completed" ${statusFilter==='completed'?'selected':''}>Completed</option>
        <option value="invoiced" ${statusFilter==='invoiced'?'selected':''}>Invoiced</option>
        <option value="cancelled" ${statusFilter==='cancelled'?'selected':''}>Cancelled</option>
      </select>
    </div>
    <table data-paginate="jobs">
      <thead>
        <tr>
          <th>Job</th>
          <th>Customer</th>
          <th>Service</th>
          <th>Job Date</th>
          <th>Due Date</th>
          ${crewRestricted?'':`<th>Amount</th><th>Paid</th><th>Outstanding</th>`}
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${filteredJobs.length === 0 ? tableEmpty(crewRestricted?6:9, 'No jobs to show', 'Schedule a new job or change the status filter to view more work.', '🧰') : filteredJobs.map(j=>{
          const billing=jobBillingSummary(j);
          const displayStatus=jobDisplayedStatus(j,billing);
          return `
          <tr class="record-row" data-job="${j.id}" data-job-status="${j.status}" tabindex="0" role="link" aria-label="Open job JOB-${j.id}">
            <td><strong>#JOB-${j.id}</strong></td>
            <td><strong>${j.customer}</strong></td>
            <td>${escapeHtml(j.service || '-')}</td>
            <td>${displayDate(j.date)}</td>
            <td>${displayDate(j.due || j.date)}</td>
            ${crewRestricted?'':`<td><strong style="color:#1a7f3d">${money(j.price)}</strong></td><td><strong style="color:#087a45">${money(billing.paid)}</strong></td><td><strong style="color:${billing.outstanding>0?'#ba4a00':'#087a45'}">${money(billing.outstanding)}</strong></td>`}
            <td><span class="status ${displayStatus.cls}">${displayStatus.label}</span></td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  </div>`;
}
function estimates(){
  const estimateQuery=normalizeText(estimateSearchQuery);
  const visibleEstimates=state.estimates.filter(estimate=>{
    const matchesContext=(!estimateServiceFilter || normalizeText(estimate.service)===normalizeText(estimateServiceFilter)) && recordMatchesCustomerFilter(estimate,estimateCustomerFilter);
    const matchesSearch=!estimateQuery || normalizeText([estimate.id,estimate.customer,estimate.service].join(' ')).includes(estimateQuery);
    return matchesContext && matchesSearch && matchesDateRange(estimate.createdDate || estimate.createdAt,estimateDateRange.start,estimateDateRange.end);
  });
  const activeEstimates=estimateListFilter==='all' ? visibleEstimates : visibleEstimates.filter(e=>e.status===estimateListFilter);
  const pending = activeEstimates.filter(e => e.status === 'pending').length;
  const approved = activeEstimates.filter(e => e.status === 'paid').length;
  const converted = activeEstimates.filter(e => e.status === 'converted').length;
  const rejected = activeEstimates.filter(e => e.status === 'rejected').length;
  const totalValue = activeEstimates.reduce((a,b) => a + b.amount, 0);
  const conversionRate = activeEstimates.length > 0 ? Math.round((converted / activeEstimates.length) * 100) : 0;
  const estimateRows = newestFirst(activeEstimates);

  return `<div class="hero"><div><h2>Estimates</h2><p>Create and track landscaping estimates. Pending: ${pending} | Proceeding: ${approved} | Converted: ${converted} | Total Value: ${money(totalValue)}</p></div><div class="hero-actions">${exportMenu('estimates')}<button class="primary" id="newEstimate">+ New Estimate</button></div></div>
  ${(estimateServiceFilter || estimateCustomerFilter)?`<div class="service-filter-banner"><span>Showing estimates for <strong>${escapeHtml(estimateCustomerFilter ? (customerForFilter(estimateCustomerFilter)?.name || estimateCustomerFilter) : estimateServiceFilter)}</strong></span><button class="secondary compact" id="clearEstimateServiceFilter">Clear filter</button></div>`:''}
  <div class="metric-grid">
    <button class="metric metric-button" data-estimate-filter="pending"><div class="label">Pending Estimates</div><div class="value">${pending}</div><div class="sub">${money(activeEstimates.filter(e=>e.status==='pending').reduce((a,b)=>a+b.amount,0))}</div><div class="bubble">&#9200;</div></button>
    <button class="metric metric-button" data-estimate-filter="paid"><div class="label">Proceeding</div><div class="value">${approved}</div><div class="sub">${money(activeEstimates.filter(e=>e.status==='paid').reduce((a,b)=>a+b.amount,0))}</div><div class="bubble">&#10003;</div></button>
    <button class="metric metric-button" data-estimate-filter="converted"><div class="label">Converted to Jobs</div><div class="value">${converted}</div><div class="sub">${conversionRate}% conversion</div><div class="bubble">&#9650;</div></button>
    <button class="metric metric-button" data-estimate-filter="all"><div class="label">Total Est. Value</div><div class="value">${money(totalValue)}</div><div class="sub">all estimates</div><div class="bubble">&#36;</div></button>
  </div>
  <div class="card table-card">
    <div class="table-tools estimate-table-tools">
      <input class="search" id="estimateSearch" value="${escapeHtml(estimateSearchQuery)}" placeholder="Search estimates...">
      ${dateRangeControls('estimate',estimateDateRange)}
      <select class="secondary" id="estimateFilter">
        <option value="all" ${estimateListFilter==='all'?'selected':''}>All status</option>
        <option value="pending" ${estimateListFilter==='pending'?'selected':''}>Pending</option>
        <option value="followup1" ${estimateListFilter==='followup1'?'selected':''}>Follow Up 1</option>
        <option value="followup2" ${estimateListFilter==='followup2'?'selected':''}>Follow Up 2</option>
        <option value="paid" ${estimateListFilter==='paid'?'selected':''}>Proceeding</option>
        <option value="converted" ${estimateListFilter==='converted'?'selected':''}>Converted to Job</option>
        <option value="rejected" ${estimateListFilter==='rejected'?'selected':''}>Not Proceeding</option>
      </select>
    </div>
    <table data-paginate="estimates">
      <thead>
        <tr>
          <th>Estimate</th>
          <th>Estimate Date</th>
          <th>Customer</th>
          <th>Service</th>
          <th>Amount</th>
          <th>Approved Amount</th>
          <th>Status</th>
          <th>Progress Date</th>
        </tr>
      </thead>
      <tbody id="estimateRows">
        ${estimateRows.length ? estimateRows.map(e=>{
          const approvedAmount=estimateApprovedAmount(e);
          return `
          <tr class="record-row view-estimate-btn" data-estimate="${e.id}" data-estimate-status="${e.status}" tabindex="0" role="link" aria-label="Open estimate ${escapeHtml(e.id)}">
            <td><strong>${e.id}</strong></td>
            <td><span class="estimate-date">${displayDate(estimateCreatedDate(e))}</span></td>
            <td>${e.customer}</td>
            <td>${e.service}</td>
            <td><strong style="color:#1a7f3d">${money(e.amount)}</strong></td>
            <td><strong style="color:#087a45">${money(approvedAmount)}</strong></td>
            <td><span class="status ${e.status}">${estimateStatusLabel(e.status)}</span>${convertedJobForEstimate(e) ? `<div class="muted" style="font-size:12px;margin-top:5px">#JOB-${convertedJobForEstimate(e).id}</div>` : ''}</td>
            <td><span class="estimate-date">${estimateStatusDate(e)}</span></td>
          </tr>
        `}).join('') : tableEmpty(8, 'No estimates to show', 'Create an estimate to start tracking quotes, approvals and conversions.', '🧾')}
      </tbody>
    </table>
  </div>`;
}
function invoiceRows(invoicesToRender){
  if(!invoicesToRender.length) return tableEmpty(9, 'No invoices to show', 'Create an invoice from a completed job or add a new invoice manually.', '💵');
  return newestFirst(invoicesToRender).map(i=>{
    const paymentStatus = invoicePaymentStatus(i);
    const displayStatus = invoiceDisplayStatus(i);
    const due = dueInfo(i);
    const paidAmount = invoicePaidAmount(i);
    const dueAmount = invoiceDueAmount(i);
    const totalAmount = invoiceTotal(i);
    return `<tr style="cursor:pointer" data-invoice="${i.id}" data-invoice-status="${paymentStatus}" data-invoice-due="${due.cls || ''}">
      <td><strong>${i.id}</strong></td>
      <td>${escapeHtml(i.customer || '-')}</td>
      <td>${displayDate(i.invoiced)}</td>
      <td>${displayDate(i.due)}${due.label ? `<div><span class="status ${due.cls}" style="margin-top:5px">${due.label}</span></div>` : ''}</td>
      <td><strong>${money(totalAmount)}</strong></td>
      <td class="invoice-paid-value"><strong>${money(paidAmount)}</strong></td>
      <td class="invoice-due-value"><strong>${money(dueAmount)}</strong></td>
      <td><span class="status ${displayStatus}">${invoiceStatusLabel(displayStatus)}</span></td>
      <td>${displayDate(i.paid)}</td>
    </tr>`;
  }).join('');
}
function invoices(){
  const invoiceQuery=normalizeText(invoiceSearchQuery);
  const totalInvoices = state.invoices.length;
  const paidInvoices = state.invoices.filter(i=>invoicePaymentStatus(i)==='paid');
  const partialInvoices = state.invoices.filter(i=>invoicePaymentStatus(i)==='partial');
  const openInvoices = state.invoices.filter(i=>invoiceDueAmount(i)>0 && invoicePaymentStatus(i)!=='cancelled');
  const overdueInvoices = state.invoices.filter(i=>invoiceDisplayStatus(i) === 'overdue');
  const totalValue = state.invoices.reduce((a,b)=>a + invoiceTotal(b), 0);
  const paidValue = state.invoices.reduce((a,b)=>a + invoicePaidAmount(b), 0);
  const dueValue = state.invoices.reduce((a,b)=>a + invoiceDueAmount(b), 0);
  const partialDueValue = partialInvoices.reduce((a,b)=>a + invoiceDueAmount(b), 0);
  const overdueValue = overdueInvoices.reduce((a,b)=>a + invoiceDueAmount(b), 0);
  const collectionRate = totalValue > 0 ? Math.round((paidValue / totalValue) * 100) : 0;
  const hasDrilldown=Boolean(invoiceDrilldown.service || invoiceDrilldown.start || invoiceDrilldown.end || invoiceDrilldown.aging);
  const agingMatches=(invoice,key)=>{
    const days=invoiceOverdueDays(invoice);
    if(key==='1-30') return days>=1 && days<=30;
    if(key==='31-60') return days>=31 && days<=60;
    if(key==='61-90') return days>=61 && days<=90;
    if(key==='90+') return days>=91;
    return true;
  };
  const visibleInvoices = newestFirst(state.invoices.filter(i => {
    const due = dueInfo(i);
    const paymentStatus = invoicePaymentStatus(i);
    const displayStatus = invoiceDisplayStatus(i);
    const statusMatches=invoiceListFilter === 'all' ||
      paymentStatus === invoiceListFilter ||
      displayStatus === invoiceListFilter ||
      (invoiceListFilter === 'open' && invoiceDueAmount(i) > 0 && paymentStatus !== 'cancelled') ||
      (invoiceListFilter === 'overdue' && (displayStatus === 'overdue' || due.cls === 'overdue'));
    const invoiceDate=invoiceBusinessDate(i);
    const startsAfter=!invoiceDrilldown.start || (invoiceDate && invoiceDate>=parseBusinessDate(invoiceDrilldown.start));
    const endsBefore=!invoiceDrilldown.end || (invoiceDate && invoiceDate<=new Date(`${invoiceDrilldown.end}T23:59:59`));
    const serviceMatches=!invoiceDrilldown.service || invoiceIncludesService(i,invoiceDrilldown.service);
    const searchMatches=!invoiceQuery || normalizeText([i.id,i.customer,invoiceServiceName(i)].join(' ')).includes(invoiceQuery);
    return statusMatches && startsAfter && endsBefore && serviceMatches && agingMatches(i,invoiceDrilldown.aging) && recordMatchesCustomerFilter(i,invoiceCustomerFilter) && searchMatches;
  }));
  const filteredTotalInvoices=visibleInvoices.length;
  const filteredPaidInvoices=visibleInvoices.filter(i=>invoicePaymentStatus(i)==='paid');
  const filteredPartialInvoices=visibleInvoices.filter(i=>invoicePaymentStatus(i)==='partial');
  const filteredOpenInvoices=visibleInvoices.filter(i=>invoiceDueAmount(i)>0 && invoicePaymentStatus(i)!=='cancelled');
  const filteredOverdueInvoices=visibleInvoices.filter(i=>invoiceDisplayStatus(i)==='overdue');
  const filteredTotalValue=visibleInvoices.reduce((sum,invoice)=>sum+invoiceTotal(invoice),0);
  const filteredPaidValue=visibleInvoices.reduce((sum,invoice)=>sum+invoicePaidAmount(invoice),0);
  const filteredDueValue=visibleInvoices.reduce((sum,invoice)=>sum+invoiceDueAmount(invoice),0);
  const filteredPartialDueValue=filteredPartialInvoices.reduce((sum,invoice)=>sum+invoiceDueAmount(invoice),0);
  const filteredOverdueValue=filteredOverdueInvoices.reduce((sum,invoice)=>sum+invoiceDueAmount(invoice),0);
  const filteredCollectionRate=filteredTotalValue>0 ? Math.round((filteredPaidValue/filteredTotalValue)*100) : 0;
  return `<div class="hero"><div><h2>Invoices</h2><p>Track billing and payment status.</p></div><div class="hero-actions">${exportMenu('invoices')}<button class="primary" id="newInvoice">+ New Invoice</button></div></div>
  <div class="metric-grid invoice-metric-grid">
    <button class="metric metric-button" data-invoice-filter="all"><div class="label">Total Billed</div><div class="value">${money(filteredTotalValue)}</div><div class="sub">${filteredTotalInvoices} invoices</div><div class="bubble">&#9638;</div></button>
    <button class="metric metric-button" data-invoice-filter="paid"><div class="label">Paid Amount</div><div class="value">${money(filteredPaidValue)}</div><div class="sub">${filteredPaidInvoices.length} fully paid</div><div class="bubble">&#10003;</div></button>
    <button class="metric metric-button" data-invoice-filter="open"><div class="label">Due Amount</div><div class="value">${money(filteredDueValue)}</div><div class="sub">${filteredOpenInvoices.length} open invoices</div><div class="bubble">&#9200;</div></button>
    <button class="metric metric-button" data-invoice-filter="partial"><div class="label">Partially Paid</div><div class="value">${filteredPartialInvoices.length}</div><div class="sub">${money(filteredPartialDueValue)} still due</div><div class="bubble">%</div></button>
    <button class="metric metric-button" data-invoice-filter="overdue"><div class="label">Overdue</div><div class="value">${filteredOverdueInvoices.length}</div><div class="sub">${money(filteredOverdueValue)} past due</div><div class="bubble">!</div></button>
    <button class="metric metric-button" data-invoice-filter="paid"><div class="label">Collection Rate</div><div class="value">${filteredCollectionRate}%</div><div class="sub">payment success</div><div class="bubble">&#9650;</div></button>
  </div>
  <div class="card table-card">
    ${(hasDrilldown || invoiceCustomerFilter) ? `<div class="invoice-drilldown-banner"><div><strong>${invoiceCustomerFilter?'Customer filter applied':'Report filter applied'}</strong><span>${escapeHtml(invoiceCustomerFilter ? (customerForFilter(invoiceCustomerFilter)?.name || invoiceCustomerFilter) : (invoiceDrilldown.service || invoiceDrilldown.aging || (invoiceDrilldown.start ? `${displayDate(invoiceDrilldown.start)} – ${displayDate(invoiceDrilldown.end)}` : invoiceStatusLabel(invoiceListFilter))))}</span></div><button type="button" class="secondary" id="clearInvoiceDrilldown">Clear filter</button></div>` : ''}
    <div class="table-tools">
      <input class="search" id="invoiceSearch" value="${escapeHtml(invoiceSearchQuery)}" placeholder="Search invoices by customer or ID...">
      ${dateRangeControls('invoice',{start:invoiceDrilldown.start,end:invoiceDrilldown.end})}
      <select class="secondary" id="invoiceStatusFilter">
        <option value="all" ${invoiceListFilter==='all'?'selected':''}>All status</option>
        <option value="draft" ${invoiceListFilter==='draft'?'selected':''}>Draft</option>
        <option value="sent" ${invoiceListFilter==='sent'?'selected':''}>Sent</option>
        <option value="pending" ${invoiceListFilter==='pending'?'selected':''}>Pending</option>
        <option value="unpaid" ${invoiceListFilter==='unpaid'?'selected':''}>Unpaid</option>
        <option value="open" ${invoiceListFilter==='open'?'selected':''}>Open</option>
        <option value="partial" ${invoiceListFilter==='partial'?'selected':''}>Partially Paid</option>
        <option value="overdue" ${invoiceListFilter==='overdue'?'selected':''}>Overdue</option>
        <option value="paid" ${invoiceListFilter==='paid'?'selected':''}>Paid</option>
        <option value="cancelled" ${invoiceListFilter==='cancelled'?'selected':''}>Cancelled</option>
      </select>
    </div>
    <table data-paginate="invoices">
      <thead><tr><th>Invoice</th><th>Customer</th><th>Invoiced Date</th><th>Due Date</th><th>Total Amount</th><th>Paid Amount</th><th>Due Amount</th><th>Status</th><th>Paid Date</th></tr></thead>
      <tbody id="invoiceRows">
        ${invoiceRows(visibleInvoices)}
      </tbody>
    </table>
  </div>`;
}

function invoiceDetail(){
  if(!selectedInvoice) return invoices();
  const invoice = state.invoices.find(i => i.id === selectedInvoice);
  if(!invoice) return invoices();

  const relatedJob = invoice.jobId ? state.jobs.find(j => j.id === invoice.jobId) : null;
  const paidAmount = invoicePaidAmount(invoice);
  const dueAmount = invoiceDueAmount(invoice);
  const displayStatus = invoiceDisplayStatus(invoice);
  const totalAmount = invoiceTotal(invoice);
  const payments = newestFirst(invoicePaymentRecords(invoice));
  const paymentDate = payments.find(payment=>payment.date)?.date || invoice.paid || '';
  const lineItems = invoiceLineItems(invoice);
  const subtotal = invoiceSubtotal(invoice);
  const taxAmount = invoiceTaxAmount(invoice);
  const invoiceServiceNames=[...new Set(lineItems.map(item=>String(item.description || '').trim()).filter(Boolean))];
  const paymentJobNumbers = [...new Set(
    [invoice.jobId, ...lineItems.map(item=>item.jobId)]
      .filter(Boolean)
      .map(displayJobNumber)
      .filter(Boolean)
  )];
  const paymentJobLabel = paymentJobNumbers.length
    ? paymentJobNumbers.map(number=>`#${number}`).join(', ')
    : '-';

  return `<div class="hero">
    <div>
      <button class="link-btn" id="backToInvoices">&larr; Back to Invoices</button>
      <h2>${invoice.id}</h2>
      <p>${invoice.customer} &middot; Due: ${displayDate(invoice.due)}</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${dueAmount > 0 && displayStatus !== 'cancelled' ? `<button class="primary" id="addPayment">+ Add Payment</button>` : ''}
      <button class="primary" id="emailInvoice">Send Invoice PDF</button>
      <button class="secondary" id="exportInvoicePdf">Export PDF</button>
      <button class="secondary" id="editInvoice" style="background:#007bff;color:white">Edit</button>
      <button class="secondary" id="deleteInvoice" style="background:#dc3545;color:white">Delete</button>
    </div>
  </div>

  <div class="dashboard-grid">
    <div class="card section-card">
      <div class="section-head"><h3>Invoice Details</h3></div>
      <div class="detail-list">
        <div class="detail-item">
          <span class="muted">Invoice #</span>
          <strong>${invoice.id}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Customer</span>
          <strong>${invoice.customer}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Project Name</span>
          <strong>${escapeHtml(invoice.projectName || relatedJob?.service || '-')}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Service</span>
          <strong class="invoice-service-list">${invoiceServiceNames.length
            ? invoiceServiceNames.map(service=>`<span class="invoice-service-chip">${escapeHtml(service)}</span>`).join('')
            : `<span>${escapeHtml(invoice.service || relatedJob?.service || '-')}</span>`}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Total Amount</span>
          <strong style="font-size:18px;color:#1a7f3d">${money(totalAmount)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Paid Amount</span>
          <strong>${money(paidAmount)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Due Amount</span>
          <strong style="color:${dueAmount > 0 ? '#dc3545' : '#1a7f3d'}">${money(dueAmount)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Invoiced Date</span>
          <strong>${displayDate(invoice.invoiced)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Due Date</span>
          <strong>${displayDate(invoice.due)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Created Date</span>
          <strong>${displayDate(invoice.createdAt || invoice.invoiced)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Created By</span>
          <strong>${escapeHtml(recordCreatedBy(invoice))}</strong>
        </div>
      </div>
    </div>

    <div class="card section-card">
      <div class="section-head"><h3>Status & Payment</h3></div>
      <div class="detail-list">
        <div class="detail-item" style="position:relative">
          <span class="muted">Status</span>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="status ${displayStatus}" style="cursor:pointer" id="statusBadge2">${invoiceStatusLabel(displayStatus)}</span>
            <div id="statusDropdown2" class="status-dropdown" style="display:none;min-width:150px">
              <div class="status-option" data-status="draft">
                <span>&#9998;</span>
                <span>Draft</span>
              </div>
              <div class="status-option" data-status="sent">
                <span>&#9993;</span>
                <span>Sent</span>
              </div>
              <div class="status-option" data-status="unpaid">
                <span>&#9200;</span>
                <span>Unpaid</span>
              </div>
              <div class="status-option" data-status="cancelled">
                <span>&#10005;</span>
                <span>Cancelled</span>
              </div>
            </div>
          </div>
        </div>
        <div class="detail-item">
          <span class="muted">Amount Due</span>
          <strong style="color:#dc3545">${money(dueAmount)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Amount Paid</span>
          <strong>${money(paidAmount)}</strong>
        </div>
        <div class="detail-item">
          <span class="muted">Payment Date</span>
          <strong>${paymentDate ? displayDate(paymentDate) : 'Not recorded'}</strong>
        </div>
      </div>
    </div>
    <div class="card section-card invoice-breakdown-card invoice-detail-breakdown-card" id="invoiceBillingBreakdown">
      <div class="section-head"><h3>Invoice Summary</h3></div>
      <div class="invoice-breakdown-table-wrap invoice-detail-line-items">
        <table class="invoice-breakdown-table">
          <thead><tr><th>Job No.</th><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total Amount</th></tr></thead>
          <tbody>
            ${invoiceLinePaymentAllocations(invoice).map(item=>`<tr><td>${item.jobId ? `<button type="button" class="billing-job-link" data-job="${escapeHtml(normalizeJobNumber(item.jobId))}" aria-label="Open ${escapeHtml(displayJobNumber(item.jobId))}">${escapeHtml(displayJobNumber(item.jobId))}</button>` : '<strong>-</strong>'}</td><td>${escapeHtml(item.description || '-')}</td><td>${Number(item.quantity || 0)}</td><td>${money(item.rate)}</td><td class="invoice-line-total"><strong>${money(item.subtotal)}</strong></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="invoice-totals">
        <div><span>Subtotal Amount</span><strong>${money(subtotal)}</strong></div>
        <div class="invoice-tax-line"><span>Tax (${Number(Number(invoice.taxRate || 0).toFixed(2))}%)</span><strong>${money(taxAmount)}</strong></div>
        <div class="invoice-summary-total"><span>Total Amount</span><strong>${money(totalAmount)}</strong></div>
        <div class="invoice-summary-paid"><span>Amount Paid</span><strong>${money(paidAmount)}</strong></div>
        <div class="invoice-total-line ${dueAmount>0?'has-balance':'is-settled'}"><span>Balance Due</span><strong class="invoice-due-value">${money(dueAmount)}</strong></div>
      </div>
    </div>
  </div>

  <div class="card table-card invoice-payment-history">
    <div class="section-head">
      <div><h3>Payment History</h3><p class="muted">${payments.length} payment${payments.length===1?'':'s'} recorded</p></div>
      ${displayStatus === 'cancelled'
        ? `<span class="status cancelled">Cancelled</span>`
        : dueAmount > 0
          ? `<button class="primary" id="addPaymentHistory">+ Add Payment</button>`
          : `<span class="status paid">Paid in Full</span>`}
    </div>
      <table>
      <thead><tr><th>Payment</th><th>Job No.</th><th>Payment Date</th><th>Method</th><th>Reference / Check #</th><th>Amount</th><th>Notes</th><th class="actions-col">Actions</th></tr></thead>
      <tbody>
        ${payments.length ? payments.map((payment, index) => `
          <tr>
            <td><strong>#${payments.length - index}</strong></td>
            <td class="payment-job-number">${escapeHtml(paymentJobLabel)}</td>
            <td>${displayDate(payment.date)}</td>
            <td><span class="status ${normalizeText(payment.method)==='cash'?'paid':'scheduled'}">${escapeHtml(payment.method || 'Other')}</span></td>
            <td>${escapeHtml(payment.reference || '-')}</td>
            <td><strong style="color:#1a7f3d">${money(payment.amount)}</strong></td>
            <td>${escapeHtml(payment.notes || '-')}</td>
            <td class="table-actions"><div class="action-group">
              <button class="action-btn view" data-payment-receipt="${escapeHtml(payment.id)}">Receipt</button>
              <button class="action-btn edit" data-edit-payment="${escapeHtml(payment.id)}">Edit</button>
              <button class="action-btn delete" data-delete-payment="${escapeHtml(payment.id)}">Delete</button>
            </div></td>
          </tr>
        `).join('') : tableEmpty(8, 'No payments recorded', 'Use Add Payment to record a cash, check, card, or bank-transfer payment.', '💵')}
      </tbody>
    </table>
  </div>
  <div class="card section-card record-activity-card"><div class="section-head"><h3>Activity History</h3></div>${auditTrail(invoice)}</div>`;
}
function simpleTable(title,sub,button,btnId,headers,rows){ return `<div class="hero"><div><h2>${title}</h2><p>${sub}</p></div><button class="primary" id="${btnId}">${button}</button></div><div class="card table-card"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function crew(){
  const totalCrew = state.crew.length;
  const activeCrew = state.crew.filter(c=>isCrewActive(c)).length;
  const inactiveCrew = state.crew.filter(c=>isCrewInactive(c)).length;
  const working = state.crew.filter(c=>isCrewActive(c) && isCrewWorkingToday(c)).length;
  const assignedCrew = state.crew.filter(c => isCrewActive(c) && state.jobs.some(j => normalizeText(j.crew) === normalizeText(c.name))).length;
  const visibleCrew = newestFirst(state.crew.filter(c => {
    const active = isCrewActive(c);
    const inactive = isCrewInactive(c);
    const workingToday = active && isCrewWorkingToday(c);
    const hasJobs = state.jobs.some(j => normalizeText(j.crew) === normalizeText(c.name));
    const matchesSearch=!crewSearchQuery || normalizeText([c.name,c.role,c.email,c.phone,c.address,c.skills].join(' ')).includes(normalizeText(crewSearchQuery));
    return matchesSearch && (crewListFilter === 'all' ||
      (crewListFilter === 'active' && active) ||
      (crewListFilter === 'inactive' && inactive) ||
      (crewListFilter === 'working' && workingToday) ||
      (crewListFilter === 'assigned' && active && hasJobs));
  }));
  return `
    <div class="hero"><div><h2>Crew Members</h2><p>${activeCrew} active members, ${inactiveCrew} inactive members, and ${working} working today.</p></div><div class="hero-actions">${exportMenu('crew')}<button class="primary" id="addMember">+ Add Member</button></div></div>
    <div class="metric-grid">
      <button class="metric metric-button" data-crew-filter="all"><div class="label">Total Crew</div><div class="value">${totalCrew}</div><div class="sub">all team records</div><div class="bubble">&#128101;</div></button>
      <button class="metric metric-button" data-crew-filter="active"><div class="label">Active Crew</div><div class="value">${activeCrew}</div><div class="sub">currently employed</div><div class="bubble">&#10003;</div></button>
      <button class="metric metric-button" data-crew-filter="inactive"><div class="label">Inactive Crew</div><div class="value">${inactiveCrew}</div><div class="sub">left organization</div><div class="bubble">&#9200;</div></button>
      <button class="metric metric-button" data-crew-filter="working"><div class="label">Working Today</div><div class="value">${working}</div><div class="sub">scheduled today</div><div class="bubble">&#9654;</div></button>
      <button class="metric metric-button" data-crew-filter="assigned"><div class="label">Assigned Crew</div><div class="value">${assignedCrew}</div><div class="sub">active crew with jobs</div><div class="bubble">&#9635;</div></button>
    </div>
    <div class="card crew-management-tools"><div class="crew-tools-copy"><strong>Crew directory</strong><span>Search team members or review their work status.</span></div><div class="crew-tools-controls"><input class="search" id="crewSearch" value="${escapeHtml(crewSearchQuery)}" placeholder="Search crew by name, role, email, or phone..."><select id="crewQuickFilter"><option value="all" ${crewListFilter==='all'?'selected':''}>All crew</option><option value="active" ${crewListFilter==='active'?'selected':''}>Active</option><option value="inactive" ${crewListFilter==='inactive'?'selected':''}>Inactive</option><option value="working" ${crewListFilter==='working'?'selected':''}>Working today</option><option value="assigned" ${crewListFilter==='assigned'?'selected':''}>Assigned jobs</option></select></div></div>
    <div class="crew-cards">
      ${visibleCrew.length ? visibleCrew.map((c)=>`
        ${(()=>{ const index = state.crew.indexOf(c); const active = isCrewActive(c); const todayCount = active ? jobsForCrewToday(c).length : 0; const hasJobs = state.jobs.some(j => normalizeText(j.crew) === normalizeText(c.name)); return `
        <div class="card crew-member-card crew-clickable" data-crew-detail="${index}" data-crew-working-today="${todayCount ? 'yes' : 'no'}" data-crew-has-jobs="${hasJobs ? 'yes' : 'no'}" title="Open ${escapeHtml(c.name)} profile">
          <div class="cmc-avatar">${c.name.split(' ').map(x=>x[0]).join('')}</div>
          <div class="cmc-info">
            <strong>${c.name}</strong>
            <span class="muted">${c.role || 'Crew Member'} · ${active ? 'Active' : 'Inactive'}</span>
            <span class="crew-contact-line">${escapeHtml(c.email || 'Email not added')} · ${escapeHtml(c.phone || 'Phone not added')}</span>
            <span class="crew-contact-line">Created by ${escapeHtml(recordCreatedBy(c))} · ${displayDate(c.createdDate || c.createdAt)}</span>
          </div>
          <div class="crew-card-summary" aria-label="${escapeHtml(c.name)} work summary">
            <span><strong>${state.jobs.filter(job=>isCrewAssignedToJob(job,c.name)).length}</strong> Assigned</span>
            <span><strong>${state.jobs.filter(job=>isCrewAssignedToJob(job,c.name) && job.status==='scheduled').length}</strong> Scheduled</span>
            <span><strong>${state.jobs.filter(job=>isCrewAssignedToJob(job,c.name) && job.status==='progress').length}</strong> In Progress</span>
            <span><strong>${state.jobs.filter(job=>isCrewAssignedToJob(job,c.name) && ['completed','invoiced'].includes(job.status)).length}</strong> Completed</span>
          </div>
          <div class="cmc-right">
            <span class="muted">${active ? `${todayCount} job${todayCount!==1?'s':''} today` : 'left organization'}</span>
            <div class="action-group crew-actions">
              <button class="action-btn view" data-crew-detail="${index}">View</button>
              <button class="action-btn edit" data-edit-crew="${index}">Edit</button>
              <button class="action-btn delete" data-delete-crew="${index}">Delete</button>
            </div>
          </div>
        </div>`; })()}
      `).join('') : emptyState('No crew members to show', 'Add a crew member or change the crew filter to see more team records.', '👷')}
    </div>`;
}
function crewDetail(){
  const rawCrew = state.crew[selectedCrewIndex] || state.crew[0];
  if(!rawCrew){
    return `<div class="hero"><div><button class="link-btn" data-view="crew">← Back to Crew</button><h2>Crew Profile</h2><p>No crew member selected.</p></div></div>`;
  }
  const index = state.crew.indexOf(rawCrew);
  const crew = mergedCrewDetails(rawCrew);
  const crewName = normalizeText(crew.name);
  const crewJobs = newestFirst(uniqueScheduleJobs(state.jobs).filter(j => isCrewAssignedToJob(j,crewName)));
  const todayJobs = crewJobs.filter(j => j.date === todayISO());
  const completedJobs = crewJobs.filter(j => j.status === 'completed' || j.status === 'invoiced');
  const scheduledJobs = crewJobs.filter(j => j.status === 'scheduled');
  const active = isCrewActive(crew);
  const nextJob = crewJobs.find(j => ['scheduled','progress'].includes(j.status)) || crewJobs[0];
  const jobValue = crewJobs.reduce((sum, job) => sum + Number(job.price || 0), 0);
  const crewAccount=getUsers().find(user=>userRole(user)==='crew' && (normalizeText(user.email)===normalizeText(crew.email) || normalizeText(user.name)===crewName));
  return `
    <div class="crew-detail-page">
      <div class="crew-detail-top">
        <div>
          <button class="link-btn" data-view="crew">← Back to Crew</button>
          <h2>${escapeHtml(crew.name)}</h2>
          <p>${escapeHtml(crew.role || 'Crew Member')} · ${active ? 'Active' : 'Inactive'}</p>
        </div>
        <div class="hero-actions"><button class="secondary" id="exportCrewMemberPdf">Export PDF</button><button class="primary" data-edit-crew="${index}">Edit Crew Details</button><button class="secondary danger-btn" data-delete-crew="${index}">Delete Crew</button></div>
      </div>
      <div class="metric-grid crew-detail-metric-grid">
        <button type="button" class="metric metric-button" data-crew-detail-job-filter="all" data-crew-name="${escapeHtml(crew.name)}"><div class="label">Assigned Jobs</div><div class="value">${crewJobs.length}</div><div class="sub">all jobs assigned</div><div class="bubble">&#9635;</div></button>
        <button type="button" class="metric metric-button" data-crew-detail-job-filter="today" data-crew-name="${escapeHtml(crew.name)}"><div class="label">Working Today</div><div class="value">${todayJobs.length}</div><div class="sub">jobs scheduled today</div><div class="bubble">&#9654;</div></button>
        <button type="button" class="metric metric-button" data-crew-detail-job-filter="scheduled" data-crew-name="${escapeHtml(crew.name)}"><div class="label">Scheduled</div><div class="value">${scheduledJobs.length}</div><div class="sub">upcoming work</div><div class="bubble">&#9200;</div></button>
        <button type="button" class="metric metric-button" data-crew-detail-job-filter="completed" data-crew-name="${escapeHtml(crew.name)}"><div class="label">Completed</div><div class="value">${completedJobs.length}</div><div class="sub">finished jobs</div><div class="bubble">&#10003;</div></button>
        <button type="button" class="metric metric-button" data-crew-detail-job-filter="all" data-crew-name="${escapeHtml(crew.name)}"><div class="label">Job Value</div><div class="value">${money(jobValue)}</div><div class="sub">view assigned jobs</div><div class="bubble">&#36;</div></button>
      </div>
      <div class="crew-profile-grid">
        <div class="card crew-info-card">
          <h3>Contact Details</h3>
          <div class="profile-info-list">
            <div><span>Email</span><strong>${escapeHtml(crew.email || 'Not added')}</strong></div>
            <div><span>Phone</span>${phoneContactControls(crew.phone,crew.name)}</div>
            <div><span>Address</span><strong>${escapeHtml(crew.address || 'Not added')}</strong></div>
            <div><span>Emergency Contact</span><strong>${escapeHtml(crew.emergencyContact || 'Not added')}</strong></div>
          </div>
        </div>
        <div class="card crew-info-card">
          <h3>Work Details</h3>
          <div class="profile-info-list">
            <div><span>Role</span><strong>${escapeHtml(crew.role || 'Crew Member')}</strong></div>
            <div><span>Status</span><strong>${escapeHtml(active ? 'Active' : 'Inactive')}</strong></div>
            <div><span>Skills</span><strong>${escapeHtml(crew.skills || 'Not added')}</strong></div>
            <div><span>Availability</span><strong>${escapeHtml(crew.availability || '8 AM - 6 PM')}</strong></div>
          </div>
        </div>
        <div class="card crew-info-card">
          <h3>Account & Access</h3>
          <div class="profile-info-list">
            <div><span>Login Account</span><strong>${crewAccount ? 'Created' : 'Not created'}</strong></div>
            <div><span>Account Status</span><strong>${crewAccount?.employmentStatus === 'Inactive' ? 'Inactive' : crewAccount ? 'Active' : '—'}</strong></div>
            <div><span>Login Email</span><strong>${escapeHtml(crewAccount?.email || crew.email || 'Not added')}</strong></div>
            <div><span>Created Date</span><strong>${displayDate(crew.createdDate || crew.createdAt)}</strong></div>
            <div><span>Created By</span><strong>${escapeHtml(recordCreatedBy(crew))}</strong></div>
            <div><span>Profile Updated</span><strong>${displayDate(crew.updatedAt || crew.createdAt || '')}</strong></div>
          </div>
        </div>
        <div class="card crew-info-card">
          <h3>Next / Latest Job</h3>
          ${nextJob ? `<div class="profile-next-job"><strong>#JOB-${nextJob.id} · ${escapeHtml(nextJob.service)}</strong><span>${escapeHtml(nextJob.customer)} · ${displayDate(nextJob.date)} · ${escapeHtml(nextJob.time)}</span><span>${escapeHtml(nextJob.address || 'No address added')}</span><button class="secondary small-action" data-job="${nextJob.id}">View Job</button></div>` : '<p class="muted">No jobs assigned yet.</p>'}
        </div>
        <div class="card crew-info-card">
          <h3>Profile Notes</h3>
          <p class="profile-note">${escapeHtml(crew.profileNotes || 'No notes added yet.')}</p>
        </div>
      </div>
      <div class="card section-card">
        <div class="section-head"><h3>Assigned Job History</h3></div>
        ${crewJobs.length ? `<div class="crew-detail-job-list">${crewJobs.map(job=>`
          <button class="crew-detail-job-row" data-job="${job.id}">
            <span><strong>#JOB-${job.id}</strong><small>${escapeHtml(job.service)} · ${escapeHtml(job.customer)}</small></span>
            <span>${displayDate(job.date)} · ${escapeHtml(job.time)}</span>
            <span class="status ${job.status || 'scheduled'}">${job.status === 'progress' ? 'In Progress' : cap(job.status || 'scheduled')}</span>
          </button>
        `).join('')}</div>` : emptyState('No assigned jobs yet', 'Jobs assigned to this crew member will appear here.', '🧰')}
      </div>
    </div>`;
}
function reports(){
  const {start:rangeStart,end:rangeEnd}=reportDateBounds();
  const filteredInvoices=state.invoices.filter(invoiceMatchesReportRange);
  // Job Value matches the Jobs page: include every job in the selected date
  // range. A job can be assigned to multiple crew members, but its amount
  // must be counted once.
  const reportJobsById=new Map();
  state.jobs.filter(job=>job.date && recordMatchesReportRange(job.date)).forEach(job=>{
    // Jobs may be stored in older formats (1038, JOB-1038, or #JOB-1038).
    // They are one job, even when multiple crew assignments exist.
    const key=normalizeJobNumber(job.id);
    if(!key) return;
    const existing=reportJobsById.get(key);
    const currentTimestamp=reportRecordTimestamp(job);
    const existingTimestamp=reportRecordTimestamp(existing);
    if(!existing || currentTimestamp>existingTimestamp ||
      (currentTimestamp===existingTimestamp && reportJobAmount(job.price)>reportJobAmount(existing.price))){
      reportJobsById.set(key,job);
    }
  });
  const filteredJobs=[...reportJobsById.values()];
  const filteredEstimates=state.estimates.filter(estimate=>recordMatchesReportRange(estimate.createdDate || estimate.createdAt));
  const activeInvoices=filteredInvoices.filter(invoice=>invoicePaymentStatus(invoice)!=='cancelled');
  const paymentRows=state.invoices.filter(invoice=>invoicePaymentStatus(invoice)!=='cancelled').flatMap(invoice=>{
    const payments=invoicePaymentRecords(invoice);
    if(payments.length) return payments.map(payment=>({
      invoice,
      payment,
      date:payment.date || invoice.paid || invoice.invoiced || '',
      amount:Number(payment.amount || 0)
    }));
    const amount=invoicePaidAmount(invoice);
    return amount>0 ? [{invoice,payment:{method:'Recorded payment'},date:invoice.paid || invoice.invoiced || '',amount}] : [];
  }).filter(row=>row.amount>0 && recordMatchesReportRange(row.date)).sort((a,b)=>(parseBusinessDate(b.date)?.getTime() || 0)-(parseBusinessDate(a.date)?.getTime() || 0));
  const totalRevenue = activeInvoices.reduce((a,b)=>a+invoiceTotal(b),0);
  const paidRevenue = paymentRows.reduce((sum,row)=>sum+row.amount,0);
  const unpaidRevenue = activeInvoices.reduce((a,b)=>a+invoiceDueAmount(b),0);
  const completedJobs = filteredJobs.filter(j=>j.status==='completed'||j.status==='invoiced').length;
  const totalJobs = filteredJobs.length;
  // Report the total value of jobs in the selected period, rather than an
  // average. For "This Week" this is the total job amount for that week.
  const totalJobValue = filteredJobs.reduce((sum,job)=>sum+reportJobAmount(job.price),0);
  const uniqueCustomers = new Set([...filteredJobs.map(j=>j.customer),...filteredInvoices.map(i=>i.customer)].filter(Boolean)).size;
  const rangeLabels={all:'All Time',week:'This Week',month:'This Month',quarter:'Last 3 Months',year:'This Year',custom:'Custom Range'};
  const rangeLabel=rangeLabels[reportRange] || 'This Year';

  const serviceRevenue = revenueByService({invoices:filteredInvoices,fallbackJobs:false});
  const sortedServiceRevenue=Object.entries(serviceRevenue).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const topService = sortedServiceRevenue[0];
  const maxServiceRevenue=Math.max(1,...sortedServiceRevenue.map(([,value])=>value));
  const invoicePeriodPaid=activeInvoices.reduce((sum,invoice)=>sum+invoicePaidAmount(invoice),0);
  const collectionRate=totalRevenue > 0 ? Math.min(100,Math.round((invoicePeriodPaid/totalRevenue)*100)) : 0;
  const reportStart=rangeStart ? toISODate(rangeStart) : '';
  const reportEnd=rangeEnd ? toISODate(rangeEnd) : '';
  const reportMetric=(label,value,sub,icon,target,{status='',service='',jobStatus=''}={})=>`<button type="button" class="metric metric-button report-metric-card" data-report-card="${target}" data-report-start="${reportStart}" data-report-end="${reportEnd}" data-report-status="${status}" data-report-service="${escapeHtml(service)}" data-report-job-status="${jobStatus}" aria-label="View ${escapeHtml(label)} details"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div><div class="bubble">${icon}</div></button>`;

  return `<div class="reports-page"><div class="hero"><div><h2>Reports & Analytics</h2><p>Business performance and financial overview.</p></div><div class="hero-actions">${exportMenu('reports')}</div></div>
  <div class="report-filter-bar" aria-label="Report date range">
    <div class="report-filter-presets">
      ${[['week','This Week'],['month','This Month'],['quarter','Last 3 Months'],['year','This Year'],['all','All Time']].map(([value,label])=>`<button type="button" class="report-filter-button${reportRange===value?' active':''}" data-report-range="${value}">${label}</button>`).join('')}
      <button type="button" class="report-filter-button${reportRange==='custom'?' active':''}" data-report-range="custom">Custom</button>
    </div>
    <div class="report-filter-summary"><span>Showing</span><strong>${rangeLabel}</strong><small>${filteredInvoices.length} invoice${filteredInvoices.length===1?'':'s'}</small></div>
    <div class="report-custom-range${reportRange==='custom'?' visible':''}">
      <label>From<input type="date" id="reportStartDate" value="${escapeHtml(reportCustomStart)}"></label>
      <label>To<input type="date" id="reportEndDate" value="${escapeHtml(reportCustomEnd)}"></label>
    </div>
  </div>
  <div class="metric-grid reports-metric-grid">
    ${reportMetric('Total Revenue',money(totalRevenue),`${rangeLabel} invoices`,'&#36;','invoices')}
    ${reportMetric('Paid Revenue',money(paidRevenue),`Received ${rangeLabel.toLowerCase()}`,'&#10003;','invoices',{status:'paid'})}
    ${reportMetric('Unpaid Revenue',money(unpaidRevenue),`${rangeLabel} invoices`,'!','invoices',{status:'open'})}
    ${reportMetric('Jobs Completed',completedJobs,`of ${totalJobs} total`,'&#10003;','jobs',{jobStatus:'completed'})}
    ${reportMetric('Job Value',money(totalJobValue),`${totalJobs} job${totalJobs===1?'':'s'} · ${rangeLabel.toLowerCase()}`,'&#9635;','jobs')}
    ${reportMetric('Customers',uniqueCustomers,'Customers in this period','&#128101;','customers')}
    ${reportMetric('Top Service',topService ? topService[0] : 'N/A',topService ? money(topService[1]) : '','&#9733;','invoices',{service:topService?.[0] || ''})}
    ${reportMetric('Collection Rate',collectionRate+'%','Payment success','&#9650;','invoices')}
  </div>
  ${reportRange==='week' ? `<div class="card weekly-revenue-details" id="weeklyRevenueDetails">
    <div class="section-head weekly-revenue-head"><div><span class="weekly-revenue-kicker">Payment details</span><h3>Payments Received This Week</h3><p class="muted">${displayDate(rangeStart)} to ${displayDate(rangeEnd)} · Select a payment to open its invoice.</p></div><div class="weekly-revenue-total"><small>Received</small><strong>${money(paidRevenue)}</strong></div></div>
    <div class="weekly-revenue-table-wrap"><table><thead><tr><th>Payment Date</th><th>Invoice</th><th>Customer</th><th>Service</th><th>Method</th><th>Amount</th></tr></thead><tbody>
      ${paymentRows.length ? paymentRows.map(({invoice,payment,date,amount})=>`<tr class="record-row" data-invoice="${escapeHtml(invoice.id)}" tabindex="0" role="link"><td>${displayDate(date)}</td><td><strong>${escapeHtml(invoice.id)}</strong></td><td>${escapeHtml(invoice.customer)}</td><td>${escapeHtml(invoiceServiceName(invoice))}</td><td>${escapeHtml(payment.method || 'Other')}</td><td class="weekly-payment-amount"><strong>${money(amount)}</strong></td></tr>`).join('') : tableEmpty(6,'No revenue received this week','Payments recorded during this seven-day period will appear here.','💵')}
    </tbody></table></div>
  </div>` : ''}
  <div class="reports-analytics-grid">
    <div class="card section-card report-chart-card collection-chart-card">
      <div class="section-head"><div><h3>Invoice Collection</h3><p class="muted report-chart-subtitle">Paid versus outstanding revenue</p></div></div>
      <div class="donut-wrap">
        <div class="donut report-donut" style="--pct:${collectionRate}"><span>${collectionRate}%</span></div>
        <div class="collection-breakdown"><div><i class="paid-dot"></i><span>Paid</span><strong>${money(paidRevenue)}</strong></div><div><i class="unpaid-dot"></i><span>Outstanding</span><strong>${money(unpaidRevenue)}</strong></div></div>
      </div>
    </div>
    <div class="card section-card report-chart-card service-revenue-card">
      <div class="section-head"><div><h3>Service Revenue</h3><p class="muted report-chart-subtitle">Revenue contribution by service</p></div><button class="link-btn" data-view="services">Manage services</button></div>
      ${sortedServiceRevenue.length ? `<div class="service-revenue-bar-chart">
        ${sortedServiceRevenue.map(([name,value],index)=>`<button type="button" class="service-revenue-column report-drilldown" data-report-service="${escapeHtml(name)}" title="View ${escapeHtml(name)} invoices"><strong>${money(value)}</strong><div class="service-revenue-track"><span class="service-bar-${index%4}" style="height:${Math.max(5,Math.round(value/maxServiceRevenue*100))}%"></span></div><small>${escapeHtml(name)}</small></button>`).join('')}
      </div>` : emptyState('No service revenue yet','Create jobs or invoices to populate service revenue.','📊')}
    </div>
  </div>
  <div class="card section-card reports-summary-card"><div class="section-head"><h3>Financial Summary</h3></div>
    <div class="reports-summary-grid">
      <div><span>Total Invoices</span><strong>${filteredInvoices.length}</strong></div>
      <div><span>Paid Invoices</span><strong>${filteredInvoices.filter(i=>invoicePaymentStatus(i)==='paid').length}</strong></div>
      <div><span>Partially Paid</span><strong>${filteredInvoices.filter(i=>invoicePaymentStatus(i)==='partial').length}</strong></div>
      <div><span>Outstanding Invoices</span><strong>${activeInvoices.filter(i=>invoiceDueAmount(i)>0).length}</strong></div>
      <div><span>Pending Estimates</span><strong>${filteredEstimates.filter(e=>e.status==='pending').length}</strong></div>
      <div><span>Approved Estimates</span><strong>${filteredEstimates.filter(e=>e.status==='paid').length}</strong></div>
    </div>
  </div></div>`;
}
function subscriptionPlans(){
  return [
    {
      name: 'Simple Start',
      tagline: 'Build your operations foundation',
      oldPrice: 38,
      price: 19,
      users: '1 user',
      support: 'Basic scheduling and customer tracking',
      features: ['Customer management', 'Job scheduling', 'Basic invoices', 'Mobile crew view']
    },
    {
      name: 'Essentials',
      tagline: 'Save time and manage field work',
      oldPrice: 75,
      price: 37.50,
      users: '3 users',
      support: 'Best for small landscaping teams',
      features: ['Everything in Simple Start', 'Crew assignments', 'Estimates', 'Job status automation']
    },
    {
      name: 'Plus',
      badge: 'Customer Favorite',
      tagline: 'Scale with automated insights',
      oldPrice: 115,
      price: 57.50,
      users: '5 users',
      support: 'For growing operations teams',
      features: ['Everything in Essentials', 'Reports and analytics', 'Payment tracking', 'Priority job workflow']
    },
    {
      name: 'Advanced',
      tagline: 'Run multiple crews professionally',
      oldPrice: 275,
      price: 137.50,
      users: '25 users',
      support: 'Advanced access for office and field teams',
      features: ['Everything in Plus', 'Multi-crew operations', 'Advanced billing', 'Admin and crew permissions']
    }
  ];
}
function subscription(){
  const plans = subscriptionPlans();
  const settings = getSettings();
  return `<div class="subscription-page">
    <div class="subscription-hero">
      <div>
        <span class="subscription-kicker">GreenOps Plans</span>
        <h2>Choose the right plan for your landscaping business</h2>
        <p>Start with a free trial, then upgrade as your customers, jobs, crews, estimates, and invoices grow.</p>
      </div>
      <div class="billing-offer">
        <strong>50% off</strong>
        <span>for 3 months</span>
        <button class="billing-toggle" type="button" aria-label="Billing offer enabled"><span></span></button>
        <span>Free trial for 30 days</span>
      </div>
    </div>
    <div class="pricing-grid">
      ${plans.map(plan => `<article class="pricing-card ${plan.badge ? 'featured' : ''}">
        <div class="pricing-top">
          <div class="pricing-name-row"><h3>${plan.name}</h3>${plan.badge ? `<span>${plan.badge}</span>` : ''}</div>
        </div>
        <div class="pricing-tagline">${plan.tagline}</div>
        <div class="pricing-price">
          <del>$${plan.oldPrice}</del>
          <strong>$${Number.isInteger(plan.price) ? plan.price : plan.price.toFixed(2)}</strong><span>/mo</span>
          <p>50% off for 3 months</p>
        </div>
        <button class="choose-plan" data-plan="${plan.name}">${settings.plan === plan.name ? 'Current plan' : 'Choose plan'}</button>
        <div class="pricing-users"><strong>${plan.users}</strong><span>${plan.support}</span></div>
        <div class="pricing-features">
          <h4>Top features:</h4>
          ${plan.features.map(feature => `<div class="feature-row"><span>&#10003;</span>${feature}</div>`).join('')}
        </div>
      </article>`).join('')}
    </div>
  </div>`;
}
function openSubscriptionCheckout(planName){
  const plan = subscriptionPlans().find(item => item.name === planName) || subscriptionPlans()[0];
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal checkout-modal">
    <div class="checkout-head">
      <div>
        <span class="subscription-kicker">Secure checkout</span>
        <h3>Complete your subscription</h3>
        <p>Choose your GreenOps plan and enter payment details to continue.</p>
      </div>
      <button class="checkout-close" id="cancelModal" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="checkout-layout">
      <aside class="checkout-summary">
        <div class="summary-plan">${plan.name}</div>
        <div class="summary-price"><span>$</span><strong>${Number.isInteger(plan.price) ? plan.price : plan.price.toFixed(2)}</strong><em>/mo</em></div>
        <p>50% off for 3 months, then standard price applies.</p>
        <div class="summary-line"><span>Users</span><strong>${plan.users}</strong></div>
        <div class="summary-line"><span>Trial</span><strong>30 days free</strong></div>
        <div class="summary-line"><span>Today</span><strong>$0.00</strong></div>
        <div class="secure-box">&#128274; Secure payment. You can cancel anytime from Settings.</div>
      </aside>
      <form id="checkoutForm" class="checkout-form">
        <div class="field full"><label>Email for receipt</label><input name="email" type="email" required value="${escapeHtml(currentUser?.email || '')}" placeholder="you@example.com"></div>
        <div class="field full"><label>Name on card</label><input name="cardName" required placeholder="Full name"></div>
        <div class="field full card-number-field"><label>Card number</label><input name="cardNumber" inputmode="numeric" maxlength="19" required placeholder="4242 4242 4242 4242"><span>&#128179;</span></div>
        <div class="field"><label>Expiry</label><input name="expiry" required placeholder="MM/YY" maxlength="5"></div>
        <div class="field"><label>CVC</label><input name="cvc" required placeholder="123" maxlength="4" inputmode="numeric"></div>
        <div class="field"><label>ZIP / Postal code</label><input name="zip" required placeholder="63101"></div>
        <div class="field"><label>Billing country</label><select name="country"><option>United States</option><option>India</option><option>Canada</option><option>United Kingdom</option></select></div>
        <div class="checkout-total">
          <span>Due today</span>
          <strong>$0.00</strong>
        </div>
        <button class="primary checkout-pay" type="submit">Start free trial</button>
        <p class="checkout-note">Demo checkout only. No real card is charged.</p>
      </form>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', e => { if(e.target === wrap) wrap.remove(); });
  wrap.querySelector('#cancelModal').addEventListener('click', () => wrap.remove());
  const cardInput = wrap.querySelector('[name="cardNumber"]');
  cardInput.addEventListener('input', () => {
    const clean = cardInput.value.replace(/\D/g, '').slice(0, 16);
    cardInput.value = clean.replace(/(.{4})/g, '$1 ').trim();
  });
  const expiryInput = wrap.querySelector('[name="expiry"]');
  expiryInput.addEventListener('input', () => {
    const clean = expiryInput.value.replace(/\D/g, '').slice(0, 4);
    expiryInput.value = clean.length > 2 ? `${clean.slice(0,2)}/${clean.slice(2)}` : clean;
  });
  wrap.querySelector('#checkoutForm').addEventListener('submit', e => {
    e.preventDefault();
    state.settings = {...getSettings(), plan: plan.name, planPrice: plan.price, subscriptionStatus: 'Trial'};
    save();
    wrap.remove();
    showToast(`${plan.name} trial started`);
    currentView = 'settings';
    render();
  });
}
function myProfile(){
  const settings=getSettings();
  const profile={...currentUser,...(settings.adminProfile || {})};
  const totalBilled=state.invoices.reduce((sum,invoice)=>sum+invoiceTotal(invoice),0);
  const completedJobs=state.jobs.filter(job=>['completed','invoiced'].includes(job.status)).length;
  return `<div class="hero"><div><h2>My Profile</h2><p>Manage your Admin identity and review workspace ownership details.</p></div><button class="primary" id="editAdminProfile">Edit Profile</button></div>
    <div class="card admin-profile-hero">
      <div class="admin-profile-identity">
        <div class="avatar admin-profile-avatar">${initials(profile.name)}</div>
        <div><span class="profile-role-label">Workspace Admin</span><h2>${escapeHtml(profile.name || 'Admin')}</h2><p>${escapeHtml(profile.title || 'Business Owner / Administrator')}</p></div>
      </div>
      <div class="admin-profile-company"><span>Company</span><strong>${escapeHtml(settings.companyName)}</strong><small>${escapeHtml(settings.address || 'Business address not added')}</small></div>
    </div>
    <div class="metric-grid admin-profile-metrics">
      <button type="button" class="metric metric-button profile-shortcut-card" data-profile-shortcut="customers" aria-label="View customers"><div class="label">Customers</div><div class="value">${state.customers.length}</div><div class="sub">workspace records <span>View customers &rarr;</span></div><div class="bubble">${icons.customers}</div></button>
      <button type="button" class="metric metric-button profile-shortcut-card" data-profile-shortcut="services" aria-label="View active services"><div class="label">Active Services</div><div class="value">${serviceCatalog(true).length}</div><div class="sub">available offerings <span>View services &rarr;</span></div><div class="bubble">${icons.services}</div></button>
      <button type="button" class="metric metric-button profile-shortcut-card" data-profile-shortcut="completedJobs" aria-label="View completed jobs"><div class="label">Completed Jobs</div><div class="value">${completedJobs}</div><div class="sub">completed or invoiced <span>View jobs &rarr;</span></div><div class="bubble">${icons.jobs}</div></button>
      <button type="button" class="metric metric-button profile-shortcut-card" data-profile-shortcut="invoices" aria-label="View invoices"><div class="label">Total Billed</div><div class="value">${money(totalBilled)}</div><div class="sub">${state.invoices.length} invoices <span>View invoices &rarr;</span></div><div class="bubble">${icons.invoices}</div></button>
    </div>
    <div class="admin-profile-grid">
      <div class="card section-card">
        <div class="section-head"><h3>Personal Information</h3></div>
        <div class="detail-list">
          <div class="detail-item"><span class="muted">Full Name</span><strong>${escapeHtml(profile.name || '-')}</strong></div>
          <div class="detail-item"><span class="muted">Email</span><strong>${escapeHtml(profile.email || '-')}</strong></div>
          <div class="detail-item"><span class="muted">Phone</span><strong>${escapeHtml(profile.phone || 'Not added')}</strong></div>
          <div class="detail-item"><span class="muted">Job Title</span><strong>${escapeHtml(profile.title || 'Business Owner / Administrator')}</strong></div>
          <div class="detail-item"><span class="muted">Address</span><strong>${escapeHtml(profile.address || 'Not added')}</strong></div>
          <div class="detail-item"><span class="muted">Timezone</span><strong>${escapeHtml(profile.timezone || 'Local browser time')}</strong></div>
        </div>
      </div>
      <div class="card section-card">
        <div class="section-head"><h3>Account & Workspace</h3></div>
        <div class="detail-list">
          <div class="detail-item"><span class="muted">Role</span><strong>Admin</strong></div>
          <div class="detail-item"><span class="muted">Account Status</span><strong><span class="status progress">Verified & Active</span></strong></div>
          <div class="detail-item"><span class="muted">Workspace Owner</span><strong>${escapeHtml(workspaceOwnerEmail())}</strong></div>
          <div class="detail-item"><span class="muted">Member Since</span><strong>${displayDate(profile.createdAt || Date.now())}</strong></div>
          <div class="detail-item"><span class="muted">Subscription</span><strong>${escapeHtml(settings.plan || 'No plan selected')}</strong></div>
          <div class="detail-item"><span class="muted">Profile Notes</span><strong>${escapeHtml(profile.bio || 'No profile notes added.')}</strong></div>
        </div>
      </div>
    </div>`;
}

function settings(){
  const s=getSettings();
  if(!isAdminUser() && selectedSettingsTab !== 'company') selectedSettingsTab = 'company';
  if(isAdminUser()){
    const users = getUsers();
    let changed = false;
    users.forEach(u => {
      if(u.email !== currentUser.email && ['administrator','crew','customer'].includes(u.role) && !u.ownerEmail){
        u.ownerEmail = currentUser.email;
        changed = true;
      }
    });
    if(changed) setUsers(users);
  }
  const teamAccounts = getUsers()
    .filter(u => u.email !== currentUser.email)
    .sort((a,b) => recordTimestamp(b) - recordTimestamp(a));
  const tabs = `<div class="settings-tabs">
    <button class="settings-tab ${selectedSettingsTab === 'company' ? 'active' : ''}" data-settings-tab="company">${icon('building-2')}<span>Company Settings</span></button>
    ${isAdminUser() ? `<button class="settings-tab ${selectedSettingsTab === 'team' ? 'active' : ''}" data-settings-tab="team">${icon('users-round')}<span>User Logins</span></button>` : ''}
    ${isAdminUser() ? `<button class="settings-tab ${selectedSettingsTab === 'data' ? 'active' : ''}" data-settings-tab="data">${icon('database-backup')}<span>Data & Backup</span></button>` : ''}
  </div>`;
  const companyPanel = `<form id="settingsForm" class="card section-card settings-company-panel">
    <div class="settings-panel-heading"><span class="settings-panel-icon">${icon('building-2')}</span><div><span class="settings-kicker">Business profile</span><h3>Company Settings</h3><p>Keep the company information used across estimates, jobs, invoices, and reports up to date.</p></div></div>
    <div class="form-grid settings-company-form">
      <div class="field"><label>Company Name</label><input name="companyName" value="${escapeHtml(s.companyName)}"></div>
      <div class="field"><label>Company Email</label><input name="email" type="email" value="${escapeHtml(s.email || currentUser?.email || '')}" placeholder="company@example.com"></div>
      <div class="field"><label>Phone</label><input name="phone" value="${escapeHtml(s.phone)}"></div>
      <div class="field"><label>Website</label><input name="website" type="url" value="${escapeHtml(s.website || '')}" placeholder="https://www.example.com"></div>
      <div class="field"><label>Default Tax Rate</label><input name="taxRate" value="${escapeHtml(s.taxRate)}"></div>
      <div class="field"><label>Business Address</label><input name="address" value="${escapeHtml(s.address)}"></div>
      <div class="field full company-logo-field"><label>Company Logo</label><input name="companyLogoDataUrl" type="hidden" value="${escapeHtml(s.companyLogoDataUrl || '')}"><div class="company-logo-control"><div class="company-logo-preview" id="companyLogoPreview">${s.companyLogoDataUrl ? `<img src="${escapeHtml(s.companyLogoDataUrl)}" alt="Company logo preview">` : '<span>&#127793;</span>'}</div><div class="company-logo-copy"><strong>Brand logo</strong><span>PNG, JPG, or WebP. The logo appears in the website sidebar and menu.</span></div><label class="secondary company-logo-upload" for="companyLogoInput">Upload / Change<input id="companyLogoInput" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button type="button" class="secondary company-logo-remove" id="removeCompanyLogo" ${s.companyLogoDataUrl ? '' : 'disabled'}>Remove</button></div></div>
      <div class="field full settings-company-actions"><span class="settings-note">Current plan: ${escapeHtml(s.plan || 'No plan selected')} ${s.subscriptionStatus ? `&middot; ${escapeHtml(s.subscriptionStatus)}` : ''}</span><button class="primary settings-save-inline" id="saveSettings" type="button">${icon('save')} Save Company Settings</button></div>
    </div>
  </form>`;
  const teamPanel = `<div class="card section-card settings-team-panel">
    <div class="settings-panel-heading"><span class="settings-panel-icon">${icon('user-round-plus')}</span><div><span class="settings-kicker">Access management</span><h3>Create User Login</h3><p>Choose an account type, then enter only the details needed for that user.</p></div></div>
    <form id="teamAccountForm" class="form-grid team-account-form" autocomplete="off">
      <div class="field"><label>Full Name</label><input name="teamName" required placeholder="Example: Emily Carter"></div>
      <div class="field"><label>Email</label><input name="teamEmail" type="email" required placeholder="user@example.com" autocomplete="off" readonly data-manual-user-login></div>
      <div class="field"><label>Phone</label><input name="teamPhone" type="tel" required placeholder="(555) 555-0100"></div>
      <div class="field"><label>Password</label><span class="password-field"><input id="teamPassword" name="teamPassword" type="password" required placeholder="Create password" autocomplete="new-password" readonly data-manual-user-login><button type="button" class="password-toggle" data-toggle-password="teamPassword" aria-label="Show password">&#128065;</button></span></div>
      <div class="field"><label>Account Type</label><select name="teamRole" required><option value="crew">Crew</option><option value="administrator">Administrator</option><option value="customer">Customer</option></select></div>
      <div class="field" data-role-field="crew administrator"><label>Employment Status</label><select name="teamEmploymentStatus"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
      <div class="field" data-role-field="crew administrator"><label>Job Title</label><input name="teamCrewRole" placeholder="Crew Member, Team Leader, Office Admin"></div>
      <div class="field" data-role-field="crew administrator"><label>Emergency Contact</label><input name="teamEmergencyContact" placeholder="Name / phone"></div>
      <div class="field full" data-role-field="crew administrator customer"><label>Address</label><input name="teamAddress" placeholder="Street, city, state"></div>
      <div class="field full" data-role-field="crew administrator"><label>Profile Notes</label><textarea name="teamProfileNotes" rows="3" placeholder="Responsibilities or internal notes"></textarea></div>
      <div class="field full team-form-actions">
        <button class="secondary" id="cancelTeamAccount" type="button">Cancel</button>
        <button class="primary" type="submit">${icon('user-round-plus')} Create User</button>
      </div>
    </form>
    <div class="team-login-list">
      <div class="team-management-heading">
        <div><h4>User Management</h4><p class="muted">Review login details and manage access for each user.</p></div>
        <span class="team-user-count">${teamAccounts.length} user${teamAccounts.length===1?'':'s'}</span>
      </div>
      <div class="team-management-table-wrap">
        <table class="team-management-table">
          <thead><tr><th>Username</th><th>Email</th><th>Phone Number</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${teamAccounts.length ? teamAccounts.map(u=>`<tr>
            <td><strong class="team-username">${escapeHtml(u.name || 'Not provided')}</strong></td>
            <td><span class="team-email">${escapeHtml(u.email || 'Not provided')}</span></td>
            <td>${escapeHtml(u.phone || 'Not provided')}</td>
            <td><span class="status ${u.role === 'crew' ? 'progress' : u.role === 'customer' ? 'paid' : 'scheduled'}">${escapeHtml(roleLabel(u))}</span></td>
            <td><span class="status ${u.employmentStatus === 'Inactive' ? 'unpaid' : 'completed'}">${escapeHtml(u.employmentStatus || 'Active')}</span></td>
            <td class="team-management-actions"><div class="action-group">
              <button type="button" class="secondary small-btn" data-edit-team-account="${escapeHtml(u.authUid || u.id || u.email)}">Edit</button>
              <button type="button" class="danger small-btn" data-delete-team-account="${escapeHtml(u.authUid || u.id || u.email)}">Delete</button>
            </div></td>
          </tr>`).join('') : '<tr><td colspan="6"><div class="empty small-empty">No team users created yet.</div></td></tr>'}</tbody>
        </table>
      </div>
    </div>
  </div>`;
  const deletedRecords=deletedDataRecords();
  const archiveTypes=Object.keys(deletedDataCollections);
  if(!archiveTypes.includes(selectedDeletedDataType)) selectedDeletedDataType='';
  const selectedArchive=selectedDeletedDataType ? deletedRecords[selectedDeletedDataType] || [] : [];
  const selectedArchiveLabel=deletedDataCollections[selectedDeletedDataType]?.label || '';
  const selectedArchiveHeaders=selectedDeletedDataType ? deletedArchiveHeaders(selectedDeletedDataType) : [];
  const archiveTable=selectedDeletedDataType ? `<div class="card table-card deleted-data-table">
    <div class="section-head"><div><span class="archive-kicker">Archive recovery</span><h3>Archived ${escapeHtml(selectedArchiveLabel)}</h3><p class="muted">Review the record, then restore only the one you need.</p></div><button type="button" class="secondary compact" data-close-deleted-archive>Close archive</button></div>
    <table><thead><tr>${selectedArchiveHeaders.map(header=>`<th>${escapeHtml(header)}</th>`).join('')}<th class="deleted-action-col">Action</th></tr></thead><tbody>${selectedArchive.length ? selectedArchive.map(record=>`<tr>${deletedArchiveCells(selectedDeletedDataType,record)}<td class="deleted-action-cell"><button type="button" class="secondary compact" data-restore-deleted-record="${escapeHtml(selectedDeletedDataType)}" data-record-id="${escapeHtml(deletedRecordId(selectedDeletedDataType,record))}">${icon('rotate-ccw')} Restore</button></td></tr>`).join('') : tableEmpty(selectedArchiveHeaders.length+1,`No deleted ${selectedArchiveLabel.toLowerCase()}`,`There are no ${selectedArchiveLabel.toLowerCase()} left to restore.`,'✓')}</tbody></table>
  </div>` : '';
  const dataPanel=`<div class="card section-card backup-panel">
    <div class="data-backup-hero"><div class="data-backup-icon">${icon('archive-restore')}</div><div><span class="archive-kicker">Data protection centre</span><h3>Restore Deleted Data</h3><p>Click a category to inspect its archived records, then restore only the item you choose.</p></div></div>
    <div class="backup-metrics deleted-data-metrics">
      ${archiveTypes.map(type=>`<button type="button" class="backup-metric-button ${selectedDeletedDataType===type?'active':''}" data-deleted-data-type="${type}"><span class="backup-metric-icon">${icons[type] || icon('archive')}</span><span class="archive-card-label">${deletedDataCollections[type].label}</span><strong>${deletedRecords[type].length}</strong></button>`).join('')}
    </div>
    ${archiveTable}
    <div class="backup-safety-note">${icon('shield-check')}<span>Each deletion is retained here until restored. Restoring Emmy, for example, brings back only Emmy and leaves the other deleted customers archived.</span></div>
  </div>`;
  return `<div class="settings-page"><div class="hero"><div><h2>Settings</h2><p>Manage company details and team login access.</p></div></div>
    ${tabs}
    ${selectedSettingsTab === 'team' && isAdminUser() ? teamPanel : selectedSettingsTab === 'data' && isAdminUser() ? dataPanel : companyPanel}
  </div>`;
}

function jobDetailHeader(j,relatedInvoice,tab){
  const displayedStatus=jobDisplayedStatus(j);
  return `<div class="hero job-detail-hero"><div><button class="link-btn" data-view="jobs">&larr; Back to Jobs</button><div class="job-title-row"><h2>#JOB-${j.id} &middot; ${escapeHtml(j.service)}</h2></div><p>${escapeHtml(j.customer)} &middot; ${escapeHtml(j.address)}</p></div><div class="job-detail-actions"><div class="status-menu-wrap"><span id="statusBadge" class="status ${displayedStatus.cls}" style="cursor:pointer;display:inline-block">${displayedStatus.label}</span><div id="statusDropdown" class="status-dropdown" style="display:none"><div class="status-option" data-status="notstarted"><span>&#9675;</span><span>Not Started</span></div><div class="status-option" data-status="pending"><span>&#9203;</span><span>Pending</span></div><div class="status-option" data-status="scheduled"><span>&#128197;</span><span>Scheduled</span></div><div class="status-option" data-status="progress"><span>&#9654;</span><span>In Progress</span></div><div class="status-option" data-status="onhold"><span>&#10074;&#10074;</span><span>On Hold</span></div><div class="status-option" data-status="completed"><span>&#10003;</span><span>Completed</span></div><div class="status-option" data-status="invoiced"><span>&#9638;</span><span>Invoiced</span></div><div class="status-option" data-status="cancelled"><span>&#10005;</span><span>Cancelled</span></div></div></div>${j.status==='completed' && !relatedInvoice ? `<button class="secondary" id="createInvoice">Create Invoice</button>` : ''}${relatedInvoice ? `<button class="secondary" id="viewInvoice">Invoice: ${escapeHtml(relatedInvoice.id)}</button>` : ''}${hasManagementAccess() ? `<button class="primary" id="emailJob" aria-label="Send job PDF to customer">&#9993; Send to Customer</button>` : ''}<button class="secondary" id="exportJobPdf">Export PDF</button>${hasManagementAccess() ? `<button class="secondary" data-edit-job="${j.id}">Edit Job</button><button class="secondary danger-btn" data-delete-job="${j.id}">Delete Job</button>` : ''}</div></div><div class="job-tabs"><button class="tab-btn${tab==='details'?' tab-active':''}" data-tab="details">Details</button><button class="tab-btn${tab==='payments'?' tab-active':''}" data-tab="payments">Invoice Details</button><button class="tab-btn${tab==='photos'?' tab-active':''}" data-tab="photos">Photos</button><button class="tab-btn${tab==='notes'?' tab-active':''}" data-tab="notes">Notes</button></div>`;
}
function compactJobDetailsPage(j,relatedInvoice,tab){
  return `${jobDetailHeader(j,relatedInvoice,tab)}<div class="job-compact-metric-grid"><div class="job-compact-metric"><span>Customer</span><strong>${escapeHtml(j.customer)}</strong></div><div class="job-compact-metric"><span>Service</span><strong>${escapeHtml(j.service)}</strong></div><div class="job-compact-metric"><span>Schedule</span><strong>${displayDate(j.date)}<small>${escapeHtml(j.time || 'Time not set')}</small></strong></div><div class="job-compact-metric amount"><span>Job Amount</span><strong>${money(j.price)}</strong></div></div><div class="job-compact-grid"><section class="card job-compact-card"><div class="section-head"><div><h3>Job Information</h3><p class="muted">Essential work and assignment details.</p></div></div><div class="job-compact-list"><div><span>Property</span><strong>${escapeHtml(j.address || 'Not added')}</strong></div><div><span>Assigned crew</span><strong>${escapeHtml(j.crew || 'Not assigned')}</strong></div><div><span>Duration</span><strong>${escapeHtml(j.duration || 'Not set')}</strong></div><div><span>Priority</span><strong><span class="priority-pill ${priorityClass(j.priority)}">${escapeHtml(j.priority || 'Medium')}</span></strong></div></div></section><section class="card job-compact-card"><div class="section-head"><div><h3>Work Notes</h3><p class="muted">Instructions for completing this job.</p></div></div><p class="job-compact-note">${escapeHtml(j.notes || 'No instructions or notes added.')}</p></section></div><details class="card job-activity-summary"><summary>Activity history</summary><div class="record-activity-card">${auditTrail(j)}</div></details>${!['completed','invoiced','cancelled'].includes(j.status) ? `<div class="job-action-bar"><button class="primary" id="completeJob">Mark Job Complete</button></div>` : ''}`;
}
function jobDetailsHistoryPage(j,relatedInvoice,tab){
  const billing=jobBillingSummary(j);
  const paymentStatusClass=billing.status==='Paid'?'paid':billing.status==='Overdue'?'overdue':billing.status==='Partially Paid'?'partial':'pending';
  const crewProgress=crewProgressRows(j);
  return `${jobDetailHeader(j,relatedInvoice,tab)}
    <div class="metric-grid job-history-metrics">
      <div class="metric"><div class="label">Customer</div><div class="value job-history-name">${escapeHtml(j.customer)}</div><div class="sub">job customer</div><div class="bubble">&#128101;</div></div>
      <div class="metric"><div class="label">Service</div><div class="value job-history-name">${escapeHtml(j.service)}</div><div class="sub">scheduled service</div><div class="bubble">&#128295;</div></div>
      <div class="metric"><div class="label">Schedule</div><div class="value job-history-date">${displayDate(j.date)}</div><div class="sub">${escapeHtml(j.time || 'Time not set')}</div><div class="bubble">&#128197;</div></div>
      <div class="metric"><div class="label">Job Amount</div><div class="value" style="color:#087a45">${money(j.price)}</div><div class="sub">job value</div><div class="bubble">&#36;</div></div>
    </div>
    <div class="job-detail-grid job-history-detail-grid">
      <section class="card section-card"><div class="section-head"><div><h3>Job Information</h3><p class="muted">Customer, schedule, and current status.</p></div></div><div class="detail-list"><div class="detail-item"><span class="muted">Customer</span><strong>${escapeHtml(j.customer)}</strong></div><div class="detail-item"><span class="muted">Service</span><strong>${escapeHtml(j.service)}</strong></div><div class="detail-item"><span class="muted">Job Date</span><strong>${displayDate(j.date)}</strong></div><div class="detail-item"><span class="muted">Due Date</span><strong>${displayDate(j.due || j.date)}</strong></div><div class="detail-item"><span class="muted">Created Date</span><strong>${displayDate(j.createdAt || j.createdDate || j.date)}</strong></div><div class="detail-item"><span class="muted">Created By</span><strong>${escapeHtml(recordCreatedBy(j))}</strong></div><div class="detail-item"><span class="muted">Status</span><strong><span class="status ${jobDisplayedStatus(j).cls}">${jobDisplayedStatus(j).label}</span></strong></div></div></section>
      <section class="card section-card job-billing-summary-card"><div class="section-head"><div><h3>Work & Payment Details</h3><p class="muted">Work information and payment summary.</p></div></div><div class="detail-list"><div class="detail-item"><span class="muted">Property</span><strong>${escapeHtml(j.address || 'Not added')}</strong></div><div class="detail-item"><span class="muted">Duration</span><strong>${escapeHtml(j.duration || 'Not set')}</strong></div><div class="detail-item"><span class="muted">Priority</span><strong><span class="priority-pill ${priorityClass(j.priority)}">${escapeHtml(j.priority || 'Medium')}</span></strong></div><div class="detail-item"><span class="muted">Job Amount</span><strong class="job-amount-value">${money(j.price)}</strong></div><div class="detail-item"><span class="muted">Payment Status</span><strong><span class="status ${paymentStatusClass}">${escapeHtml(billing.status)}</span></strong></div><div class="detail-item"><span class="muted">Paid Amount</span><strong class="job-paid-value">${money(billing.paid)}</strong></div><div class="detail-item"><span class="muted">Due Amount</span><strong class="job-due-value">${money(billing.outstanding)}</strong></div></div></section>
    </div>
    <section class="card job-history-notes job-history-details schedule-details-section schedule-details-link" data-open-schedule-details="${escapeHtml(j.id)}" role="link" tabindex="0" aria-label="Open schedule details for JOB-${escapeHtml(j.id)}"><div class="section-head"><div><h3>Schedule Details</h3><p class="muted">Select to open this job's full schedule details.</p></div><span class="link-btn">Open schedule &rarr;</span></div><div class="table-scroll crew-schedule-table"><table><thead><tr><th>Crew Name</th><th>Service</th><th>Scheduled Date</th><th>Status</th><th>Start Date</th><th>Start Time</th><th>Completed Date</th><th>Completed Time</th></tr></thead><tbody>${crewProgress.length?crewProgress.map(member=>{const assignment=crewScheduleForJob(j,member.name);return `<tr class="record-row" data-open-schedule-crew="${escapeHtml(j.id)}" data-schedule-crew="${escapeHtml(member.name)}" role="link" tabindex="0" aria-label="Open ${escapeHtml(member.name)} schedule details"><td><strong>${escapeHtml(member.name)}</strong></td><td>${escapeHtml(j.service || 'Not added')}</td><td>${displayDate(assignment.date)}</td><td><span class="status ${member.status}">${jobStatusLabel(member.status)}</span></td><td>${member.startedAt ? displayDate(member.startedAt) : '-'}</td><td>${member.startedAt ? displayClockTime(member.startedAt) : '-'}</td><td>${member.completedAt ? displayDate(member.completedAt) : '-'}</td><td>${member.completedAt ? displayClockTime(member.completedAt) : '-'}</td></tr>`;}).join(''):tableEmpty(8,'No crew assigned','Crew assignments will appear here after the job is scheduled.','👥')}</tbody></table></div><div class="schedule-details-notes"><span>Notes</span><strong>${escapeHtml(j.notes || 'No notes added.')}</strong></div></section>
    <details class="card job-activity-summary"><summary>Activity history</summary><div class="record-activity-card">${auditTrail(j)}</div></details>
    ${!['completed','invoiced','cancelled'].includes(j.status) ? `<div class="job-action-bar"><button class="primary" id="completeJob">Mark Job Complete</button></div>` : ''}`;
}
function compactJobPaymentsPage(j,relatedInvoices,billing,payments,tab){
  const invoiceBilling=jobInvoicePaymentSummary(j,relatedInvoices);
  const paymentStatusClass=invoiceBilling.status==='Paid'?'paid':invoiceBilling.status==='Overdue'?'overdue':invoiceBilling.status==='Partially Paid'?'partial':'pending';
  return `${jobDetailHeader(j,relatedInvoices[0],tab)}<div class="job-compact-metric-grid payment-metrics"><div class="job-compact-metric"><span>Payment Status</span><strong><span class="status ${paymentStatusClass}">${invoiceBilling.status}</span></strong></div><div class="job-compact-metric amount"><span>Job Amount</span><strong>${money(invoiceBilling.total)}</strong></div><div class="job-compact-metric paid"><span>Paid Amount</span><strong>${money(invoiceBilling.paid)}</strong></div><div class="job-compact-metric due"><span>Outstanding</span><strong>${money(invoiceBilling.outstanding)}</strong></div></div><div class="job-payment-status-grid job-compact-payment-grid"><section class="card job-compact-card"><div class="section-head"><div><h3>Payment Summary</h3><p class="muted">Current billing position for this job.</p></div></div><div class="job-compact-list"><div><span>Job Status</span><strong><span class="status ${j.status}">${jobStatusLabel(j.status)}</span></strong></div><div><span>Linked Invoices</span><strong>${relatedInvoices.length}</strong></div><div><span>Payment Records</span><strong>${payments.length}</strong></div></div></section><section class="card job-compact-card"><div class="section-head"><div><h3>Invoice Information</h3><p class="muted">Invoices connected to this job.</p></div></div>${relatedInvoices.length?`<div class="detail-list">${relatedInvoices.map(invoice=>`<div class="detail-item"><span class="muted">${escapeHtml(invoice.id)}</span><strong>${money(invoiceTotal(invoice))} <span class="status ${invoiceDisplayStatus(invoice)}">${invoiceStatusLabel(invoiceDisplayStatus(invoice))}</span></strong></div>`).join('')}</div>`:emptyState('No invoice linked','Create an invoice for this job to track billing.')}</section></div><section class="card table-card job-payment-history"><div class="section-head"><div><h3>Payment History</h3><p class="muted">Recorded payments for this job.</p></div><span class="payment-history-count">${payments.length} record${payments.length===1?'':'s'}</span></div><table><thead><tr><th>Date</th><th>Invoice</th><th>Method</th><th>Amount</th></tr></thead><tbody>${payments.length?payments.map(payment=>`<tr><td>${displayDate(payment.date)}</td><td><strong>${escapeHtml(payment.invoiceId)}</strong></td><td>${escapeHtml(payment.method || 'Other')}</td><td style="color:#087a45"><strong>${money(payment.amount)}</strong></td></tr>`).join(''):tableEmpty(4,'No payments recorded','Payment activity will appear here after an invoice is paid.','✓')}</tbody></table></section>`;
}
function jobPaymentsHistoryPage(j,relatedInvoices,billing,payments,tab){
  const invoiceBilling=jobInvoicePaymentSummary(j,relatedInvoices);
  const paymentStatusClass=invoiceBilling.status==='Paid'?'paid':invoiceBilling.status==='Overdue'?'overdue':invoiceBilling.status==='Partially Paid'?'partial':'pending';
  return `${jobDetailHeader(j,relatedInvoices[0],tab)}
    <div class="job-compact-metric-grid payment-metrics">
      <div class="job-compact-metric"><span>Payment Status</span><strong><span class="status ${paymentStatusClass}">${invoiceBilling.status}</span></strong></div>
      <div class="job-compact-metric amount"><span>Job Amount</span><strong>${money(invoiceBilling.total)}</strong></div>
      <div class="job-compact-metric paid"><span>Paid Amount</span><strong>${money(invoiceBilling.paid)}</strong></div>
      <div class="job-compact-metric due"><span>Outstanding</span><strong>${money(invoiceBilling.outstanding)}</strong></div>
    </div>
    <section class="card table-card job-payment-history job-invoice-information">
      <div class="section-head"><div><h3>Invoice Information</h3><p class="muted">Only this job’s line-item totals are shown.</p></div><span class="payment-history-count">${relatedInvoices.length} invoice${relatedInvoices.length===1?'':'s'}</span></div>
      <table><thead><tr><th>Invoice</th><th>Invoiced</th><th>Job Total</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>
        ${relatedInvoices.length?relatedInvoices.map(invoice=>{const itemBilling=jobInvoiceBilling(invoice,j);return `<tr class="record-row" data-invoice="${escapeHtml(invoice.id)}" tabindex="0" role="link"><td><strong>${escapeHtml(invoice.id)}</strong></td><td>${displayDate(invoice.invoiced)}</td><td><strong>${money(itemBilling.total)}</strong></td><td class="job-paid-value"><strong>${money(itemBilling.paid)}</strong></td><td class="job-due-value"><strong>${money(itemBilling.due)}</strong></td><td><span class="status ${itemBilling.status}">${invoiceStatusLabel(itemBilling.status)}</span></td></tr>`}).join(''):tableEmpty(6,'No invoice linked','Create an invoice for this job to track billing.','🧾')}
      </tbody></table>
    </section>
    <section class="card table-card job-payment-history">
      <div class="section-head"><div><h3>Payment History</h3><p class="muted">Payments allocated to this job from its invoice line items.</p></div><span class="payment-history-count">${payments.length} record${payments.length===1?'':'s'}</span></div>
      <table><thead><tr><th>Payment Date</th><th>Invoice</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>
        ${payments.length?payments.map(payment=>`<tr><td>${displayDate(payment.date)}</td><td><strong>${escapeHtml(payment.invoiceId)}</strong></td><td>${escapeHtml(payment.method || 'Other')}</td><td>${escapeHtml(payment.reference || '-')}</td><td class="job-paid-value"><strong>${money(payment.amount)}</strong></td></tr>`).join(''):tableEmpty(5,'No payments recorded','Payment activity will appear after a linked invoice is paid.','✓')}
      </tbody></table>
    </section>`;
}
function jobDetail(){
  const j=ensureCrewJobFields(selectedJob);
  if(!j) return `<div class="hero"><div><h2>Job Detail</h2><p>No job selected.</p></div><button class="primary" id="newJob">+ New Job</button></div>`;
  if(isCrewUser()){
    crewPageTab='jobs';
    return crewView();
  }
  if(isCrewUser() && String(j.crew || '').toLowerCase() !== String(currentUser?.name || '').toLowerCase()){
    selectedJob = assignedJobs()[0] || null;
    return `<div class="hero"><div><h2>Job Detail</h2><p>You can only view jobs assigned to you.</p></div></div>`;
  }
  const tab = ['details','payments','photos','notes'].includes(selectedJobTab) ? selectedJobTab : 'details';
  const relatedInvoices = jobLinkedInvoices(j);
  const relatedInvoice = relatedInvoices[0];
  const billing = jobBillingSummary(j);
  const payments = jobPaymentHistory(j);
  const issues = j.issues || [];
  const photos = j.photos || [];
  if(tab==='details') return jobDetailsHistoryPage(j,relatedInvoice,tab);
  if(tab==='payments') return jobPaymentsHistoryPage(j,relatedInvoices,billing,payments,tab);

  return `
    <div class="hero job-detail-hero"><div><button class="link-btn" data-view="jobs">&larr; Back to Jobs</button>
      <div class="job-title-row">
        <h2>#JOB-${j.id} &middot; ${j.service}</h2>
      </div>
      <p>${j.customer} &middot; ${j.address}</p>
    </div><div class="job-detail-actions">
      <div class="status-menu-wrap">
        <span id="statusBadge" class="status ${j.status}" style="cursor:pointer;display:inline-block">${jobStatusLabel(j.status)}</span>
        <div id="statusDropdown" class="status-dropdown" style="display:none">
          <div class="status-option" data-status="pending">
            <span style="font-size:16px">&#9203;</span>
            <span>Pending</span>
          </div>
          <div class="status-option" data-status="scheduled">
            <span style="font-size:16px">&#128197;</span>
            <span>Scheduled</span>
          </div>
          <div class="status-option" data-status="progress">
            <span style="font-size:16px">&#9654;</span>
            <span>In Progress</span>
          </div>
          <div class="status-option" data-status="onhold">
            <span style="font-size:16px">&#10074;&#10074;</span>
            <span>On Hold</span>
          </div>
          <div class="status-option" data-status="completed">
            <span style="font-size:16px">&#10003;</span>
            <span>Completed</span>
          </div>
          <div class="status-option" data-status="invoiced">
            <span style="font-size:16px">&#9638;</span>
            <span>Invoiced</span>
          </div>
          <div class="status-option" data-status="cancelled">
            <span style="font-size:16px">&#10005;</span>
            <span>Cancelled</span>
          </div>
        </div>
      </div>
      ${j.status==='completed' && !relatedInvoice ? `<button class="secondary" id="createInvoice" style="background:#007bff;color:white">&rarr; Create Invoice</button>` : ''}
      ${relatedInvoice ? `<button class="secondary" id="viewInvoice" style="background:#28a745;color:white">&#10003; Invoice: ${relatedInvoice.id}</button>` : ''}
      ${hasManagementAccess() ? `<button class="primary" id="emailJob" aria-label="Send job PDF to customer">&#9993; Send to Customer</button>` : ''}
      <button class="secondary" id="exportJobPdf">Export PDF</button>
      ${hasManagementAccess() ? `
        <button class="secondary" data-edit-job="${j.id}">Edit Job</button>
        <button class="secondary" data-delete-job="${j.id}" style="background:#dc3545;color:white">Delete Job</button>
      ` : ''}
    </div></div>
    <div class="job-tabs">
      <button class="tab-btn${tab==='details'?' tab-active':''}" data-tab="details">Details</button>
      <button class="tab-btn${tab==='payments'?' tab-active':''}" data-tab="payments">Invoice Details</button>
      <button class="tab-btn${tab==='photos'?' tab-active':''}" data-tab="photos">Photos</button>
      <button class="tab-btn${tab==='notes'?' tab-active':''}" data-tab="notes">Notes</button>
    </div>
    ${tab==='details'?`<div class="card section-card"><div class="detail-list"><div class="detail-item"><span class="muted">Customer</span><strong>${escapeHtml(j.customer)}</strong></div><div class="detail-item"><span class="muted">Property</span><strong>${escapeHtml(j.address)}</strong></div><div class="detail-item"><span class="muted">Service</span><strong>${escapeHtml(j.service)}</strong></div><div class="detail-item"><span class="muted">Date</span><strong>${displayDate(j.date)}</strong></div><div class="detail-item"><span class="muted">Time</span><strong>${escapeHtml(j.time)}</strong></div><div class="detail-item"><span class="muted">Assigned Crew</span><strong>${escapeHtml(j.crew)}</strong></div><div class="detail-item"><span class="muted">Priority</span><strong><span class="priority-pill ${priorityClass(j.priority)}">${escapeHtml(j.priority || 'Medium')}</span></strong></div><div class="detail-item"><span class="muted">Duration</span><strong>${escapeHtml(j.duration || '2 hours')}</strong></div><div class="detail-item"><span class="muted">Equipment</span><strong>${escapeHtml(j.equipment || 'Not assigned')}</strong></div><div class="detail-item"><span class="muted">Materials</span><strong>${escapeHtml(j.materials || 'Not assigned')}</strong></div><div class="detail-item full"><span class="muted">Instructions / Notes</span><strong>${escapeHtml(j.notes || 'No notes added')}</strong></div><div class="detail-item"><span class="muted">Amount</span><strong style="color:#1a7f3d;font-size:16px">${money(j.price)}</strong></div><div class="detail-item"><span class="muted">Payment Status</span><strong><span class="status ${billing.status==='Paid'?'paid':billing.status==='Overdue'?'overdue':billing.status==='Partially Paid'?'partial':'pending'}">${billing.status}</span></strong></div><div class="detail-item"><span class="muted">Paid Amount</span><strong style="color:#087a45">${money(billing.paid)}</strong></div><div class="detail-item"><span class="muted">Outstanding Amount</span><strong style="color:${billing.outstanding>0?'#ba4a00':'#087a45'}">${money(billing.outstanding)}</strong></div></div></div><div class="card table-card job-payment-history"><div class="section-head"><div><h3>Payment History</h3><p class="muted">Payments received for invoices linked to this job.</p></div></div><table><thead><tr><th>Date</th><th>Invoice</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>${payments.length?payments.map(payment=>`<tr><td>${displayDate(payment.date)}</td><td><strong>${escapeHtml(payment.invoiceId)}</strong></td><td>${escapeHtml(payment.method || 'Other')}</td><td>${escapeHtml(payment.reference || '-')}</td><td style="color:#087a45"><strong>${money(payment.amount)}</strong></td></tr>`).join(''):tableEmpty(5,'No payments recorded','Payment activity will appear after a linked invoice is paid.','✓')}</tbody></table></div><div class="card section-card record-activity-card"><div class="section-head"><h3>Activity History</h3></div>${auditTrail(j)}</div>`
    :tab==='payments'?`<div class="job-payment-status-grid"><div class="card section-card"><div class="section-head"><div><h3>Job & Payment Status</h3><p class="muted">A clear balance summary for this job.</p></div></div><div class="detail-list"><div class="detail-item"><span class="muted">Job Status</span><strong><span class="status ${j.status}">${jobStatusLabel(j.status)}</span></strong></div><div class="detail-item"><span class="muted">Payment Status</span><strong><span class="status ${billing.status==='Paid'?'paid':billing.status==='Overdue'?'overdue':billing.status==='Partially Paid'?'partial':'pending'}">${billing.status}</span></strong></div><div class="detail-item"><span class="muted">Job Amount</span><strong>${money(j.price)}</strong></div><div class="detail-item"><span class="muted">Paid Amount</span><strong style="color:#087a45">${money(billing.paid)}</strong></div><div class="detail-item"><span class="muted">Outstanding Amount</span><strong style="color:${billing.outstanding>0?'#ba4a00':'#087a45'}">${money(billing.outstanding)}</strong></div></div></div><div class="card section-card"><div class="section-head"><div><h3>Linked Invoices</h3><p class="muted">Invoices that collect payment for this job.</p></div></div>${relatedInvoices.length?`<div class="detail-list">${relatedInvoices.map(invoice=>`<div class="detail-item"><span class="muted">${escapeHtml(invoice.id)}</span><strong>${money(invoiceTotal(invoice))} · <span class="status ${invoiceDisplayStatus(invoice)}">${invoiceStatusLabel(invoiceDisplayStatus(invoice))}</span></strong></div>`).join('')}</div>`:emptyState('No invoice linked','Create an invoice for this job to track billing and payments.')}</div></div><div class="card table-card job-payment-history"><div class="section-head"><div><h3>Payment History</h3><p class="muted">Every payment received for invoices linked to this job.</p></div><span class="payment-history-count">${payments.length} record${payments.length===1?'':'s'}</span></div><table><thead><tr><th>Date</th><th>Invoice</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>${payments.length?payments.map(payment=>`<tr><td>${displayDate(payment.date)}</td><td><strong>${escapeHtml(payment.invoiceId)}</strong></td><td>${escapeHtml(payment.method || 'Other')}</td><td>${escapeHtml(payment.reference || '-')}</td><td style="color:#087a45"><strong>${money(payment.amount)}</strong></td></tr>`).join(''):tableEmpty(5,'No payments recorded','Payment activity will appear here after a linked invoice is paid.','✓')}</tbody></table></div>`
    :tab==='photos'?`<div class="card section-card"><div class="section-head"><div><h3>Job Photos</h3><p class="muted">Add progress or completion photos and manage them here.</p></div>${hasManagementAccess()?`<label class="cv-upload">+ Add Photos<input id="adminJobPhotoUpload" type="file" accept="image/*" multiple hidden></label>`:''}</div>${photos.length ? `<div class="cv-photo-grid">${photos.map((src,index)=>`<div class="cv-photo"><img src="${src}" alt="Job photo ${index + 1}">${hasManagementAccess()?`<div class="cv-photo-actions"><label>Edit Photo<input type="file" accept="image/*" data-admin-replace-photo="${index}" hidden></label><button type="button" data-admin-remove-photo="${index}">Delete</button></div>`:''}</div>`).join('')}</div>` : emptyState('No job photos yet',hasManagementAccess()?'Select Add Photos to attach progress or completion images.':'Uploaded job photos will appear here.')}</div>`
    :`<div class="card section-card"><div class="section-head"><h3>Job Notes</h3></div><p class="note-box">${escapeHtml(j.notes || 'No notes added yet.')}</p>${issues.length ? `<div class="cv-issues"><h4>Reported Issues</h4>${issues.map(x=>`<p>! ${escapeHtml(x)}</p>`).join('')}</div>` : ''}</div>`}
    ${!['completed','invoiced','cancelled'].includes(j.status) ? `<div class="job-action-bar"><button class="primary" id="completeJob">Mark Job Complete</button></div>` : ''}`;
}
function crewView(){
  const jobsForCrew = assignedJobs();
  const chosen = selectedJob && jobsForCrew.some(job => String(job.id) === String(selectedJob.id)) ? selectedJob : jobsForCrew[0];
  const j = ensureCrewJobFields(chosen);
  const crewRecord = findCrewRecordForUser() || {};
  const crewStatusFor=job=>crewJobProgress(job,currentUser.name).status;
  const completedForCrew = jobsForCrew.filter(job => crewStatusFor(job) === 'completed').length;
  const progressForCrew = jobsForCrew.filter(job => crewStatusFor(job) === 'progress').length;
  const scheduledForCrew = jobsForCrew.filter(job => crewStatusFor(job) === 'scheduled').length;
  const nextCrewJob = jobsForCrew.find(job => !['completed','invoiced'].includes(crewStatusFor(job))) || jobsForCrew[0];
  const crewProfileCard = `<div class="card crew-profile-card">
    <div class="crew-profile-main">
      <div class="avatar crew-profile-avatar">${initials(currentUser.name)}</div>
      <div>
        <h3>${escapeHtml(currentUser.name)}</h3>
        <p>${escapeHtml(crewRecord.role || 'Crew Member')}</p>
      </div>
    </div>
    <div class="crew-profile-details">
      <div><span>Email</span><strong>${escapeHtml(currentUser.email || 'Not added')}</strong></div>
      <div><span>Phone</span><strong>${escapeHtml(currentUser.phone || crewRecord.phone || 'Not added')}</strong></div>
      <div><span>Status</span><strong>${escapeHtml(crewRecord.status || 'Working')}</strong></div>
      <div><span>Assigned Jobs</span><strong>${jobsForCrew.length}</strong></div>
    </div>
    <button class="secondary edit-my-crew-details" type="button">Edit Profile</button>
  </div>`;
  const fullProfileCard = `<div class="crew-profile-page">
    <div class="card crew-profile-hero">
      <div class="crew-hero-info">
        <span class="profile-kicker">GreenOps Crew Profile</span>
        <h2>${escapeHtml(currentUser.name)}</h2>
        <p>${escapeHtml(crewRecord.role || currentUser.title || 'Crew Member')} · ${escapeHtml(crewRecord.status || 'Working')}</p>
        <div class="crew-profile-metrics">
          <button type="button" data-crew-job-filter="all"><span>Assigned</span><strong>${jobsForCrew.length}</strong><small>View all jobs</small></button>
          <button type="button" data-crew-job-filter="scheduled"><span>Scheduled</span><strong>${scheduledForCrew}</strong><small>View scheduled jobs</small></button>
          <button type="button" data-crew-job-filter="progress"><span>In progress</span><strong>${progressForCrew}</strong><small>View active jobs</small></button>
          <button type="button" data-crew-job-filter="completed"><span>Completed</span><strong>${completedForCrew}</strong><small>View completed jobs</small></button>
        </div>
      </div>
      <div class="crew-hero-actions">
        <span class="status ${String(crewRecord.status || '').toLowerCase().includes('inactive') ? 'cancelled' : 'progress'}">${escapeHtml(crewRecord.status || 'Working')}</span>
        <button class="primary edit-my-crew-details" type="button">Edit Profile</button>
      </div>
    </div>
    <div class="crew-profile-grid">
      <div class="card crew-info-card">
        <h3>Contact Details</h3>
        <div class="profile-info-list">
          <div><span>Email</span><strong>${escapeHtml(currentUser.email || 'Not added')}</strong></div>
          <div><span>Phone</span>${phoneContactControls(currentUser.phone || crewRecord.phone,currentUser.name || crewRecord.name,false)}</div>
          <div><span>Address</span><strong>${escapeHtml(currentUser.address || crewRecord.address || 'Not added')}</strong></div>
          <div><span>Emergency Contact</span><strong>${escapeHtml(currentUser.emergencyContact || crewRecord.emergencyContact || 'Not added')}</strong></div>
        </div>
      </div>
      <div class="card crew-info-card">
        <h3>Work Details</h3>
        <div class="profile-info-list">
          <div><span>Role</span><strong>${escapeHtml(crewRecord.role || 'Crew Member')}</strong></div>
          <div><span>Status</span><strong>${escapeHtml(crewRecord.status || 'Working')}</strong></div>
          <div><span>Skills</span><strong>${escapeHtml(currentUser.skills || crewRecord.skills || 'Lawn care, field service')}</strong></div>
          <div><span>Availability</span><strong>${escapeHtml(currentUser.availability || crewRecord.availability || '8 AM - 6 PM')}</strong></div>
        </div>
      </div>
      <div class="card crew-info-card">
        <h3>Next Job</h3>
        ${nextCrewJob ? `<div class="profile-next-job"><strong>${escapeHtml(nextCrewJob.service)}</strong><span>${escapeHtml(nextCrewJob.customer)} · ${displayDate(nextCrewJob.date)} · ${escapeHtml(nextCrewJob.time)}</span><span>${escapeHtml(nextCrewJob.address || 'No address added')}</span></div>` : '<p class="muted">No jobs assigned yet.</p>'}
      </div>
      <div class="card crew-info-card">
        <h3>Notes</h3>
        <p class="profile-note">${escapeHtml(currentUser.profileNotes || crewRecord.profileNotes || 'No profile notes added yet.')}</p>
      </div>
    </div>
  </div>`;
  if(crewPageTab === 'profile' && currentView !== 'crewJobDetail'){
    return `<div class="crew-view-shell">
      <div class="cv-content">${fullProfileCard}</div>
    </div>`;
  }
  if(!j) return `<div class="crew-view-shell"><div class="cv-topbar"><span class="cv-title">My Jobs</span></div><div class="cv-content"><div class="hero"><div><h2>No Assigned Jobs</h2><p>No jobs are assigned to ${escapeHtml(currentUser.name)} yet.</p></div></div></div></div>`;
  selectedJob = j;
  const customer = findCustomerForJob(j) || {};
  const tab = ['details','photos','notes'].includes(selectedJobTab) ? selectedJobTab : 'details';
  const crewWorkStatus = crewStatusFor(j);
  const statusText = jobStatusLabel(crewWorkStatus);
  const issues = j.issues || [];
  const photos = j.photos || [];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(j.address || '')}`;
  const tabContent = tab === 'details' ? `
        <div class="cv-detail-grid">
          <div><span>Customer</span><strong>${escapeHtml(j.customer)}</strong></div>
          <div><span>Service</span><strong>${escapeHtml(j.service)}</strong></div>
          <div><span>Schedule</span><strong>${displayDate(j.date)}${j.time?` &middot; ${escapeHtml(j.time)}`:''}</strong></div>
          <div><span>Due Date</span><strong>${displayDate(j.due || j.date)}</strong></div>
          <div><span>Priority</span><strong><span class="priority-pill ${priorityClass(j.priority)}">${escapeHtml(j.priority || 'Medium')}</span></strong></div>
          <div><span>Duration</span><strong>${escapeHtml(j.duration || '2 hours')}</strong></div>
          <div><span>Equipment</span><strong>${escapeHtml(j.equipment || 'Not assigned')}</strong></div>
          <div><span>Materials</span><strong>${escapeHtml(j.materials || 'Not assigned')}</strong></div>
          <div class="full"><span>Address</span><strong>${escapeHtml(j.address)}</strong></div>
          <div class="full"><span>Customer Instructions</span><strong>${escapeHtml(customer.notes || j.notes || 'No special instructions')}</strong></div>
        </div>`
    : tab === 'photos' ? `
        <div class="cv-photo-tools">
          <label class="cv-upload">Upload Job Photo<input id="cvPhotoUpload" type="file" accept="image/*" multiple hidden></label>
          <span class="muted">Add progress or completion photos for admin review.</span>
        </div>
        ${photos.length ? `<div class="cv-photo-grid">${photos.map((src,index)=>`<div class="cv-photo"><img src="${src}" alt="Job photo ${index + 1}"><div class="cv-photo-actions"><label>Replace<input type="file" accept="image/*" data-replace-photo="${index}" hidden></label><button type="button" data-remove-photo="${index}">Delete</button></div></div>`).join('')}</div>` : emptyState('No job photos yet','Upload work photos from this job. Admin and Administrator can view them.')}
      `
    : `
        <textarea id="cvNotes" class="cv-notes" rows="7" placeholder="Add work notes, materials used, customer instructions...">${escapeHtml(j.notes || '')}</textarea>
        <button class="primary" id="cvSaveNotes">Save Notes</button>
        ${issues.length ? `<div class="cv-issues"><h4>Reported Issues</h4>${issues.map(x=>`<p>! ${escapeHtml(x)}</p>`).join('')}</div>` : ''}`;
  const crewJobQuery=normalizeText(crewJobSearchQuery);
  const visibleCrewJobs = jobsForCrew.filter(job=>{
    const status=crewStatusFor(job);
    const matchesSearch=!crewJobQuery || normalizeText([job.id,job.customer,job.service,jobStatusLabel(status)].join(' ')).includes(crewJobQuery);
    return (crewJobListFilter==='all' || status===crewJobListFilter) && matchesSearch;
  });
  const filterLabel={all:'All assigned jobs',scheduled:'Scheduled jobs',progress:'In-progress jobs',completed:'Completed jobs'}[crewJobListFilter] || 'Assigned Jobs';
  const jobSummaryCards = `<div class="metric-grid crew-job-summary-grid">
    <button type="button" class="metric metric-button" data-crew-job-filter="all"><div class="label">Assigned Jobs</div><div class="value">${jobsForCrew.length}</div><div class="sub">all assigned work</div><div class="bubble">&#9635;</div></button>
    <button type="button" class="metric metric-button" data-crew-job-filter="scheduled"><div class="label">Scheduled</div><div class="value">${scheduledForCrew}</div><div class="sub">upcoming work</div><div class="bubble">&#9200;</div></button>
    <button type="button" class="metric metric-button" data-crew-job-filter="progress"><div class="label">In Progress</div><div class="value">${progressForCrew}</div><div class="sub">work in progress</div><div class="bubble">&#9654;</div></button>
    <button type="button" class="metric metric-button" data-crew-job-filter="completed"><div class="label">Completed</div><div class="value">${completedForCrew}</div><div class="sub">finished jobs</div><div class="bubble">&#10003;</div></button>
  </div>`;
  const jobSwitcher = `<section class="card crew-jobs-table-card"><div class="section-head"><div><h3>${filterLabel}</h3><p class="muted">Select any row to view work details, photos, and notes.</p></div><div class="crew-table-tools"><span class="payment-history-count">${visibleCrewJobs.length} job${visibleCrewJobs.length===1?'':'s'}</span></div></div><div class="crew-job-filter-bar"><input id="crewJobSearch" class="search" type="search" value="${escapeHtml(crewJobSearchQuery)}" placeholder="Search job no., customer, service, or status..."><select id="crewJobStatusFilter" class="secondary"><option value="all" ${crewJobListFilter==='all'?'selected':''}>All status</option><option value="scheduled" ${crewJobListFilter==='scheduled'?'selected':''}>Scheduled</option><option value="progress" ${crewJobListFilter==='progress'?'selected':''}>In Progress</option><option value="completed" ${crewJobListFilter==='completed'?'selected':''}>Completed</option></select><button type="button" class="secondary" id="clearCrewJobFilters">Clear</button></div><div class="table-scroll"><table class="crew-jobs-table" data-paginate="crew-jobs"><thead><tr><th>Job No.</th><th>Customer</th><th>Service</th><th>Scheduled Date</th><th>Completed Date</th><th>Status</th></tr></thead><tbody>${visibleCrewJobs.length?visibleCrewJobs.map(job=>{const progress=crewJobProgress(job,currentUser.name);const status=progress.status;return `<tr class="crew-job-row ${String(job.id)===String(j.id)?'active':''}" data-crew-job="${job.id}" tabindex="0" role="button" aria-label="Open job ${escapeHtml(job.id)}"><td><strong class="crew-job-number">#JOB-${escapeHtml(job.id)}</strong></td><td>${escapeHtml(job.customer)}</td><td>${escapeHtml(job.service)}</td><td>${displayDate(job.date)}${job.time?`<small>${escapeHtml(job.time)}</small>`:''}</td><td>${progress.completedAt?displayDate(progress.completedAt):'-'}</td><td><span class="status ${status}">${jobStatusLabel(status)}</span></td></tr>`}).join(''):tableEmpty(6,'No matching jobs','Clear the filters or choose another status to see your assigned jobs.','✓')}</tbody></table></div></section>`;
  if(currentView === 'crewJobDetail'){
    return `<div class="crew-view-shell">
      <div class="cv-content crew-job-detail-page">
        <div class="hero crew-job-detail-hero"><div><button class="link-btn" data-view="crewView">&larr; Back to My Jobs</button><h2>#JOB-${escapeHtml(j.id)} &middot; ${escapeHtml(j.service)}</h2><p>${escapeHtml(j.customer)} &middot; ${escapeHtml(j.address)}</p></div><span class="status ${crewWorkStatus} cv-status">${statusText}</span></div>
        <div class="card cv-card"><h2 class="cv-job-title">${escapeHtml(j.service)}</h2><p class="muted cv-addr">${escapeHtml(j.address)}</p>
          <div class="cv-actions crew-job-actions"><span class="status ${crewWorkStatus}">${statusText}</span>${crewWorkStatus==='scheduled'?'<button class="primary" id="cvStartJob">Start Job</button>':''}${crewWorkStatus==='progress'?'<button class="primary" id="cvCompleteJob">Complete Job</button>':''}<button class="secondary cv-nav-btn" id="cvNavigate" data-map="${mapsUrl}">&#9654; Navigate</button><button class="secondary" id="cvMessageAdmin">✉ Request Admin</button></div>
          <div class="cv-tabs">
            <button class="tab-btn${tab==='details'?' tab-active':''}" data-tab="details">Details</button>
            <button class="tab-btn${tab==='photos'?' tab-active':''}" data-tab="photos">Photos</button>
            <button class="tab-btn${tab==='notes'?' tab-active':''}" data-tab="notes">Notes</button>
          </div>
          <div class="cv-tab-content">${tabContent}</div>
        </div>
      </div>
    </div>`;
  }
  return `<div class="crew-view-shell">
    <div class="cv-topbar"><span class="cv-title">My Jobs</span></div>
    <div class="cv-content">${jobSummaryCards}${jobSwitcher}</div>
  </div>`;
}

function openCrewAdminMessageModal(job){
  if(!job) return;
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal crew-message-modal"><h3>Request Admin</h3><p class="muted">Send an update or request about #JOB-${escapeHtml(job.id)} to administrators.</p><form id="crewAdminMessageForm"><div class="form-grid"><div class="field"><label>Request Type</label><select name="type"><option value="update">Job update</option><option value="change">Update request</option><option value="deletion">Deletion request</option></select></div><div class="field full"><label>Request Details</label><textarea name="message" rows="4" required placeholder="Describe your update or request..."></textarea></div></div><div class="modal-actions"><button type="button" class="secondary" id="cancelCrewMessage">Cancel</button><button class="primary" type="submit">Send Request</button></div></form></div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{ if(e.target===wrap) wrap.remove(); };
  wrap.querySelector('#cancelCrewMessage').onclick=()=>wrap.remove();
  wrap.querySelector('#crewAdminMessageForm').onsubmit=e=>{
    e.preventDefault();
    const form=new FormData(e.target);
    const type=String(form.get('type') || 'update');
    const message=String(form.get('message') || '').trim();
    if(!message) return;
    const labels={update:'Job update',change:'Update request',deletion:'Deletion request'};
    addWorkspaceNotification({audience:'management',kind:'job',id:job.id,severity:type==='deletion'?'warning':'info',title:`${labels[type]} from ${currentUser.name}`,detail:`#JOB-${job.id} · ${job.service}: ${message}`});
    recordAudit(job,`Crew ${labels[type].toLowerCase()}`,message);
    saveAssignedJob(job);
    wrap.remove();
    showToast('Message sent to admin');
  };
}

function bind(){
  setupTablePagination();
  document.getElementById('logoutBtn')?.addEventListener('click',()=>openLogoutConfirm());
  document.querySelectorAll('[data-phone-action]').forEach(button=>button.addEventListener('click',()=>{
    openPhoneAction(button.dataset.phoneAction,button.dataset.phone,button.dataset.contactName);
  }));
  const paymentPanelHeadings=document.querySelectorAll('.job-payment-status-grid .section-head h3');
  if(paymentPanelHeadings[0]){
    paymentPanelHeadings[0].textContent='Payment Summary';
    const description=paymentPanelHeadings[0].parentElement?.querySelector('p');
    if(description) description.textContent='Amounts received and still outstanding for this job.';
  }
  if(paymentPanelHeadings[1]){
    paymentPanelHeadings[1].textContent='Invoice Information';
    const description=paymentPanelHeadings[1].parentElement?.querySelector('p');
    if(description) description.textContent='Invoices connected to this job.';
  }
  const jobDetailsCard=document.querySelector('.job-tabs + .card');
  const jobDetailsLabels=new Set(['Property','Priority','Equipment','Materials','Instructions / Notes','Payment Status','Paid Amount','Outstanding Amount']);
  jobDetailsCard?.querySelectorAll('.detail-item').forEach(item=>{
    const label=item.querySelector('.muted');
    if(jobDetailsLabels.has(label?.textContent?.trim())) item.hidden=true;
    if(label?.textContent?.trim()==='Date' && selectedJob){
      label.textContent='Schedule';
      const value=item.querySelector('strong');
      if(value) value.textContent=`${displayDate(selectedJob.date)} · ${selectedJob.time || 'Time not set'}`;
    }
  });
  if(jobDetailsCard && selectedJobTab==='details') jobDetailsCard.classList.add('job-summary-card');
  document.querySelectorAll('.job-activity-summary').forEach(activity=>activity.open=true);
  // Settings form password controls are rendered with the page, so wire each
  // eye button to its own input rather than relying on the login-form handler.
  document.querySelectorAll('[data-toggle-password]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();
    const input=document.getElementById(button.dataset.togglePassword);
    if(!input) return;
    const show=input.type==='password';
    input.type=show?'text':'password';
    button.classList.toggle('is-visible',show);
    button.setAttribute('aria-label',show?'Hide password':'Show password');
    button.setAttribute('aria-pressed',String(show));
  }));
  const notificationButton=document.getElementById('notificationButton');
  const notificationPanelElement=document.getElementById('notificationPanel');
  notificationButton?.addEventListener('click',event=>{
    event.stopPropagation();
    const willOpen=notificationPanelElement.hidden;
    notificationPanelElement.hidden=!willOpen;
    notificationButton.setAttribute('aria-expanded',String(willOpen));
    if(willOpen){
      markNotificationsRead();
      notificationButton.querySelector('.notification-count')?.remove();
    }
    if(willOpen) setTimeout(()=>document.addEventListener('click',()=>{
      if(document.body.contains(notificationPanelElement)) notificationPanelElement.hidden=true;
      if(document.body.contains(notificationButton)) notificationButton.setAttribute('aria-expanded','false');
    },{once:true}),0);
  });
  notificationPanelElement?.addEventListener('click',event=>event.stopPropagation());
  const globalSearch=document.getElementById('globalSearch');
  const globalSearchPanel=document.getElementById('globalSearchResults');
  globalSearch?.addEventListener('input',event=>{ globalSearchPanel.innerHTML=globalSearchMarkup(globalSearchResults(event.target.value),event.target.value); });
  globalSearchPanel?.addEventListener('click',event=>{
    const button=event.target.closest('[data-global-result-kind]');
    if(!button) return;
    const kind=button.dataset.globalResultKind, id=button.dataset.globalResultId;
    if(kind==='customer'){ selectedCustomer=id; currentView='customerProfile'; }
    if(kind==='job'){
      selectedJob=state.jobs.find(job=>String(job.id)===String(id)) || selectedJob;
      selectedJobTab='details';
      currentView=isCrewUser() ? 'crewJobDetail' : 'jobDetail';
    }
    if(kind==='estimate'){ selectedEstimate=id; currentView='estimateDetail'; }
    if(kind==='invoice'){ selectedInvoice=id; currentView='invoiceDetail'; }
    render();
  });
  document.querySelectorAll('[data-notification-kind]').forEach(button=>button.addEventListener('click',()=>{
    const kind=button.dataset.notificationKind;
    const id=button.dataset.notificationId;
    if(isCustomerUser()){
      customerPortalTab=kind==='invoice' ? 'invoices' : kind==='estimate' ? 'estimates' : 'jobs';
      currentView={estimates:'customerEstimates',jobs:'customerJobs',invoices:'customerInvoices'}[customerPortalTab];
      render();
      return;
    }
    if(kind==='invoice'){
      selectedInvoice=id;
      currentView='invoiceDetail';
    } else if(kind==='estimate'){
      selectedEstimate=id;
      currentView='estimateDetail';
    } else if(kind==='job'){
      selectedJob=state.jobs.find(job=>String(job.id)===String(id)) || selectedJob;
      selectedJobTab='details';
      // Assigned-job notifications take crew members straight to the job
      // workspace, where the Start Job / Complete Job actions are available.
      if(isCrewUser()){
        crewPageTab='jobs';
        currentView='crewJobDetail';
      } else {
        currentView='jobDetail';
      }
    }
    render();
  }));
  document.querySelectorAll('[data-dashboard-card]').forEach(card=>card.addEventListener('click',()=>{
    const target = card.dataset.dashboardCard;
    const filter = card.dataset.filter || 'all';
    const reportFocus=card.dataset.reportFocus || '';
    if(target === 'jobs') jobListFilter = filter;
    if(target === 'estimates') estimateListFilter = filter;
    if(target === 'invoices') invoiceListFilter = filter;
    if(target === 'crew') crewListFilter = filter;
    if(target === 'schedule'){
      scheduleView = 'week';
      selectedDate = null;
    }
    if(target === 'reports'){
      reportRange=card.dataset.reportRange || 'week';
      reportCustomStart='';
      reportCustomEnd='';
    }
    if(!canOpenView(target)){ showToast('You do not have access to this screen'); return; }
    currentView = target;
    render();
    if(reportFocus) requestAnimationFrame(()=>document.getElementById(reportFocus)?.scrollIntoView({behavior:'smooth',block:'start'}));
  }));
  document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{
    if(!canOpenView(el.dataset.view)){ showToast('You do not have access to this screen'); return; }
    if(['customerProfile','customerEstimates','customerJobs','customerInvoices'].includes(el.dataset.view)){
      customerPortalSearchQuery='';
      customerPortalListFilter='all';
    }
    if(el.dataset.view === 'settings'){
      selectedSettingsTab = 'company';
      selectedDeletedDataType = '';
    }
    if(el.dataset.view === 'jobs'){ jobListFilter = 'all'; jobCustomerFilter=''; jobServiceFilter=''; }
    if(el.dataset.view === 'estimates'){ estimateListFilter = 'all'; estimateCustomerFilter=''; estimateServiceFilter=''; }
    if(el.dataset.view === 'invoices'){
      invoiceListFilter = el.dataset.dashboardFilter || 'all';
      invoiceDrilldown = {service:'',start:'',end:'',aging:''};
      invoiceCustomerFilter='';
    }
    if(el.dataset.view === 'reports'){
      reportRange=el.dataset.reportRange || 'week';
      reportCustomStart='';
      reportCustomEnd='';
    }
    if(el.dataset.view === 'crew') crewListFilter = 'all';
    if(el.dataset.view === 'schedule'){
      // Opening Schedule from navigation must always start from the current
      // calendar week, never from a previously opened crew/detail view.
      scheduleDate = new Date();
      scheduleView = 'week';
      selectedDate = null;
      selectedScheduleJobId = null;
      selectedScheduleCrewName = '';
      scheduleSearchQuery = '';
      scheduleTableStatusFilter = 'all';
    }
    currentView=el.dataset.view;
    render();
    if(currentView==='settings') requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
  });
  document.querySelectorAll('.record-row').forEach(row=>row.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key) || event.target.closest('button,a,input,select,textarea')) return;
    event.preventDefault();
    row.click();
  }));
  const bindDateRange=(prefix,currentRange,onChange)=>{
    const from=document.getElementById(`${prefix}DateFrom`);
    const to=document.getElementById(`${prefix}DateTo`);
    const apply=()=>{
      const next={start:from?.value || '',end:to?.value || ''};
      if(next.start && next.end && next.start>next.end){
        showToast('From Date cannot be after To Date','error');
        return;
      }
      onChange(next);
      render();
    };
    from?.addEventListener('change',apply);
    to?.addEventListener('change',apply);
    document.getElementById(`reset${cap(prefix)}Dates`)?.addEventListener('click',()=>{
      if(prefix==='job'){
        jobListFilter='all';
        jobSearchQuery='';
        jobServiceFilter='';
        jobCustomerFilter='';
      }else if(prefix==='estimate'){
        estimateListFilter='all';
        estimateSearchQuery='';
        estimateServiceFilter='';
        estimateCustomerFilter='';
      }else if(prefix==='invoice'){
        invoiceListFilter='all';
        invoiceSearchQuery='';
        invoiceCustomerFilter='';
        invoiceDrilldown={service:'',start:'',end:'',aging:''};
      }
      onChange({start:'',end:''});
      render();
    });
  };
  bindDateRange('job',jobDateRange,next=>{ jobDateRange=next; });
  bindDateRange('estimate',estimateDateRange,next=>{ estimateDateRange=next; });
  bindDateRange('invoice',{start:invoiceDrilldown.start,end:invoiceDrilldown.end},next=>{
    invoiceDrilldown={...invoiceDrilldown,...next};
  });
  document.getElementById('openDrawer')?.addEventListener('click',()=>document.getElementById('drawerOverlay')?.classList.add('open'));
  document.getElementById('closeDrawer')?.addEventListener('click',()=>document.getElementById('drawerOverlay')?.classList.remove('open'));
  document.getElementById('drawerOverlay')?.addEventListener('click',e=>{if(e.target.id==='drawerOverlay')e.target.classList.remove('open');});
  document.querySelectorAll('[data-plan]').forEach(button => {
    button.addEventListener('click', () => openSubscriptionCheckout(button.dataset.plan));
  });
  document.querySelectorAll('[data-settings-tab]').forEach(button => {
    button.addEventListener('click', () => {
      selectedSettingsTab = button.dataset.settingsTab;
      render();
      requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
    });
  });
  document.querySelectorAll('[data-job]').forEach(el=>el.onclick=()=>{
    const job = state.jobs.find(j=>j.id==el.dataset.job);
    if(isCrewUser() && job && !isCrewAssignedToJob(job,currentUser?.name)){ showToast('Crew can only view assigned jobs'); return; }
    selectedJob=job || assignedJobs()[0] || state.jobs[0];
    selectedJobTab='details';
    currentView='jobDetail';
    render();
  });
  // Selecting one calendar card should open that job's crew details directly.
  // The separate "View Scheduled Jobs" action remains available for the full table.
  document.querySelectorAll('[data-schedule-calendar-job]').forEach(el=>el.addEventListener('click',event=>{
    if(event.target.closest('[data-edit-schedule],[data-delete-schedule]')) return;
    const job=state.jobs.find(item=>String(item.id)===String(el.dataset.scheduleCalendarJob));
    if(!job) return;
    selectedDate=job.date;
    selectedScheduleJobId=job.id;
    selectedScheduleCrewName=el.dataset.scheduleCrew || '';
    currentView='scheduleDetail';
    render();
  }));
  // A selected row in that daily table opens the dedicated details page.
  document.querySelectorAll('[data-schedule-job]').forEach(el=>el.addEventListener('click',event=>{
    if(event.target.closest('[data-edit-schedule],[data-delete-schedule]')) return;
    const job=state.jobs.find(item=>String(item.id)===String(el.dataset.scheduleJob));
    if(!job) return;
    selectedDate=job.date;
    selectedScheduleJobId=job.id;
    selectedScheduleCrewName=el.dataset.scheduleCrew || '';
    currentView='scheduleDetail';
    render();
  }));
  document.querySelectorAll('[data-open-schedule-crew]').forEach(el=>el.addEventListener('click',event=>{
    // A crew row is a specific assignment, so it must not fall through to
    // the parent job-level schedule link (which intentionally shows all crew).
    event.preventDefault();
    event.stopPropagation();
    const job=state.jobs.find(item=>String(item.id)===String(el.dataset.openScheduleCrew));
    if(!job) return;
    selectedDate=job.date;
    selectedScheduleJobId=job.id;
    selectedScheduleCrewName=el.dataset.scheduleCrew || '';
    currentView='scheduleDetail';
    render();
  }));
  document.querySelectorAll('[data-open-schedule-details]').forEach(el=>el.addEventListener('click',event=>{
    event.preventDefault();
    const job=state.jobs.find(item=>String(item.id)===String(el.dataset.openScheduleDetails));
    if(!job) return;
    selectedDate=job.date;
    selectedScheduleJobId=job.id;
    selectedScheduleCrewName='';
    currentView='scheduleDetail';
    render();
  }));
  document.getElementById('viewScheduledJobs')?.addEventListener('click',()=>{
    // The full schedule table is a separate view so the calendar remains
    // uncluttered and every scheduled assignment can be reviewed at once.
    selectedDate='all';
    selectedScheduleJobId=null;
    selectedScheduleCrewName='';
    currentView='schedule';
    render();
  });
  document.getElementById('closeScheduleDetails')?.addEventListener('click',()=>{selectedScheduleJobId=null;selectedScheduleCrewName='';render();});
  document.querySelectorAll('[data-edit-schedule]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    const job=state.jobs.find(item=>String(item.id)===String(button.dataset.editSchedule));
    if(!job || !hasManagementAccess()) return;
    if(!canRescheduleJob(job)){
      showToast('Only scheduled jobs can be rescheduled. Completed jobs cannot be changed.','error');
      return;
    }
    // When this page was opened from an individual crew assignment, prefill
    // only that person. Rescheduling Hari must never also move Vinay.
    const editCrew=selectedScheduleCrewName && isCrewAssignedToJob(job,selectedScheduleCrewName) ? selectedScheduleCrewName : '';
    const crewAppointment=editCrew ? crewScheduleForJob(job,editCrew) : {date:job.date || '',time:job.time || ''};
    currentView='schedule';
    openJobModal({...job,
      ...(editCrew ? {crew:editCrew,assignedCrews:[editCrew],date:crewAppointment.date,time:crewAppointment.time} : {}),
      scheduledJobId:job.id,
      scheduleEdit:true,
      scheduleEditCrew:editCrew,
      scheduleOriginalDate:crewAppointment.date,
      scheduleOriginalTime:crewAppointment.time
    });
  }));
  document.querySelectorAll('[data-delete-schedule]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    void window.deleteSchedule(button.dataset.deleteSchedule);
  }));

  // Job buttons
  document.querySelectorAll('#newJob').forEach(el=>el.addEventListener('click',()=>hasManagementAccess()?openJobModal():showToast('Crew cannot create jobs')));
  document.getElementById('mobileNewJob')?.addEventListener('click',()=>hasManagementAccess()?openJobModal():showToast('Crew cannot create jobs'));

  // Customer buttons
  document.querySelectorAll('[id="newCustomer"]').forEach(el=>el.addEventListener('click',()=>hasManagementAccess()?openCustomerModal():showToast('Crew cannot add customers')));
  document.querySelectorAll('[data-customer-filter]').forEach(card=>{
    card.addEventListener('click',()=>{
      const filter = card.dataset.customerFilter;
      const rows = document.getElementById('customerRows');
      const search = document.getElementById('customerSearch');
      let filtered = state.customers;
      if(filter === 'active' || filter === 'job-history'){
        filtered = state.customers.filter(c => state.jobs.some(j => recordMatchesCustomer(j,c)));
      } else if(filter === 'inactive'){
        filtered = state.customers.filter(c => !state.jobs.some(j => recordMatchesCustomer(j,c)));
      } else if(filter === 'top-service'){
        const service = card.dataset.service;
        filtered = state.customers.filter(c => c.service === service);
      }
      if(search) search.value = '';
      if(rows) rows.innerHTML = filtered.length ? customerRows(filtered) : '<tr><td colspan="6" class="empty">No customers found for this selection.</td></tr>';
      tablePaginationPages.customers=1;
      setupTablePagination();
      showToast(`${card.querySelector('.label')?.textContent || 'Customers'} list shown`);
    });
  });
  document.getElementById('customerSearch')?.addEventListener('input',e=>{ const q=e.target.value.toLowerCase(); document.getElementById('customerRows').innerHTML=customerRows(state.customers.filter(c=>Object.values(c).join(' ').toLowerCase().includes(q))); tablePaginationPages.customers=1; setupTablePagination(); });

  const applyServiceFilters=()=>{
    const query=normalizeText(document.getElementById('serviceSearch')?.value);
    const status=document.getElementById('serviceStatusFilter')?.value || 'all';
    const filtered=serviceCatalog(false).filter(service=>{
      const matchesText=!query || normalizeText([service.name,service.status,service.rate,service.duration].join(' ')).includes(query);
      return matchesText && (status==='all' || service.status===status);
    });
    const rows=document.getElementById('serviceRows');
    if(rows) rows.innerHTML=serviceRows(filtered);
    tablePaginationPages.services=1;
    setupTablePagination();
  };
  document.getElementById('serviceSearch')?.addEventListener('input',applyServiceFilters);
  document.getElementById('serviceStatusFilter')?.addEventListener('change',applyServiceFilters);
  document.querySelectorAll('[data-service-history-toggle]').forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.serviceHistoryToggle==='jobs'){
      serviceHistoryJobsExpandedFor=serviceHistoryJobsExpandedFor===String(selectedService) ? '' : String(selectedService);
    }else{
      serviceHistoryEstimatesExpandedFor=serviceHistoryEstimatesExpandedFor===String(selectedService) ? '' : String(selectedService);
    }
    render();
  }));
  document.querySelectorAll('[data-service-history-view-all]').forEach(button=>button.addEventListener('click',()=>{
    const service=state.services.find(item=>String(item.id)===String(selectedService));
    if(!service) return;
    if(button.dataset.serviceHistoryViewAll==='jobs'){
      jobServiceFilter=service.name;
      jobCustomerFilter='';
      jobListFilter='all';
      currentView='jobs';
    }else if(button.dataset.serviceHistoryViewAll==='estimates'){
      estimateServiceFilter=service.name;
      estimateCustomerFilter='';
      estimateListFilter='all';
      currentView='estimates';
    }else{
      invoiceDrilldown={service:service.name,start:'',end:'',aging:''};
      invoiceCustomerFilter='';
      invoiceListFilter='all';
      currentView='invoices';
    }
    render();
  }));
  document.getElementById('clearJobServiceFilter')?.addEventListener('click',()=>{
    jobServiceFilter='';
    jobCustomerFilter='';
    jobCrewFilter='';
    jobDateRange={start:'',end:''};
    jobListFilter='all';
    render();
  });
  document.getElementById('clearEstimateServiceFilter')?.addEventListener('click',()=>{
    estimateServiceFilter='';
    estimateCustomerFilter='';
    render();
  });
  document.querySelectorAll('[data-customer-history-toggle]').forEach(button=>button.addEventListener('click',()=>{
    const customer=state.customers.find(c=>c.id==selectedCustomer || c.name===selectedCustomer);
    if(!customer) return;
    const section=button.dataset.customerHistoryToggle;
    const customerId=String(customer.id || customer.name);
    if(customerHistoryExpanded.customerId!==customerId){
      customerHistoryExpanded={customerId,jobs:false,estimates:false,paidInvoices:false,invoices:false,payments:false};
    }
    customerHistoryExpanded[section]=!customerHistoryExpanded[section];
    render();
    requestAnimationFrame(()=>document.getElementById(`customer-history-${section}`)?.scrollIntoView({behavior:'smooth',block:'start'}));
  }));
  document.querySelectorAll('[data-customer-history-target]').forEach(button=>button.addEventListener('click',()=>{
    const section=document.getElementById(`customer-history-${button.dataset.customerHistoryTarget}`);
    if(!section) return;
    section.scrollIntoView({behavior:'smooth',block:'start'});
    section.classList.add('service-history-section-focus');
    setTimeout(()=>section.classList.remove('service-history-section-focus'),1200);
  }));
  document.querySelectorAll('[data-customer-history-view-all]').forEach(button=>button.addEventListener('click',()=>{
    const customer=state.customers.find(c=>c.id==selectedCustomer || normalizeText(c.name)===normalizeText(selectedCustomer));
    if(!customer) return;
    const target=button.dataset.customerHistoryViewAll;
    const customerKey=String(customer.id || customer.name);
    if(target==='jobs'){
      jobCustomerFilter=customerKey;
      jobServiceFilter='';
      jobListFilter='all';
      currentView='jobs';
    }else if(target==='estimates'){
      estimateCustomerFilter=customerKey;
      estimateServiceFilter='';
      estimateListFilter='all';
      currentView='estimates';
    }else{
      invoiceCustomerFilter=customerKey;
      invoiceDrilldown={service:'',start:'',end:'',aging:''};
      invoiceListFilter=target==='paidInvoices' ? 'paid' : 'all';
      currentView='invoices';
    }
    render();
  }));
  document.querySelectorAll('[data-service-history-target]').forEach(button=>button.addEventListener('click',()=>{
    const section=document.getElementById(`service-history-${button.dataset.serviceHistoryTarget}`);
    if(!section) return;
    section.scrollIntoView({behavior:'smooth',block:'start'});
    section.classList.add('service-history-section-focus');
    setTimeout(()=>section.classList.remove('service-history-section-focus'),1200);
  }));
  document.querySelectorAll('#serviceRows tr[data-service-detail]').forEach(row=>{
    const openServiceHistory=event=>{
      if(event.target.closest('button, a, input, select, textarea')) return;
      event.preventDefault();
      event.stopPropagation();
      selectedService=row.dataset.serviceDetail;
      currentView='serviceDetail';
      render();
    };
    row.addEventListener('click',openServiceHistory);
    row.addEventListener('keydown',event=>{
      if(event.key==='Enter' || event.key===' '){
        event.preventDefault();
        selectedService=row.dataset.serviceDetail;
        currentView='serviceDetail';
        render();
      }
    });
  });
  document.getElementById('backToServices')?.addEventListener('click',()=>{
    selectedService=null;
    currentView='services';
    render();
  });
  document.querySelectorAll('[data-service-filter]').forEach(card=>card.addEventListener('click',()=>{
    const select=document.getElementById('serviceStatusFilter');
    if(select) select.value=card.dataset.serviceFilter || 'all';
    applyServiceFilters();
  }));
  document.getElementById('editAdminProfile')?.addEventListener('click',()=>isAdminUser()?openAdminProfileModal():showToast('Only the Admin can edit this profile'));
  document.querySelectorAll('[data-profile-shortcut]').forEach(card=>card.addEventListener('click',()=>{
    const shortcut=card.dataset.profileShortcut;
    if(shortcut==='customers') currentView='customers';
    if(shortcut==='services') currentView='services';
    if(shortcut==='completedJobs'){
      jobListFilter='completed';
      currentView='jobs';
    }
    if(shortcut==='invoices'){
      invoiceListFilter='all';
      currentView='invoices';
    }
    render();
    if(shortcut==='services'){
      const status=document.getElementById('serviceStatusFilter');
      if(status){ status.value='active'; status.dispatchEvent(new Event('change')); }
    }
  }));
  document.querySelectorAll('[data-customer-portal-tab]').forEach(button=>button.addEventListener('click',()=>{
    customerPortalTab=button.dataset.customerPortalTab || 'overview';
    customerPortalSearchQuery='';
    customerPortalListFilter='all';
    currentView={overview:'customerProfile',estimates:'customerEstimates',jobs:'customerJobs',invoices:'customerInvoices'}[customerPortalTab] || 'customerProfile';
    render();
  }));
  document.querySelectorAll('[data-customer-portal-filter]').forEach(button=>button.addEventListener('click',()=>{
    customerPortalListFilter=button.dataset.customerPortalFilter || 'all';
    render();
  }));
  document.getElementById('customerPortalSearch')?.addEventListener('input',event=>{
    customerPortalSearchQuery=event.target.value;
    render();
    requestAnimationFrame(()=>{
      const input=document.getElementById('customerPortalSearch');
      input?.focus();
      input?.setSelectionRange(customerPortalSearchQuery.length,customerPortalSearchQuery.length);
    });
  });
  document.getElementById('customerPortalStatusFilter')?.addEventListener('change',event=>{
    customerPortalListFilter=event.target.value || 'all';
    render();
  });
  document.getElementById('clearCustomerPortalFilters')?.addEventListener('click',()=>{
    customerPortalSearchQuery='';
    customerPortalListFilter='all';
    render();
  });
  const openCustomerRecordPdf=async(kind,id)=>{
    try {
      await openCustomerPortalPdf(kind,id);
    } catch (error) {
      showToast(error.message || 'Unable to open this PDF.','error');
    }
  };
  document.querySelectorAll('[data-customer-portal-pdf]').forEach(button=>button.addEventListener('click',async event=>{
    event.stopPropagation();
    const originalLabel=button.textContent;
    button.disabled=true;
    button.textContent='Opening…';
    try { await openCustomerRecordPdf(button.dataset.customerPortalPdf,button.dataset.recordId); }
    finally {
      button.disabled=false;
      button.textContent=originalLabel;
    }
  }));
  document.querySelectorAll('[data-customer-portal-record]').forEach(row=>{
    const openRow=()=>{
      customerPortalSelectedRecord={kind:row.dataset.customerPortalRecord,id:row.dataset.recordId};
      currentView='customerRecordDetail';
      render();
    };
    row.addEventListener('click',event=>{ if(!event.target.closest('button,a,input,select,label')) openRow(); });
    row.addEventListener('keydown',event=>{ if(event.key==='Enter' || event.key===' '){ event.preventDefault(); openRow(); } });
  });
  document.querySelectorAll('[data-customer-portal-back]').forEach(button=>button.addEventListener('click',()=>{
    const kind=customerPortalSelectedRecord?.kind;
    customerPortalSelectedRecord=null;
    currentView={estimate:'customerEstimates',job:'customerJobs',invoice:'customerInvoices'}[kind] || 'customerProfile';
    render();
  }));

  document.querySelectorAll('[data-job-filter]').forEach(card=>{
    card.addEventListener('click',()=>{
      const filter = card.dataset.jobFilter;
      jobListFilter = filter;
      render();
      showToast(`${card.querySelector('.label')?.textContent || 'Jobs'} list shown`);
    });
  });
  document.querySelectorAll('[data-crew-detail-job-filter]').forEach(card=>{
    card.addEventListener('click',()=>{
      const filter=card.dataset.crewDetailJobFilter || 'all';
      jobCrewFilter=card.dataset.crewName || '';
      jobServiceFilter='';
      jobCustomerFilter='';
      jobSearchQuery='';
      jobDateRange=filter==='today' ? {start:todayISO(),end:todayISO()} : {start:'',end:''};
      jobListFilter=['scheduled','completed','progress'].includes(filter) ? filter : 'all';
      currentView='jobs';
      render();
      showToast(`${card.querySelector('.label')?.textContent || 'Crew'} jobs shown`);
    });
  });

  document.querySelectorAll('[data-estimate-filter]').forEach(card=>{
    card.addEventListener('click',()=>{
      const filter = card.dataset.estimateFilter;
      estimateListFilter = filter;
      render();
      showToast(`${card.querySelector('.label')?.textContent || 'Estimates'} list shown`);
    });
  });

  document.querySelectorAll('[data-invoice-filter]').forEach(card=>{
    card.addEventListener('click',()=>{
      const filter = card.dataset.invoiceFilter;
      invoiceListFilter = filter;
      render();
      showToast(`${card.querySelector('.label')?.textContent || 'Invoices'} list shown`);
    });
  });

  document.querySelectorAll('[data-crew-filter]').forEach(card=>{
    card.addEventListener('click',()=>{
      const filter = card.dataset.crewFilter;
      crewListFilter = filter;
      showToast(`${card.querySelector('.label')?.textContent || 'Crew'} list shown`);
      render();
    });
  });
  document.getElementById('crewSearch')?.addEventListener('input',event=>{
    crewSearchQuery=event.target.value;
    render();
  });
  document.getElementById('crewQuickFilter')?.addEventListener('change',event=>{
    crewListFilter=event.target.value;
    render();
  });

  // Estimate, Invoice, Crew buttons
  document.getElementById('newEstimate')?.addEventListener('click',()=>hasManagementAccess()?openEstimateModal():showToast('Crew cannot create estimates'));
  document.getElementById('newInvoice')?.addEventListener('click',()=>hasManagementAccess()?openInvoiceModal():showToast('Crew cannot create invoices'));
  document.getElementById('addMember')?.addEventListener('click',()=>hasManagementAccess()?openCrewModal():showToast('Crew cannot add members'));


  // Job actions
  document.getElementById('completeJob')?.addEventListener('click',async ()=>{
    if(!selectedJob) return;
    if(!isCrewUser()){
      showToast('Only the assigned crew can mark a job complete','error');
      return;
    }
    selectedJob.status='completed';
    selectedJob.statusDate=todayISO();
    selectedJob.completedAt=new Date().toISOString();
    recordAudit(selectedJob,'Job completed','Marked complete from job details');
    await saveToFirebase('jobs',selectedJob);
    showToast('Job marked complete');
    render();
  });

  // Settings
  document.getElementById('saveSettings')?.addEventListener('click',()=>{
    const form=document.getElementById('settingsForm');
    if(!form){ save(); showToast('Settings saved'); return; }
    const f=new FormData(form);
    state.settings={
      ...getSettings(),
      companyName:f.get('companyName'),
      email:normalizeEmailText(f.get('email')),
      phone:f.get('phone'),
      website:String(f.get('website') || '').trim(),
      address:f.get('address'),
      copyright:String(f.get('copyright') || getSettings().copyright || '').trim(),
      taxRate:f.get('taxRate'),
      companyLogoDataUrl:f.get('companyLogoDataUrl') || '',
      theme:'light'
    };
    save();
    showToast('Settings saved');
    render();
  });
  document.getElementById('companyLogoInput')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0];
    if(!file) return;
    try{
      const logo=await resizeCompanyLogo(file);
      const valueInput=document.querySelector('#settingsForm [name="companyLogoDataUrl"]');
      const preview=document.getElementById('companyLogoPreview');
      if(valueInput) valueInput.value=logo;
      if(preview) preview.innerHTML=`<img src="${escapeHtml(logo)}" alt="Company logo preview">`;
      document.getElementById('removeCompanyLogo')?.removeAttribute('disabled');
      showToast('Logo ready. Click Save Company Settings to apply it.');
    }catch(error){ showToast(error.message || 'Unable to prepare logo','error'); event.target.value=''; }
  });
  document.getElementById('removeCompanyLogo')?.addEventListener('click',()=>{
    const valueInput=document.querySelector('#settingsForm [name="companyLogoDataUrl"]');
    const preview=document.getElementById('companyLogoPreview');
    if(valueInput) valueInput.value='';
    if(preview) preview.innerHTML='<span>&#127793;</span>';
    document.getElementById('companyLogoInput').value='';
    document.getElementById('removeCompanyLogo').setAttribute('disabled','');
    showToast('Logo removed. Click Save Company Settings to apply the change.');
  });
  document.getElementById('downloadWorkspaceBackup')?.addEventListener('click',()=>{
    downloadWorkspaceBackup();
    showToast('Workspace backup downloaded');
  });
  document.getElementById('restoreDeletedData')?.addEventListener('click',()=>{
    const snapshot=automaticDeletedDataSnapshot();
    if(!snapshot){ showToast('No deleted data is available to restore yet','error'); return; }
    openWorkspaceRestoreConfirm(snapshot,'Automatic deleted-data safety copy',{clearAutomaticSnapshot:true});
  });
  document.querySelectorAll('[data-deleted-data-type]').forEach(button=>button.addEventListener('click',()=>{
    selectedDeletedDataType=button.dataset.deletedDataType || '';
    render();
  }));
  document.querySelector('[data-close-deleted-archive]')?.addEventListener('click',()=>{
    selectedDeletedDataType='';
    render();
  });
  document.querySelectorAll('[data-restore-deleted-record]').forEach(button=>button.addEventListener('click',()=>{
    openRestoreConfirm(button.dataset.restoreDeletedRecord,button.dataset.recordId);
  }));
  document.querySelectorAll('[data-crew-job]').forEach(el=>el.addEventListener('click',()=>{
    const job = jobByIdAnyStorage(el.dataset.crewJob);
    if(!job) return;
    selectedJob = job;
    selectedJobTab = 'details';
    currentView = 'crewJobDetail';
    render();
  }));
  document.querySelectorAll('[data-crew-job]').forEach(el=>el.addEventListener('keydown',event=>{
    if(event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    el.click();
  }));
  document.querySelectorAll('[data-crew-job-filter]').forEach(el=>el.addEventListener('click',()=>{
    crewJobListFilter = el.dataset.crewJobFilter || 'all';
    crewPageTab = 'jobs';
    currentView = 'crewView';
    render();
  }));
  document.getElementById('crewJobSearch')?.addEventListener('input',event=>{
    crewJobSearchQuery=event.target.value;
    render();
    requestAnimationFrame(()=>{
      const input=document.getElementById('crewJobSearch');
      input?.focus();
      input?.setSelectionRange(crewJobSearchQuery.length,crewJobSearchQuery.length);
    });
  });
  document.getElementById('crewJobStatusFilter')?.addEventListener('change',event=>{
    crewJobListFilter=event.target.value || 'all';
    render();
  });
  document.getElementById('clearCrewJobFilters')?.addEventListener('click',()=>{
    crewJobSearchQuery='';
    crewJobListFilter='all';
    render();
  });
  document.querySelectorAll('[data-crew-page-tab]').forEach(el=>el.addEventListener('click',()=>{
    crewPageTab = el.dataset.crewPageTab || 'profile';
    render();
  }));
  const teamAccountForm=document.getElementById('teamAccountForm');
  const updateUserLoginFields=()=>{
    if(!teamAccountForm) return;
    const role=String(teamAccountForm.elements.teamRole?.value || 'crew');
    teamAccountForm.querySelectorAll('[data-role-field]').forEach(field=>{
      const visible=field.dataset.roleField.split(' ').includes(role);
      field.hidden=!visible;
      field.querySelectorAll('input,select,textarea').forEach(control=>control.disabled=!visible);
    });
  };
  teamAccountForm?.elements.teamRole?.addEventListener('change',updateUserLoginFields);
  teamAccountForm?.querySelectorAll('[data-manual-user-login]').forEach(input=>{
    const unlock=()=>input.removeAttribute('readonly');
    input.addEventListener('focus',unlock,{once:true});
    input.addEventListener('pointerdown',unlock,{once:true});
  });
  updateUserLoginFields();
  document.getElementById('cancelTeamAccount')?.addEventListener('click',()=>{
    teamAccountForm?.reset();
    updateUserLoginFields();
    teamAccountForm?.querySelector('[name="teamName"]')?.focus();
  });
  teamAccountForm?.addEventListener('submit', async e=>{
    e.preventDefault();
    const f = new FormData(e.target);
    const name = String(f.get('teamName') || '').trim();
    const email = String(f.get('teamEmail') || '').trim().toLowerCase();
    const password = String(f.get('teamPassword') || '');
    const role = String(f.get('teamRole') || 'crew');
    const phone = String(f.get('teamPhone') || '').trim();
    const employmentStatus = String(f.get('teamEmploymentStatus') || 'Active');
    const crewRole = String(f.get('teamCrewRole') || '').trim() || (role === 'crew' ? 'Crew Member' : 'Administrator');
    const address = String(f.get('teamAddress') || '').trim();
    const emergencyContact = String(f.get('teamEmergencyContact') || '').trim();
    const profileNotes = String(f.get('teamProfileNotes') || '').trim();
    if(!name || !email){ showToast('Enter name and email'); return; }
    if(!password){ showToast('Enter a password'); return; }
    const users = getUsers();
    if(users.some(u => u.email === email)){ showToast('Account already exists'); return; }
    const submit = e.target.querySelector('button[type="submit"]');
    const oldText = submit?.textContent;
    if(submit){ submit.disabled = true; submit.textContent = 'Creating...'; }
    const createdAt = Date.now();
    let createdCustomerProfile=null;
    let linkedCustomerProfile=null;
    if(role==='customer'){
      linkedCustomerProfile=state.customers.find(customer=>
        normalizeEmailText(customer.email)===email || normalizeText(customer.name)===normalizeText(name)
      );
      if(!linkedCustomerProfile){
        createdCustomerProfile={id:createdAt,createdAt,name,email,phone,service:'',address,notes:profileNotes};
        state.customers.push(createdCustomerProfile);
        linkedCustomerProfile=createdCustomerProfile;
      }
    }
    let user = {id:createdAt, createdAt, name, email, role, phone, employmentStatus, crewRole, address, emergencyContact, profileNotes, customerId:String(linkedCustomerProfile?.id || ''), customerName:String(linkedCustomerProfile?.name || ''), ownerEmail: currentUser.email};
    try {
      const result = await apiRequest('/auth/team/register', {...user, password});
      user = {...user, ...result.user, id: user.id, createdAt};
      showToast(`${roleLabel({role})} login created`);
    } catch (error) {
      if(createdCustomerProfile) state.customers=state.customers.filter(customer=>String(customer.id)!==String(createdCustomerProfile.id));
      if(error.message?.includes('exists')){ showToast('Account already exists'); return; }
      showToast(error.message || `Unable to create ${roleLabel({role})} login`);
      return;
    } finally {
      if(submit && document.body.contains(submit)){
        submit.disabled = false;
        submit.textContent = oldText;
      }
    }
    users.push(user);
    setUsers(users);
    if(role === 'crew' && !findCrewRecordForUser(user)){
      state.crew.push({
        id:createdAt,
        createdAt,
        name,
        email,
        phone,
        role:crewRole || 'Crew Member',
        status:employmentStatus,
        address,
        emergencyContact,
        profileNotes,
        authUid:user.authUid || '',
        jobs:0
      });
    }
    await saveWorkspaceToBackend();
    e.target.reset();
    render();
  });
  document.querySelectorAll('[data-edit-team-account]').forEach(button=>button.addEventListener('click',()=>{
    const key=String(button.dataset.editTeamAccount || '');
    const user=getUsers().find(item=>String(item.authUid || item.id || item.email)===key);
    if(user) openEditTeamAccountModal(user);
  }));
  document.querySelectorAll('[data-delete-team-account]').forEach(button=>button.addEventListener('click',()=>{
    const key=String(button.dataset.deleteTeamAccount || '');
    const user=getUsers().find(item=>String(item.authUid || item.id || item.email)===key);
    if(!user) return;
    if(normalizeEmailText(user.email)===normalizeEmailText(currentUser?.email)){
      showToast('The active Admin account cannot be deleted','error');
      return;
    }
    openDeleteConfirm(
      'Delete user login?',
      `Delete ${user.name || user.email}'s login access? Existing business records will be kept, and this login can be restored from Data & Backup.`,
      async()=>{
        captureDeletedRecord('teamAccounts',user);
        await apiRequest('/auth/team/delete',{authUid:user.authUid || '',email:user.email || ''});
        setUsers(getUsers().filter(item=>String(item.authUid || item.id || item.email)!==key));
        showToast(`${user.name || user.email} login deleted`);
        render();
      }
    );
  }));
  document.querySelectorAll('[data-resend-verification]').forEach(button=>button.addEventListener('click',async()=>{
    const key=String(button.dataset.resendVerification || '');
    const user=getUsers().find(item=>String(item.authUid || item.id || item.email)===key);
    if(!user) return;
    button.disabled=true;
    try{
      await apiRequest('/auth/team/resend-verification',{authUid:user.authUid || '',email:user.email});
      showToast(`Verification email sent to ${user.email}`);
    }catch(error){
      showToast(error.message || 'Unable to send verification email','error');
    }finally{
      if(document.body.contains(button)) button.disabled=false;
    }
  }));

  // Mobile navigation
  document.getElementById('mobileMore')?.addEventListener('click',()=>document.getElementById('drawerOverlay')?.classList.add('open'));

  // Tabs
  document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>{ selectedJobTab=el.dataset.tab; render(); });

  const adminPhotoJob=hasManagementAccess() ? ensureCrewJobFields(selectedJob) : null;
  document.getElementById('adminJobPhotoUpload')?.addEventListener('change',async event=>{
    const files=Array.from(event.target.files || []);
    if(!files.length || !adminPhotoJob) return;
    try{
      const images=await Promise.all(files.map(readJobPhoto));
      adminPhotoJob.photos=[...(adminPhotoJob.photos || []),...images];
      recordAudit(adminPhotoJob,'Job photos added',`${images.length} photo${images.length===1?'':'s'} uploaded`);
      saveAssignedJob(adminPhotoJob);
      await saveToFirebase('jobs',adminPhotoJob);
      showToast(images.length===1?'Photo added':'Photos added');
      render();
    }catch(error){ showToast(error.message || 'Unable to add photos','error'); }
  });
  document.querySelectorAll('[data-admin-replace-photo]').forEach(input=>input.addEventListener('change',async event=>{
    const file=event.target.files?.[0];
    const index=Number(event.target.dataset.adminReplacePhoto);
    if(!file || !adminPhotoJob) return;
    try{
      adminPhotoJob.photos[index]=await readJobPhoto(file);
      recordAudit(adminPhotoJob,'Job photo edited',`Photo ${index+1} replaced`);
      saveAssignedJob(adminPhotoJob);
      await saveToFirebase('jobs',adminPhotoJob);
      showToast('Photo updated');
      render();
    }catch(error){ showToast(error.message || 'Unable to update photo','error'); }
  }));
  document.querySelectorAll('[data-admin-remove-photo]').forEach(button=>button.addEventListener('click',()=>{
    const index=Number(button.dataset.adminRemovePhoto);
    if(!adminPhotoJob) return;
    openDeleteConfirm('Delete job photo?',`Remove photo ${index+1} from this job?`,async()=>{
      adminPhotoJob.photos=(adminPhotoJob.photos || []).filter((_,photoIndex)=>photoIndex!==index);
      recordAudit(adminPhotoJob,'Job photo deleted',`Photo ${index+1} removed`);
      saveAssignedJob(adminPhotoJob);
      await saveToFirebase('jobs',adminPhotoJob);
      showToast('Photo deleted');
      render();
    });
  }));

  // Crew job actions
  const activeCrewJob = ensureCrewJobFields(selectedJob && assignedJobs().some(job => String(job.id) === String(selectedJob.id)) ? selectedJob : assignedJobs()[0]);
  document.querySelectorAll('.edit-my-crew-details').forEach(button=>button.addEventListener('click',()=>openMyCrewDetailsModal()));
  document.getElementById('cvPhotoUpload')?.addEventListener('change',e=>{
    const files = Array.from(e.target.files || []);
    if(!files.length || !activeCrewJob) return;
    Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    }))).then(images => {
      activeCrewJob.photos = [...(activeCrewJob.photos || []), ...images];
      addWorkspaceNotification({audience:'management',kind:'job',id:activeCrewJob.id,severity:'info',title:`${currentUser.name} added job photos`,detail:`#JOB-${activeCrewJob.id} · ${images.length} photo${images.length===1?'':'s'} added`});
      saveAssignedJob(activeCrewJob);
      selectedJob = activeCrewJob;
      showToast(images.length > 1 ? 'Photos uploaded' : 'Photo uploaded');
      render();
    });
  });
  document.querySelectorAll('[data-replace-photo]').forEach(input=>input.addEventListener('change',e=>{
    const file = e.target.files?.[0];
    const index = Number(e.target.dataset.replacePhoto);
    if(!file || !activeCrewJob) return;
    const reader = new FileReader();
    reader.onload = () => {
      activeCrewJob.photos = activeCrewJob.photos || [];
      activeCrewJob.photos[index] = reader.result;
      addWorkspaceNotification({audience:'management',kind:'job',id:activeCrewJob.id,severity:'info',title:`${currentUser.name} updated a job photo`,detail:`#JOB-${activeCrewJob.id} · Photo ${index+1} replaced`});
      saveAssignedJob(activeCrewJob);
      selectedJob = activeCrewJob;
      showToast('Photo updated');
      render();
    };
    reader.readAsDataURL(file);
  }));
  document.querySelectorAll('[data-remove-photo]').forEach(button=>button.addEventListener('click',()=>{
    const index = Number(button.dataset.removePhoto);
    if(!activeCrewJob) return;
    activeCrewJob.photos = (activeCrewJob.photos || []).filter((_,photoIndex)=>photoIndex !== index);
    addWorkspaceNotification({audience:'management',kind:'job',id:activeCrewJob.id,severity:'info',title:`${currentUser.name} removed a job photo`,detail:`#JOB-${activeCrewJob.id} · Photo ${index+1} removed`});
    saveAssignedJob(activeCrewJob);
    selectedJob = activeCrewJob;
    showToast('Photo deleted');
    render();
  }));
  document.getElementById('cvCompleteJob')?.addEventListener('click',()=>{
    if(!activeCrewJob) return;
    updateCrewJobProgress(activeCrewJob,currentUser.name,'completed');
    addWorkspaceNotification({audience:'management',kind:'job',id:activeCrewJob.id,severity:'info',title:`${currentUser.name} completed a job`,detail:`#JOB-${activeCrewJob.id} · ${activeCrewJob.service} for ${activeCrewJob.customer}`});
    saveAssignedJob(activeCrewJob);
    selectedJob = activeCrewJob;
    showToast('Job completed');
    render();
  });
  document.querySelectorAll('[data-check-index]').forEach(el=>el.addEventListener('click',()=>{
    if(!activeCrewJob) return;
    const index = Number(el.dataset.checkIndex);
    activeCrewJob.checklist[index].done = !activeCrewJob.checklist[index].done;
    saveAssignedJob(activeCrewJob);
    selectedJob = activeCrewJob;
    render();
  }));
  document.getElementById('cvSaveNotes')?.addEventListener('click',()=>{
    if(!activeCrewJob) return;
    activeCrewJob.notes = document.getElementById('cvNotes')?.value || '';
    addWorkspaceNotification({audience:'management',kind:'job',id:activeCrewJob.id,severity:'info',title:`${currentUser.name} updated job notes`,detail:`#JOB-${activeCrewJob.id} · ${activeCrewJob.service}`});
    saveAssignedJob(activeCrewJob);
    selectedJob = activeCrewJob;
    showToast('Notes saved');
    render();
  });
  document.getElementById('cvNavigate')?.addEventListener('click',e=>{
    window.open(e.currentTarget.dataset.map, '_blank');
  });
  document.getElementById('cvMessageAdmin')?.addEventListener('click',()=>{
    openCrewAdminMessageModal(activeCrewJob);
  });
  document.getElementById('cvStartJob')?.addEventListener('click',()=>{
    if(!activeCrewJob) return;
    updateCrewJobProgress(activeCrewJob,currentUser.name,'progress');
    addWorkspaceNotification({audience:'management',kind:'job',id:activeCrewJob.id,severity:'info',title:`${currentUser.name} started a job`,detail:`#JOB-${activeCrewJob.id} · ${activeCrewJob.service} for ${activeCrewJob.customer}`});
    saveAssignedJob(activeCrewJob);
    selectedJob=activeCrewJob;
    showToast('Job marked in progress');
    render();
  });
  // Schedule navigation
  document.getElementById('schedPrev')?.addEventListener('click',()=>{scheduleDate.setDate(scheduleDate.getDate()-(scheduleView==='week'?7:32));render();});
  document.getElementById('schedNext')?.addEventListener('click',()=>{scheduleDate.setDate(scheduleDate.getDate()+(scheduleView==='week'?7:32));render();});
  document.getElementById('schedToday')?.addEventListener('click',()=>{scheduleDate=new Date();render();});
  document.getElementById('schedWeek')?.addEventListener('click',()=>{scheduleView='week';selectedDate=null;render();});
  document.getElementById('schedMonth')?.addEventListener('click',()=>{scheduleView='month';selectedDate=null;render();});

  // Month day click
  document.querySelectorAll('.month-day').forEach(el=>{
    if(el.dataset.date) {
      el.addEventListener('click',event=>{
        if(event.target.closest('[data-schedule-calendar-job]')) return;
        selectedDate=el.dataset.date;
        render();
      });
    }
  });

  // Back to month
  document.getElementById('backToMonth')?.addEventListener('click',()=>{selectedDate=null;selectedScheduleJobId=null;selectedScheduleCrewName='';render();});
  document.getElementById('scheduleSearch')?.addEventListener('input',event=>{
    scheduleSearchQuery=event.target.value;
    const cursor=event.target.selectionStart ?? scheduleSearchQuery.length;
    render();
    const input=document.getElementById('scheduleSearch');
    input?.focus();
    input?.setSelectionRange(cursor,cursor);
  });
  document.getElementById('clearScheduleSearch')?.addEventListener('click',()=>{
    scheduleSearchQuery='';
    scheduleTableStatusFilter='all';
    render();
  });
  document.querySelectorAll('[data-schedule-table-filter]').forEach(card=>card.addEventListener('click',()=>{
    scheduleTableStatusFilter=card.dataset.scheduleTableFilter || 'all';
    render();
  }));

  // Status dropdown
  const statusBadge = document.getElementById('statusBadge');
  const statusDropdown = document.getElementById('statusDropdown');
  if(statusBadge && statusDropdown) {
    statusBadge.addEventListener('click',()=>{
      statusDropdown.style.display = statusDropdown.style.display==='none' ? 'block' : 'none';
    });
    document.querySelectorAll('[data-status]').forEach(opt=>{
      opt.addEventListener('click',async ()=>{
        const newStatus = opt.dataset.status;
        if(newStatus === 'completed' && !isCrewUser()){
          showToast('Only the assigned crew can mark a job complete','error');
          statusDropdown.style.display = 'none';
          return;
        }
        if(newStatus === 'invoiced' && !state.invoices.some(invoice=>String(invoice.jobId)===String(selectedJob.id))){
          showToast('Create an invoice before marking this job as invoiced','error');
          statusDropdown.style.display = 'none';
          return;
        }
        selectedJob.status = newStatus;
        selectedJob.statusDate = todayISO();
        if(newStatus==='progress') selectedJob.startedAt=selectedJob.startedAt || new Date().toISOString();
        if(newStatus==='completed') selectedJob.completedAt=selectedJob.completedAt || new Date().toISOString();
        recordAudit(selectedJob,'Status changed',`Status set to ${jobStatusLabel(newStatus)}`);
        await saveToFirebase('jobs', selectedJob);
        save();
        statusDropdown.style.display = 'none';
        showToast(`Job status changed to ${jobStatusLabel(newStatus)}`);
        render();
      });
    });
    document.addEventListener('click',(e)=>{
      if(!statusBadge.contains(e.target) && !statusDropdown.contains(e.target)) {
        statusDropdown.style.display = 'none';
      }
    });
  }

  // Job cards in day view - click to see full details
  document.querySelectorAll('[data-job]').forEach(el=>{
    if(el.classList.contains('job-card-clickable')) {
      el.addEventListener('click',()=>{
        const job = state.jobs.find(j => j.id == el.dataset.job);
        if(isCrewUser() && job && !isCrewAssignedToJob(job,currentUser?.name)){ showToast('Crew can only view assigned jobs'); return; }
        selectedJob = job || assignedJobs()[0] || state.jobs[0];
        currentView = 'jobDetail';
        selectedDate = null;
        render();
      });
    }
  });

  // Job view handlers
  document.getElementById('jobStatusFilter')?.addEventListener('change',e=>{
    jobListFilter = e.target.value;
    render();
  });
  document.getElementById('jobSearch')?.addEventListener('input',e=>{
    jobSearchQuery=e.target.value;
    const cursor=e.target.selectionStart ?? jobSearchQuery.length;
    render();
    const search=document.getElementById('jobSearch');
    search?.focus();
    search?.setSelectionRange(cursor,cursor);
  });

  document.querySelectorAll('[data-tab-export]').forEach(button=>button.addEventListener('click',()=>{
    const type=button.dataset.tabExport;
    const format=button.dataset.exportFormat;
    button.closest('details')?.removeAttribute('open');
    if(format==='excel') exportExcelReport(type);
    else exportPdfReport(type);
  }));
  document.getElementById('exportCustomerPdf')?.addEventListener('click',()=>exportSelectedRecord('customer','pdf'));
  document.getElementById('exportServicePdf')?.addEventListener('click',()=>exportSelectedRecord('service','pdf'));
  document.getElementById('exportJobPdf')?.addEventListener('click',()=>exportSelectedRecord('job','pdf'));
  document.getElementById('emailJob')?.addEventListener('click',async()=>{
    const job=selectedJob;
    if(!job) return;
    const emailButton=document.getElementById('emailJob');
    const deliveryMode=emailButton?.dataset.deliveryMode || '';
    if(!deliveryMode){ openCustomerDeliveryOptions('emailJob','Job'); return; }
    delete emailButton.dataset.deliveryMode;
    // The visible customer name is the reliable delivery choice. Older jobs
    // can retain an ID from a replaced/imported customer record.
    const customer=state.customers.find(item=>normalizeText(item.name)===normalizeText(job.customer))
      || state.customers.find(item=>job.customerId && String(item.id)===String(job.customerId));
    const email=String(customer?.email || '').trim();
    if(!customer){ showToast('Link this job to a customer first','error'); return; }
    if(deliveryMode==='account'){
      await publishRecordToCustomerAccount(job,customer,'job');
      recordAudit(job,'Job shared to customer account','Private customer portal access granted');
      showToast('Job shared to the customer account');
      render();
      return;
    }
    if(!email){ showToast('Add an email address to this customer first','error'); return; }
    const settings=getSettings();
    const originalLabel=emailButton?.textContent || '✉ Send to Customer';
    try{
      if(emailButton){ emailButton.disabled=true; emailButton.textContent='Sending...'; }
      await apiRequest('/jobs/send-email',{
        to:email,
        company:{name:settings.companyName || 'GreenOps',email:settings.email || '',address:settings.address || '',phone:settings.phone || '',website:settings.website || '',companyLogoDataUrl:settings.companyLogoDataUrl || ''},
        job:{
          id:job.id,
          // Send the resolved customer name too. Older jobs can be linked by id
          // without retaining a customer-name value on the job record.
          customer:job.customer || customer?.name || '',
          customerName:customer?.name || job.customer || '',
          customerAddress:customer?.address || job.address || '',
          customerEmail:email,
          service:job.service || '',
          date:displayDate(job.date),
          time:job.time || '',
          crew:job.crew || '',
          duration:job.duration || '',
          priority:job.priority || '',
          price:Number(job.price || 0),
          status:jobStatusLabel(job.status),
          notes:job.notes || ''
        },
        shareToAccount:deliveryMode==='both'
      });
      if(deliveryMode==='both') shareRecordWithCustomer(job,customer,'job');
      recordAudit(job,'Job PDF emailed',`PDF job summary sent to ${email}`);
      // The email endpoint already persists the shared record atomically on
      // the server. Saving this older browser copy afterward could overwrite
      // the customer sharing link and leave the portal empty.
      if(deliveryMode!=='both') await saveToFirebase('jobs',job);
      showToast(deliveryMode==='both' ? `Job emailed and shared with ${customer.name}` : `Job PDF emailed to ${email}`);
      render();
    }catch(error){
      const message=error?.status===503
        ? 'Email is not configured. Add the admin SMTP settings to send PDF attachments.'
        : (error?.message || 'Unable to send the job PDF email.');
      showToast(message,'error');
    }finally{
      if(emailButton && document.body.contains(emailButton)){ emailButton.disabled=false; emailButton.textContent=originalLabel; }
    }
  });
  document.getElementById('exportEstimatePdf')?.addEventListener('click',()=>exportSelectedRecord('estimate','pdf'));
  document.getElementById('exportInvoicePdf')?.addEventListener('click',()=>exportSelectedRecord('invoice','pdf'));
  document.getElementById('emailInvoice')?.addEventListener('click',async()=>{
    const invoice=state.invoices.find(item=>item.id===selectedInvoice);
    if(!invoice) return;
    const emailButton=document.getElementById('emailInvoice');
    const deliveryMode=emailButton?.dataset.deliveryMode || '';
    if(!deliveryMode){ openCustomerDeliveryOptions('emailInvoice','Invoice'); return; }
    delete emailButton.dataset.deliveryMode;
    const customer=state.customers.find(item=>normalizeText(item.name)===normalizeText(invoice.customer));
    const email=String(customer?.email || '').trim();
    if(!customer){ showToast('Link this invoice to a customer first','error'); return; }
    if(deliveryMode==='account'){
      await publishRecordToCustomerAccount(invoice,customer,'invoice');
      recordAudit(invoice,'Invoice shared to customer account','Private customer portal access granted');
      showToast('Invoice shared to the customer account');
      render();
      return;
    }
    if(!email){ showToast('Add an email address to this customer first','error'); return; }
    const settings=getSettings();
    const company=settings.companyName || 'GreenOps';
    const originalLabel=emailButton?.textContent || 'Send Invoice';
    try{
      if(emailButton){ emailButton.disabled=true; emailButton.textContent='Sending...'; }
      await apiRequest('/invoices/send-email',{
        to:email,
        company:{name:company,address:settings.address || '',phone:settings.phone || '',email:settings.email || '',website:settings.website || '',companyLogoDataUrl:settings.companyLogoDataUrl || ''},
        invoice:{
          id:invoice.id,
          customer:invoice.customer,
          customerAddress:customer?.address || '',
          customerEmail:email,
          jobId:invoice.jobId || '',
          projectName:invoice.projectName || '',
          invoiceDate:displayDate(invoice.invoiced),
          dueDate:displayDate(invoice.due),
          lineItems:invoiceLineItems(invoice),
          subtotal:invoiceSubtotal(invoice),
          discount:Number(invoice.discount || 0),
          tax:invoiceTaxAmount(invoice),
          total:invoiceTotal(invoice),
          paid:invoicePaidAmount(invoice),
          due:invoiceDueAmount(invoice),
          notes:invoice.notes || ''
        },
        shareToAccount:deliveryMode==='both'
      });
      if(invoicePaidAmount(invoice)===0 && invoice.status!=='cancelled') invoice.status='sent';
      if(deliveryMode==='both') shareRecordWithCustomer(invoice,customer,'invoice');
      recordAudit(invoice,'Invoice emailed',`PDF invoice sent to ${email}`);
      if(deliveryMode!=='both') await saveToFirebase('invoices',invoice);
      showToast(deliveryMode==='both' ? `Invoice emailed and shared with ${customer.name}` : `Invoice emailed to ${email}`);
      render();
    }catch(error){
      const message=error?.status===503
        ? 'Invoice email is not configured. Add SMTP settings to send the PDF automatically.'
        : (error?.message || 'Unable to send the invoice email with its PDF attachment.');
      showToast(message,'error');
    }finally{
      if(emailButton && document.body.contains(emailButton)){ emailButton.disabled=false; emailButton.textContent=originalLabel; }
    }
  });
  document.getElementById('exportCrewMemberPdf')?.addEventListener('click',()=>exportSelectedRecord('crew','pdf'));
  document.querySelectorAll('.reports-page [data-report-range]').forEach(button=>button.addEventListener('click',()=>{
    reportRange=button.dataset.reportRange || 'year';
    render();
  }));
  document.getElementById('reportStartDate')?.addEventListener('change',event=>{
    reportCustomStart=event.target.value;
    reportRange='custom';
    render();
  });
  document.getElementById('reportEndDate')?.addEventListener('change',event=>{
    reportCustomEnd=event.target.value;
    reportRange='custom';
    render();
  });
  document.querySelectorAll('[data-report-card]').forEach(card=>card.addEventListener('click',()=>{
    const target=card.dataset.reportCard;
    const start=card.dataset.reportStart || '';
    const end=card.dataset.reportEnd || '';
    if(target==='invoices'){
      invoiceDrilldown={service:card.dataset.reportService || '',start,end,aging:''};
      invoiceListFilter=card.dataset.reportStatus || 'all';
      currentView='invoices';
    }else if(target==='jobs'){
      jobDateRange={start,end};
      jobListFilter=card.dataset.reportJobStatus || 'all';
      currentView='jobs';
    }else if(target==='estimates'){
      estimateDateRange={start,end};
      estimateListFilter='all';
      currentView='estimates';
    }else if(target==='customers'){
      currentView='customers';
    }
    render();
  }));
  // Detailed invoice widgets use these attributes too. Exclude the top
  // metric cards: their dedicated handler above routes Jobs and Customers
  // to their respective tabs.
  document.querySelectorAll('[data-report-service]:not(.report-metric-card),[data-report-month-start]:not(.report-metric-card),[data-report-status]:not(.report-metric-card),[data-report-aging]:not(.report-metric-card)').forEach(button=>button.addEventListener('click',()=>{
    invoiceDrilldown={
      service:button.dataset.reportService || '',
      start:button.dataset.reportMonthStart || '',
      end:button.dataset.reportMonthEnd || '',
      aging:button.dataset.reportAging || ''
    };
    invoiceListFilter=button.dataset.reportStatus || (invoiceDrilldown.aging ? 'overdue' : 'all');
    currentView='invoices';
    render();
  }));
  document.getElementById('clearInvoiceDrilldown')?.addEventListener('click',()=>{
    invoiceDrilldown={service:'',start:'',end:'',aging:''};
    invoiceCustomerFilter='';
    invoiceListFilter='all';
    render();
  });

  // Estimate view
  document.querySelectorAll('.view-estimate-btn').forEach(el=>{
    el.addEventListener('click',(e)=>{
      e.stopPropagation();
      selectedEstimate = el.dataset.estimate;
      currentView = 'estimateDetail';
      render();
    });
  });

  // Back to estimates
  document.getElementById('backToEstimates')?.addEventListener('click',()=>{
    selectedEstimate = null;
    currentView = 'estimates';
    render();
  });

  // Estimate search and filter
  document.getElementById('estimateSearch')?.addEventListener('input',e=>{
    estimateSearchQuery=e.target.value;
    const cursor=e.target.selectionStart ?? estimateSearchQuery.length;
    render();
    const search=document.getElementById('estimateSearch');
    search?.focus();
    search?.setSelectionRange(cursor,cursor);
  });

  document.getElementById('estimateFilter')?.addEventListener('change',e=>{
    estimateListFilter=e.target.value;
    render();
  });

  // Estimate actions
  document.getElementById('convertToJob')?.addEventListener('click',()=>{
    const est = state.estimates.find(e => e.id === selectedEstimate);
    if(!est) return;

    const customer = state.customers.find(c => normalizeText(c.name) === normalizeText(est.customer));
    if(!customer) { showToast('Customer not found'); return; }

    const jobPrefill = {
      sourceEstimateId: est.id,
      customer: est.customer,
      service: est.service,
      price: est.amount
    };

    selectedEstimate = null;
    currentView = 'jobs';
    render();
    setTimeout(() => openJobModal(jobPrefill), 0);
  });

  document.getElementById('viewConvertedJob')?.addEventListener('click',()=>{
    const est = state.estimates.find(e => e.id === selectedEstimate);
    const job = convertedJobForEstimate(est);
    if(!job) return;
    selectedJob = job;
    selectedJobTab = 'details';
    currentView = 'jobDetail';
    render();
  });

  document.getElementById('printEstimate')?.addEventListener('click',()=>{
    const est = state.estimates.find(e => e.id === selectedEstimate);
    if(!est) return;
    const printContent = `
      ESTIMATE ${est.id}
      Customer: ${est.customer}
      Service: ${est.service}
      Amount: $${est.amount}
      Status: ${estimateStatusLabel(est.status)}
      Valid until: ${displayDate(estimateExpirationDate(est))}
    `;
    const win = window.open('','','height=600,width=800');
    win.document.write('<pre>'+printContent+'</pre>');
    win.document.close();
    win.print();
  });

  document.getElementById('emailEstimate')?.addEventListener('click',async()=>{
    const est = state.estimates.find(e => e.id === selectedEstimate);
    if(!est) return;
    const emailButton=document.getElementById('emailEstimate');
    const deliveryMode=emailButton?.dataset.deliveryMode || '';
    if(!deliveryMode){ openCustomerDeliveryOptions('emailEstimate','Estimate'); return; }
    delete emailButton.dataset.deliveryMode;
    const customer=state.customers.find(item=>normalizeText(item.name)===normalizeText(est.customer))
      || state.customers.find(item=>est.customerId && String(item.id)===String(est.customerId));
    const email=String(customer?.email || '').trim();
    if(!customer){ showToast('Link this estimate to a customer first','error'); return; }
    if(deliveryMode==='account'){
      await publishRecordToCustomerAccount(est,customer,'estimate');
      recordAudit(est,'Estimate shared to customer account','Private customer portal access granted');
      showToast('Estimate shared to the customer account');
      render();
      return;
    }
    if(!email){ showToast('Add an email address to this customer first','error'); return; }
    const settings=getSettings();
    const originalLabel=emailButton?.textContent || 'Send to Customer';
    try{
      if(emailButton){ emailButton.disabled=true; emailButton.textContent='Sending...'; }
      await apiRequest('/estimates/send-email',{
        to:email,
        company:{name:settings.companyName || 'GreenOps',email:settings.email || '',address:settings.address || '',phone:settings.phone || '',website:settings.website || '',companyLogoDataUrl:settings.companyLogoDataUrl || ''},
        estimate:{
          id:est.id,
          customer:est.customer,
          customerAddress:customer?.address || '',
          customerEmail:email,
          service:est.service || '',
          amount:Number(est.amount || 0),
          createdDate:displayDate(estimateCreatedDate(est)),
          validUntil:displayDate(estimateExpirationDate(est)),
          notes:est.notes || ''
        },
        shareToAccount:deliveryMode==='both'
      });
      if(deliveryMode==='both') shareRecordWithCustomer(est,customer,'estimate');
      recordAudit(est,'Estimate emailed',`PDF estimate sent to ${email}`);
      if(deliveryMode!=='both') await saveToFirebase('estimates',est);
      showToast(deliveryMode==='both' ? `Estimate emailed and shared with ${customer.name}` : `Estimate emailed to ${email}`);
      render();
    }catch(error){
      const message=error?.status===503
        ? 'Email is not configured. Add the admin SMTP settings to send PDF attachments.'
        : (error?.message || 'Unable to send the estimate PDF email.');
      showToast(message,'error');
    }finally{
      if(emailButton && document.body.contains(emailButton)){ emailButton.disabled=false; emailButton.textContent=originalLabel; }
    }
  });

  document.getElementById('sendReminder')?.addEventListener('click',()=>{
    const est = state.estimates.find(e => e.id === selectedEstimate);
    if(!est) return;
    const customer=state.customers.find(item=>
      (est.customerId && String(item.id)===String(est.customerId)) || normalizeText(item.name)===normalizeText(est.customer)
    );
    const email=String(customer?.email || '').trim();
    if(!email){ showToast('Add an email address to this customer first','error'); return; }
    const settings=getSettings();
    const subject=`Reminder: Estimate ${est.id} from ${settings.companyName || 'GreenOps'}`;
    const body=[
      `Hello ${customer?.name || est.customer},`,
      '',
      `This is a friendly reminder about your estimate from ${settings.companyName || 'GreenOps'}.`,
      `Estimate: ${est.id}`,
      `Service: ${est.service}`,
      `Estimated Amount: ${money(est.amount)}`,
      `Valid Until: ${displayDate(estimateExpirationDate(est))}`,
      '',
      `Please reply if you would like to approve this estimate or have any questions.`,
      '',
      `Regards,`,
      settings.companyName || 'GreenOps'
    ].join('\n');
    est.lastFollowUpDate=todayISO();
    est.nextFollowUpDate=toISODate(addDays(new Date(),7));
    est.followUpHistory=[...(est.followUpHistory || []),{date:todayISO(),type:'Reminder email opened',user:currentUser?.name || currentUser?.email || 'Admin'}].slice(-25);
    recordAudit(est,'Reminder email opened',`Reminder prepared for ${email}; next follow-up due ${displayDate(est.nextFollowUpDate)}`);
    save();
    saveToFirebase('estimates',est);
    showToast('Opening reminder email');
    window.location.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  document.getElementById('editEstimate')?.addEventListener('click',()=>{
    const est = state.estimates.find(e => e.id === selectedEstimate);
    if(est) openEditEstimateModal(est);
  });

  document.getElementById('saveEstimateNotes')?.addEventListener('click',()=>{
    const est = state.estimates.find(e => e.id === selectedEstimate);
    const notes = document.getElementById('estimateNotes')?.value || '';
    if(est) {
      est.notes = notes;
      save();
      saveToFirebase('estimates', est);
      showToast('Estimate notes saved');
    }
  });

  document.getElementById('deleteEstimate')?.addEventListener('click',()=>{
    deleteEstimateById(selectedEstimate);
  });

  document.getElementById('customerProfile')?.addEventListener('click',()=>{
    const est = state.estimates.find(e => e.id === selectedEstimate);
    if(est) {
      const customer = state.customers.find(c => normalizeText(c.name) === normalizeText(est.customer));
      if(customer) {
        selectedCustomer = customer.id;
        currentView = 'customerProfile';
        render();
      }
    }
  });

  document.querySelectorAll('[data-customer-target]').forEach(button=>{
    button.addEventListener('click',()=>{
      const customer=state.customers.find(c=>c.id==selectedCustomer || c.name===selectedCustomer);
      if(!customer) return;
      const target=button.dataset.customerTarget;
      const customerKey=String(customer.id || customer.name);
      if(target==='jobs'){
        jobCustomerFilter=customerKey;
        jobServiceFilter='';
        jobListFilter='all';
        currentView='jobs';
      }else if(target==='estimates'){
        estimateCustomerFilter=customerKey;
        estimateServiceFilter='';
        estimateListFilter='all';
        currentView='estimates';
      }else{
        invoiceCustomerFilter=customerKey;
        invoiceDrilldown={service:'',start:'',end:'',aging:''};
        invoiceListFilter=target==='paidInvoices' ? 'paid' : 'all';
        currentView='invoices';
      }
      render();
    });
  });

  // Back to customers
  document.getElementById('backToCustomers')?.addEventListener('click',()=>{
    selectedCustomer = null;
    currentView = 'customers';
    render();
  });

  // Edit customer
  document.getElementById('editCustomer')?.addEventListener('click',()=>{
    const customer = state.customers.find(c => c.id == selectedCustomer);
    if(customer) openEditCustomerModal(customer);
  });

  // Delete customer
  document.getElementById('deleteCustomer')?.addEventListener('click',()=>{
    deleteCustomerById(selectedCustomer);
  });

  // Create invoice from job
  document.getElementById('createInvoice')?.addEventListener('click',()=>{
    const job = selectedJob;
    if(!job) return;
    const invoicePrefill = {
      jobId: job.id,
      customer: job.customer,
      service: job.service,
      projectName: `#JOB-${job.id} - ${job.service || 'Job service'}`,
      amount: job.price || 0,
      notes: `Invoice for #JOB-${job.id} - ${job.service || 'Job service'}`
    };
    currentView = 'invoices';
    render();
    openInvoiceModal(invoicePrefill);
  });

  // View invoice from job
  document.getElementById('viewInvoice')?.addEventListener('click',()=>{
    const relatedInvoice = state.invoices.find(inv => String(inv.jobId) === String(selectedJob.id));
    if(relatedInvoice) {
      selectedInvoice = relatedInvoice.id;
      currentView = 'invoiceDetail';
      render();
    }
  });

  // Invoice table rows click
  document.querySelectorAll('[data-invoice]').forEach(el=>{
    el.addEventListener('click',()=>{
      selectedInvoice = el.dataset.invoice;
      currentView = 'invoiceDetail';
      render();
    });
  });

  document.querySelectorAll('[data-invoice-breakdown]').forEach(button=>{
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      selectedInvoice=button.dataset.invoiceBreakdown;
      currentView='invoiceDetail';
      render();
      requestAnimationFrame(()=>document.getElementById('invoiceBillingBreakdown')?.scrollIntoView({behavior:'smooth',block:'start'}));
    });
  });

  // Linked invoices in a job's Status & Payments tab open the full invoice record.
  document.querySelectorAll('.job-payment-status-grid .detail-item').forEach(item=>{
    const invoiceId=item.querySelector('.muted')?.textContent?.trim();
    const invoice=state.invoices.find(record=>record.id===invoiceId);
    if(!invoice) return;
    const openInvoice=()=>{
      selectedInvoice=invoice.id;
      currentView='invoiceDetail';
      render();
    };
    item.classList.add('record-row','job-linked-invoice');
    item.tabIndex=0;
    item.setAttribute('role','link');
    item.setAttribute('aria-label',`Open invoice ${invoice.id}`);
    item.addEventListener('click',openInvoice);
    item.addEventListener('keydown',event=>{
      if(event.key==='Enter' || event.key===' '){
        event.preventDefault();
        openInvoice();
      }
    });
  });

  // Invoice search
  document.getElementById('invoiceSearch')?.addEventListener('input',e=>{
    invoiceSearchQuery=e.target.value;
    const cursor=e.target.selectionStart ?? invoiceSearchQuery.length;
    render();
    const search=document.getElementById('invoiceSearch');
    search?.focus();
    search?.setSelectionRange(cursor,cursor);
  });
  document.getElementById('invoiceStatusFilter')?.addEventListener('change',e=>{
    invoiceListFilter=e.target.value;
    render();
  });

  // Invoice detail handlers
  document.getElementById('backToInvoices')?.addEventListener('click',()=>{
    selectedInvoice = null;
    currentView = 'invoices';
    render();
  });

  document.getElementById('viewBillingBreakdown')?.addEventListener('click',()=>{
    document.getElementById('invoiceBillingBreakdown')?.scrollIntoView({behavior:'smooth',block:'start'});
  });

  // Edit invoice
  document.getElementById('editInvoice')?.addEventListener('click',()=>{
    const inv = state.invoices.find(i => i.id === selectedInvoice);
    if(!inv) return;
    openEditInvoiceModal(inv);
  });

  // Delete invoice
  document.getElementById('deleteInvoice')?.addEventListener('click',()=>{
    deleteInvoiceById(selectedInvoice);
  });

  const openSelectedInvoicePayment = () => {
    const inv = state.invoices.find(i => i.id === selectedInvoice);
    if(inv) openInvoicePaymentModal(inv);
  };
  document.getElementById('addPayment')?.addEventListener('click',openSelectedInvoicePayment);
  document.getElementById('addPaymentHistory')?.addEventListener('click',openSelectedInvoicePayment);
  document.querySelectorAll('[data-edit-payment]').forEach(button=>{
    button.addEventListener('click',()=>{
      const inv = state.invoices.find(i => i.id === selectedInvoice);
      const payment = invoicePaymentRecords(inv).find(item => String(item.id) === String(button.dataset.editPayment));
      if(inv && payment) openInvoicePaymentModal(inv, payment);
    });
  });

  document.querySelectorAll('[data-payment-receipt]').forEach(button=>{
    button.addEventListener('click',()=>{
      const inv = state.invoices.find(i => i.id === selectedInvoice);
      const payment = invoicePaymentRecords(inv).find(item => String(item.id) === String(button.dataset.paymentReceipt));
      if(!inv || !payment) return;
      openPdfReport(`Payment Receipt ${payment.id}`,[
        {title:'Receipt Details',html:pdfTable(['Field','Value'],[
          ['Invoice',inv.id],
          ['Customer',inv.customer],
          ['Payment Date',displayDate(payment.date)],
          ['Payment Method',payment.method],
          ['Reference / Check #',payment.reference || '-'],
          ['Amount Received',money(payment.amount)],
          ['Remaining Balance',money(invoiceDueAmount(inv))],
          ['Notes',payment.notes || '-']
        ])}
      ]);
      recordAudit(inv,'Receipt generated',`${money(payment.amount)} ${payment.method} receipt`);
      saveToFirebase('invoices',inv);
    });
  });

  document.querySelectorAll('[data-delete-payment]').forEach(button=>{
    button.addEventListener('click',()=>{
      const inv = state.invoices.find(i => i.id === selectedInvoice);
      const payment = invoicePaymentRecords(inv).find(item => String(item.id) === String(button.dataset.deletePayment));
      if(!inv || !payment) return;
      openDeleteConfirm('Delete payment?', `Delete the ${money(payment.amount)} ${payment.method || ''} payment?`, async ()=>{
        inv.payments = invoicePaymentRecords(inv).filter(item => String(item.id) !== String(payment.id));
        recordAudit(inv,'Payment deleted',`${money(payment.amount)} ${payment.method || ''} payment removed`);
        recalculateInvoiceFromPayments(inv);
        save();
        await saveToFirebase('invoices', inv);
        showToast('Payment deleted');
        render();
      });
    });
  });

  // Invoice status dropdown
  const statusBadge2 = document.getElementById('statusBadge2');
  const statusDropdown2 = document.getElementById('statusDropdown2');
  if(statusBadge2 && statusDropdown2) {
    statusBadge2.addEventListener('click',()=>{
      statusDropdown2.style.display = statusDropdown2.style.display==='none' ? 'block' : 'none';
    });
    document.querySelectorAll('#statusDropdown2 [data-status]').forEach(opt=>{
      opt.addEventListener('click',async ()=>{
        const inv = state.invoices.find(i => i.id === selectedInvoice);
        if(!inv) return;
        const newStatus = opt.dataset.status;
        inv.status = newStatus;
        recordAudit(inv,'Status changed',`Invoice status set to ${invoiceStatusLabel(newStatus)}`);
        recalculateInvoiceFromPayments(inv);
        if(newStatus === 'cancelled') inv.status = 'cancelled';
        else if(invoicePaidAmount(inv) === 0 && ['draft','sent','unpaid'].includes(newStatus)) inv.status = newStatus;
        await saveToFirebase('invoices', inv);
        save();
        statusDropdown2.style.display = 'none';
        showToast(`Invoice status changed to ${cap(newStatus)}`);
        render();
      });
    });
    document.addEventListener('click',(e)=>{
      if(!statusBadge2.contains(e.target) && !statusDropdown2.contains(e.target)) {
        statusDropdown2.style.display = 'none';
      }
    });
  }

  document.getElementById('markPaid')?.addEventListener('click',()=>{
    const inv = state.invoices.find(i => i.id === selectedInvoice);
    if(inv) {
      const remaining = invoiceDueAmount(inv);
      if(remaining > 0){
        inv.payments = [...invoicePaymentRecords(inv), {
          id: `PAY-${Date.now()}`,
          amount: remaining,
          method: 'Other',
          date: todayISO(),
          reference: '',
          notes: 'Balance marked as paid',
          createdAt: Date.now()
        }];
      }
      recalculateInvoiceFromPayments(inv);
      save();
      saveToFirebase('invoices', inv);
      showToast('Invoice marked as paid');
      render();
    }
  });

  document.getElementById('printInvoice')?.addEventListener('click',()=>{
    const inv = state.invoices.find(i => i.id === selectedInvoice);
    if(!inv) return;
    const items=invoiceLineItems(inv);
    openPdfReport(`Invoice ${inv.id}`,[
      {title:'Billing Information',html:pdfTable(['Field','Value'],[
        ['Customer',inv.customer],
        ['Invoice Date',displayDate(inv.invoiced)],
        ['Due Date',displayDate(inv.due)],
        ['Status',invoiceStatusLabel(invoiceDisplayStatus(inv))],
        ['Related Job',inv.jobId ? `JOB-${inv.jobId}` : '-']
      ])},
      {title:'Services & Materials',html:pdfTable(['Description','Quantity','Rate','Amount'],items.map(item=>[
        item.description,item.quantity,money(item.rate),money(item.quantity*item.rate)
      ]))},
      {title:'Invoice Summary',html:pdfTable(['Subtotal','Tax','Total','Paid','Balance Due'],[[
        money(invoiceSubtotal(inv)),money(invoiceTaxAmount(inv)),money(invoiceTotal(inv)),money(invoicePaidAmount(inv)),money(invoiceDueAmount(inv))
      ]])},
      {title:'Payment History',html:pdfTable(['Date','Method','Reference','Amount','Notes'],invoicePaymentRecords(inv).map(payment=>[
        displayDate(payment.date),payment.method,payment.reference || '-',money(payment.amount),payment.notes || '-'
      ]))}
    ]);
    recordAudit(inv,'Invoice PDF generated',`Invoice ${inv.id} opened for printing`);
    saveToFirebase('invoices',inv);
  });

  document.getElementById('viewRelatedJob')?.addEventListener('click',(e)=>{
    e.preventDefault();
    const inv = state.invoices.find(i => i.id === selectedInvoice);
    if(inv && inv.jobId) {
      selectedJob = state.jobs.find(j => j.id === inv.jobId) || state.jobs[0];
      currentView = 'jobDetail';
      render();
    }
  });

  document.getElementById('newJobCustomer')?.addEventListener('click',()=>{
    const customer = state.customers.find(c => c.id == selectedCustomer);
    if(customer) {
      // Pre-fill with customer info
      const wrap=document.createElement('div');
      wrap.className='modal-backdrop';
      wrap.innerHTML=`<div class="modal"><h3>New Job for ${customer.name}</h3><form id="jobForm"><div class="form-grid">
        <div class="field"><label>Customer</label><input type="text" value="${customer.name}" disabled></div>
        <div class="field"><label>Service</label><select name="service" required><option value="" selected disabled>Select service</option>${serviceNames(true).map(service=>`<option>${escapeHtml(service)}</option>`).join('')}</select></div>
        <div class="field"><label>Date</label><input name="date" type="date" value="${todayISO()}" required></div>
        <div class="field"><label>Due Date</label><input name="due" type="date" value="${todayISO()}" required></div>
        <div class="field"><label>Crew</label><select name="crew" required><option value="" selected disabled>${state.crew.length?'Select crew':'No crew available'}</option>${state.crew.map(c=>`<option>${escapeHtml(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Price</label><input name="price" type="number" min="0" value="0" required></div>
        <div class="field"><label>Priority</label><select name="priority"><option>Low</option><option selected>Medium</option><option>High</option><option>Urgent</option></select></div>
        <div class="field"><label>Duration (hours)</label><input name="duration" type="number" min="0" step="0.25" value="0" required></div>
        <div class="field"><label>Status</label><select name="status" required><option value="notstarted" selected>Not Started</option><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="progress">In Progress</option><option value="onhold">On Hold</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
        <div class="field"><label>Equipment</label><input name="equipment" placeholder="Mower, trimmer, blower"></div>
        <div class="field"><label>Materials</label><input name="materials" placeholder="Mulch, fertilizer, seed"></div>
        <div class="field full"><label>Notes</label><textarea name="notes" rows="3" placeholder="Gate code, pets, special instructions...">${escapeHtml(customer.notes || '')}</textarea></div>
      </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Create Job</button></div></form></div>`;
      document.body.appendChild(wrap);
      wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
      wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
      const customerJobForm=wrap.querySelector('#jobForm');
      bindServiceDefaults(customerJobForm);
      const customerJobDate=customerJobForm.querySelector('[name="date"]');
      const customerJobStatus=customerJobForm.querySelector('[name="status"]');
      customerJobDate.addEventListener('change',()=>{
        if(customerJobDate.value > todayISO()){
          customerJobStatus.value='scheduled';
          showToast('Future job automatically set to Scheduled');
        }
      });
      customerJobForm.onsubmit=async e=>{
        e.preventDefault();
        const f=new FormData(e.target);
        const job=ensureCrewJobFields({id:nextNumericId(state.jobs),time:'',date:f.get('date'),due:f.get('due') || f.get('date'),customer:customer.name,service:f.get('service'),address:customer?.address || '',crew:f.get('crew'),status:f.get('status') || 'notstarted',statusDate:todayISO(),price:Number(f.get('price')),priority:f.get('priority'),duration:f.get('duration'),equipment:f.get('equipment'),materials:f.get('materials'),notes:f.get('notes'),createdBy:currentCreatorName(),createdByEmail:currentUser?.email || '',createdAt:Date.now()});
        state.jobs.push(job);
        save();
        saveToFirebase('jobs',job);
        wrap.remove();
        showToast('Job created for '+customer.name);
        selectedCustomer = null;
        currentView = 'customers';
        render();
      };
    }
  });

  // Job Detail buttons
  document.querySelector('.cv-back')?.addEventListener('click',()=>{currentView='dashboard';render();});
}

function openServiceModal(service=null){
  const isEditing=Boolean(service);
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal wide-modal"><h3>${isEditing?'Edit Service':'Add Service'}</h3><p class="muted payment-modal-summary">Services added here become available throughout GreenOps.</p>
    <form id="serviceForm"><div class="form-grid">
      <div class="field"><label>Service Name</label><input name="name" value="${escapeHtml(service?.name || '')}" placeholder="Example: Lawn Fertilization" required></div>
      <div class="field"><label>Price</label><input name="rate" type="number" min="0" step="0.01" value="${Number(service?.rate || 0)}" required></div>
      <div class="field"><label>Estimated Duration (hours)</label><input name="duration" type="number" min="0" step="0.25" value="${Number(service?.duration ?? 0)}" required></div>
      <div class="field"><label>Status</label><select name="status" required><option value="" ${!service?'selected':''} disabled>Select status...</option><option value="active" ${service?.status==='active'?'selected':''}>Active</option><option value="inactive" ${service?.status==='inactive'?'selected':''}>Inactive</option></select></div>
      <div class="field full"><label>Description</label><textarea name="description" rows="3" placeholder="Describe what is included in this service.">${escapeHtml(service?.description || '')}</textarea></div>
    </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">${isEditing?'Save Service':'Add Service'}</button></div></form>
  </div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.querySelector('#serviceForm').onsubmit=async e=>{
    e.preventDefault();
    const form=new FormData(e.target);
    const name=String(form.get('name') || '').trim();
    if(state.services.some(item=>item!==service && normalizeText(item.name)===normalizeText(name))){
      showToast('A service with this name already exists','error');
      return;
    }
    const oldName=service?.name || '';
    const next={
      id:service?.id || `SRV-${Date.now()}`,
      createdAt:service?.createdAt || Date.now(),
      createdBy:service?.createdBy || service?.createdByName || currentCreatorName(),
      createdByEmail:service?.createdByEmail || currentUser?.email || '',
      ownerEmail:service?.ownerEmail || currentUser?.email || '',
      updatedAt:Date.now(),
      name,
      category:'',
      description:String(form.get('description') || '').trim(),
      rate:Number(form.get('rate') || 0),
      duration:Number(form.get('duration') || 0),
      unit:'Per job',
      status:String(form.get('status') || 'active'),
      taxable:false
    };
    if(isEditing){
      Object.assign(service,next);
      if(normalizeText(oldName)!==normalizeText(name)){
        [...state.customers,...state.jobs,...state.estimates,...state.invoices].forEach(record=>{
          if(normalizeText(record.service)===normalizeText(oldName)) record.service=name;
        });
      }
    }else{
      state.services.push(next);
    }
    save();
    await saveToFirebase('services',next);
    wrap.remove();
    showToast(isEditing?'Service updated':'Service added');
    render();
  };
}

function openAdminProfileModal(){
  const settings=getSettings();
  const profile={...currentUser,...(settings.adminProfile || {})};
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal wide-modal"><h3>Edit My Profile</h3><form id="adminProfileForm"><div class="form-grid">
    <div class="field"><label>Full Name</label><input name="name" value="${escapeHtml(profile.name || '')}" required></div>
    <div class="field"><label>Email</label><input value="${escapeHtml(profile.email || '')}" readonly><small class="muted">Your verified login email cannot be changed here.</small></div>
    <div class="field"><label>Phone</label><input name="phone" value="${escapeHtml(profile.phone || '')}" placeholder="Phone number"></div>
    <div class="field"><label>Job Title</label><input name="title" value="${escapeHtml(profile.title || 'Business Owner / Administrator')}" placeholder="Business Owner"></div>
    <div class="field full"><label>Address</label><input name="address" value="${escapeHtml(profile.address || '')}" placeholder="Street, city, state"></div>
    <div class="field"><label>Timezone</label><input name="timezone" value="${escapeHtml(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '')}" placeholder="America/Chicago"></div>
    <div class="field"><label>Preferred Contact</label><select name="preferredContact"><option ${profile.preferredContact==='Email'?'selected':''}>Email</option><option ${profile.preferredContact==='Phone'?'selected':''}>Phone</option></select></div>
    <div class="field full"><label>Profile Notes</label><textarea name="bio" rows="4" placeholder="Add responsibilities, preferences, or internal profile notes.">${escapeHtml(profile.bio || '')}</textarea></div>
  </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Save Profile</button></div></form></div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.querySelector('#adminProfileForm').onsubmit=async e=>{
    e.preventDefault();
    const form=new FormData(e.target);
    const adminProfile={
      name:String(form.get('name') || '').trim(),
      phone:String(form.get('phone') || '').trim(),
      title:String(form.get('title') || '').trim(),
      address:String(form.get('address') || '').trim(),
      timezone:String(form.get('timezone') || '').trim(),
      preferredContact:String(form.get('preferredContact') || 'Email'),
      bio:String(form.get('bio') || '').trim()
    };
    state.settings={...settings,adminProfile};
    currentUser={...currentUser,...adminProfile};
    localStorage.setItem(USER_KEY,JSON.stringify(currentUser));
    save();
    await saveToFirebase('settings',state.settings);
    wrap.remove();
    showToast('Profile updated');
    render();
  };
}

function openJobModal(prefill = {}){
  if(!requireManualService()) return;
  if(!state.customers.length){ showToast('Add a customer first'); openCustomerModal(); return; }
  const isScheduleContext = currentView === 'schedule';
  const jobModalTitle = isScheduleContext ? 'Schedule Job' : 'Create New Job';
  const jobSubmitLabel = isScheduleContext ? 'Schedule Job' : 'Create Job';
  const serviceOptions = serviceNames(true,[prefill.service]);
  const selectedCustomerName = prefill.customer || '';
  const selectedServiceName = prefill.service || '';
  const selectedCrewName = prefill.crew || '';
  const selectedStatus = prefill.status || (prefill.sourceEstimateId ? 'scheduled' : 'notstarted');
  const selectedScheduleStatus = prefill.status || 'scheduled';
  const scheduleJobNumberField=`<div class="field"><label>Job No.</label><input name="scheduledJobId" inputmode="numeric" autocomplete="off" value="${escapeHtml(prefill.scheduledJobId || '')}" placeholder="Enter job no. (example: 1029)" required></div>`;
  const scheduleOnlyFields=`
    ${scheduleTimeSlotFields(prefill.time || '6 AM - 8 AM')}
    <div class="field"><label>Status</label><select name="status" required>
      <option value="notstarted" ${selectedScheduleStatus==='notstarted'?'selected':''}>Not Started</option>
      <option value="pending" ${selectedScheduleStatus==='pending'?'selected':''}>Pending</option>
      <option value="scheduled" ${selectedScheduleStatus==='scheduled'?'selected':''}>Scheduled</option>
      <option value="rescheduled" ${selectedScheduleStatus==='rescheduled'?'selected':''}>Rescheduled</option>
      <option value="progress" ${selectedScheduleStatus==='progress'?'selected':''}>In Progress</option>
      <option value="onhold" ${selectedScheduleStatus==='onhold'?'selected':''}>On Hold</option>
      <option value="completed" ${selectedScheduleStatus==='completed'?'selected':''}>Completed</option>
      <option value="cancelled" ${selectedScheduleStatus==='cancelled'?'selected':''}>Cancelled</option>
    </select></div>
    <div class="field full"><label>Notes / Description</label><textarea name="notes" rows="3" placeholder="Add scheduling notes, job description, access details, or special instructions...">${escapeHtml(prefill.notes || '')}</textarea></div>`;
  const jobDetailFields=`
    <div class="field"><label>Price</label><input name="price" type="number" min="0" value="${prefill.price ?? 0}" required></div>
    <div class="field"><label>Priority</label><select name="priority"><option>Low</option><option selected>Medium</option><option>High</option><option>Urgent</option></select></div>
    <div class="field"><label>Duration (hours)</label><input name="duration" type="number" min="0" step="0.25" value="${prefill.duration ?? 0}" required></div>
    <div class="field"><label>Status</label><select name="status" required>
      <option value="" ${!selectedStatus?'selected':''} disabled>Select status...</option>
      <option value="notstarted" ${selectedStatus==='notstarted'?'selected':''}>Not Started</option>
      <option value="pending" ${selectedStatus==='pending'?'selected':''}>Pending</option>
      <option value="scheduled" ${selectedStatus==='scheduled'?'selected':''}>Scheduled</option>
      <option value="progress" ${selectedStatus==='progress'?'selected':''}>In Progress</option>
      <option value="onhold" ${selectedStatus==='onhold'?'selected':''}>On Hold</option>
      <option value="completed" ${selectedStatus==='completed'?'selected':''}>Completed</option>
      <option value="cancelled" ${selectedStatus==='cancelled'?'selected':''}>Cancelled</option>
    </select></div>
    <div class="field"><label>Equipment</label><input name="equipment" placeholder="Mower, trimmer, blower"></div>
    <div class="field"><label>Materials</label><input name="materials" placeholder="Mulch, fertilizer, seed"></div>
    <div class="field full"><label>Notes</label><textarea name="notes" rows="3" placeholder="Gate code, pets, special instructions...">${escapeHtml(prefill.notes || '')}</textarea></div>`;
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal"><h3>${jobModalTitle}</h3><form id="jobForm"><div class="form-grid">
    ${isScheduleContext ? scheduleJobNumberField : ''}
    <div class="field"><label>Customer</label><select name="customer" required><option value="" ${!selectedCustomerName?'selected':''} disabled>Select customer</option>${state.customers.map(c=>`<option ${c.name===selectedCustomerName?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Service</label><select name="service" required><option value="" ${!selectedServiceName?'selected':''} disabled>Select service</option>${serviceOptions.map(s=>`<option ${s===selectedServiceName?'selected':''}>${escapeHtml(s)}</option>`).join('')}</select></div>
    <div class="field"><label>Date</label><input name="date" type="date" value="${prefill.date || todayISO()}" required></div>
    ${isScheduleContext ? '' : `<div class="field"><label>Due Date</label><input name="due" type="date" value="${prefill.due || prefill.date || todayISO()}" required></div>`}
    ${isScheduleContext ? `<div class="field"><label>Assigned Crews</label><details class="schedule-crew-dropdown"><summary><span data-crew-picker-label>Select crew members</span><span class="schedule-crew-chevron">⌄</span></summary><div class="schedule-crew-menu">${state.crew.map(c=>`<label class="schedule-crew-choice"><input type="checkbox" name="crew" value="${escapeHtml(c.name)}" ${assignedCrewNames(prefill).includes(c.name) || c.name===selectedCrewName?'checked':''}><span>${escapeHtml(c.name)}</span></label>`).join('')}</div></details></div>` : ''}
    ${isScheduleContext ? scheduleOnlyFields : jobDetailFields}
  </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">${jobSubmitLabel}</button></div></form></div>`;
  document.body.appendChild(wrap); wrap.onclick=e=>{if(e.target===wrap)wrap.remove()}; wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  const newJobForm=wrap.querySelector('#jobForm');
  // Keep the original appointment only for an existing schedule edit. This
  // lets us distinguish a first-time schedule from a genuine reschedule.
  newJobForm.dataset.scheduleEdit=prefill.scheduleEdit ? 'true' : 'false';
  newJobForm.dataset.scheduleEditCrew=prefill.scheduleEditCrew || '';
  newJobForm.dataset.scheduleOriginalDate=prefill.scheduleOriginalDate || '';
  newJobForm.dataset.scheduleOriginalTime=prefill.scheduleOriginalTime || '';
  bindServiceDefaults(newJobForm);
  const newJobDate=newJobForm.querySelector('[name="date"]');
  const newJobStatus=newJobForm.querySelector('[name="status"]');
  const scheduledJobInput=newJobForm.querySelector('[name="scheduledJobId"]');
  const crewPickerLabel=newJobForm.querySelector('[data-crew-picker-label]');
  const updateCrewPickerLabel=()=>{
    if(!crewPickerLabel) return;
    const names=[...newJobForm.querySelectorAll('[name="crew"]:checked')].map(input=>input.value);
    crewPickerLabel.textContent=names.length ? names.join(', ') : 'Select crew members';
  };
  newJobForm.querySelectorAll('[name="crew"]').forEach(input=>input.addEventListener('change',updateCrewPickerLabel));
  updateCrewPickerLabel();
  const scheduledJobFromValue=value=>{
    const normalized=String(value || '').trim().replace(/^#?job-/i,'').trim();
    return state.jobs.find(job=>String(job.id)===normalized);
  };
  const fillScheduledJob=()=>{
    const existing=scheduledJobFromValue(scheduledJobInput?.value);
    if(!existing) return;
    const setValue=(name,value)=>{ const input=newJobForm.querySelector(`[name="${name}"]`); if(input) input.value=value ?? ''; };
    setValue('customer',existing.customer);
    setValue('service',existing.service);
    const crewInputs=newJobForm.querySelectorAll('[name="crew"]');
    if(crewInputs.length>1){
      const selectedCrews=assignedCrewNames(existing);
      crewInputs.forEach(input=>{input.checked=selectedCrews.includes(input.value);});
      updateCrewPickerLabel();
    } else setValue('crew',existing.crew);
    setValue('date',existing.date || todayISO());
    const timeParts=splitJobTime(String(existing.time || '9:00 AM').split(/\s*-\s*/)[0]);
    setValue('scheduleHour',timeParts.hour);
    setValue('scheduleMinute',timeParts.minute);
    setValue('schedulePeriod',timeParts.period);
    setValue('status',existing.status || 'notstarted');
    setValue('notes',existing.notes || '');
  };
  scheduledJobInput?.addEventListener('input',fillScheduledJob);
  scheduledJobInput?.addEventListener('change',fillScheduledJob);
  newJobDate.addEventListener('change',()=>{
    if(isScheduleContext){
      if(newJobDate.value > todayISO()){
        newJobStatus.value='scheduled';
        showToast('Future job automatically set to Scheduled');
      }
      return;
    }
    if(newJobDate.value > todayISO()){
      newJobStatus.value='scheduled';
      showToast('Future job automatically set to Scheduled');
    }
  });
  newJobForm.onsubmit=async event=>{
    event.preventDefault();
    const formData=new FormData(event.target);
    if(isScheduleContext){
      const job=scheduledJobFromValue(formData.get('scheduledJobId'));
      if(!job){ showToast('Enter a valid existing job number','error'); return; }
      const selectedCrewChoices=mergeAssignedCrewNames(formData.getAll('crew'));
      if(!selectedCrewChoices.length){ showToast('Select at least one crew','error'); return; }
      const scheduledTime=scheduleTimeFromForm(formData);
      const isExistingScheduleEdit=newJobForm.dataset.scheduleEdit==='true';
      const editedCrewName=newJobForm.dataset.scheduleEditCrew || '';
      const isCrewSpecificEdit=Boolean(editedCrewName);
      // A crew-specific edit is deliberately scoped to that crew, even if a
      // checkbox is changed in the form.
      const selectedCrews=isCrewSpecificEdit ? [editedCrewName] : selectedCrewChoices;
      if(isExistingScheduleEdit && !canRescheduleJob(job)){
        showToast('Only scheduled jobs can be rescheduled. Completed jobs cannot be changed.','error');
        return;
      }
      const scheduleChanged=isExistingScheduleEdit && (
        formData.get('date')!==newJobForm.dataset.scheduleOriginalDate ||
        scheduledTime!==newJobForm.dataset.scheduleOriginalTime
      );
      // Scheduling the same job again adds crew members; it must never remove
      // crew members who were already assigned or discard their progress.
      const existingCrews=assignedCrewNames(job);
      const crews=mergeAssignedCrewNames(existingCrews,selectedCrews);
      const newlyAssigned=crews.filter(name=>!existingCrews.some(existing=>normalizeText(existing)===normalizeText(name)));
      const crewProgress={...(job.crewProgress || {})};
      const crewSchedules={...(job.crewSchedules || {})};
      // Upgrade legacy assignments to per-crew appointment records before
      // adding another schedule for this job.
      existingCrews.forEach(name=>{
        const key=crewProgressKey(name);
        if(!crewSchedules[key]){
          crewSchedules[key]={name,date:job.date || '',time:job.time || '',scheduleStatus:job.scheduleStatus || ''};
        }
      });
      existingCrews.forEach(name=>{
        const key=crewProgressKey(name);
        if(crewProgress[key]) return;
        const priorStatus=['completed','invoiced'].includes(job.status) ? 'completed' : job.status==='progress' ? 'progress' : 'scheduled';
        crewProgress[key]={
          name,
          status:priorStatus,
          startedAt:['progress','completed'].includes(priorStatus) ? (job.startedAt || job.statusDate || '') : '',
          completedAt:priorStatus==='completed' ? (job.completedAt || job.completedDate || job.statusDate || '') : ''
        };
      });
      newlyAssigned.forEach(name=>{
        const key=crewProgressKey(name);
        if(!crewProgress[key]) crewProgress[key]={name,status:'scheduled',startedAt:'',completedAt:''};
        crewSchedules[key]={name,date:formData.get('date'),time:scheduledTime,scheduleStatus:formData.get('status') === 'rescheduled' ? 'rescheduled' : ''};
      });
      // A moved appointment is a new crew commitment. Reset its crew progress
      // and display the calendar state as Rescheduled until work begins again.
      if(scheduleChanged){
        selectedCrews.forEach(name=>{
          crewProgress[crewProgressKey(name)]={name,status:'scheduled',startedAt:'',completedAt:''};
          crewSchedules[crewProgressKey(name)]={name,date:formData.get('date'),time:scheduledTime,scheduleStatus:'rescheduled'};
        });
      }
      const customer=state.customers.find(c=>c.name===formData.get('customer'));
      // Adding new crew to an existing job must not overwrite the original
      // appointment. The calendar reads each crew's saved appointment above.
      const keepOriginalAppointment=(!isExistingScheduleEdit && existingCrews.length>0) || (isCrewSpecificEdit && existingCrews.length>1);
      Object.assign(job,{
        customer:formData.get('customer'), customerId:customer?.id || job.customerId || '', service:formData.get('service'),
        crew:crews[0], assignedCrews:crews, date:keepOriginalAppointment ? job.date : formData.get('date'), due:keepOriginalAppointment ? (job.due || job.date) : formData.get('date'),
        time:keepOriginalAppointment ? job.time : scheduledTime, status:scheduleChanged ? 'scheduled' : (keepOriginalAppointment ? job.status : (formData.get('status') || 'scheduled')),
        scheduleStatus:isCrewSpecificEdit ? (job.scheduleStatus || '') : ((scheduleChanged || formData.get('status') === 'rescheduled') ? 'rescheduled' : ''),
        statusDate:todayISO(), isScheduled:true, scheduledAt:Date.now(), address:customer?.address || job.address || '', notes:String(formData.get('notes') || '').trim(), crewProgress, crewSchedules
      });
      // Keep the real combined status based on every crew member's progress.
      // Newly assigned crews begin as Scheduled; existing progress is retained.
      refreshOverallCrewJobStatus(job);
      recordAudit(job,scheduleChanged?'Job rescheduled':'Job scheduled',`${scheduleChanged?'Rescheduled':'Scheduled'} for ${displayDate(job.date)} at ${job.time} with ${crews.join(', ')}`);
      (newlyAssigned.length ? newlyAssigned : selectedCrews).forEach(crew=>addWorkspaceNotification({audience:`crew:${crew}`,kind:'job',id:job.id,severity:'info',title:`Job scheduled: ${job.service}`,detail:`JOB-${job.id} · ${displayDate(job.date)} at ${job.time}`}));
      addWorkspaceNotification({audience:'management',kind:'job',id:job.id,severity:'info',title:scheduleChanged?'Job rescheduled':'Job scheduled',detail:`JOB-${job.id} · ${job.customer} · ${crews.join(', ')}`});
      save(); await saveToFirebase('jobs',job); wrap.remove();
      try{
        await notifyScheduledCrew(job,newlyAssigned.length ? newlyAssigned : selectedCrews);
      }catch(error){
        console.warn('Crew schedule delivery failed:',error.message);
        showToast('Schedule saved. In-app alerts are ready; email or SMS delivery needs configuration.','error');
      }
      // Saving an edited schedule always returns to the calendar. The full
      // assignment table is opened only from the "View Scheduled Jobs" button.
      selectedDate=null;
      selectedScheduleJobId=null;
      selectedJob=null;
      selectedJobTab='details';
      currentView='schedule';
      showToast(`Job ${job.id} ${scheduleChanged?'rescheduled':'scheduled'} for ${crews.length} crew${crews.length===1?'':' members'}`);
      render(); return;
    }
    const customer=state.customers.find(c=>c.name===formData.get('customer'));
    const job=ensureCrewJobFields({id:nextNumericId(state.jobs),sourceEstimateId:prefill.sourceEstimateId || '',time:'',date:formData.get('date'),due:formData.get('due') || formData.get('date'),customer:formData.get('customer'),customerId:customer?.id || '',service:formData.get('service'),address:customer?.address || '',crew:formData.get('crew'),status:formData.get('status') || 'notstarted',statusDate:todayISO(),isScheduled:false,price:Number(formData.get('price') || 0),priority:formData.get('priority') || 'Medium',duration:formData.get('duration') || 0,equipment:formData.get('equipment') || '',materials:formData.get('materials') || '',notes:formData.get('notes') || '',createdBy:currentCreatorName(),createdByEmail:currentUser?.email || '',createdAt:Date.now()});
    state.jobs.push(job);
    if(prefill.sourceEstimateId){const estimate=state.estimates.find(est=>est.id===prefill.sourceEstimateId);if(estimate){estimate.status='converted';estimate.statusDate=todayISO();estimate.convertedDate=todayISO();estimate.convertedJobId=job.id;estimate.convertedAt=Date.now();estimate.updatedAt=Date.now();recordAudit(estimate,'Converted to job',`Created #JOB-${job.id} on ${displayDate(estimate.convertedDate)}`);await saveToFirebase('estimates',estimate);}}
    save(); await saveToFirebase('jobs',job); wrap.remove(); selectedEstimate=null; selectedJob=job; selectedJobTab='details'; currentView='jobDetail'; showToast(prefill.sourceEstimateId?'Estimate converted to scheduled job':'Job created'); render();
  };
}

function openCustomerModal(){
  const wrap=document.createElement('div'); wrap.className='modal-backdrop'; wrap.innerHTML=`<div class="modal"><h3>Add Customer</h3><p class="muted">A customer login is created with this record, so they can view only the estimates, jobs, and invoices you send.</p><form id="customerForm"><div class="form-grid"><div class="field"><label>Name</label><input name="name" required></div><div class="field"><label>Phone</label><input name="phone" required></div><div class="field"><label>Email</label><input name="email" type="email" required autocomplete="off"></div><div class="field"><label>Password</label><span class="password-field"><input id="customerPassword" name="password" type="password" required minlength="6" placeholder="Create a password" autocomplete="new-password"><button type="button" class="password-toggle" data-toggle-password="customerPassword" aria-label="Show password">&#128065;</button></span></div><div class="field full"><label>Property Address</label><input name="address" required></div><div class="field full"><label>Customer Notes</label><textarea name="notes" rows="3" placeholder="Gate code, pets, preferred time, special instructions..."></textarea></div></div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Add Customer & Create Login</button></div></form></div>`;
  document.body.appendChild(wrap); wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.querySelector('[data-toggle-password]')?.addEventListener('click',event=>{
    const button=event.currentTarget, input=wrap.querySelector(`#${button.dataset.togglePassword}`);
    if(!input) return;
    const show=input.type==='password'; input.type=show?'text':'password'; button.classList.toggle('is-visible',show); button.setAttribute('aria-label',show?'Hide password':'Show password');
  });
  wrap.querySelector('#customerForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target), now=Date.now();
    const name=String(f.get('name') || '').trim(), phone=String(f.get('phone') || '').trim(), email=normalizeEmailText(f.get('email'));
    const password=String(f.get('password') || ''), address=String(f.get('address') || '').trim(), notes=String(f.get('notes') || '').trim();
    if(!name || !phone || !email || !password || !address){ showToast('Complete the customer and login details','error'); return; }
    if(password.length<6){ showToast('Password must contain at least 6 characters.','error'); return; }
    if(state.customers.some(item=>normalizeEmailText(item.email)===email) || getUsers().some(item=>normalizeEmailText(item.email)===email)){ showToast('This email is already in use','error'); return; }
    const submit=e.target.querySelector('button[type="submit"]'), originalText=submit?.textContent;
    if(submit){ submit.disabled=true; submit.textContent='Creating customer...'; }
    const customer={id:now,createdAt:now,createdBy:currentCreatorName(),createdByEmail:currentUser?.email || '',ownerEmail:currentUser?.email || '',name,phone,email,service:'',address,notes};
    const account={id:now,createdAt:now,createdBy:currentCreatorName(),createdByEmail:currentUser?.email || '',name,email,role:'customer',phone,employmentStatus:'Active',crewRole:'',address,emergencyContact:'',profileNotes:notes,customerId:String(customer.id),customerName:customer.name,ownerEmail:currentUser.email};
    try{
      const result=await apiRequest('/auth/team/register',{...account,password});
      const createdAccount={...account,...result.user,id:account.id,createdAt:account.createdAt};
      state.customers.push(customer);
      setUsers([...getUsers(),createdAccount]);
      save();
      await saveToFirebase('customers',customer);
      wrap.remove(); showToast('Customer and customer login created'); render();
    }catch(error){
      showToast(error.message || 'Unable to create the customer login','error');
      if(submit){ submit.disabled=false; submit.textContent=originalText; }
    }
  };
}

function openEstimateModal(){
  if(!requireManualService()) return;
  const services = serviceNames(true);
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal"><h3>Create Estimate</h3><form id="estimateForm"><div class="form-grid">
    <div class="field"><label>Customer</label><select name="customer" required><option value="" selected disabled>Select customer</option>${state.customers.map(c=>`<option>${c.name}</option>`).join('')}</select></div>
    <div class="field"><label>Estimate Date</label><input name="createdDate" type="date" value="${todayISO()}" required></div>
    <div class="field"><label>Service</label><select name="service" required><option value="" selected disabled>Select service</option>${services.map(s=>`<option>${s}</option>`).join('')}</select></div>
    <div class="field"><label>Status</label><select name="status" required><option value="" selected disabled>Select status...</option><option value="pending">Pending</option><option value="followup1">Follow Up 1</option><option value="followup2">Follow Up 2</option><option value="paid">Proceeding</option><option value="converted">Converted to Job</option><option value="rejected">Not Proceeding</option></select></div>
    <div class="field"><label>Estimated Amount</label><input name="amount" type="number" min="0" value="0" required></div>
    <div class="field" data-approved-amount-field hidden><label>Approved Amount</label><input name="approvedAmount" type="number" min="0" step="0.01" value="0" disabled></div>
    <div class="field"><label id="estimateStatusDateLabel">Status Date</label><input name="statusDate" type="date" value="${todayISO()}" required></div>
    <div class="field"><label>Expiration Date</label><input name="expirationDate" type="date" value="${toISODate(addDays(new Date(),30))}" required></div>
    <div class="field full"><label>Description</label><textarea name="notes" rows="3" placeholder="Project details, specifications..."></textarea></div>
  </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Create Estimate</button></div></form></div>`;

  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();

  const estimateStatusSelect = wrap.querySelector('select[name="status"]');
  const estimateStatusDateInput = wrap.querySelector('input[name="statusDate"]');
  const estimateStatusDateLabelElement = wrap.querySelector('#estimateStatusDateLabel');
  const toggleApprovedFields=()=>{
    const approved=estimateStatusSelect.value==='paid';
    wrap.querySelectorAll('[data-approved-amount-field]').forEach(field=>{
      field.hidden=!approved;
      field.querySelectorAll('input').forEach(input=>input.disabled=!approved);
    });
    estimateStatusDateLabelElement.textContent=estimateStatusDateLabel(estimateStatusSelect.value);
    estimateStatusDateInput.value=todayISO();
  };
  estimateStatusSelect.addEventListener('change',toggleApprovedFields);
  toggleApprovedFields();

  const newEstimateForm=wrap.querySelector('#estimateForm');
  bindServiceDefaults(newEstimateForm,{amountName:'amount',durationName:null});
  newEstimateForm.onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const service = f.get('service');
    const status=f.get('status') || 'pending';
    const estimate={
      id:nextEstimateId(),
      customer:f.get('customer'),
      service:service,
      amount:Number(f.get('amount')),
      approvedAmount:status==='paid' ? Number(f.get('approvedAmount') || 0) : 0,
      status,
      statusDate: f.get('statusDate') || todayISO(),
      notes:f.get('notes'),
      validDays:30,
      expirationDate:f.get('expirationDate'),
      createdDate:f.get('createdDate') || todayISO(),
      createdBy:currentCreatorName(),
      createdByEmail:currentUser?.email || '',
      createdAt: Date.now()
    };
    if(estimate.status==='paid') estimate.approvedAt=estimate.statusDate;
    if(estimate.status==='rejected') estimate.rejectedAt=estimate.statusDate;
    state.estimates.push(estimate);
    save();
    await saveToFirebase('estimates',estimate);
    wrap.remove();
    showToast('Estimate created and sent to customer');
    render();
  };
}

function mountInvoiceItemsEditor(wrap, initialItems, onChange,{customerInput,currentInvoiceId=''}={}){
  const editor=wrap.querySelector('[data-invoice-items-editor]');
  const addButton=wrap.querySelector('[data-add-invoice-item]');
  const selectedCustomer=()=>String(customerInput?.value || '').trim();
  const availableJobs=()=>newestFirst(state.jobs.filter(job=>
    job.status!=='cancelled' &&
    (!selectedCustomer() || normalizeText(job.customer)===normalizeText(selectedCustomer())) &&
    !unavailableInvoiceJob(job.id,currentInvoiceId)
  ));
  const collectItems=()=>[...editor.querySelectorAll('.line-item-editor-row')].map((row,index)=>({
    id:row.dataset.itemId || `ITEM-${Date.now()}-${index}`,
    jobId:row.querySelector('[data-item-job-picker]')?.value || row.dataset.jobId || '',
    description:String(row.querySelector('[data-item-description]').value || '').trim(),
    quantity:Math.round(Number(row.querySelector('[data-item-quantity]').value || 0) * 100) / 100,
    rate:currencyValue(row.querySelector('[data-item-rate]').value || 0)
  })).filter(item=>item.description && item.quantity>0 && item.rate>=0);
  const updateRowTotal=row=>{
    const quantity=Number(row.querySelector('[data-item-quantity]')?.value || 0);
    const rate=Number(row.querySelector('[data-item-rate]')?.value || 0);
    const total=row.querySelector('[data-item-total]');
    if(total) total.textContent=money(currencyValue(quantity*rate));
  };
  const notify=()=>{
    editor.querySelectorAll('.line-item-editor-row').forEach(updateRowTotal);
    onChange?.(collectItems());
  };
  const serviceOptions=currentValue=>{
    const names=serviceNames(true);
    if(currentValue && !names.some(name=>normalizeText(name)===normalizeText(currentValue))) names.unshift(currentValue);
    return `<option value="">Select service...</option>${names.map(name=>`<option value="${escapeHtml(name)}" ${normalizeText(name)===normalizeText(currentValue)?'selected':''}>${escapeHtml(name)}</option>`).join('')}`;
  };
  const setRowService=(row,description,rate)=>{
    const select=row.querySelector('[data-item-description]');
    if(description && ![...select.options].some(option=>normalizeText(option.value)===normalizeText(description))){
      select.add(new Option(description,description));
    }
    select.value=description || '';
    if(rate !== undefined) row.querySelector('[data-item-rate]').value=currencyValue(rate).toFixed(2);
  };
  const jobPickerOptions=(selectedId='')=>{
    const jobs=availableJobs();
    if(!selectedCustomer()) return '<option value="">Select a customer first</option>';
    return `<option value="">Choose a job...</option>${jobs.map(job=>`<option value="${escapeHtml(job.id)}" ${String(job.id)===String(selectedId)?'selected':''}>${escapeHtml(displayJobNumber(job.id))}</option>`).join('')}`;
  };
  const refreshRowJobs=row=>{
    const picker=row.querySelector('[data-item-job-picker]');
    const currentId=picker.value || row.dataset.jobId || '';
    const matching=availableJobs().some(job=>String(job.id)===String(currentId));
    const nextId=matching ? currentId : '';
    row.dataset.jobId=nextId;
    picker.disabled=!selectedCustomer();
    picker.innerHTML=jobPickerOptions(nextId);
    picker.value=nextId;
    if(!nextId && currentId){
      setRowService(row,'',0);
      row.querySelector('[data-item-quantity]').value='1';
    }
  };
  const addItem=(item={})=>{
    const row=document.createElement('div');
    row.className='line-item-editor-row';
    row.dataset.itemId=item.id || '';
    row.dataset.jobId=item.jobId || '';
    row.innerHTML=`<div class="field line-item-job"><label>Job No.</label><select data-item-job-picker required ${selectedCustomer()?'':'disabled'}>${jobPickerOptions(item.jobId || '')}</select></div>
      <div class="field line-description"><label>Service Name</label><select data-item-description required>${serviceOptions(item.description || '')}</select></div>
      <div class="field"><label>Qty</label><input data-item-quantity type="number" min="0.01" step="0.01" value="${Number(item.quantity || 1)}" required></div>
      <div class="field"><label>Unit Price</label><input data-item-rate type="number" min="0" step="0.01" value="${Number(item.rate || 0)}" required></div>
      <div class="field line-item-total"><label>Total Amount</label><output data-item-total>${money(Number(item.quantity || 1)*Number(item.rate || 0))}</output></div>
      <button type="button" class="icon-btn remove-line-item" aria-label="Remove line item">&times;</button>`;
    row.querySelector('.remove-line-item').onclick=()=>{
      if(editor.children.length===1){
        showToast('An invoice needs at least one line item','error');
        return;
      }
      row.remove();
      notify();
    };
    row.querySelector('[data-item-description]').addEventListener('change',event=>{
      const service=serviceByName(event.target.value);
      if(service) row.querySelector('[data-item-rate]').value=currencyValue(service.rate || 0).toFixed(2);
      notify();
    });
    const applyLineItemJob=()=>{
      const picker=row.querySelector('[data-item-job-picker]');
      const job=state.jobs.find(record=>String(record.id)===String(picker.value));
      if(!job){ row.dataset.jobId=''; return null; }
      row.dataset.jobId=job.id;
      setRowService(row,job.service || '',job.price || serviceByName(job.service)?.rate || 0);
      row.querySelector('[data-item-quantity]').value='1';
      notify();
      return job;
    };
    row.querySelector('[data-item-job-picker]').addEventListener('change',applyLineItemJob);
    row.querySelectorAll('input').forEach(input=>input.addEventListener('input',notify));
    editor.appendChild(row);
    updateRowTotal(row);
    return row;
  };
  (initialItems?.length ? initialItems : [{description:'',quantity:1,rate:0}]).forEach(addItem);
  addButton.onclick=()=>{ addItem({quantity:1,rate:0}); notify(); };
  const setFirstItem=(description,rate,jobId='')=>{
    const row=editor.querySelector('.line-item-editor-row') || addItem({quantity:1,rate:0});
    if(jobId){
      row.dataset.jobId=jobId;
      refreshRowJobs(row);
    }
    setRowService(row,description,rate);
    notify();
  };
  const refreshJobs=()=>{ editor.querySelectorAll('.line-item-editor-row').forEach(refreshRowJobs); notify(); };
  return {collectItems, notify, setFirstItem, refreshJobs};
}

function updateInvoiceFormSummary(wrap,{subtotal=0,taxRate=0,paid=0}={}){
  const values={
    subtotal:currencyValue(Math.max(0,subtotal)),
    taxRate:Math.min(100,Math.max(0,Number(taxRate || 0))),
    paid:currencyValue(Math.max(0,paid))
  };
  values.tax=currencyValue(values.subtotal*values.taxRate/100);
  values.total=currencyValue(Math.max(0,values.subtotal+values.tax));
  values.due=currencyValue(Math.max(0,values.total-values.paid));
  const set=(name,value)=>{
    const element=wrap.querySelector(`[data-invoice-summary="${name}"]`);
    if(element) element.textContent=money(value);
  };
  set('subtotal',values.subtotal);
  set('tax',values.tax);
  set('total',values.total);
  set('paid',values.paid);
  set('due',values.due);
  const taxLabel=wrap.querySelector('[data-invoice-summary-tax-label]');
  if(taxLabel) taxLabel.textContent=`Tax (${Number(values.taxRate.toFixed(2))}%)`;
  return values;
}
function updateInvoiceFormBreakdown(wrap,items=[],paid=0){
  const preview=wrap.querySelector('[data-invoice-breakdown-preview]');
  if(!preview) return;
  let remaining=Math.max(0,Number(paid || 0));
  const rows=items.map(item=>{
    const total=currencyValue(Number(item.quantity || 0)*Number(item.rate || 0));
    const paidForLine=currencyValue(Math.min(total,remaining));
    remaining=currencyValue(Math.max(0,remaining-paidForLine));
    const job=state.jobs.find(record=>String(record.id)===String(item.jobId || ''));
    return `<tr><td><strong>${escapeHtml(job ? displayJobNumber(job.id) : '-')}</strong></td><td>${escapeHtml(item.description || '-')}</td><td>${Number(item.quantity || 0)}</td><td>${money(item.rate || 0)}</td><td><strong>${money(total)}</strong></td><td class="invoice-paid-value"><strong>${money(paidForLine)}</strong></td><td class="invoice-due-value"><strong>${money(total-paidForLine)}</strong></td></tr>`;
  }).join('');
  preview.innerHTML=`<p class="muted">Payments are applied from the first job line to the last.</p><table class="invoice-breakdown-table"><thead><tr><th>Job No.</th><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total Amount</th><th>Paid Amount</th><th>Due Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted">Add a job line item to see its billing breakdown.</td></tr>'}</tbody></table>`;
}

function openInvoiceModal(prefill = {}){
  const today = todayISO();
  const due = (()=>{ const d = new Date(`${today}T00:00:00`); d.setDate(d.getDate()+30); return toISODate(d); })();
  const relatedJob = prefill.jobId ? state.jobs.find(job=>String(job.id)===String(prefill.jobId)) : null;
  const selectedCustomerName = prefill.customer || '';
  const selectedService = prefill.service || relatedJob?.service || '';
  const initialStatus=prefill.status || 'draft';
  const initialTaxRate=prefill.taxRate ?? 0;
  const initialItems = Array.isArray(prefill.lineItems) && prefill.lineItems.length
    ? prefill.lineItems
    : [{jobId:relatedJob?.id || '',description:selectedService,quantity:1,rate:Number(prefill.amount ?? relatedJob?.price ?? 0)}];
  const invoiceNumber = prefill.id || nextInvoiceId();
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal invoice-form-modal"><div class="modal-heading"><div><h3>Create Invoice</h3><p class="muted">Add project details, services, tax, and invoice line items.</p></div></div>
    <form id="invoiceForm">
      <div class="form-grid invoice-main-fields">
        <div class="field"><label>Invoice No.</label><input name="invoiceNumber" value="${escapeHtml(invoiceNumber)}" readonly required></div>
        <div class="field"><label>Customer</label><select name="customer" required><option value="" ${!selectedCustomerName?'selected':''} disabled>Select customer</option>${state.customers.map(c=>`<option ${c.name===selectedCustomerName?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Invoice Date</label><input name="invoiced" type="date" value="${prefill.invoiced || today}" required></div>
        <div class="field"><label>Due Date</label><input name="due" type="date" value="${prefill.due || due}" required></div>
        <div class="field"><label>Status</label><select name="status" required><option value="draft" ${initialStatus==='draft'?'selected':''}>Draft</option><option value="sent" ${initialStatus==='sent'?'selected':''}>Sent</option><option value="pending" ${initialStatus==='pending'?'selected':''}>Pending</option><option value="unpaid" ${initialStatus==='unpaid'?'selected':''}>Unpaid</option><option value="partial" ${initialStatus==='partial'?'selected':''}>Partially Paid</option><option value="paid" ${initialStatus==='paid'?'selected':''}>Paid</option><option value="overdue" ${initialStatus==='overdue'?'selected':''}>Overdue</option><option value="cancelled" ${initialStatus==='cancelled'?'selected':''}>Cancelled</option></select></div>
        <div class="field" data-invoice-paid-date-field ${['paid','partial'].includes(initialStatus)?'':'hidden'}><label>Paid Date</label><input name="paidDate" type="date" value="${escapeHtml(dateInputValue(prefill.paid || ''))}"></div>
        <div class="field" data-invoice-payment-field ${['paid','partial'].includes(initialStatus)?'':'hidden'}><label>Payment Amount</label><input name="paymentAmount" type="number" min="0" step="0.01" value="${Number(prefill.paidAmount || 0)}"></div>
        <div class="field" data-invoice-payment-method-field ${initialStatus==='paid'?'':'hidden'}><label>Payment Method</label><select name="paymentMethod">${['Cash','Check','Card','Bank Transfer','Other'].map(method=>`<option value="${method}" ${String(prefill.paymentMethod || 'Cash')===method?'selected':''}>${method}</option>`).join('')}</select></div>
        <div class="field"><label>Tax Rate (%)</label><input name="taxRate" type="number" min="0" max="100" step="0.01" value="${Number(initialTaxRate || 0)}"></div>
      </div>
      <section class="invoice-items-section">
        <div class="invoice-items-heading"><div><h4>Invoice Line Items</h4><p class="muted">Choose a job for this customer to fill the service name, quantity, and rate automatically.</p></div><button type="button" class="secondary compact" data-add-invoice-item>+ Add Line Item</button></div>
        <div class="line-items-editor" data-invoice-items-editor></div>
      </section>
      <div class="invoice-live-summary" aria-live="polite">
        <div><span>Subtotal Amount</span><strong data-invoice-summary="subtotal">$0.00</strong></div>
        <div><span data-invoice-summary-tax-label>Tax (0%)</span><strong data-invoice-summary="tax">$0.00</strong></div>
        <div class="summary-total"><span>Total Amount</span><strong data-invoice-summary="total">$0.00</strong></div>
        <div class="summary-paid"><span>Amount Paid</span><strong data-invoice-summary="paid">$0.00</strong></div>
        <div class="summary-due"><span>Balance Due</span><strong data-invoice-summary="due">$0.00</strong></div>
      </div>
      <div class="form-grid invoice-payment-fields">
        <div class="field full"><label>Notes <small>(optional)</small></label><textarea name="notes" rows="2" placeholder="Payment terms or customer notes...">${escapeHtml(prefill.notes || '')}</textarea></div>
      </div>
      <div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Create Invoice</button></div>
    </form>
  </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  const taxInput = wrap.querySelector('[name="taxRate"]');
  const customerInput=wrap.querySelector('[name="customer"]');
  const statusInput=wrap.querySelector('[name="status"]');
  const paidDateField=wrap.querySelector('[data-invoice-paid-date-field]');
  const paymentField=wrap.querySelector('[data-invoice-payment-field]');
  const paymentMethodField=wrap.querySelector('[data-invoice-payment-method-field]');
  const paymentInput=paymentField.querySelector('input');
  const togglePaymentFields=()=>{
    const needsDate=['paid','partial'].includes(statusInput.value);
    paidDateField.hidden=!needsDate;
    paidDateField.querySelector('input').disabled=!needsDate;
    paymentField.hidden=!needsDate;
    paymentInput.disabled=!needsDate;
    const needsPaymentMethod=statusInput.value==='paid';
    paymentMethodField.hidden=!needsPaymentMethod;
    paymentMethodField.querySelector('select').disabled=!needsPaymentMethod;
    if(needsDate && !paidDateField.querySelector('input').value) paidDateField.querySelector('input').value=today;
    paymentInput.readOnly=statusInput.value==='paid';
  };
  let itemsEditor;
  const syncInvoiceTotals = () => {
    const subtotal=currencyValue(itemsEditor?.collectItems().reduce((sum,item)=>sum+currencyValue(item.quantity*item.rate),0) || 0);
    const previewTotal=currencyValue(subtotal + (subtotal * Math.min(100,Math.max(0,Number(taxInput.value || 0))) / 100));
    const previewPaid=statusInput.value==='paid' ? previewTotal : statusInput.value==='partial' ? Math.min(previewTotal,Math.max(0,Number(paymentInput.value || 0))) : 0;
    const summary=updateInvoiceFormSummary(wrap,{subtotal,taxRate:taxInput.value,paid:previewPaid});
    updateInvoiceFormBreakdown(wrap,itemsEditor?.collectItems() || [],previewPaid);
    paymentInput.max=String(summary.total);
    if(statusInput.value==='paid') paymentInput.value=String(summary.total);
  };
  itemsEditor=mountInvoiceItemsEditor(wrap,initialItems,syncInvoiceTotals,{customerInput});
  customerInput.addEventListener('change',()=>itemsEditor.refreshJobs());
  taxInput.addEventListener('input',syncInvoiceTotals);
  statusInput.addEventListener('change',()=>{ togglePaymentFields(); syncInvoiceTotals(); });
  paymentInput.addEventListener('input',syncInvoiceTotals);
  togglePaymentFields();
  syncInvoiceTotals();
  wrap.querySelector('#invoiceForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const id=String(f.get('invoiceNumber') || '').trim();
    if(state.invoices.some(invoice=>String(invoice.id).toLowerCase()===id.toLowerCase())){
      showToast('Invoice number already exists','error');
      return;
    }
    const lineItems=itemsEditor.collectItems();
    if(!lineItems.length || lineItems.some(item=>!item.jobId)){ showToast('Choose a job for every line item','error'); return; }
    const jobs=lineItems.map(item=>state.jobs.find(job=>String(job.id)===String(item.jobId))).filter(Boolean);
    const job=jobs[0];
    if(!job){ showToast('Choose a job for every line item','error'); return; }
    const duplicate=lineItems.map(line=>({line,conflict:unavailableInvoiceJob(line.jobId)})).find(item=>item.conflict);
    if(duplicate){
      showToast(duplicate.conflict.invoice
        ? `${displayJobNumber(duplicate.line.jobId)} already has invoice ${duplicate.conflict.invoice.id}`
        : `${displayJobNumber(duplicate.line.jobId)} is already invoiced`,'error');
      return;
    }
    const taxRate=Number(f.get('taxRate') || 0);
    const candidate={lineItems,taxRate,discount:0};
    const total=invoiceTotal(candidate);
    if(total<=0){ showToast('Invoice total must be greater than $0.00','error'); return; }
    const jobId=job.id;
    const status=f.get('status') || 'draft';
    const paidDate=String(f.get('paidDate') || '').trim();
    const enteredPayment=Math.max(0,Number(f.get('paymentAmount') || 0));
    const paymentAmount=status==='paid' ? total : status==='partial' ? Math.min(total,enteredPayment) : 0;
    if(status==='partial' && paymentAmount<=0){ showToast('Enter a payment amount for a partially paid invoice','error'); return; }
    const paymentMethod=String(f.get('paymentMethod') || 'Cash');
    const invoice=normalizeInvoicePayment({id,createdBy:currentCreatorName(),createdByEmail:currentUser?.email || '',createdAt:Date.now(),jobId,customer:f.get('customer') || job.customer,service:lineItems[0]?.description || job.service || selectedService || '',amount:total,lineItems,taxRate,discount:0,paidAmount:paymentAmount,paymentMethod,payments:paymentAmount?[{id:`PAY-${id.replace(/[^A-Za-z0-9]/g,'')}-001`,amount:paymentAmount,date:paidDate || f.get('invoiced'),method:paymentMethod,reference:'',notes:'Payment recorded while creating invoice',createdAt:Date.now()}]:[],invoiced:f.get('invoiced'),due:f.get('due'),status,paid:['paid','partial'].includes(status) ? (paidDate || f.get('invoiced')) : null,notes:f.get('notes')});
    state.invoices.push(invoice);
    for(const linkedJob of jobs){
      linkedJob.status='invoiced';
      linkedJob.invoiceId=invoice.id;
      linkedJob.invoicedAt=todayISO();
      await saveToFirebase('jobs',linkedJob);
    }
    selectedJob=job;
    save();
    await saveToFirebase('invoices',invoice);
    wrap.remove();
    if(jobId){
      selectedInvoice=invoice.id;
      currentView='invoiceDetail';
      showToast(`Invoice ${invoice.id} created. Job marked as Invoiced`);
    } else {
      showToast('Invoice created');
    }
    render();
  };
}

function openCustomerOwnProfileModal(customer){
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal customer-self-profile-modal"><div class="modal-title-row"><div><h3>Edit My Profile</h3><p class="muted">Update your contact details and, if needed, choose a new password.</p></div></div><form id="customerOwnProfileForm"><div class="form-grid"><div class="field"><label>Full Name</label><input name="name" value="${escapeHtml(customer.name || currentUser.name || '')}" required></div><div class="field"><label>Phone</label><input name="phone" type="tel" value="${escapeHtml(customer.phone || currentUser.phone || '')}" required></div><div class="field full"><label>Email</label><input value="${escapeHtml(customer.email || currentUser.email || '')}" readonly aria-readonly="true"><small>Your email is used to sign in. Ask your service team if it needs to be changed.</small></div><div class="field full"><label>Property Address</label><input name="address" value="${escapeHtml(customer.address || currentUser.address || '')}" placeholder="Street, city, state" required></div><div class="field full"><label>Profile Notes</label><textarea name="notes" rows="4" placeholder="Preferred contact method, property access details, or special instructions...">${escapeHtml(customer.notes || currentUser.profileNotes || '')}</textarea></div><div class="field"><label>New Password <small>(optional)</small></label><span class="password-field"><input id="customerOwnNewPassword" name="password" type="password" minlength="6" autocomplete="new-password" placeholder="Leave blank to keep current password"><button type="button" class="password-toggle" data-toggle-password="customerOwnNewPassword" aria-label="Show password">&#128065;</button></span></div><div class="field"><label>Confirm New Password</label><span class="password-field"><input id="customerOwnConfirmPassword" name="confirmPassword" type="password" minlength="6" autocomplete="new-password" placeholder="Re-enter new password"><button type="button" class="password-toggle" data-toggle-password="customerOwnConfirmPassword" aria-label="Show password">&#128065;</button></span></div></div><div class="modal-actions"><button type="button" class="secondary" id="cancelCustomerOwnProfile">Cancel</button><button class="primary">Save Profile</button></div></form></div>`;
  document.body.appendChild(wrap);
  wrap.onclick=event=>{if(event.target===wrap) wrap.remove();};
  wrap.querySelector('#cancelCustomerOwnProfile').onclick=()=>wrap.remove();
  wrap.querySelectorAll('[data-toggle-password]').forEach(button=>button.addEventListener('click',()=>{
    const input=wrap.querySelector(`#${button.dataset.togglePassword}`);
    if(!input) return;
    const show=input.type==='password';
    input.type=show?'text':'password';
    button.classList.toggle('is-visible',show);
    button.setAttribute('aria-label',show?'Hide password':'Show password');
  }));
  wrap.querySelector('#customerOwnProfileForm').onsubmit=async event=>{
    event.preventDefault();
    const form=new FormData(event.target);
    const payload={
      name:String(form.get('name') || '').trim(),
      phone:String(form.get('phone') || '').trim(),
      address:String(form.get('address') || '').trim(),
      profileNotes:String(form.get('notes') || '').trim(),
      password:String(form.get('password') || '')
    };
    if(!payload.name || !payload.phone || !payload.address){ showToast('Name, phone, and property address are required.','error'); return; }
    const confirmPassword=String(form.get('confirmPassword') || '');
    if(payload.password && payload.password.length<6){ showToast('Your new password must contain at least 6 characters.','error'); return; }
    if(payload.password!==confirmPassword){ showToast('New password and confirmation do not match.','error'); return; }
    const submit=event.target.querySelector('button.primary');
    if(submit){ submit.disabled=true; submit.textContent='Saving...'; }
    try{
      const result=await apiRequest('/auth/profile/update',payload);
      Object.assign(customer,{...result.customer,name:payload.name,phone:payload.phone,address:payload.address,notes:payload.profileNotes});
      currentUser={...currentUser,...result.user,name:payload.name,phone:payload.phone,address:payload.address,profileNotes:payload.profileNotes};
      localStorage.setItem(USER_KEY,JSON.stringify(currentUser));
      wrap.remove();
      showToast('Your profile has been updated');
      await syncWorkspaceFromBackend();
      render();
    }catch(error){
      if(submit){ submit.disabled=false; submit.textContent='Save Profile'; }
      showToast(error.message || 'Unable to update your profile','error');
    }
  };
}

function deleteCustomerOwnProfile(customer){
  openDeleteConfirm(
    'Delete your profile?',
    'This permanently removes your login and personal profile details. Your service team will retain anonymized financial records for accounting.',
    async()=>{
      await apiRequest('/auth/profile/delete',{});
      await window.greenopsAuth?.signOut?.().catch(()=>{});
      localStorage.removeItem(USER_KEY);
      currentUser=null;
      customerPortalTab='overview';
      showToast('Your profile has been deleted');
      render();
    }
  );
}

function openEditCustomerModal(customer){
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  const linkedCustomerLogin=getUsers().find(user=>userRole(user)==='customer' && (String(user.customerId || '')===String(customer.id || '') || normalizeEmailText(user.email)===normalizeEmailText(customer.email)));
  wrap.innerHTML=`<div class="modal"><h3>Edit Customer</h3><form id="editCustomerForm"><div class="form-grid"><div class="field"><label>Name</label><input name="name" value="${escapeHtml(customer.name)}" required></div><div class="field"><label>Phone</label><input name="phone" value="${escapeHtml(customer.phone)}" required></div><div class="field"><label>Email</label><input name="email" type="email" value="${escapeHtml(customer.email)}" required></div><div class="field"><label>Primary Service</label><select name="service" required>${serviceNames(true,[customer.service]).map(service=>`<option ${service===customer.service?'selected':''}>${escapeHtml(service)}</option>`).join('')}</select></div><div class="field"><label>${linkedCustomerLogin?'New Password':'Create Password'} <small>(optional)</small></label><span class="password-field"><input id="editCustomerPassword" name="password" type="password" minlength="6" placeholder="${linkedCustomerLogin?'Leave blank to keep current password':'Enter a password to create login'}" autocomplete="new-password"><button type="button" class="password-toggle" data-toggle-password="editCustomerPassword" aria-label="Show password">&#128065;</button></span></div><div class="field full"><label>Property Address</label><input name="address" value="${escapeHtml(customer.address)}" required></div><div class="field full"><label>Customer Notes</label><textarea name="notes" rows="3" placeholder="Gate code, pets, preferred time, special instructions...">${escapeHtml(customer.notes || '')}</textarea></div></div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Save Changes</button></div></form></div>`;

  document.body.appendChild(wrap);
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('[data-toggle-password]')?.addEventListener('click',event=>{
    const button=event.currentTarget, input=wrap.querySelector(`#${button.dataset.togglePassword}`);
    if(!input) return;
    const show=input.type==='password';
    input.type=show?'text':'password';
    button.classList.toggle('is-visible',show);
    button.setAttribute('aria-label',show?'Hide password':'Show password');
  });

  wrap.querySelector('#editCustomerForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const previousName=String(customer.name || '').trim();
    const nextName=String(f.get('name') || '').trim();
    const nextEmail=normalizeEmailText(f.get('email'));
    const nextPhone=String(f.get('phone') || '').trim();
    const nextAddress=String(f.get('address') || '').trim();
    const nextNotes=String(f.get('notes') || '').trim();
    const nextPassword=String(f.get('password') || '');
    if(nextPassword && nextPassword.length<6){ showToast('Password must contain at least 6 characters.','error'); return; }
    const customerId=String(customer.id || '');
    const previousNameKey=normalizeText(previousName);
    const linkedRecords=[...state.jobs,...state.estimates,...state.invoices].filter(record=>
      (customerId && String(record.customerId || '')===customerId) || normalizeText(record.customer)===previousNameKey
    );
    if(linkedCustomerLogin){
      try{
        const result=await apiRequest('/auth/team/update',{
          authUid:linkedCustomerLogin.authUid || '', currentEmail:linkedCustomerLogin.email,
          name:nextName, email:nextEmail, phone:nextPhone, password:nextPassword, role:'customer',
          employmentStatus:linkedCustomerLogin.employmentStatus || 'Active', crewRole:'', address:nextAddress,
          emergencyContact:linkedCustomerLogin.emergencyContact || '', profileNotes:nextNotes,
          customerId, customerName:nextName
        });
        const users=getUsers(), accountIndex=users.indexOf(linkedCustomerLogin);
        if(accountIndex>=0) users[accountIndex]={...linkedCustomerLogin,...result.user,name:nextName,email:nextEmail,phone:nextPhone,address:nextAddress,profileNotes:nextNotes,customerName:nextName};
        setUsers(users);
      }catch(error){ showToast(error.message || 'Unable to update customer login','error'); return; }
    }else if(nextPassword){
      try{
        const createdAt=Date.now();
        const result=await apiRequest('/auth/team/register',{
          id:createdAt, createdAt, name:nextName, email:nextEmail, phone:nextPhone, password:nextPassword,
          role:'customer', employmentStatus:'Active', crewRole:'', address:nextAddress,
          emergencyContact:'', profileNotes:nextNotes, customerId, customerName:nextName, ownerEmail:currentUser.email
        });
        setUsers([...getUsers(),{id:createdAt,createdAt,...result.user,name:nextName,email:nextEmail,phone:nextPhone,role:'customer',employmentStatus:'Active',address:nextAddress,profileNotes:nextNotes,customerId,customerName:nextName,ownerEmail:currentUser.email}]);
      }catch(error){ showToast(error.message || 'Unable to create customer login','error'); return; }
    }
    if(previousNameKey && previousNameKey!==normalizeText(nextName)){
      customer.aliases=[...new Set([...(Array.isArray(customer.aliases)?customer.aliases:[]),previousName].filter(Boolean))];
    }
    linkedRecords.forEach(record=>{
      record.customer=nextName;
      record.customerId=customer.id;
      record.updatedAt=Date.now();
    });
    customer.name = nextName;
    customer.phone = nextPhone;
    customer.email = nextEmail;
    customer.service = f.get('service');
    customer.address = nextAddress;
    customer.notes = nextNotes;

    save();
    await saveToFirebase('customers',customer);
    if(linkedRecords.length) await saveWorkspaceToBackend();
    wrap.remove();
    showToast('Customer updated');
    render();
  };
}

function openEditTeamAccountModal(user){
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal wide-modal"><h3>Edit User Login</h3><form id="editTeamAccountForm"><div class="form-grid">
    <div class="field"><label>Full Name</label><input name="name" value="${escapeHtml(user.name || '')}" required></div>
    <div class="field"><label>Email</label><input name="email" type="email" value="${escapeHtml(user.email || '')}" required></div>
    <div class="field"><label>Phone</label><input name="phone" type="tel" value="${escapeHtml(user.phone || '')}" required></div>
    <div class="field"><label>New Password <small>(optional)</small></label><span class="password-field"><input id="editTeamPassword" name="password" type="password" autocomplete="new-password" placeholder="Leave blank to keep current password"><button type="button" class="password-toggle" data-toggle-password="editTeamPassword" aria-label="Show password">&#128065;</button></span></div>
    <div class="field"><label>Account Type</label><select name="role"><option value="administrator" ${userRole(user)==='administrator'?'selected':''}>Administrator</option><option value="crew" ${userRole(user)==='crew'?'selected':''}>Crew</option><option value="customer" ${userRole(user)==='customer'?'selected':''}>Customer</option></select></div>
    <div class="field"><label>Employment Status</label><select name="employmentStatus"><option value="Active" ${user.employmentStatus!=='Inactive'?'selected':''}>Active</option><option value="Inactive" ${user.employmentStatus==='Inactive'?'selected':''}>Inactive</option></select></div>
    <div class="field"><label>Job Title / Crew Position</label><input name="crewRole" value="${escapeHtml(user.crewRole || (userRole(user)==='crew'?'Crew Member':'Administrator'))}"></div>
    <div class="field full"><label>Address</label><input name="address" value="${escapeHtml(user.address || '')}" placeholder="Street, city, state"></div>
    <div class="field"><label>Emergency Contact</label><input name="emergencyContact" value="${escapeHtml(user.emergencyContact || '')}" placeholder="Name / phone"></div>
    <div class="field full"><label>Profile Notes</label><textarea name="profileNotes" rows="3">${escapeHtml(user.profileNotes || '')}</textarea></div>
  </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Save User</button></div></form></div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.querySelector('[data-toggle-password]')?.addEventListener('click',event=>{
    const button=event.currentTarget;
    const input=wrap.querySelector(`#${button.dataset.togglePassword}`);
    if(!input) return;
    const show=input.type==='password';
    input.type=show?'text':'password';
    button.classList.toggle('is-visible',show);
    button.setAttribute('aria-label',show?'Hide password':'Show password');
  });
  wrap.querySelector('#editTeamAccountForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const payload={
      authUid:user.authUid || '',
      currentEmail:user.email,
      name:String(f.get('name') || '').trim(),
      email:normalizeEmailText(f.get('email')),
      phone:String(f.get('phone') || '').trim(),
      password:String(f.get('password') || ''),
      role:String(f.get('role') || user.role),
      employmentStatus:String(f.get('employmentStatus') || 'Active'),
      crewRole:String(f.get('crewRole') || '').trim(),
      address:String(f.get('address') || '').trim(),
      emergencyContact:String(f.get('emergencyContact') || '').trim(),
      profileNotes:String(f.get('profileNotes') || '').trim(),
      customerId:'',
      customerName:''
    };
    if(!payload.name || !payload.email || !payload.phone){ showToast('Name, email, and phone are required','error'); return; }
    if(payload.password && payload.password.length<6){ showToast('Password must contain at least 6 characters.','error'); return; }
    if(getUsers().some(item=>item!==user && normalizeEmailText(item.email)===payload.email)){
      showToast('Email is already used by another team account','error');
      return;
    }
    const submit=e.target.querySelector('button[type="submit"],button.primary');
    if(submit){submit.disabled=true;submit.textContent='Saving...';}
    try{
      const result=await apiRequest('/auth/team/update',payload);
      const updated={...user,...payload,...result.user,password:undefined};
      const users=getUsers();
      const index=users.indexOf(user);
      if(index>=0) users[index]=updated;
      setUsers(users);

      const linkedCrew=findCrewRecordForUser(user);
      if(payload.role==='crew'){
        const crew=linkedCrew || {id:Date.now(),createdAt:Date.now(),jobs:0};
        const oldName=crew.name || user.name;
        Object.assign(crew,{
          authUid:updated.authUid || '',
          name:payload.name,
          email:payload.email,
          phone:payload.phone,
          role:payload.crewRole || 'Crew Member',
          status:payload.employmentStatus,
          address:payload.address,
          emergencyContact:payload.emergencyContact,
          profileNotes:payload.profileNotes
        });
        if(!linkedCrew) state.crew.push(crew);
        state.jobs.forEach(job=>{if(normalizeText(job.crew)===normalizeText(oldName))job.crew=crew.name;});
      }else if(linkedCrew){
        linkedCrew.name=payload.name;
        linkedCrew.email=payload.email;
        linkedCrew.phone=payload.phone;
        linkedCrew.status=payload.employmentStatus;
      }
      await saveWorkspaceToBackend();
      wrap.remove();
      showToast('User login updated');
      render();
    }catch(error){
      showToast(error.message || 'Unable to update team user','error');
      if(submit){submit.disabled=false;submit.textContent='Save User';}
    }
  };
}

function openCrewModal(){
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal wide-modal crew-login-modal"><div class="modal-heading"><div><span class="crew-access-label">Crew access</span><h3>Add Crew Member & Login</h3><p class="muted">Create a crew profile and secure sign-in in one place.</p></div></div><form id="crewForm"><div class="form-grid">
    <div class="field"><label>Full Name</label><input name="name" required></div>
    <div class="field"><label>Email</label><input name="email" type="email" required placeholder="crew@example.com"></div>
    <div class="field"><label>Phone</label><input name="phone" type="tel" required placeholder="(555) 555-0100"></div>
    <div class="field"><label>Temporary Password</label><span class="password-field"><input id="crewPassword" name="password" type="password" autocomplete="new-password" required placeholder="Enter temporary password"><button type="button" class="password-toggle" data-toggle-password="crewPassword" aria-label="Show password">&#128065;</button></span></div>
    <div class="field"><label>Crew Position</label><select name="role"><option>Team Leader</option><option selected>Crew Member</option></select></div>
    <div class="field"><label>Employment Status</label><select name="status" required><option value="" selected disabled>Select status...</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
    <div class="field"><label>Availability</label><input name="availability" value="8 AM - 6 PM"></div>
    <div class="field"><label>Skills</label><input name="skills" placeholder="Mowing, trimming, irrigation"></div>
    <div class="field full"><label>Address</label><input name="address" placeholder="Street, city, state"></div>
    <div class="field"><label>Emergency Contact</label><input name="emergencyContact" placeholder="Name / phone"></div>
    <div class="field full"><label>Profile Notes</label><textarea name="profileNotes" rows="3" placeholder="Experience or internal notes"></textarea></div>
  </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Create Crew Account</button></div></form></div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.querySelector('[data-toggle-password]')?.addEventListener('click',event=>{
    const button=event.currentTarget;
    const input=wrap.querySelector(`#${button.dataset.togglePassword}`);
    if(!input) return;
    const show=input.type==='password';
    input.type=show?'text':'password';
    button.classList.toggle('is-visible',show);
    button.setAttribute('aria-label',show?'Hide password':'Show password');
  });
  wrap.querySelector('#crewForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const now=Date.now();
    const name=cleanCrewName(f.get('name'));
    const email=normalizeEmailText(f.get('email'));
    const phone=String(f.get('phone') || '').trim();
    const password=String(f.get('password') || '');
    const crewRole=String(f.get('role') || 'Crew Member');
    const employmentStatus=String(f.get('status') || 'Active');
    const availability=String(f.get('availability') || '').trim();
    const address=String(f.get('address') || '').trim();
    const emergencyContact=String(f.get('emergencyContact') || '').trim();
    const skills=String(f.get('skills') || '').trim();
    const profileNotes=String(f.get('profileNotes') || '').trim();
    if(!name || !email || !phone){showToast('Name, email, and phone are required','error');return;}
    const passwordMessage=passwordValidationMessage(password);
    if(passwordMessage){showToast(passwordMessage,'error');return;}
    if(getUsers().some(user=>normalizeEmailText(user.email)===email)){showToast('Account already exists','error');return;}
    const submit=e.target.querySelector('button.primary');
    submit.disabled=true;submit.textContent='Creating...';
    try{
      const result=await apiRequest('/auth/team/register',{name,email,phone,password,role:'crew',employmentStatus,crewRole,availability,address,emergencyContact,skills,profileNotes});
      const user={id:now,createdAt:now,...result.user,createdBy:currentCreatorName(),createdByEmail:currentUser?.email || '',name,email,phone,role:'crew',employmentStatus,crewRole,availability,address,emergencyContact,skills,profileNotes,ownerEmail:currentUser.email};
      setUsers([...getUsers(),user]);
      const crew={id:now,createdAt:now,createdBy:currentCreatorName(),createdByEmail:currentUser?.email || '',ownerEmail:currentUser?.email || '',authUid:user.authUid || '',name,email,phone,role:crewRole,status:employmentStatus,availability,address,emergencyContact,skills,profileNotes,jobs:0};
      state.crew.push(crew);
      await saveWorkspaceToBackend();
      wrap.remove();
      showToast(result.verificationEmailSent
        ? 'Crew member created. Verification email sent'
        : 'Crew member created; use Send Verification Email in Settings');
      render();
    }catch(error){
      showToast(error.message || 'Unable to create crew account','error');
      submit.disabled=false;submit.textContent='Create Crew Account';
    }
  };
}

function openMyCrewDetailsModal(){
  document.querySelector('.modal-backdrop')?.remove();
  const user = currentUser || {};
  const crewRecord = findCrewRecordForUser(user) || {};
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal wide-modal"><h3>Edit Profile</h3><form id="myCrewDetailsForm"><div class="form-grid">
    <div class="field"><label>Name</label><input name="name" value="${escapeHtml(user.name || '')}" required></div>
    <div class="field"><label>Email</label><input name="email" type="email" value="${escapeHtml(user.email || '')}" required></div>
    <div class="field"><label>Phone</label><input name="phone" value="${escapeHtml(user.phone || crewRecord.phone || '')}" placeholder="Phone number"></div>
    <div class="field"><label>Role</label><input value="${escapeHtml(crewRecord.role || 'Crew Member')}" disabled></div>
    <div class="field"><label>Address</label><input name="address" value="${escapeHtml(user.address || crewRecord.address || '')}" placeholder="Home address"></div>
    <div class="field"><label>Emergency Contact</label><input name="emergencyContact" value="${escapeHtml(user.emergencyContact || crewRecord.emergencyContact || '')}" placeholder="Name / phone"></div>
    <div class="field"><label>Skills</label><input name="skills" value="${escapeHtml(user.skills || crewRecord.skills || '')}" placeholder="Mowing, trimming, irrigation"></div>
    <div class="field"><label>Availability</label><input name="availability" value="${escapeHtml(user.availability || crewRecord.availability || '8 AM - 6 PM')}" placeholder="8 AM - 6 PM"></div>
    <div class="field full"><label>Profile Notes</label><textarea name="profileNotes" rows="4" placeholder="Basic notes, experience, preferred work areas...">${escapeHtml(user.profileNotes || crewRecord.profileNotes || '')}</textarea></div>
  </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Save My Details</button></div></form></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#myCrewDetailsForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const oldName = currentUser.name;
    const oldEmail = currentUser.email;
    const nextName = cleanCrewName(f.get('name'));
    const nextEmail = String(f.get('email') || '').trim().toLowerCase();
    const nextPhone = String(f.get('phone') || '').trim();
    const nextProfile = {
      address: String(f.get('address') || '').trim(),
      emergencyContact: String(f.get('emergencyContact') || '').trim(),
      skills: String(f.get('skills') || '').trim(),
      availability: String(f.get('availability') || '').trim(),
      profileNotes: String(f.get('profileNotes') || '').trim()
    };
    const syncCrewRecord = c => {
      const sameCrew = normalizeText(c.name) === normalizeText(oldName) ||
        (oldEmail && normalizeEmailText(c.email) === normalizeEmailText(oldEmail)) ||
        normalizeText(c.name) === normalizeText(nextName);
      if(!sameCrew) return false;
      c.name = nextName;
      c.email = nextEmail;
      c.phone = nextPhone;
      Object.assign(c, nextProfile);
      return true;
    };
    state.crew.forEach(syncCrewRecord);
    state.jobs.forEach(job => {
      if(normalizeText(job.crew) === normalizeText(oldName)) job.crew = nextName;
    });
    const users = getUsers().map(u => u.id === currentUser.id || u.email === oldEmail ? {...u, name:nextName, email:nextEmail, phone:nextPhone, ...nextProfile} : u);
    setUsers(users);
    currentUser = {...currentUser, name:nextName, email:nextEmail, phone:nextPhone, ...nextProfile};
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    save();
    const updatedCrew = state.crew.find(c => normalizeText(c.name) === normalizeText(nextName) || normalizeEmailText(c.email) === normalizeEmailText(nextEmail));
    await saveToFirebase('crew', updatedCrew || {});
    selectedJob = null;
    wrap.remove();
    showToast('Details updated');
    render();
  };
}

function openLogoutConfirm(){
  document.querySelector('.modal-backdrop')?.remove();
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal confirm-modal">
    <h3>Logout?</h3>
    <p class="muted">Are you sure you want to logout from GreenOps?</p>
    <div class="modal-actions">
      <button type="button" class="secondary" id="cancelLogout">No, Stay</button>
      <button type="button" class="primary danger-primary" id="confirmLogout">Yes, Logout</button>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelLogout').onclick=()=>wrap.remove();
  wrap.querySelector('#confirmLogout').onclick=async ()=>{
    await window.greenopsAuth?.signOut?.().catch(()=>{});
    localStorage.removeItem(USER_KEY);
    currentUser=null;
    wrap.remove();
    render();
  };
}

function openDeleteConfirm(title, message, onConfirm){
  document.querySelector('.modal-backdrop')?.remove();
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal confirm-modal">
    <h3>${escapeHtml(title || 'Delete item?')}</h3>
    <p class="muted">${escapeHtml(message || 'Are you sure you want to delete this item?')}</p>
    <div class="modal-actions">
      <button type="button" class="secondary" id="cancelDelete">No</button>
      <button type="button" class="primary danger-primary" id="confirmDelete">Yes, Delete</button>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelDelete').onclick=()=>wrap.remove();
  wrap.querySelector('#confirmDelete').onclick=async event=>{
    const button=event.currentTarget;
    button.disabled=true;
    button.textContent='Deleting...';
    try{
      await onConfirm?.();
    }catch(error){
      showToast(error.message || 'Unable to delete this record','error');
    }finally{
      wrap.remove();
    }
  };
}

function openRestoreConfirm(type,id){
  const record=deletedDataRecords()[type]?.find(item=>deletedRecordId(type,item)===String(id));
  if(!record) return;
  const display=deletedRecordDisplay(type,record);
  document.querySelector('.modal-backdrop')?.remove();
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal confirm-modal restore-confirm-modal">
    <div class="restore-confirm-icon">${icon('archive-restore')}</div>
    <h3>Restore this record?</h3>
    <p class="muted">Are you sure you want to restore <strong>${escapeHtml(display.primary)}</strong>? Only this record will be brought back.</p>
    <div class="modal-actions"><button type="button" class="secondary" data-cancel-restore>No</button><button type="button" class="primary" data-confirm-restore>Yes, Restore</button></div>
  </div>`;
  document.body.appendChild(wrap);
  window.lucide?.createIcons?.({attrs:{'stroke-width':2}});
  wrap.onclick=event=>{if(event.target===wrap) wrap.remove();};
  wrap.querySelector('[data-cancel-restore]').onclick=()=>wrap.remove();
  wrap.querySelector('[data-confirm-restore]').onclick=async event=>{
    const button=event.currentTarget;
    button.disabled=true;
    button.textContent='Restoring...';
    try{ await restoreDeletedRecord(type,id); }catch(error){ showToast(error.message || 'Unable to restore this record','error'); }
    finally{ wrap.remove(); }
  };
}

function openEditJobModal(job){
  const serviceOptions=serviceNames(true,[job.service]);
  const customerNames=[...new Set([...state.customers.map(c=>c.name),job.customer].filter(Boolean))];
  const crewNames=[...new Set([...state.crew.map(c=>c.name),job.crew].filter(Boolean))];
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal wide-modal job-edit-modal"><div class="modal-heading"><div><span class="modal-kicker">Job management</span><h3>Edit Job</h3><p class="muted">Update scheduling, assignment, status, and work requirements.</p></div></div><form id="editJobForm"><div class="form-grid">
    <div class="field"><label>Customer</label><select name="customer" required><option value="" ${!job.customer?'selected':''} disabled>Select customer</option>${customerNames.map(name=>`<option ${name===job.customer?'selected':''}>${escapeHtml(name)}</option>`).join('')}</select></div>
    <div class="field"><label>Service</label><select name="service" required><option value="" ${!job.service?'selected':''} disabled>Select service</option>${serviceOptions.map(service=>`<option ${service===job.service?'selected':''}>${escapeHtml(service)}</option>`).join('')}</select></div>
    <div class="field"><label>Date</label><input name="date" type="date" value="${escapeHtml(job.date)}" required></div>
    <div class="field"><label>Due Date</label><input name="due" type="date" value="${escapeHtml(job.due || job.date)}" required></div>
    <div class="field"><label>Price</label><input name="price" type="number" min="0" value="${job.price || 0}" required></div>
    <div class="field"><label>Priority</label><select name="priority"><option ${job.priority==='Low'?'selected':''}>Low</option><option ${!job.priority || job.priority==='Medium'?'selected':''}>Medium</option><option ${job.priority==='High'?'selected':''}>High</option><option ${job.priority==='Urgent'?'selected':''}>Urgent</option></select></div>
    <div class="field"><label>Duration (hours)</label><input name="duration" type="number" min="0" step="0.25" value="${Number.parseFloat(job.duration) || 0}" required></div>
    <div class="field"><label>Status</label><select name="status">
      <option value="" disabled>Select status...</option>
      <option value="notstarted" ${job.status==='notstarted'?'selected':''}>Not Started</option>
      <option value="pending" ${job.status==='pending'?'selected':''}>Pending</option>
      <option value="scheduled" ${job.status==='scheduled'?'selected':''}>Scheduled</option>
      <option value="progress" ${job.status==='progress'?'selected':''}>In Progress</option>
      <option value="onhold" ${job.status==='onhold'?'selected':''}>On Hold</option>
      <option value="completed" ${job.status==='completed'?'selected':''} disabled>Completed (set by crew)</option>
      <option value="invoiced" ${job.status==='invoiced'?'selected':''}>Invoiced</option>
      <option value="cancelled" ${job.status==='cancelled'?'selected':''}>Cancelled</option>
    </select></div>
    <div class="field"><label>Status Date</label><input name="statusDate" type="date" value="${escapeHtml(job.statusDate || job.invoicedAt || todayISO())}" required></div>
    <div class="field"><label>Equipment</label><input name="equipment" value="${escapeHtml(job.equipment || '')}" placeholder="Mower, trimmer, blower"></div>
    <div class="field"><label>Materials</label><input name="materials" value="${escapeHtml(job.materials || '')}" placeholder="Mulch, fertilizer, seed"></div>
    <div class="field full"><label>Notes</label><textarea name="notes" rows="3">${escapeHtml(job.notes || '')}</textarea></div>
  </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Save Job</button></div></form></div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  const editJobForm=wrap.querySelector('#editJobForm');
  bindServiceDefaults(editJobForm);
  const jobDateInput=editJobForm.querySelector('[name="date"]');
  const jobStatusInput=editJobForm.querySelector('[name="status"]');
  const jobStatusDateInput=editJobForm.querySelector('[name="statusDate"]');
  jobDateInput.addEventListener('change',()=>{
    if(jobDateInput.value > todayISO() && jobStatusInput.value !== 'invoiced'){
      jobStatusInput.value='scheduled';
      jobStatusDateInput.value=todayISO();
      showToast('Future job automatically set to Scheduled');
    }
  });
  editJobForm.onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const customer=state.customers.find(c=>c.name===f.get('customer'));
    const previousCrew=job.crew;
    job.customer=f.get('customer');
    job.service=f.get('service');
    job.date=f.get('date');
    job.due=f.get('due') || f.get('date');
    job.time='';
    job.crew=f.get('crew') || job.crew || '';
    job.price=Number(f.get('price'));
    job.address=customer?.address || job.address || '';
    job.priority=f.get('priority');
    job.duration=f.get('duration');
    const selectedStatus=f.get('status') || 'scheduled';
    if(selectedStatus==='completed' && job.status!=='completed'){
      showToast('Only the assigned crew can mark a job complete','error');
      return;
    }
    const futureStatusCanRemain=['notstarted','pending','onhold','cancelled','invoiced'].includes(selectedStatus);
    const nextStatus=job.date > todayISO() && !futureStatusCanRemain
      ? 'scheduled'
      : selectedStatus;
    if(nextStatus === 'invoiced' && !state.invoices.some(invoice=>String(invoice.jobId)===String(job.id))){
      showToast('Create an invoice before marking this job as invoiced','error');
      return;
    }
    if(job.status !== nextStatus) recordAudit(job,'Status changed',`Status set to ${jobStatusLabel(nextStatus)}`);
    job.status=nextStatus;
    job.statusDate=f.get('statusDate') || todayISO();
    if(nextStatus==='progress') job.startedAt=job.startedAt || new Date().toISOString();
    job.equipment=f.get('equipment');
    job.materials=f.get('materials');
    job.notes=f.get('notes');
    if(job.crew && normalizeText(job.crew)!==normalizeText(previousCrew)){
      addWorkspaceNotification({audience:`crew:${job.crew}`,kind:'job',id:job.id,severity:'info',title:`Job assigned to you: ${job.service}`,detail:`${job.customer} · ${displayDate(job.date)} · ${job.time || 'Time not set'}`});
    }
    save();
    await saveToFirebase('jobs',job);
    wrap.remove();
    showToast('Job updated');
    render();
  };
}

function openEditEstimateModal(estimate){
  const customerNames=[...new Set([...state.customers.map(c=>c.name),estimate.customer].filter(Boolean))];
  const estimateServiceNames=serviceNames(true,[estimate.service]);
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal"><h3>Edit Estimate</h3><form id="editEstimateForm"><div class="form-grid">
    <div class="field"><label>Customer</label><select name="customer" required>${customerNames.map(name=>`<option ${name===estimate.customer?'selected':''}>${escapeHtml(name)}</option>`).join('')}</select></div>
    <div class="field"><label>Estimate Date</label><input name="createdDate" type="date" value="${escapeHtml(estimateCreatedDate(estimate))}" required></div>
    <div class="field"><label>Service</label><select name="service" required>${estimateServiceNames.map(service=>`<option ${service===estimate.service?'selected':''}>${escapeHtml(service)}</option>`).join('')}</select></div>
    <div class="field"><label>Status</label><select name="status">
      <option value="" disabled>Select status...</option>
      <option value="pending" ${estimate.status==='pending'?'selected':''}>Pending</option>
      <option value="followup1" ${estimate.status==='followup1'?'selected':''}>Follow Up 1</option>
      <option value="followup2" ${estimate.status==='followup2'?'selected':''}>Follow Up 2</option>
      <option value="paid" ${estimate.status==='paid'?'selected':''}>Proceeding</option>
      <option value="converted" ${estimate.status==='converted'?'selected':''}>Converted to Job</option>
      <option value="rejected" ${estimate.status==='rejected'?'selected':''}>Not Proceeding</option>
    </select></div>
    <div class="field"><label>Estimated Amount</label><input name="amount" type="number" min="0" value="${estimate.amount || 0}" required></div>
    <div class="field" data-approved-amount-field ${estimate.status==='paid'?'':'hidden'}><label>Approved Amount</label><input name="approvedAmount" type="number" min="0" step="0.01" value="${estimateApprovedAmount(estimate)}" ${estimate.status==='paid'?'':'disabled'}></div>
    <div class="field"><label id="editEstimateStatusDateLabel">${escapeHtml(estimateStatusDateLabel(estimate.status))}</label><input name="statusDate" type="date" value="${estimate.statusDate || todayISO()}" required></div>
    <div class="field"><label>Expiration Date</label><input name="expirationDate" type="date" value="${escapeHtml(estimateExpirationDate(estimate))}" required></div>
    <div class="field full"><label>Notes</label><textarea name="notes" rows="3">${escapeHtml(estimate.notes || '')}</textarea></div>
  </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Save Estimate</button></div></form></div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  const editEstimateForm=wrap.querySelector('#editEstimateForm');
  bindServiceDefaults(editEstimateForm,{amountName:'amount',durationName:null});
  const editEstimateStatus=editEstimateForm.querySelector('[name="status"]');
  const editEstimateStatusDate=editEstimateForm.querySelector('[name="statusDate"]');
  const editEstimateStatusDateLabel=editEstimateForm.querySelector('#editEstimateStatusDateLabel');
  const toggleEditApprovedFields=(resetDate=false)=>{
    const approved=editEstimateStatus.value==='paid';
    editEstimateForm.querySelectorAll('[data-approved-amount-field]').forEach(field=>{
      field.hidden=!approved;
      field.querySelectorAll('input').forEach(input=>input.disabled=!approved);
    });
    editEstimateStatusDateLabel.textContent=estimateStatusDateLabel(editEstimateStatus.value);
    if(resetDate) editEstimateStatusDate.value=todayISO();
  };
  editEstimateStatus.addEventListener('change',()=>toggleEditApprovedFields(true));
  toggleEditApprovedFields();
  editEstimateForm.onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    estimate.customer=f.get('customer');
    estimate.service=f.get('service');
    const nextStatus=f.get('status');
    estimate.amount=Number(f.get('amount'));
    estimate.approvedAmount=nextStatus==='paid' ? Number(f.get('approvedAmount') || 0) : 0;
    if(nextStatus === 'converted' && !convertedJobForEstimate(estimate)){
      showToast('Use Convert to Job so a linked job number is created','error');
      return;
    }
    if(estimate.status !== nextStatus) recordAudit(estimate,'Status changed',`Status set to ${estimateStatusLabel(nextStatus)}`);
    estimate.status=nextStatus;
    estimate.statusDate=f.get('statusDate') || todayISO();
    estimate.createdDate=f.get('createdDate') || estimateCreatedDate(estimate);
    estimate.expirationDate=f.get('expirationDate') || estimateExpirationDate(estimate);
    delete estimate.followup1Date;
    delete estimate.followup2Date;
    delete estimate.nextFollowUpDate;
    delete estimate.lastFollowUpDate;
    if(nextStatus==='paid') estimate.approvedAt=estimate.statusDate;
    if(nextStatus==='rejected') estimate.rejectedAt=estimate.statusDate;
    estimate.updatedAt = Date.now();
    estimate.notes=f.get('notes');
    save();
    await saveToFirebase('estimates',estimate);
    wrap.remove();
    showToast('Estimate updated');
    render();
  };
}

function openInvoiceLineItemsModal(invoice){
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal line-items-modal"><h3>Invoice Line Items</h3><p class="muted payment-modal-summary">Adjust services, quantities, rates, and tax.</p>
    <form id="lineItemsForm">
      <div class="line-items-editor" id="lineItemsEditor"></div>
      <button type="button" class="secondary" id="addLineItem">+ Add Line Item</button>
      <div class="form-grid invoice-adjustments">
        <div class="field"><label>Tax Rate (%)</label><input name="taxRate" type="number" min="0" max="100" step="0.01" value="${Number(invoice.taxRate || 0)}"></div>
      </div>
      <div class="line-item-preview"><span>Calculated Total</span><strong id="lineItemTotal">${money(invoiceTotal(invoice))}</strong></div>
      <div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Save Billing</button></div>
    </form>
  </div>`;
  document.body.appendChild(wrap);
  const editor=wrap.querySelector('#lineItemsEditor');
  const renderItem=(item={})=>{
    const row=document.createElement('div');
    row.className='line-item-editor-row';
    row.innerHTML=`<div class="field line-description"><label>Description</label><input data-item-description value="${escapeHtml(item.description || '')}" placeholder="Service or material" required></div>
      <div class="field"><label>Qty</label><input data-item-quantity type="number" min="0.01" step="0.01" value="${Number(item.quantity || 1)}" required></div>
      <div class="field"><label>Rate</label><input data-item-rate type="number" min="0" step="0.01" value="${Number(item.rate || 0)}" required></div>
      <button type="button" class="icon-btn remove-line-item" aria-label="Remove line item">&times;</button>`;
    row.querySelector('.remove-line-item').onclick=()=>{ row.remove(); updatePreview(); };
    row.querySelectorAll('input').forEach(input=>input.addEventListener('input',updatePreview));
    editor.appendChild(row);
  };
  const collectItems=()=>[...editor.querySelectorAll('.line-item-editor-row')].map((row,index)=>({
    id:`ITEM-${Date.now()}-${index}`,
    description:String(row.querySelector('[data-item-description]').value || '').trim(),
    quantity:Math.round(Number(row.querySelector('[data-item-quantity]').value || 0) * 100) / 100,
    rate:currencyValue(row.querySelector('[data-item-rate]').value || 0)
  })).filter(item=>item.description && item.quantity>0 && item.rate>=0);
  const updatePreview=()=>{
    const items=collectItems();
    const taxRate=Number(wrap.querySelector('[name="taxRate"]').value || 0);
    wrap.querySelector('#lineItemTotal').textContent=money(invoiceTotal({lineItems:items,taxRate}));
  };
  invoiceLineItems(invoice).forEach(renderItem);
  if(!editor.children.length) renderItem({description:'Landscaping services',quantity:1,rate:invoiceTotal(invoice)});
  wrap.querySelector('#addLineItem').onclick=()=>{ renderItem({quantity:1,rate:0}); updatePreview(); };
  wrap.querySelectorAll('[name="taxRate"]').forEach(input=>input.addEventListener('input',updatePreview));
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  updatePreview();
  wrap.querySelector('#lineItemsForm').onsubmit=async e=>{
    e.preventDefault();
    const items=collectItems();
    if(!items.length){ showToast('Add at least one valid line item','error'); return; }
    const form=new FormData(e.target);
    const candidate={...invoice,lineItems:items,taxRate:Number(form.get('taxRate')||0),discount:0};
    const nextTotal=invoiceTotal(candidate);
    if(nextTotal<=0){ showToast('Invoice total must be greater than $0.00','error'); return; }
    if(nextTotal < invoicePaidAmount(invoice)){
      showToast(`Invoice total cannot be less than ${money(invoicePaidAmount(invoice))} already paid`,'error');
      return;
    }
    invoice.lineItems=items;
    invoice.taxRate=candidate.taxRate;
    invoice.discount=candidate.discount;
    invoice.amount=nextTotal;
    recordAudit(invoice,'Billing updated',`${items.length} line item${items.length===1?'':'s'} · ${money(nextTotal)} total`);
    recalculateInvoiceFromPayments(invoice);
    save();
    await saveToFirebase('invoices',invoice);
    wrap.remove();
    showToast('Invoice billing updated');
    render();
  };
}

function openInvoicePaymentModal(invoice, payment = null){
  const isEditing = Boolean(payment);
  const currentAmount = currencyValue(payment?.amount || 0);
  const availableAmount = currencyValue(invoiceDueAmount(invoice) + currentAmount);
  const selectedMethod = payment?.method || 'Cash';
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal payment-modal"><h3>${isEditing?'Edit Payment':'Add Payment'}</h3>
    <p class="muted payment-modal-summary">Invoice ${escapeHtml(invoice.id)} &middot; ${money(invoiceDueAmount(invoice))} currently due</p>
    <form id="invoicePaymentForm"><div class="form-grid">
      <div class="field"><label>Payment Amount</label><input name="amount" type="number" min="0.01" max="${availableAmount.toFixed(2)}" step="0.01" value="${(isEditing?currentAmount:invoiceDueAmount(invoice)).toFixed(2)}" required></div>
      <div class="field"><label>Payment Date</label><input name="date" type="date" value="${escapeHtml(payment?.date || todayISO())}" required></div>
      <div class="field"><label>Payment Method</label><select name="method">
        ${['Cash','Check','Card','Bank Transfer','Other'].map(method=>`<option value="${method}" ${selectedMethod===method?'selected':''}>${method}</option>`).join('')}
      </select></div>
      <div class="field"><label>Reference / Check Number</label><input name="reference" value="${escapeHtml(payment?.reference || '')}" placeholder="Check #, transaction ID, or receipt #"></div>
      <div class="field full"><label>Payment Notes</label><textarea name="notes" rows="3" placeholder="Optional payment details or internal notes...">${escapeHtml(payment?.notes || '')}</textarea></div>
    </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">${isEditing?'Save Payment':'Add Payment'}</button></div></form>
  </div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.querySelector('#invoicePaymentForm').onsubmit=async e=>{
    e.preventDefault();
    const form=new FormData(e.target);
    const amount=currencyValue(form.get('amount') || 0);
    if(amount <= 0 || amount > availableAmount){
      showToast(`Payment must be between $0.01 and ${money(availableAmount)}`);
      return;
    }
    const nextPayment={
      id: payment?.id || `PAY-${Date.now()}`,
      amount,
      date:form.get('date') || todayISO(),
      method:form.get('method') || 'Cash',
      reference:String(form.get('reference') || '').trim(),
      notes:String(form.get('notes') || '').trim(),
      createdAt:payment?.createdAt || Date.now(),
      updatedAt:Date.now()
    };
    const payments=invoicePaymentRecords(invoice);
    invoice.payments=isEditing
      ? payments.map(item=>String(item.id)===String(payment.id)?nextPayment:item)
      : [...payments,nextPayment];
    recordAudit(invoice,isEditing?'Payment updated':'Payment received',`${money(amount)} via ${nextPayment.method}${nextPayment.reference?` · ${nextPayment.reference}`:''}`);
    recalculateInvoiceFromPayments(invoice);
    save();
    await saveToFirebase('invoices',invoice);
    wrap.remove();
    showToast(isEditing?'Payment updated':'Payment added');
    render();
  };
}

function openEditInvoiceModal(invoice){
  const totalAmount = invoiceTotal(invoice);
  const paidAmount = invoicePaidAmount(invoice);
  const relatedJob=invoice.jobId ? state.jobs.find(job=>String(job.id)===String(invoice.jobId)) : null;
  const selectedService=invoice.service || relatedJob?.service || invoiceLineItems(invoice)[0]?.description || '';
  const documentStatus=['draft','sent','pending','unpaid','partial','paid','overdue','cancelled'].includes(invoice.status) ? invoice.status : 'unpaid';
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal invoice-form-modal"><div class="modal-heading"><div><h3>Edit Invoice</h3><p class="muted">Update invoice details and billing items in one place.</p></div></div>
    <form id="editInvoiceForm">
      <div class="form-grid invoice-main-fields">
        <div class="field"><label>Invoice No.</label><input name="invoiceNumber" value="${escapeHtml(invoice.id)}" readonly required></div>
        <div class="field"><label>Customer</label><select name="customer" required>${!state.customers.some(customer=>customer.name===invoice.customer)?`<option selected>${escapeHtml(invoice.customer)}</option>`:''}${state.customers.map(customer=>`<option ${customer.name===invoice.customer?'selected':''}>${escapeHtml(customer.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Invoice Date</label><input name="invoiced" type="date" value="${escapeHtml(dateInputValue(invoice.invoiced))}" required></div>
        <div class="field"><label>Due Date</label><input name="due" type="date" value="${escapeHtml(dateInputValue(invoice.due))}" required></div>
        <div class="field"><label>Invoice Status</label><select name="status" required>
      <option value="draft" ${documentStatus==='draft'?'selected':''}>Draft</option>
      <option value="sent" ${documentStatus==='sent'?'selected':''}>Sent</option>
      <option value="pending" ${documentStatus==='pending'?'selected':''}>Pending</option>
      <option value="unpaid" ${documentStatus==='unpaid'?'selected':''}>Unpaid</option>
      <option value="partial" ${documentStatus==='partial'?'selected':''}>Partially Paid</option>
      <option value="paid" ${documentStatus==='paid'?'selected':''}>Paid</option>
      <option value="overdue" ${documentStatus==='overdue'?'selected':''}>Overdue</option>
      <option value="cancelled" ${documentStatus==='cancelled'?'selected':''}>Cancelled</option>
    </select></div>
        <div class="field" data-edit-invoice-paid-date-field ${['paid','partial'].includes(documentStatus)?'':'hidden'}><label>Paid Date</label><input name="paidDate" type="date" value="${escapeHtml(dateInputValue(invoice.paid || ''))}"></div>
        <div class="field" data-edit-invoice-payment-field ${['paid','partial'].includes(documentStatus)?'':'hidden'}><label>Payment Amount</label><input name="paymentAmount" type="number" min="0" step="0.01" value="${Number(paidAmount || 0)}"></div>
        <div class="field" data-edit-invoice-payment-method-field ${documentStatus==='paid'?'':'hidden'}><label>Payment Method</label><select name="paymentMethod">${['Cash','Check','Card','Bank Transfer','Other'].map(method=>`<option value="${method}" ${String(invoice.paymentMethod || invoicePaymentRecords(invoice)[0]?.method || 'Cash')===method?'selected':''}>${method}</option>`).join('')}</select></div>
        <div class="field"><label>Tax Rate (%)</label><input name="taxRate" type="number" min="0" max="100" step="0.01" value="${Number(invoice.taxRate || 0)}"></div>
      </div>
      <section class="invoice-items-section">
        <div class="invoice-items-heading"><div><h4>Invoice Line Items</h4><p class="muted">Choose a job for this customer to fill the service name, quantity, and rate automatically.</p></div><button type="button" class="secondary compact" data-add-invoice-item>+ Add Line Item</button></div>
        <div class="line-items-editor" data-invoice-items-editor></div>
      </section>
      <div class="invoice-live-summary" aria-live="polite">
        <div><span>Subtotal Amount</span><strong data-invoice-summary="subtotal">$0.00</strong></div>
        <div><span data-invoice-summary-tax-label>Tax (0%)</span><strong data-invoice-summary="tax">$0.00</strong></div>
        <div class="summary-total"><span>Total Amount</span><strong data-invoice-summary="total">$0.00</strong></div>
        <div class="summary-paid"><span>Amount Paid</span><strong data-invoice-summary="paid">$0.00</strong></div>
        <div class="summary-due"><span>Balance Due</span><strong data-invoice-summary="due">$0.00</strong></div>
      </div>
      <div class="form-grid invoice-payment-fields">
        <div class="field full"><label>Notes <small>(optional)</small></label><textarea name="notes" rows="2">${escapeHtml(invoice.notes || '')}</textarea><small class="muted">Use Add Payment on the invoice page to record payments and payment dates.</small></div>
      </div>
      <div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Save Invoice</button></div>
    </form>
  </div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  const taxInput=wrap.querySelector('[name="taxRate"]');
  const customerInput=wrap.querySelector('[name="customer"]');
  const statusInput=wrap.querySelector('[name="status"]');
  const paidDateField=wrap.querySelector('[data-edit-invoice-paid-date-field]');
  const paymentField=wrap.querySelector('[data-edit-invoice-payment-field]');
  const paymentMethodField=wrap.querySelector('[data-edit-invoice-payment-method-field]');
  const paymentInput=paymentField.querySelector('input');
  const togglePaymentFields=()=>{
    const visible=['paid','partial'].includes(statusInput.value);
    paidDateField.hidden=!visible;
    paidDateField.querySelector('input').disabled=!visible;
    paymentField.hidden=!visible;
    paymentInput.disabled=!visible;
    const needsPaymentMethod=statusInput.value==='paid';
    paymentMethodField.hidden=!needsPaymentMethod;
    paymentMethodField.querySelector('select').disabled=!needsPaymentMethod;
    if(visible && !paidDateField.querySelector('input').value) paidDateField.querySelector('input').value=todayISO();
    paymentInput.readOnly=statusInput.value==='paid';
  };
  let itemsEditor;
  const syncInvoiceTotals=()=>{
    const subtotal=currencyValue(itemsEditor?.collectItems().reduce((sum,item)=>sum+currencyValue(item.quantity*item.rate),0) || 0);
    const previewTotal=currencyValue(subtotal + (subtotal * Math.min(100,Math.max(0,Number(taxInput.value || 0))) / 100));
    if(statusInput.value==='paid') paymentInput.value=String(previewTotal);
    paymentInput.max=String(previewTotal);
    const previewPaid=statusInput.value==='paid' ? previewTotal : statusInput.value==='partial' ? Math.min(previewTotal,Math.max(0,Number(paymentInput.value || 0))) : paidAmount;
    updateInvoiceFormSummary(wrap,{subtotal,taxRate:taxInput.value,paid:previewPaid});
    updateInvoiceFormBreakdown(wrap,itemsEditor?.collectItems() || [],previewPaid);
  };
  const existingItems=invoiceLineItems(invoice).map((item,index)=>index===0 && !item.jobId ? {...item,jobId:invoice.jobId || ''} : item);
  itemsEditor=mountInvoiceItemsEditor(wrap,existingItems,syncInvoiceTotals,{customerInput,currentInvoiceId:invoice.id});
  customerInput.addEventListener('change',()=>itemsEditor.refreshJobs());
  taxInput.addEventListener('input',syncInvoiceTotals);
  statusInput.addEventListener('change',()=>{ togglePaymentFields(); syncInvoiceTotals(); });
  paymentInput.addEventListener('input',syncInvoiceTotals);
  togglePaymentFields();
  syncInvoiceTotals();
  wrap.querySelector('#editInvoiceForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const oldId=invoice.id;
    const nextId=String(f.get('invoiceNumber') || '').trim();
    if(state.invoices.some(item=>item!==invoice && String(item.id).toLowerCase()===nextId.toLowerCase())){
      showToast('Invoice number already exists','error');
      return;
    }
    const lineItems=itemsEditor.collectItems();
    if(!lineItems.length || lineItems.some(item=>!item.jobId)){ showToast('Choose a job for every line item','error'); return; }
    const jobs=lineItems.map(item=>state.jobs.find(job=>String(job.id)===String(item.jobId))).filter(Boolean);
    const job=jobs[0];
    if(!job){ showToast('Choose a job for every line item','error'); return; }
    const duplicate=lineItems.map(line=>({line,conflict:unavailableInvoiceJob(line.jobId,invoice.id)})).find(item=>item.conflict);
    if(duplicate){
      showToast(duplicate.conflict.invoice
        ? `${displayJobNumber(duplicate.line.jobId)} already has invoice ${duplicate.conflict.invoice.id}`
        : `${displayJobNumber(duplicate.line.jobId)} is already invoiced`,'error');
      return;
    }
    const candidate={...invoice,lineItems,taxRate:Number(f.get('taxRate') || 0)};
    const total = invoiceTotal(candidate);
    if(total<=0){ showToast('Invoice total must be greater than $0.00','error'); return; }
    const nextStatus=f.get('status') || 'draft';
    const enteredPayment=Math.max(0,Number(f.get('paymentAmount') || 0));
    const targetPaid=nextStatus==='paid' ? total : nextStatus==='partial' ? Math.min(total,enteredPayment) : paidAmount;
    if(nextStatus==='partial' && targetPaid<=0){
      showToast('Enter a payment amount for a partially paid invoice','error');
      return;
    }
    if(total < targetPaid){
      showToast(`Invoice total cannot be less than ${money(targetPaid)} paid`,'error');
      return;
    }
    invoice.id=nextId;
    const previousJobId=invoice.jobId;
    invoice.customer=f.get('customer') || job.customer;
    invoice.projectName='';
    invoice.jobId=job.id;
    invoice.service=lineItems[0]?.description || selectedService || '';
    invoice.lineItems=lineItems;
    invoice.taxRate=candidate.taxRate;
    invoice.amount=total;
    invoice.invoiced=f.get('invoiced');
    invoice.due=f.get('due');
    invoice.status=nextStatus;
    invoice.notes=f.get('notes');
    const paidDate=String(f.get('paidDate') || '').trim();
    if(['paid','partial'].includes(invoice.status)){
      updateInvoicePaidAmount(invoice, targetPaid, paidDate || todayISO());
      invoice.paymentMethod=String(f.get('paymentMethod') || 'Cash');
      if(invoice.payments?.length){
        invoice.payments[invoice.payments.length-1].method=invoice.paymentMethod;
        invoice.payments[invoice.payments.length-1].date=paidDate || todayISO();
      }
    }
    recalculateInvoiceFromPayments(invoice);
    if(f.get('status') === 'cancelled') invoice.status='cancelled';
    if(oldId!==nextId){
      state.jobs.filter(job=>String(job.invoiceId)===String(oldId)).forEach(job=>{ job.invoiceId=nextId; });
      selectedInvoice=nextId;
    }
    if(previousJobId && !lineItems.some(line=>String(line.jobId)===String(previousJobId))){
      const previousJob=state.jobs.find(item=>String(item.id)===String(previousJobId));
      if(previousJob && String(previousJob.invoiceId)===String(oldId)){
        previousJob.invoiceId='';
        if(previousJob.status==='invoiced') previousJob.status='completed';
        await saveToFirebase('jobs',previousJob);
      }
    }
    for(const linkedJob of jobs){
      linkedJob.invoiceId=nextId;
      linkedJob.status='invoiced';
      linkedJob.invoicedAt=invoice.invoiced || todayISO();
      await saveToFirebase('jobs',linkedJob);
    }
    recordAudit(invoice,'Invoice details updated',`${nextId} · ${lineItems.length} line item${lineItems.length===1?'':'s'} · ${money(total)}`);
    save();
    await saveToFirebase('invoices',invoice);
    wrap.remove();
    showToast('Invoice updated');
    render();
  };
}

function openEditCrewModal(index){
  const crew=state.crew[index];
  if(!crew) return;
  const linkedUser=findCrewUserForRecord(crew);
  const oldName = crew.name;
  const oldEmail = crew.email || '';
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.innerHTML=`<div class="modal"><h3>Edit Crew Member</h3><form id="editCrewForm"><div class="form-grid">
    <div class="field"><label>Name</label><input name="name" value="${escapeHtml(crew.name)}" required></div>
    <div class="field"><label>Email</label><input name="email" type="email" value="${escapeHtml(crew.email || linkedUser?.email || '')}" placeholder="crew@example.com"></div>
    <div class="field"><label>Phone</label><input name="phone" value="${escapeHtml(crew.phone || linkedUser?.phone || '')}" placeholder="(555) 555-0100"></div>
    ${linkedUser ? `<div class="field"><label>New Password <small>(optional)</small></label><input name="password" type="password" autocomplete="new-password" placeholder="Leave blank to keep current password"></div>` : ''}
    <div class="field"><label>Role</label><select name="role"><option ${crew.role==='Team Leader'?'selected':''}>Team Leader</option><option ${crew.role==='Crew Member'?'selected':''}>Crew Member</option></select></div>
    <div class="field"><label>Employment Status</label><select name="status"><option value="" disabled>Select status...</option><option value="Active" ${isCrewActive(crew)?'selected':''}>Active</option><option value="Inactive" ${isCrewInactive(crew)?'selected':''}>Inactive</option></select></div>
    <div class="field"><label>Availability</label><input name="availability" value="${escapeHtml(crew.availability || '8 AM - 6 PM')}"></div>
    <div class="field full"><label>Address</label><input name="address" value="${escapeHtml(crew.address || '')}" placeholder="Street, city, state"></div>
    <div class="field"><label>Emergency Contact</label><input name="emergencyContact" value="${escapeHtml(crew.emergencyContact || '')}" placeholder="Name / phone"></div>
    <div class="field"><label>Skills</label><input name="skills" value="${escapeHtml(crew.skills || '')}" placeholder="Lawn care, trimming, irrigation"></div>
    <div class="field full"><label>Profile Notes</label><textarea name="profileNotes" rows="3" placeholder="Internal notes for admin/administrator">${escapeHtml(crew.profileNotes || '')}</textarea></div>
  </div><div class="modal-actions"><button type="button" class="secondary" id="cancelModal">Cancel</button><button class="primary">Save Member</button></div></form></div>`;
  document.body.appendChild(wrap);
  wrap.onclick=e=>{if(e.target===wrap)wrap.remove()};
  wrap.querySelector('#cancelModal').onclick=()=>wrap.remove();
  wrap.querySelector('#editCrewForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const newPassword=String(f.get('password') || '');
    const passwordMessage=newPassword ? passwordValidationMessage(newPassword) : '';
    if(passwordMessage){showToast(passwordMessage,'error');return;}
    if(linkedUser){
      try{
        await apiRequest('/auth/team/update',{
          authUid:linkedUser.authUid || '',
          currentEmail:linkedUser.email,
          name:cleanCrewName(f.get('name')),
          email:normalizeEmailText(f.get('email') || linkedUser.email),
          phone:String(f.get('phone') || '').trim(),
          password:newPassword,
          role:'crew',
          employmentStatus:String(f.get('status') || 'Active'),
          crewRole:String(f.get('role') || 'Crew Member'),
          availability:String(f.get('availability') || '').trim(),
          address:String(f.get('address') || '').trim(),
          emergencyContact:String(f.get('emergencyContact') || '').trim(),
          skills:String(f.get('skills') || '').trim(),
          profileNotes:String(f.get('profileNotes') || '').trim()
        });
      }catch(error){
        showToast(error.message || 'Unable to update crew login','error');
        return;
      }
    }
    crew.name=cleanCrewName(f.get('name'));
    crew.email=String(f.get('email') || '').trim();
    crew.phone=String(f.get('phone') || '').trim();
    crew.role=f.get('role');
    crew.status=f.get('status');
    crew.availability=String(f.get('availability') || '').trim();
    crew.address=String(f.get('address') || '').trim();
    crew.emergencyContact=String(f.get('emergencyContact') || '').trim();
    crew.skills=String(f.get('skills') || '').trim();
    crew.profileNotes=String(f.get('profileNotes') || '').trim();
    state.jobs.forEach(job => {
      if(normalizeText(job.crew) === normalizeText(oldName)) job.crew = crew.name;
    });
    const users = getUsers().map(user => {
      const isSameCrewUser = userRole(user) === 'crew' && (
        normalizeText(user.name) === normalizeText(oldName) ||
        (oldEmail && normalizeEmailText(user.email) === normalizeEmailText(oldEmail))
      );
      return isSameCrewUser ? {
        ...user,
        name: crew.name,
        email: crew.email || user.email,
        phone: crew.phone,
        address: crew.address,
        emergencyContact: crew.emergencyContact,
        skills: crew.skills,
        availability: crew.availability,
        profileNotes: crew.profileNotes
      } : user;
    });
    setUsers(users);
    save();
    await saveToFirebase('crew',crew);
    wrap.remove();
    showToast('Crew member updated');
    render();
  };
}

function deleteCustomerById(id){
  const customer=state.customers.find(c=>c.id == id);
  if(!customer) return;
  openDeleteConfirm('Delete customer?', `Are you sure you want to delete ${customer.name}?`, async()=>{
    captureDeletedRecord('customers',customer);
    state.customers=state.customers.filter(c=>c.id != id);
    if(selectedCustomer == id || selectedCustomer === customer.name){
      selectedCustomer=null;
      currentView='customers';
    }
    await saveToFirebase('customers',{id,deleted:true});
    showToast('Customer deleted');
    render();
  });
}

function deleteServiceById(id){
  const service=state.services.find(item=>String(item.id)===String(id));
  if(!service) return;
  const usage=[...state.customers,...state.jobs,...state.estimates,...state.invoices]
    .filter(record=>normalizeText(record.service)===normalizeText(service.name)).length;
  const detail=usage
    ? `${service.name} is referenced by ${usage} existing record${usage===1?'':'s'}. It will be marked inactive and hidden from new forms while existing records remain unchanged.`
    : `Are you sure you want to delete ${service.name}?`;
  openDeleteConfirm(usage?'Archive service?':'Delete service?',detail,async()=>{
    if(usage){
      service.status='inactive';
      service.updatedAt=Date.now();
    }else{
      captureDeletedRecord('services',service);
      state.services=state.services.filter(item=>String(item.id)!==String(id));
    }
    await saveToFirebase('services',usage?service:{id,deleted:true});
    showToast(usage?'Service marked inactive':'Service deleted');
    render();
  });
}

function deleteJobById(id){
  const job=state.jobs.find(j=>j.id == id);
  if(!job) return;
  const linkedInvoiceCount=state.invoices.filter(invoice=>
    String(invoice.jobId)===String(id) || invoiceLineItems(invoice).some(item=>String(item.jobId)===String(id))
  ).length;
  const warning=linkedInvoiceCount
    ? `This will also remove #JOB-${job.id} from ${linkedInvoiceCount} linked invoice${linkedInvoiceCount===1?'':'s'}. Any payment allocated to this job will be removed; invoices with no remaining line items will be deleted.`
    : `Are you sure you want to delete #JOB-${job.id}?`;
  openDeleteConfirm('Delete job?', warning, async()=>{
    // Capture the workspace state before changing linked invoices so restore keeps the original totals and payments.
    captureDeletedRecord('jobs',job);
    const affectedInvoices=state.invoices.filter(invoice=>
      String(invoice.jobId)===String(id) || invoiceLineItems(invoice).some(item=>String(item.jobId)===String(id))
    );
    let deletedInvoices=0;
    let updatedInvoices=0;
    for(const invoice of affectedInvoices){
      const invoicePaidBefore=invoicePaidAmount(invoice);
      const allocations=invoiceLinePaymentAllocations(invoice);
      const paidForDeletedJob=currencyValue(allocations
        .filter(item=>String(item.jobId)===String(id))
        .reduce((sum,item)=>sum+Number(item.paid || 0),0));
      const remainingItems=invoiceLineItems(invoice)
        .filter(item=>String(item.jobId)!==String(id));
      if(!remainingItems.length){
        captureDeletedRecord('invoices',invoice);
        state.invoices=state.invoices.filter(item=>item!==invoice);
        if(selectedInvoice===invoice.id){ selectedInvoice=null; currentView='invoices'; }
        await saveToFirebase('invoices',{id:invoice.id,deleted:true});
        deletedInvoices++;
        continue;
      }
      invoice.lineItems=remainingItems;
      if(String(invoice.jobId)===String(id)) invoice.jobId=remainingItems[0]?.jobId || '';
      invoice.service=remainingItems[0]?.description || invoice.service;
      updateInvoicePaidAmount(invoice,Math.max(0,invoicePaidBefore-paidForDeletedJob),invoice.paid || todayISO());
      recordAudit(invoice,'Job removed from invoice',`#JOB-${job.id} and its allocated payment were removed after the job was deleted.`);
      await saveToFirebase('invoices',invoice);
      updatedInvoices++;
    }
    state.jobs=state.jobs.filter(j=>j.id != id);
    if(selectedJob?.id == id){
      selectedJob=state.jobs[0] || null;
      currentView='jobs';
    }
    await saveToFirebase('jobs',{id,deleted:true});
    save();
    const invoiceMessage=deletedInvoices || updatedInvoices
      ? ` Job removed from ${updatedInvoices} invoice${updatedInvoices===1?'':'s'}; ${deletedInvoices} empty invoice${deletedInvoices===1?' was':'s were'} deleted.`
      : '';
    showToast(`Job deleted.${invoiceMessage}`);
    render();
  });
}

function deleteEstimateById(id){
  const estimate=state.estimates.find(e=>e.id === id);
  if(!estimate) return;
  openDeleteConfirm('Delete estimate?', `Are you sure you want to delete ${estimate.id}?`, async()=>{
    captureDeletedRecord('estimates',estimate);
    state.estimates=state.estimates.filter(e=>e.id !== id);
    if(selectedEstimate === id){
      selectedEstimate=null;
      currentView='estimates';
    }
    await saveToFirebase('estimates',{id,deleted:true});
    showToast('Estimate deleted');
    render();
  });
}

function deleteInvoiceById(id){
  const invoice=state.invoices.find(i=>i.id === id);
  if(!invoice) return;
  openDeleteConfirm('Delete invoice?', `Are you sure you want to delete ${invoice.id}?`, async()=>{
    captureDeletedRecord('invoices',invoice);
    state.invoices=state.invoices.filter(i=>i.id !== id);
    if(selectedInvoice === id){
      selectedInvoice=null;
      currentView='invoices';
    }
    await saveToFirebase('invoices',{id,deleted:true});
    showToast('Invoice deleted');
    render();
  });
}

function deleteCrewByIndex(index){
  const crew=state.crew[index];
  if(!crew) return;
  openDeleteConfirm('Delete crew member?', `Are you sure you want to delete ${crew.name}?`, async()=>{
    captureDeletedRecord('crew',crew);
    state.crew.splice(index,1);
    await saveToFirebase('crew',{id:crew.id || index,deleted:true});
    showToast('Crew member deleted');
    render();
  });
}

initializeApp().then(() => {
  render();
  startCustomerWorkspaceSync();
  if(startupToastMessage){
    showToast(startupToastMessage);
    startupToastMessage = '';
  }
});


