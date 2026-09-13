/* Rebel Hounds MC — Club Manager. Offline-first, localStorage. */
const LS_KEY = 'rhmc_manager_v1';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayISO = () => new Date().toISOString().slice(0,10);
const daysUntil = d => { if(!d) return null; const t=new Date(); t.setHours(0,0,0,0); return Math.round((new Date(d)-t)/86400000); };
const money = n => (Number(n)||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});

const COLLECTIONS = ['members','prospects','projects','tasks','deadlines','gangs','intel','heists','civilians','finance','inventory','bikes'];

const SCHEMAS = {
  members: [
    {k:'name',label:'Road name',req:1},{k:'callsign',label:'Callsign / AKA'},
    {k:'rank',label:'Rank',type:'select',opts:['President','Vice President','Sergeant At Arms','Secretary','Treasurer','Road Captain','Enforcer','Full Patch','Tailgunner','Nomad','Life Member','Hangaround']},
    {k:'status',label:'Status',type:'select',opts:['Active','Inactive','Retired','Out Bad']},
    {k:'phone',label:'Phone'},{k:'discord',label:'Discord'},
    {k:'joined',label:'Patched date',type:'date'},
    {k:'duesPaid',label:'Dues status',type:'select',opts:['Paid','Owes','Exempt']},
    {k:'bike',label:'Bike'},{k:'notes',label:'Notes / file',type:'textarea',full:1},
  ],
  prospects: [
    {k:'name',label:'Name',req:1},{k:'sponsor',label:'Sponsor'},{k:'recruitedBy',label:'Recruited by'},
    {k:'stage',label:'Stage',type:'select',opts:['Hangaround','Prospect','Patched','Dropped']},
    {k:'since',label:'Since',type:'date'},{k:'standing',label:'Standing',type:'select',opts:['Good','Watch','Shaky','Bad']},
    {k:'attendance',label:'Attendance %',type:'number'},{k:'nextReview',label:'Next review',type:'date'},
    {k:'tasks',label:'Assigned tasks / chores',full:1},{k:'notes',label:'Officer notes',type:'textarea',full:1},
  ],
  projects: [
    {k:'title',label:'Project title',req:1,full:1},
    {k:'category',label:'Category',type:'select',opts:['Business','Run / Event','Clubhouse','Recruitment','Intel Op','Other']},
    {k:'lead',label:'Lead'},{k:'status',label:'Status',type:'select',opts:['Planning','Active','On Hold','Done']},
    {k:'priority',label:'Priority',type:'select',opts:['Low','Normal','High','Urgent']},
    {k:'start',label:'Start',type:'date'},{k:'deadline',label:'Deadline',type:'date'},
    {k:'progress',label:'Progress %',type:'number'},
    {k:'desc',label:'Details / plan',type:'textarea',full:1},
  ],
  tasks: [
    {k:'title',label:'Task',req:1,full:1},
    {k:'assignedTo',label:'Assigned to'},{k:'project',label:'Related project'},
    {k:'priority',label:'Priority',type:'select',opts:['Low','Normal','High','Urgent']},
    {k:'status',label:'Status',type:'select',opts:['Todo','Doing','Done']},
    {k:'due',label:'Due date',type:'date'},{k:'notes',label:'Notes',type:'textarea',full:1},
  ],
  deadlines: [
    {k:'title',label:'Deadline',req:1,full:1},
    {k:'date',label:'Date',type:'date'},{k:'type',label:'Type',type:'select',opts:['Church','Dues','Event','Heist','Turf','Other']},
    {k:'owner',label:'Owner'},{k:'done',label:'Completed',type:'select',opts:['No','Yes']},
    {k:'notes',label:'Notes',full:1},
  ],
  gangs: [
    {k:'name',label:'Gang / crew name',req:1},{k:'territory',label:'Turf / territory'},
    {k:'attitude',label:'Attitude to us',type:'select',opts:['Allied','Neutral','Tense','Hostile','At War']},
    {k:'strength',label:'Est. numbers',type:'number'},{k:'leader',label:'Known leader(s)'},
    {k:'business',label:'Businesses'},{k:'weapons',label:'Known firepower'},
    {k:'lastContact',label:'Last contact',type:'date'},
    {k:'notes',label:'Dossier notes',type:'textarea',full:1},
  ],
  intel: [
    {k:'subject',label:'Subject',req:1,full:1},
    {k:'category',label:'Category',type:'select',opts:['Gang','Heist','Civilian','LEO','Business','Other']},
    {k:'source',label:'Source'},{k:'reliability',label:'Reliability',type:'select',opts:['Confirmed','Likely','Rumor','Unverified']},
    {k:'date',label:'Date gathered',type:'date'},{k:'linkedTo',label:'Linked gang / person'},
    {k:'action',label:'Action needed'},{k:'details',label:'Details',type:'textarea',full:1},
  ],
  heists: [
    {k:'name',label:'Heist / job name',req:1},{k:'target',label:'Target'},
    {k:'status',label:'Status',type:'select',opts:['Intel','Planning','Ready','Executed','Burned']},
    {k:'difficulty',label:'Difficulty',type:'select',opts:['Easy','Medium','Hard','Military']},
    {k:'payout',label:'Est. payout $',type:'number'},{k:'date',label:'Planned date',type:'date'},
    {k:'crew',label:'Crew'},{k:'needs',label:'Still needed'},
    {k:'notes',label:'Plan / notes',type:'textarea',full:1},
  ],
  civilians: [
    {k:'name',label:'Name / alias',req:1},{k:'role',label:'Occupation / role'},
    {k:'value',label:'Value',type:'select',opts:['Informant','Client','Neutral','Threat','LEO Watch']},
    {k:'contact',label:'Contact / phone'},{k:'lastSeen',label:'Last seen',type:'date'},
    {k:'gang',label:'Affiliation'},{k:'notes',label:'Notes',type:'textarea',full:1},
  ],
  finance: [
    {k:'date',label:'Date',type:'date'},{k:'type',label:'Type',type:'select',opts:['in','out']},
    {k:'category',label:'Category',type:'select',opts:['Dues','Heist Cut','Business','Donation','Upkeep','Bikes/Parts','Weapons','Event','Other']},
    {k:'amount',label:'Amount $',type:'number',req:1},{k:'by',label:'By / for'},
    {k:'notes',label:'Notes',full:1},
  ],
  inventory: [
    {k:'item',label:'Item',req:1},{k:'category',label:'Category',type:'select',opts:['Weapons','Ammo','Parts','Supplies','Cut / Gear','Vehicles','Other']},
    {k:'qty',label:'Qty',type:'number'},{k:'location',label:'Location',type:'select',opts:['Clubhouse','Storage Unit','Van','Member Holding','Other']},
    {k:'condition',label:'Condition',type:'select',opts:['New','Good','Worn','Broken']},
    {k:'assignedTo',label:'Held by'},{k:'notes',label:'Notes',full:1},
  ],
  bikes: [
    {k:'owner',label:'Owner',req:1},{k:'bike',label:'Make / model'},
    {k:'plate',label:'Plate'},{k:'color',label:'Color'},
    {k:'status',label:'Status',type:'select',opts:['Road Ready','In Shop','Wrecked','Impounded','Sold']},
    {k:'lastService',label:'Last service',type:'date'},{k:'mods',label:'Mods / upgrades'},
    {k:'notes',label:'Notes',type:'textarea',full:1},
  ],
};

const TITLES = {dashboard:'Dashboard',members:'Membership List',prospects:'Prospect Manager',projects:'Project Planning',tasks:'Tasks',deadlines:'Deadlines',gangs:'Gang Dossiers',intel:'Information Gathering',heists:'Heists',civilians:'Civilians',finance:'Finance Log',inventory:'Inventory Log',bikes:'Bike Log',settings:'Settings'};

/* ---------- STORE ---------- */
let DB = null;
function blankDB(){ const o={settings:{club:'Rebel Hounds MC',pass:'hounds',church:'Sunday 20:00'}}; COLLECTIONS.forEach(c=>o[c]=[]); return o; }
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
function load(){ try{ const r=localStorage.getItem(LS_KEY); if(r){ DB=JSON.parse(r); return; } }catch(e){} DB=blankDB(); }

function seedDemo(){
  DB = blankDB();
  DB.members = [
    {id:uid(),name:'Jonathan "Jay" Charles',callsign:'Jay',rank:'President',status:'Active',phone:'555-0101',discord:'jayreaper',joined:'2025-09-01',duesPaid:'Paid',bike:'Harley Fat Bob',notes:'Founder. Church Sundays.'},
    {id:uid(),name:'Jason "Escobar" Castle',callsign:'Escobar',rank:'Vice President',status:'Active',phone:'',discord:'d.bennett31',joined:'2025-09-01',duesPaid:'Paid',bike:'',notes:''},
    {id:uid(),name:'Shepard',callsign:'Sergeant Stabby',rank:'Sergeant At Arms',status:'Active',discord:'shepardsky',joined:'2025-09-01',duesPaid:'Paid',bike:'',notes:'Runs security details.'},
    {id:uid(),name:'Ember Davis',callsign:'Ember',rank:'Secretary',status:'Active',discord:'snow3976',joined:'2025-09-01',duesPaid:'Paid',bike:'',notes:''},
    {id:uid(),name:'William Xander Reks',callsign:'Reks',rank:'Treasurer',status:'Active',discord:'panda_alleyway',joined:'2025-09-01',duesPaid:'Paid',bike:'',notes:'Holds treasury.'},
    {id:uid(),name:'Olivia Newton',callsign:'Liv',rank:'Road Captain',status:'Active',joined:'2025-11-25',duesPaid:'Owes',bike:'Sportster',notes:''},
  ];
  DB.prospects = [
    {id:uid(),name:'JDavinci',sponsor:'Tyrex',recruitedBy:'Tyrex',stage:'Prospect',since:'2026-05-10',standing:'Good',attendance:80,nextReview:'2026-09-20',tasks:'Gate duty, ride support',notes:'Strong work ethic. Consistent attendance.'},
    {id:uid(),name:'Kilo',sponsor:'KingSlayer',recruitedBy:'KingSlayer',stage:'Prospect',since:'2026-06-22',standing:'Watch',attendance:55,nextReview:'2026-09-18',tasks:'Clubhouse cleanup',notes:'New prospect. Learning the ropes.'},
    {id:uid(),name:'Hangaround Tommy',sponsor:'',recruitedBy:'Jay',stage:'Hangaround',since:'2026-08-15',standing:'Good',attendance:40,nextReview:'',tasks:'',notes:'Shows up to rides.'},
  ];
  DB.projects = [
    {id:uid(),title:'Clubhouse meth-table upgrade',category:'Business',lead:'Reks',status:'Active',priority:'High',start:'2026-08-20',deadline:'2026-09-25',progress:60,desc:'Need 40k + supplies. Assign runners.'},
    {id:uid(),title:'Charity ride — Grapeseed',category:'Run / Event',lead:'Olivia',status:'Planning',priority:'Normal',start:'2026-09-05',deadline:'2026-10-04',progress:20,desc:'Route, flyers, prospect roadblock crew.'},
  ];
  DB.tasks = [
    {id:uid(),title:'Collect September dues',assignedTo:'Reks',project:'',priority:'High',status:'Doing',due:'2026-09-15',notes:'$500 per patch.'},
    {id:uid(),title:'Scout Paleto lab raid window',assignedTo:'Shepard',project:'',priority:'Urgent',status:'Todo',due:'2026-09-12',notes:'LEO patrol times.'},
    {id:uid(),title:'Fix gate camera',assignedTo:'Kilo (prospect)',project:'Clubhouse meth-table upgrade',priority:'Normal',status:'Todo',due:'2026-09-14',notes:''},
  ];
  DB.deadlines = [
    {id:uid(),title:'Church — weekly',date:'2026-09-13',type:'Church',owner:'Jay',done:'No',notes:DB.settings?.church||'Sundays'},
    {id:uid(),title:'Dues deadline',date:'2026-09-15',type:'Dues',owner:'Reks',done:'No',notes:'$500 per patch'},
    {id:uid(),title:'Turf payment — Stab City',date:'2026-09-20',type:'Turf',owner:'Shepard',done:'No',notes:''},
  ];
  DB.gangs = [
    {id:uid(),name:'The Lost MC (mirror crew)',territory:'Stab City / Sandy',attitude:'Tense',strength:12,leader:'Unknown "Prez"',business:'Chop shop',weapons:'Pistols, sawed-off',lastContact:'2026-08-28',notes:'Bumped into us at Yellow Jack. Watching.'},
    {id:uid(),name:'Vagos — East LS set',territory:'Rancho',attitude:'Neutral',strength:20,leader:'?',business:'Weed runs',weapons:'SMGs reported',lastContact:'',notes:'Possible gun connect. Vet before dealing.'},
  ];
  DB.intel = [
    {id:uid(),subject:'Lost moving guns via Stab City docks',category:'Gang',source:'Informant "G"',reliability:'Likely',date:'2026-09-02',linkedTo:'The Lost MC (mirror crew)',action:'Verify with night watch',details:'Two box trucks, late night, armed escort.'},
    {id:uid(),subject:'Fleeca on Great Ocean — weak roof access',category:'Heist',source:'Kilo',reliability:'Rumor',date:'2026-09-05',linkedTo:'',action:'Daytime recon photos',details:'Janitor claims back door sticks.'},
    {id:uid(),subject:'Civilian "Marta" — nurse at Sandy',category:'Civilian',source:'Ember',reliability:'Confirmed',date:'2026-09-06',linkedTo:'Marta (see Civilians)',action:'Keep friendly — patch-up off books',details:'Will treat GSWs for cash.'},
  ];
  DB.heists = [
    {id:uid(),name:'Paleto Bay bonded truck',target:'Group 6 truck, Paleto route',status:'Planning',difficulty:'Hard',payout:180000,date:'2026-09-27',crew:'Jay, Shepard, Escobar + driver TBD',needs:'Hacker, getaway bikes',notes:'Need LEO-shift intel first.'},
  ];
  DB.civilians = [
    {id:uid(),name:'Marta Reyes',role:'Nurse — Sandy Shores',value:'Informant',contact:'555-7788',lastSeen:'2026-09-06',gang:'None',notes:'Off-books treatment. Paid in cash. Protect identity.'},
    {id:uid(),name:'"Slick" — car dealer',role:'Dealer, Premium Deluxe',value:'Client',contact:'',lastSeen:'2026-08-30',gang:'',notes:'Moves hot bikes, takes 15%. Reliable.'},
    {id:uid(),name:'Deputy R. Cole',role:'LSSD',value:'LEO Watch',contact:'',lastSeen:'2026-09-01',gang:'LEO',notes:'Asks questions at Yellow Jack. Do not engage.'},
  ];
  DB.finance = [
    {id:uid(),date:'2026-09-01',type:'in',category:'Dues',amount:3500,by:'August dues',notes:'7 patches paid'},
    {id:uid(),date:'2026-09-03',type:'out',category:'Upkeep',amount:1200,by:'Reks',notes:'Clubhouse rent + power'},
    {id:uid(),date:'2026-09-05',type:'in',category:'Business',amount:8200,by:'Table run',notes:'Split to treasury'},
    {id:uid(),date:'2026-09-07',type:'out',category:'Bikes/Parts',amount:900,by:'Liv',notes:'Sportster repairs'},
  ];
  DB.inventory = [
    {id:uid(),item:'Pistol Ammo (box)',category:'Ammo',qty:40,location:'Clubhouse',condition:'New',assignedTo:'Armory',notes:'Count weekly'},
    {id:uid(),item:'Engine parts crate',category:'Parts',qty:6,location:'Storage Unit',condition:'Good',assignedTo:'',notes:'For chop orders'},
    {id:uid(),item:'First aid kits',category:'Supplies',qty:12,location:'Clubhouse',condition:'New',assignedTo:'',notes:'Restock via Marta connect'},
    {id:uid(),item:'Sawn-off (stash)',category:'Weapons',qty:2,location:'Van',condition:'Good',assignedTo:'Shepard',notes:'Heist use only'},
  ];
  DB.bikes = [
    {id:uid(),owner:'Jonathan "Jay" Charles',bike:'Harley Fat Bob 114',plate:'HOUND01',color:'Black / red',status:'Road Ready',lastService:'2026-08-20',mods:'Stage 2, apes',notes:''},
    {id:uid(),owner:'Olivia Newton',bike:'Sportster Iron 883',plate:'HOUND22',color:'Matte grey',status:'In Shop',lastService:'2026-09-07',mods:'',notes:'Waiting on forks'},
    {id:uid(),owner:'Club (prospect pool)',bike:'Bagger — spare',plate:'HOUND99',color:'Black',status:'Road Ready',lastService:'2026-07-30',mods:'',notes:'Loaner for prospects'},
  ];
  save();
}

/* Try to import real roster/prospects on first ever run */
async function tryImportClubFiles(){
  try{
    const r = await fetch('../roster.json',{cache:'no-store'}).then(x=>x.ok?x.json():null).catch(()=>null);
    if(r && r.members && r.members.length && DB.members.length <= 6){
      const map = {President:'President','Vice President':'Vice President','Sergeant At Arms':'Sergeant At Arms',Secretary:'Secretary',Treasurer:'Treasurer','Road Captain':'Road Captain',Enforcer:'Enforcer','Full Patch':'Full Patch',Tailgunner:'Tailgunner',Nomad:'Nomad','Life Member':'Life Member'};
      DB.members = r.members.map(m=>({id:uid(),name:m.name||m.username||'Unknown',callsign:m.username||'',rank:map[m.rank]||'Full Patch',status:(m.status||'Active'),phone:'',discord:m.username||'',joined:m.joined||'',duesPaid:'Owes',bike:'',notes:(m.bio||'')+' '+(m.contributions||'')})).slice(0,60);
    }
    const p = await fetch('../prospects.json',{cache:'no-store'}).then(x=>x.ok?x.json():null).catch(()=>null);
    if(p && p.prospects && p.prospects.length){
      const mapped = p.prospects.map(x=>({id:uid(),name:x.name||'Unknown',sponsor:x.sponsor||'',recruitedBy:x.recruitedBy||'',stage:'Prospect',since:x.prospectSince||'',standing:x.standing||'Good',attendance:50,nextReview:x.nextReview||'',tasks:'',notes:x.notes||x.officerNote||''}));
      // merge without dupes
      mapped.forEach(m=>{ if(!DB.prospects.some(e=>e.name===m.name)) DB.prospects.push(m); });
    }
    save(); renderAll();
  }catch(e){}
}

/* ---------- AUTH ---------- */
function authed(){ return sessionStorage.getItem('rhmc_mgr')==='1'; }
function bindGate(){
  $('#gateForm').addEventListener('submit',e=>{
    e.preventDefault();
    if($('#gatePass').value === (DB.settings.pass||'hounds')){ sessionStorage.setItem('rhmc_mgr','1'); showApp(); }
    else $('#gateMsg').textContent='Wrong passcode.';
  });
}
function showApp(){ $('#gate').classList.add('hidden'); $('#app').classList.remove('hidden'); renderAll(); }

/* ---------- NAV ---------- */
let curView='dashboard';
function bindNav(){
  $$('#sideNav button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
  $('#menuToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
}
function go(v){ curView=v; $$('#sideNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  $$('.view').forEach(s=>s.classList.toggle('active',s.id==='view-'+v));
  $('#viewTitle').textContent=TITLES[v]||v; $('#sidebar').classList.remove('open');
  $('#searchResults').classList.add('hidden'); renderAll(); }

/* ---------- GENERIC MODAL CRUD ---------- */
let editing={col:null,id:null};
function openModal(col,id){
  editing={col,id:id||null};
  const schema=SCHEMAS[col]; const rec=id?DB[col].find(x=>x.id===id):{};
  $('#modalTitle').textContent=(id?'Edit ':'New ')+col.slice(0,-1);
  $('#modalDelete').style.visibility=id?'visible':'hidden';
  $('#modalBody').innerHTML='<div class="form-grid">'+schema.map(f=>{
    const v=rec?(rec[f.k]??''):'';
    let input='';
    if(f.type==='select') input=`<select data-k="${f.k}">${(f.opts||[]).map(o=>`<option ${String(v)===o?'selected':''}>${o}</option>`).join('')}</select>`;
    else if(f.type==='textarea') input=`<textarea data-k="${f.k}">${esc(v)}</textarea>`;
    else input=`<input data-k="${f.k}" type="${f.type||'text'}" value="${esc(v)}">`;
    return `<label class="${f.full?'full':''}">${f.label}${f.req?' *':''}${input}</label>`;
  }).join('')+'</div>';
  $('#modal').classList.remove('hidden');
}
function closeModal(){ $('#modal').classList.add('hidden'); }
function saveModal(){
  const {col,id}=editing; const schema=SCHEMAS[col];
  const obj=id?DB[col].find(x=>x.id===id):{id:uid()};
  let valid=true;
  $$('#modalBody [data-k]').forEach(el=>{
    const k=el.dataset.k; obj[k]=el.value.trim();
    const f=schema.find(s=>s.k===k);
    if(f&&f.req&&!obj[k]){ el.style.borderColor='red'; valid=false; }
  });
  if(!valid){ toast('Fill required fields'); return; }
  if(col==='finance') obj.amount=Number(obj.amount)||0;
  if(col==='inventory'||col==='gangs') obj.qty=obj.qty, obj.strength=Number(obj.strength)||0;
  if(col==='projects') obj.progress=Math.max(0,Math.min(100,Number(obj.progress)||0));
  if(col==='prospects') obj.attendance=Number(obj.attendance)||0;
  if(col==='heists') obj.payout=Number(obj.payout)||0;
  if(col==='finance'&&!obj.date) obj.date=todayISO();
  if(col==='intel'&&!obj.date) obj.date=todayISO();
  if(!id) DB[col].unshift(obj);
  save(); closeModal(); renderAll(); toast('Saved');
}
function bindModal(){
  $('#modalClose').onclick=$('#modalCancel').onclick=closeModal;
  $('#modal').addEventListener('click',e=>{ if(e.target.id==='modal') closeModal(); });
  $('#modalSave').onclick=saveModal;
  $('#modalDelete').onclick=()=>{ if(!editing.id) return;
    if(confirm('Delete this record?')){ DB[editing.col]=DB[editing.col].filter(x=>x.id!==editing.id); save(); closeModal(); renderAll(); } };
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-add]'); if(b) openModal(b.dataset.add); });
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-edit]'); if(b) openModal(b.dataset.col,b.dataset.edit); });
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-del]'); if(b){ if(confirm('Delete?')){ DB[b.dataset.col]=DB[b.dataset.col].filter(x=>x.id!==b.dataset.del); save(); renderAll(); } } });
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-done-task]'); if(b){ const t=DB.tasks.find(x=>x.id===b.dataset.doneTask); if(t){ t.status=t.status==='Done'?'Todo':'Done'; save(); renderAll(); } } });
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-patch]'); if(b){ const p=DB.prospects.find(x=>x.id===b.dataset.patch); if(p&&confirm('Patch '+p.name+' to Full Patch member?')){ p.stage='Patched'; DB.members.unshift({id:uid(),name:p.name,callsign:'',rank:'Full Patch',status:'Active',phone:'',discord:'',joined:todayISO(),duesPaid:'Owes',bike:'',notes:'Patched from prospect. Sponsor: '+p.sponsor}); save(); renderAll(); toast(p.name+' patched in!'); } } });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){closeModal();$('#quickMenu').classList.add('hidden');} if(e.key==='/'&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA'){e.preventDefault();$('#globalSearch').focus();} });
}

/* ---------- RENDER: shared bits ---------- */
function pill(txt,cls){ return txt?`<span class="pill ${cls||''}">${esc(txt)}</span>`:''; }
function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),1800); }
function attPill(a){ return {Allied:'green',Neutral:'grey',Tense:'gold',Hostile:'red','At War':'red'}[a]||''; }
function priPill(p){ return {Urgent:'red',High:'gold',Normal:'',Low:'grey'}[p]||''; }
function dueClass(d,done){ if(done==='Yes') return ''; const n=daysUntil(d); if(n==null) return ''; if(n<0) return 'due-over'; if(n<=3) return 'due-soon'; return ''; }

/* ---------- RENDER: each module ---------- */
function renderCounts(){
  $('#cMembers').textContent=DB.members.length;
  $('#cProspects').textContent=DB.prospects.filter(p=>p.stage==='Prospect'||p.stage==='Hangaround').length;
  $('#cTasks').textContent=DB.tasks.filter(t=>t.status!=='Done').length;
  const urgent=DB.deadlines.filter(d=>d.done!=='Yes'&&(daysUntil(d.date)!=null&&daysUntil(d.date)<=7)).length
    + DB.tasks.filter(t=>t.status!=='Done'&&t.due&&(daysUntil(t.due)!=null&&daysUntil(t.due)<0)).length;
  $('#cDeadlines').textContent=urgent||'';
}
function renderDashboard(){
  const bal=DB.finance.reduce((s,f)=>s+(f.type==='in'?Number(f.amount):-Number(f.amount)),0);
  $('#statGrid').innerHTML=`
    <div class="stat"><div class="n">${DB.members.filter(m=>m.status==='Active').length}</div><div class="l">Patched</div></div>
    <div class="stat"><div class="n">${DB.prospects.filter(p=>p.stage!=='Patched'&&p.stage!=='Dropped').length}</div><div class="l">Prospects</div></div>
    <div class="stat"><div class="n">${DB.tasks.filter(t=>t.status!=='Done').length}</div><div class="l">Open tasks</div></div>
    <div class="stat"><div class="n" style="color:${bal<0?'var(--red2)':'var(--green)'}">${money(bal)}</div><div class="l">Treasury</div></div>
    <div class="stat"><div class="n">${DB.projects.filter(p=>p.status==='Active').length}</div><div class="l">Active projects</div></div>
    <div class="stat"><div class="n">${DB.bikes.filter(b=>b.status==='Road Ready').length}/${DB.bikes.length}</div><div class="l">Bikes ready</div></div>`;
  const dl=[...DB.deadlines.filter(d=>d.done!=='Yes'&&d.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6),
    ...DB.tasks.filter(t=>t.status!=='Done'&&t.due).map(t=>({title:'TASK: '+t.title,date:t.due,owner:t.assignedTo,type:'Task'}))].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(0,7);
  $('#dashDeadlines').innerHTML=dl.length?dl.map(d=>{const n=daysUntil(d.date);return `<div class="list-row ${dueClass(d.date,d.done)}"><div class="grow"><strong>${esc(d.title)}</strong><div class="muted">${esc(d.date||'')} · ${esc(d.owner||d.type||'')}</div></div>${pill(n==null?'':n<0?Math.abs(n)+'d OVERDUE':n===0?'TODAY':'in '+n+'d',n!=null&&n<0?'red':n<=3?'gold':'')}</div>`}).join(''):'<p class="muted">Nothing due. Enjoy the ride.</p>';
  $('#dashTasks').innerHTML=DB.tasks.filter(t=>t.status!=='Done').slice(0,6).map(t=>`<div class="list-row"><div class="grow"><strong>${esc(t.title)}</strong><div class="muted">${esc(t.assignedTo||'Unassigned')} · due ${esc(t.due||'—')}</div></div>${pill(t.priority,priPill(t.priority))}<button class="icon-btn" data-done-task="${t.id}">✓</button></div>`).join('')||'<p class="muted">No open tasks.</p>';
  $('#dashIntel').innerHTML=[...DB.intel].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5).map(i=>`<div class="list-row"><div class="grow"><strong>${esc(i.subject)}</strong><div class="muted">${esc(i.category||'')} · ${esc(i.date||'')} · src: ${esc(i.source||'?')}</div></div>${pill(i.reliability,i.reliability==='Confirmed'?'green':i.reliability==='Rumor'?'gold':'')}</div>`).join('')||'<p class="muted">No intel yet.</p>';
  const fin=[...DB.finance].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5);
  $('#dashFinance').innerHTML=`<div class="stat" style="margin-bottom:.6rem"><div class="n">${money(bal)}</div><div class="l">Balance · Church ${esc(DB.settings.church||'')}</div></div>`+(fin.map(f=>`<div class="list-row"><div class="grow">${esc(f.date||'')} — ${esc(f.category||'')} <span class="muted">${esc(f.notes||'')}</span></div><span class="amt ${f.type}">${f.type==='in'?'+':'−'}${money(f.amount)}</span></div>`).join('')||'');
}
function renderMembers(){
  const q=($('#fMembers').value||'').toLowerCase(), rk=$('#fMemberRank').value, st=$('#fMemberStatus').value;
  const list=DB.members.filter(m=>(!q||(m.name+m.callsign+m.discord+m.notes).toLowerCase().includes(q))&&(!rk||m.rank===rk)&&(!st||m.status===st));
  $('#membersList').innerHTML=list.map(m=>`<div class="ent"><div class="ent-actions"><button class="icon-btn" data-edit="${m.id}" data-col="members">✎</button><button class="icon-btn" data-del="${m.id}" data-col="members">🗑</button></div>
    <h4>${esc(m.name)}</h4><div class="sub">${esc(m.callsign||m.discord||'')}</div>
    <div class="meta">${pill(m.rank,'red')}${pill(m.status,m.status==='Active'?'green':'grey')}${m.duesPaid?pill('Dues: '+m.duesPaid,m.duesPaid==='Owes'?'gold':''):''}</div>
    <div class="muted">Patched: ${esc(m.joined||'—')} · 📞 ${esc(m.phone||'—')} ${m.bike?'· 🏍 '+esc(m.bike):''}</div>
    ${m.notes?`<div class="notes">${esc(m.notes)}</div>`:''}</div>`).join('')||'<p class="muted">No members match.</p>';
}
function renderProspects(){
  const q=($('#fProspects').value||'').toLowerCase(), st=$('#fProspectStatus').value;
  const stages=['Hangaround','Prospect','Patched','Dropped'];
  $('#prospectBoard').innerHTML=stages.filter(s=>!st||s===st).map(s=>{
    const arr=DB.prospects.filter(p=>p.stage===s&&(!q||(p.name+p.sponsor+p.notes).toLowerCase().includes(q)));
    return `<div class="card stage"><h3>${s} (${arr.length})</h3><div class="task-lane">${arr.map(p=>`<div class="ent"><div class="ent-actions"><button class="icon-btn" data-edit="${p.id}" data-col="prospects">✎</button></div>
      <h4>${esc(p.name)}</h4><div class="sub">Sponsor: ${esc(p.sponsor||'—')} · since ${esc(p.since||'—')}</div>
      <div class="meta">${pill(p.standing,p.standing==='Good'?'green':p.standing==='Bad'?'red':'gold')}${p.attendance?pill(p.attendance+'% att','blue'):''}</div>
      ${p.nextReview?`<div class="muted">Review: ${esc(p.nextReview)}</div>`:''}
      ${p.tasks?`<div class="muted">🧹 ${esc(p.tasks)}</div>`:''}
      ${p.notes?`<div class="notes">${esc(p.notes)}</div>`:''}
      <div class="row">${s!=='Patched'?`<button class="btn btn-primary btn-sm" data-patch="${p.id}">Patch in</button>`:''}</div></div>`).join('')||'<p class="muted">—</p>'}</div></div>`;
  }).join('');
}
function renderProjects(){
  const q=($('#fProjects').value||'').toLowerCase(), st=$('#fProjectStatus').value;
  $('#projectsList').innerHTML=DB.projects.filter(p=>(!q||(p.title+p.lead+p.desc).toLowerCase().includes(q))&&(!st||p.status===st)).map(p=>`<div class="ent ${dueClass(p.deadline,p.status==='Done'?'Yes':'No')}"><div class="ent-actions"><button class="icon-btn" data-edit="${p.id}" data-col="projects">✎</button><button class="icon-btn" data-del="${p.id}" data-col="projects">🗑</button></div>
    <h4>${esc(p.title)}</h4><div class="sub">${esc(p.category||'')} · Lead: ${esc(p.lead||'—')}</div>
    <div class="meta">${pill(p.status,p.status==='Done'?'green':p.status==='Active'?'red':'gold')}${pill(p.priority,priPill(p.priority))}${p.deadline?pill('⏰ '+p.deadline+' ('+(daysUntil(p.deadline)??'?')+'d)',(daysUntil(p.deadline)<0?'red':'')):''}</div>
    <div class="prog"><div style="width:${Number(p.progress)||0}%"></div></div><div class="muted">${Number(p.progress)||0}% · ${esc(p.start||'')} → ${esc(p.deadline||'')}</div>
    ${p.desc?`<div class="notes">${esc(p.desc)}</div>`:''}</div>`).join('')||'<p class="muted">No projects.</p>';
}
function renderTasks(){
  const q=($('#fTasks').value||'').toLowerCase(), st=$('#fTaskStatus').value, pr=$('#fTaskPriority').value;
  const arr=DB.tasks.filter(t=>(!q||(t.title+t.assignedTo+t.notes).toLowerCase().includes(q))&&(!st||t.status===st)&&(!pr||t.priority===pr));
  ['Todo','Doing','Done'].forEach(s=>{
    $('#tasks'+s).innerHTML=arr.filter(t=>t.status===s).map(t=>`<div class="ent task ${s==='Done'?'done':''} ${dueClass(t.due,s==='Done'?'Yes':'No')}"><div class="ent-actions"><button class="icon-btn" data-edit="${t.id}" data-col="tasks">✎</button></div>
      <h4>${esc(t.title)}</h4><div class="sub">${esc(t.assignedTo||'Unassigned')}${t.project?' · 📁 '+esc(t.project):''}</div>
      <div class="meta">${pill(t.priority,priPill(t.priority))}${t.due?pill('due '+t.due):''}</div>
      ${t.notes?`<div class="notes">${esc(t.notes)}</div>`:''}
      <div class="row"><button class="btn btn-ghost btn-sm" data-done-task="${t.id}">${s==='Done'?'↩ Reopen':'✓ Done'}</button></div></div>`).join('')||'<p class="muted">—</p>';
  });
}
function renderDeadlines(){
  const show=$('#showDoneDeadlines').checked;
  const arr=[...DB.deadlines].filter(d=>show||d.done!=='Yes').sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  $('#deadlinesList').innerHTML=arr.map(d=>{const n=daysUntil(d.date);return `<div class="list-row ${dueClass(d.date,d.done)}"><div class="grow"><strong>${esc(d.title)}</strong><div class="muted">${esc(d.date||'no date')} · ${esc(d.type||'')} · ${esc(d.owner||'')} ${d.notes?'· '+esc(d.notes):''}</div></div>
    ${pill(d.done==='Yes'?'done':n==null?'':n<0?Math.abs(n)+'d overdue':n===0?'TODAY':'in '+n+'d',d.done==='Yes'?'green':n!=null&&n<0?'red':'gold')}
    <button class="icon-btn" data-edit="${d.id}" data-col="deadlines">✎</button><button class="icon-btn" data-del="${d.id}" data-col="deadlines">🗑</button></div>`}).join('')||'<p class="muted">All clear.</p>';
}
function renderGangs(){
  const q=($('#fGangs').value||'').toLowerCase(), a=$('#fGangAtt').value;
  $('#gangsList').innerHTML=DB.gangs.filter(g=>(!q||(g.name+g.territory+g.leader+g.notes).toLowerCase().includes(q))&&(!a||g.attitude===a)).map(g=>{
    const rel=DB.intel.filter(i=>(i.linkedTo||'').toLowerCase().includes(g.name.toLowerCase().split(' ')[0])).length;
    return `<div class="ent"><div class="ent-actions"><button class="icon-btn" data-edit="${g.id}" data-col="gangs">✎</button><button class="icon-btn" data-del="${g.id}" data-col="gangs">🗑</button></div>
    <h4>💀 ${esc(g.name)}</h4><div class="sub">📍 ${esc(g.territory||'Unknown turf')}</div>
    <div class="meta">${pill(g.attitude,attPill(g.attitude))}${g.strength?pill('~'+g.strength+' deep','blue'):''}${rel?pill(rel+' intel','gold'):''}</div>
    <div class="muted">Leader: ${esc(g.leader||'?')} · Biz: ${esc(g.business||'—')} · 🔫 ${esc(g.weapons||'—')}</div>
    <div class="muted">Last contact: ${esc(g.lastContact||'—')}</div>
    ${g.notes?`<div class="notes">${esc(g.notes)}</div>`:''}</div>`}).join('')||'<p class="muted">No dossiers.</p>';
}
function renderIntel(){
  const q=($('#fIntel').value||'').toLowerCase(), c=$('#fIntelCat').value;
  $('#intelList').innerHTML=[...DB.intel].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).filter(i=>(!q||(i.subject+i.details+i.source+i.linkedTo).toLowerCase().includes(q))&&(!c||i.category===c)).map(i=>`<div class="list-row"><div class="grow"><strong>[${esc(i.category||'?')}] ${esc(i.subject)}</strong>
    <div class="muted">${esc(i.date||'')} · src: ${esc(i.source||'?')} · → ${esc(i.linkedTo||'—')}</div>
    ${i.details?`<div class="notes">${esc(i.details)}</div>`:''}${i.action?`<div class="muted">⚡ Action: ${esc(i.action)}</div>`:''}</div>
    <div>${pill(i.reliability,i.reliability==='Confirmed'?'green':i.reliability==='Rumor'?'gold':'blue')}</div>
    <button class="icon-btn" data-edit="${i.id}" data-col="intel">✎</button><button class="icon-btn" data-del="${i.id}" data-col="intel">🗑</button></div>`).join('')||'<p class="muted">No intel logged. Ears open.</p>';
}
function renderHeists(){
  const q=($('#fHeists').value||'').toLowerCase(), s=$('#fHeistStatus').value;
  $('#heistsList').innerHTML=DB.heists.filter(h=>(!q||(h.name+h.target+h.crew+h.notes).toLowerCase().includes(q))&&(!s||h.status===s)).map(h=>`<div class="ent"><div class="ent-actions"><button class="icon-btn" data-edit="${h.id}" data-col="heists">✎</button><button class="icon-btn" data-del="${h.id}" data-col="heists">🗑</button></div>
    <h4>💰 ${esc(h.name)}</h4><div class="sub">🎯 ${esc(h.target||'')}</div>
    <div class="meta">${pill(h.status,h.status==='Ready'?'green':h.status==='Burned'?'red':'gold')}${pill(h.difficulty||'',h.difficulty==='Hard'||h.difficulty==='Military'?'red':'')}${h.payout?pill(money(h.payout),'green'):''}</div>
    <div class="muted">📅 ${esc(h.date||'TBD')} · 👥 ${esc(h.crew||'—')}</div>
    ${h.needs?`<div class="muted">🧩 Still needed: ${esc(h.needs)}</div>`:''}${h.notes?`<div class="notes">${esc(h.notes)}</div>`:''}</div>`).join('')||'<p class="muted">No heists on the board.</p>';
}
function renderCivs(){
  const q=($('#fCivs').value||'').toLowerCase(), v=$('#fCivValue').value;
  $('#civsList').innerHTML=DB.civilians.filter(c=>(!q||(c.name+c.role+c.notes).toLowerCase().includes(q))&&(!v||c.value===v)).map(c=>`<div class="ent"><div class="ent-actions"><button class="icon-btn" data-edit="${c.id}" data-col="civilians">✎</button><button class="icon-btn" data-del="${c.id}" data-col="civilians">🗑</button></div>
    <h4>🧍 ${esc(c.name)}</h4><div class="sub">${esc(c.role||'')}</div>
    <div class="meta">${pill(c.value,c.value==='Threat'||c.value==='LEO Watch'?'red':c.value==='Informant'?'green':'blue')}</div>
    <div class="muted">📞 ${esc(c.contact||'—')} · seen ${esc(c.lastSeen||'—')} ${c.gang?'· ⛓ '+esc(c.gang):''}</div>
    ${c.notes?`<div class="notes">${esc(c.notes)}</div>`:''}</div>`).join('')||'<p class="muted">Nobody logged.</p>';
}
function renderFinance(){
  const q=($('#fFin').value||'').toLowerCase(), t=$('#fFinType').value;
  const arr=[...DB.finance].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const inn=arr.filter(f=>f.type==='in').reduce((s,f)=>s+Number(f.amount),0);
  const out=arr.filter(f=>f.type==='out').reduce((s,f)=>s+Number(f.amount),0);
  $('#finStats').innerHTML=`<div class="stat"><div class="n" style="color:var(--green)">+${money(inn)}</div><div class="l">In</div></div><div class="stat"><div class="n" style="color:var(--red2)">−${money(out)}</div><div class="l">Out</div></div><div class="stat"><div class="n">${money(inn-out)}</div><div class="l">Balance</div></div>`;
  $('#financeList').innerHTML=arr.filter(f=>(!q||(f.category+f.by+f.notes).toLowerCase().includes(q))&&(!t||f.type===t)).map(f=>`<div class="list-row"><div class="grow"><strong>${esc(f.date||'')} — ${esc(f.category||'')}</strong><div class="muted">${esc(f.by||'')} ${f.notes?'· '+esc(f.notes):''}</div></div><span class="amt ${f.type}">${f.type==='in'?'+':'−'}${money(f.amount)}</span><button class="icon-btn" data-edit="${f.id}" data-col="finance">✎</button><button class="icon-btn" data-del="${f.id}" data-col="finance">🗑</button></div>`).join('')||'<p class="muted">Ledger empty.</p>';
}
function renderInv(){
  const q=($('#fInv').value||'').toLowerCase(), c=$('#fInvCat').value;
  const arr=DB.inventory.filter(i=>(!q||(i.item+i.assignedTo+i.notes).toLowerCase().includes(q))&&(!c||i.category===c));
  $('#invList').innerHTML=arr.map(i=>`<div class="list-row" ${Number(i.qty)<=2?'style="border-color:var(--gold)"':''}><div class="grow"><strong>${esc(i.item)} × ${esc(i.qty||0)}</strong><div class="muted">${esc(i.category||'')} · ${esc(i.location||'')} · ${esc(i.condition||'')} · held by ${esc(i.assignedTo||'—')} ${i.notes?'· '+esc(i.notes):''}</div></div>
    ${Number(i.qty)<=2?pill('LOW','gold'):''}<button class="icon-btn" data-edit="${i.id}" data-col="inventory">✎</button><button class="icon-btn" data-del="${i.id}" data-col="inventory">🗑</button></div>`).join('')||'<p class="muted">Inventory empty.</p>';
}
function renderBikes(){
  const q=($('#fBikes').value||'').toLowerCase();
  $('#bikesList').innerHTML=DB.bikes.filter(b=>(!q||(b.owner+b.bike+b.plate).toLowerCase().includes(q))).map(b=>`<div class="ent"><div class="ent-actions"><button class="icon-btn" data-edit="${b.id}" data-col="bikes">✎</button><button class="icon-btn" data-del="${b.id}" data-col="bikes">🗑</button></div>
    <h4>🏍 ${esc(b.owner)}</h4><div class="sub">${esc(b.bike||'')} · ${esc(b.plate||'')}</div>
    <div class="meta">${pill(b.status,b.status==='Road Ready'?'green':b.status==='In Shop'?'gold':'red')}${b.color?pill(b.color,'blue'):''}</div>
    <div class="muted">🔧 Last service: ${esc(b.lastService||'—')}${b.mods?' · ⚙ '+esc(b.mods):''}</div>
    ${b.notes?`<div class="notes">${esc(b.notes)}</div>`:''}</div>`).join('')||'<p class="muted">No bikes logged.</p>';
}
function renderSettings(){
  $('#setClub').value=DB.settings.club||''; $('#setPass').value=DB.settings.pass||''; $('#setChurch').value=DB.settings.church||'';
}

/* ---------- SEARCH ---------- */
function bindSearch(){
  const inp=$('#globalSearch');
  inp.addEventListener('input',()=>{
    const q=inp.value.trim().toLowerCase(); const box=$('#searchResults');
    if(q.length<2){box.classList.add('hidden');return;}
    const hits=[];
    const push=(col,label,arr,fmt)=>arr.forEach(r=>{const s=JSON.stringify(r).toLowerCase(); if(s.includes(q)) hits.push({col,label,txt:fmt(r),id:r.id});});
    push('members','Member',DB.members,r=>r.name+' — '+r.rank);
    push('prospects','Prospect',DB.prospects,r=>r.name+' — '+r.stage);
    push('tasks','Task',DB.tasks,r=>r.title);
    push('gangs','Gang',DB.gangs,r=>r.name);
    push('intel','Intel',DB.intel,r=>r.subject);
    push('heists','Heist',DB.heists,r=>r.name);
    push('civilians','Civ',DB.civilians,r=>r.name);
    push('inventory','Inv',DB.inventory,r=>r.item);
    push('bikes','Bike',DB.bikes,r=>r.owner+' '+r.bike);
    box.innerHTML=hits.slice(0,20).map(h=>`<div data-jump="${h.col}" data-id="${h.id}">[${h.label}] ${esc(h.txt)}</div>`).join('')||'<div>No matches</div>';
    box.classList.remove('hidden');
    box.querySelectorAll('[data-jump]').forEach(d=>d.onclick=()=>{go(d.dataset.jump); setTimeout(()=>openModal(d.dataset.jump,d.dataset.id),150);});
  });
}

/* ---------- MISC BINDINGS ---------- */
function renderAll(){ if(!DB) return; renderCounts(); renderDashboard(); renderMembers(); renderProspects(); renderProjects(); renderTasks(); renderDeadlines(); renderGangs(); renderIntel(); renderHeists(); renderCivs(); renderFinance(); renderInv(); renderBikes(); renderSettings();
  const sel=$('#fMemberRank'); if(sel&&sel.options.length<=1){['President','Vice President','Sergeant At Arms','Secretary','Treasurer','Road Captain','Enforcer','Full Patch','Tailgunner','Nomad','Hangaround'].forEach(r=>{const o=document.createElement('option');o.textContent=r;sel.appendChild(o);});}
}
function bindMisc(){
  ['fMembers','fProspects','fProjects','fTasks','fGangs','fIntel','fHeists','fCivs','fFin','fInv','fBikes'].forEach(id=>{const el=document.getElementById(id); if(el) el.addEventListener('input',renderAll);});
  ['fMemberRank','fMemberStatus','fProspectStatus','fProjectStatus','fTaskStatus','fTaskPriority','fGangAtt','fIntelCat','fHeistStatus','fCivValue','fFinType','fInvCat'].forEach(id=>{const el=document.getElementById(id); if(el) el.addEventListener('change',renderAll);});
  $('#showDoneDeadlines').addEventListener('change',renderDeadlines);
  $('#quickAdd').onclick=e=>{e.stopPropagation();$('#quickMenu').classList.toggle('hidden');};
  document.addEventListener('click',e=>{ if(!e.target.closest('#quickMenu')&&!e.target.closest('#quickAdd')) $('#quickMenu').classList.add('hidden'); });
  $('#quickMenu').addEventListener('click',()=>$('#quickMenu').classList.add('hidden'));
  $('#exportBtn').onclick=()=>{ const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='rhmc-manager-backup-'+todayISO()+'.json'; a.click(); toast('Exported'); };
  $('#importBtn').onclick=()=>$('#importFile').click();
  $('#importFile').addEventListener('change',e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const o=JSON.parse(r.result); if(!o.members) throw 0; DB=o; save(); renderAll(); toast('Imported'); }catch{ toast('Bad file'); } }; r.readAsText(f); });
  $('#lockBtn').onclick=()=>{ sessionStorage.removeItem('rhmc_mgr'); location.reload(); };
  $('#saveSettings').onclick=()=>{ DB.settings={club:$('#setClub').value,pass:$('#setPass').value||'hounds',church:$('#setChurch').value}; save(); toast('Settings saved'); };
  $('#seedBtn').onclick=()=>{ if(confirm('Reload demo data? Current data will be replaced.')){ seedDemo(); renderAll(); } };
  $('#wipeBtn').onclick=()=>{ if(confirm('WIPE EVERYTHING? Export first!')){ DB=blankDB(); save(); renderAll(); } };
  setInterval(()=>{ const c=$('#clock'); if(c) c.textContent=new Date().toLocaleString(); },1000);
}

/* ---------- INIT ---------- */
load();
if(!DB||!COLLECTIONS.every(c=>Array.isArray(DB[c]))){ seedDemo(); }
else if(COLLECTIONS.every(c=>DB[c].length===0)){ seedDemo(); }
bindGate(); bindNav(); bindModal(); bindSearch(); bindMisc();
if(authed()) showApp();
tryImportClubFiles();
