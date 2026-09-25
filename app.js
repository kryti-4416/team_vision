/* Demo data adapter. Connect the approved backend here when its API contract is available. */
const dataSource = {
  async getSnapshot() {
    const snapshot = {
      source: "sample",
      updatedAt: new Date().toISOString(),
      gateway: { status: "online" },
      nodes: [
        { id:"GS-01", status:"online", lat:12.9716, lon:77.5946, mapPos:[47,42], zone:"river", lastSeen:"Just now", route:{ nextHop:"GS-02", hops:2 }, sensors:{ gas:{value:184,unit:"ppm"}, temperature:{value:31.8,unit:"°C"}, vibration:{value:0.12,unit:"g"} } },
        { id:"GS-02", status:"online", lat:12.9724, lon:77.5961, mapPos:[53,61], zone:"river", lastSeen:"8 sec ago", route:{ nextHop:"Gateway", hops:1 }, sensors:{ gas:{value:342,unit:"ppm"}, temperature:{value:34.2,unit:"°C"}, vibration:{value:0.28,unit:"g"} } },
        { id:"GS-03", status:"online", lat:12.9707, lon:77.5970, mapPos:[18,25], zone:"mountain", lastSeen:"Just now", route:{ nextHop:"GS-04", hops:2 }, sensors:{ gas:{value:612,unit:"ppm"}, temperature:{value:39.6,unit:"°C"}, vibration:{value:0.71,unit:"g"} } },
        { id:"GS-04", status:"online", lat:12.9698, lon:77.5954, mapPos:[78,23], zone:"mountain", lastSeen:"4 sec ago", route:{ nextHop:"Gateway", hops:1 }, sensors:{ gas:{value:226,unit:"ppm"}, temperature:{value:32.5,unit:"°C"}, vibration:{value:0.18,unit:"g"} } }
      ],
      links:[
        {from:"GS-01",to:"GS-02",type:"active"},{from:"GS-02",to:"Gateway",type:"active"},
        {from:"GS-03",to:"GS-04",type:"active"},{from:"GS-04",to:"Gateway",type:"active"},
        {from:"GS-01",to:"GS-04",type:"alternative"},{from:"GS-03",to:"GS-02",type:"alternative"},
        {from:"GS-01",to:"GS-03",type:"broken"}
      ],
      events:[
        {time:"14:32:17",level:"ok",text:"Gateway connected and receiving node telemetry"},
        {time:"14:31:54",level:"ok",text:"GS-03 heartbeat received"},
        {time:"14:31:40",level:"danger",text:"Elevated gas reading reported by GS-03"},
        {time:"14:30:52",level:"ok",text:"Route update received for GS-04"}
      ],
      logs:[
        {time:"14:32:17",node:"GS-01",values:"Gas 184 ppm · Temp 31.8 °C · Vibration 0.12 g",delivery:"Delivered",route:"Direct · 1 hop"},
        {time:"14:32:09",node:"GS-02",values:"Gas 342 ppm · Temp 34.2 °C · Vibration 0.28 g",delivery:"Delivered",route:"Direct · 1 hop"},
        {time:"14:32:02",node:"GS-01",type:"REROUTE",values:"Route changed after GS-01–GS-03 link failure",delivery:"Route updated",route:"GS-01 → GS-02 → Gateway"},
        {time:"14:31:40",node:"GS-03",values:"Gas 612 ppm · Temp 39.6 °C · Vibration 0.71 g",delivery:"Buffered",route:"Awaiting connection"},
        {time:"14:31:31",node:"GS-04",values:"Gas 226 ppm · Temp 32.5 °C · Vibration 0.18 g",delivery:"Delivered",route:"Direct · 1 hop"}
      ]
    };
    const saved=localStorage.getItem("gridsense-node-config");
    if(saved){try{snapshot.nodes=JSON.parse(saved);}catch{localStorage.removeItem("gridsense-node-config");}}
    return snapshot;
  }
};

// DEMO ONLY: replace with safety limits calibrated and approved for your sensors.
// Preferred live backend value: node.risk[metric].level = "danger" | "warning" | "normal".
const dangerThresholds = { gas:400, temperature:50, vibration:0.6 };
const metricLabels = { gas:"Gas", temperature:"Temperature", vibration:"Vibration" };
const metricUnits = { gas:"ppm", temperature:"°C", vibration:"g" };
const heatPositions = [[19,57],[46,31],[67,59],[34,76]];
const titles = {
  overview:["LIVE FIELD OVERVIEW","Overview","Environmental telemetry from your LoRa mesh."],
  network:["MESH TOPOLOGY","Network map","Backend-reported node links and current routes."],
  nodes:["NODE TELEMETRY","Node details","Sensor readings and status reported by the backend."],
  heatmap:["SITUATIONAL AWARENESS","Heatmap","Risk view across every node and sensor."],
  events:["SYSTEM ACTIVITY","Alerts & events","Status changes and events from the data source."],
  logs:["TELEMETRY HISTORY","Data logs","Sensor packets and delivery information."],
  settings:["CONFIGURATION","Settings","Node records and dashboard data source."]
};
let state={data:null,view:location.hash.slice(1)||"overview",metric:"gas",selected:"GS-01",pendingDelete:null};
const dismissedAlerts=new Set();
const root=document.getElementById("viewRoot");
const esc=value=>String(value??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const nodeFor=id=>state.data.nodes.find(n=>n.id===id)||state.data.nodes[0];
const reading=(n,m)=>n.sensors?.[m];
const displayReading=(r)=>!r||r.value==null?"—":`${esc(r.value)} ${esc(r.unit||"")}`;
const badge=status=>`<span class="badge ${status==="offline"?"offline":status==="online"?"":"unknown"}">${esc(status||"unknown")}</span>`;

function detectDanger(){
  const result=[];
  for(const n of state.data.nodes){for(const metric of Object.keys(metricLabels)){
    const r=reading(n,metric);if(!r||r.value==null)continue;
    const level=n.risk?.[metric]?.level??r.risk;
    const danger=level?String(level).toLowerCase()==="danger":Number(r.value)>=dangerThresholds[metric];
    if(danger)result.push({node:n,metric,reading:r});
  }}
  return result;
}
function emergencyMarkup(){
  const alerts=detectDanger();
  const active=new Set(alerts.map(a=>`${a.node.id}:${a.metric}`));
  for(const key of dismissedAlerts)if(!active.has(key))dismissedAlerts.delete(key);
  return alerts.filter(a=>!dismissedAlerts.has(`${a.node.id}:${a.metric}`)).map(a=>`<article class="emergency-alert"><div><strong>EMERGENCY · Danger threshold reached</strong><p>${esc(a.node.id)} · ${metricLabels[a.metric]}: ${displayReading(a.reading)}</p></div><button data-alert-node="${esc(a.node.id)}" data-alert-metric="${a.metric}">View heatmap</button></article>`).join("");
}
function setHeading(){const [eyebrow,title,subtitle]=titles[state.view]||titles.overview;document.getElementById("eyebrow").textContent=eyebrow;document.getElementById("pageTitle").textContent=title;document.getElementById("pageSubtitle").textContent=subtitle;document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("active",a.dataset.view===state.view));}
function mapMarkup(){
  const pos={Gateway:[91,11]};
  state.data.nodes.forEach((n,i)=>pos[n.id]=n.mapPos||[50+(i%2)*8,42+Math.floor(i/2)*17]);
  const lines=(state.data.links||[]).map(link=>{const a=pos[link.from],b=pos[link.to];if(!a||!b)return "";return `<line class="${link.type==='alternative'?'alternative-link':link.type==='broken'?'broken-link':'active-link'}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}).join("");
  const markers=state.data.nodes.map(n=>{const p=pos[n.id],status=n.status==='offline'?'offline':n.status==='online'?'':'unknown';return `<button class="map-point ${status}" data-node="${esc(n.id)}" style="left:${p[0]}%;top:${p[1]}%" aria-label="${esc(n.id)} ${esc(n.status)}"><i></i><b>${esc(n.id)}</b></button>`;}).join("");
  return `<div class="map"><svg class="topology-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Mesh links">${lines}</svg><span class="map-gateway" style="left:91%;top:11%">GATEWAY</span>${markers}</div><div class="link-legend"><span><i class="link-swatch"></i>Active route</span><span><i class="link-swatch alternative"></i>Alternative route</span><span><i class="link-swatch broken"></i>Broken link</span><span>Green/red node markers: reported status</span></div>`;
}
function eventList(){return `<div class="events">${(state.data.events||[]).map(e=>`<div class="event"><i class="${e.level==='danger'?'danger':e.level==='warn'?'warn':''}"></i><span>${esc(e.text)}</span><time>${esc(e.time)}</time></div>`).join("")||'<div class="empty">No events available.</div>'}</div>`;}
function table(){return `<div class="table-wrap"><table><thead><tr><th>NODE</th><th>TEMPERATURE</th><th>GAS</th><th>VIBRATION</th><th>STATUS</th></tr></thead><tbody>${state.data.nodes.map(n=>`<tr data-node="${esc(n.id)}"><td class="node-id">${esc(n.id)}</td><td>${displayReading(reading(n,'temperature'))}</td><td>${displayReading(reading(n,'gas'))}</td><td>${displayReading(reading(n,'vibration'))}</td><td>${badge(n.status)}</td></tr>`).join("")}</tbody></table></div>`;}
function heatArt(){return `<div class="heatmap-art">${state.data.nodes.map((n,i)=>{const r=reading(n,state.metric),v=Number(r?.value),t=dangerThresholds[state.metric],ratio=Number.isFinite(v)?v/t:0;const kind=ratio>=1?'high':ratio>=.65?'medium':'low';const [x,y]=n.mapPos||heatPositions[i%heatPositions.length];return `${r&&r.value!=null?`<i class="heat-spot ${kind}" style="left:${x}%;top:${y}%"></i>`:''}<button class="heat-pin" data-node="${esc(n.id)}" style="left:${x}%;top:${y}%"><i class="${kind}"></i>${esc(n.id)} · ${displayReading(r)}</button>`;}).join("")}</div>`;}
function metricControls(){return `<div class="heat-controls"><label>Heatmap metric <select id="metric"><option value="gas" ${state.metric==='gas'?'selected':''}>Gas · MQ135</option><option value="temperature" ${state.metric==='temperature'?'selected':''}>Temperature · DS18B20</option><option value="vibration" ${state.metric==='vibration'?'selected':''}>Vibration · SW-420</option></select></label><div class="scale">Lower risk <i class="gradient"></i> Higher risk</div></div>`;}
function overview(){const online=state.data.nodes.filter(n=>n.status==='online').length;const buffered=state.data.logs.filter(l=>l.delivery==='Buffered').length;return `<div class="grid stats"><article class="card stat"><small>NODES ONLINE</small><strong>${online} / ${state.data.nodes.length}</strong><em>Sample status values</em></article><article class="card stat"><small>FIXED GATEWAY</small><strong>${esc(state.data.gateway.status)}</strong><em>Sample connection state</em></article><article class="card stat"><small>BUFFERED READINGS</small><strong>${buffered}</strong><em>Awaiting delivery</em></article><article class="card stat"><small>SENSOR TYPES</small><strong>3</strong><em>Gas · temperature · vibration</em></article></div><div class="grid split"><section class="panel"><header class="panel-head"><div><strong>Network map</strong><small>Routes and links supplied by data source</small></div><a href="#network">Open map →</a></header>${mapMarkup()}</section><section class="panel"><header class="panel-head"><div><strong>Recent events</strong><small>Latest received activity</small></div><a href="#events">All events →</a></header>${eventList()}</section></div><div class="grid split split2"><section class="panel"><header class="panel-head"><div><strong>Sensor data</strong><small>Latest readings by node</small></div><a href="#logs">View logs →</a></header>${table()}</section><section class="panel"><header class="panel-head"><div><strong>Heatmap</strong><small>Satellite view · manually assigned sample positions</small></div><a href="#heatmap">Open →</a></header>${metricControls()}<div class="heatmap-shell">${heatArt()}</div></section></div>`;}
function network(){return `<section class="panel"><header class="panel-head"><div><strong>LoRa mesh topology</strong><small>Only topology links supplied by the data source are drawn.</small></div></header>${mapMarkup()}</section>`;}
function nodes(){return `<section class="panel"><header class="panel-head"><div><strong>Node details</strong><small>Select a physical node</small></div></header><div class="node-grid">${state.data.nodes.map(n=>`<article class="node-card"><header><b>${esc(n.id)}</b>${badge(n.status)}</header><p class="muted">Last seen ${esc(n.lastSeen)} · ${n.lat}, ${n.lon}</p><div class="readings">${Object.entries(metricLabels).map(([m,l])=>`<div class="reading"><small>${l}</small><b>${displayReading(reading(n,m))}</b></div>`).join("")}</div><p class="muted">Next hop ${esc(n.route?.nextHop)} · ${n.route?.hops??'—'} hops</p></article>`).join("")}</div></section>`;}
function heatmap(){return `<section class="panel"><header class="panel-head"><div><strong>Environmental risk heatmap</strong><small>Satellite background with manually entered sample node positions.</small></div></header>${metricControls()}<div class="heatmap-shell">${heatArt()}</div><div class="legend"><span>Lower risk</span><span class="gradient"></span><span>Higher risk</span></div><p class="settings-note">Demo thresholds: gas ≥ ${dangerThresholds.gas} ppm, temperature ≥ ${dangerThresholds.temperature} °C, vibration ≥ ${dangerThresholds.vibration} g. Confirm these with the project team before operational use. Alerts above check all metrics, not only this selection.</p></section>`;}
function events(){return `<section class="panel"><header class="panel-head"><div><strong>Alerts &amp; events</strong><small>Events in the current data source</small></div></header>${eventList()}</section>`;}
function logs(){return `<section class="panel"><header class="panel-head"><div><strong>Data logs</strong><small>Readings, delivery state, and backend-reported route changes</small></div></header><div class="table-wrap"><table><thead><tr><th>TIME</th><th>NODE</th><th>TYPE</th><th>READING / EVENT</th><th>DELIVERY</th><th>ROUTE</th></tr></thead><tbody>${state.data.logs.map(l=>`<tr><td>${esc(l.time)}</td><td class="node-id">${esc(l.node)}</td><td>${esc(l.type||'SENSOR')}</td><td>${esc(l.values)}</td><td>${esc(l.delivery)}</td><td>${esc(l.route)}</td></tr>`).join("")}</tbody></table></div></section>`;}
function settings(){return `<section class="panel"><header class="panel-head"><div><strong>Node configurations</strong><small>Manage dashboard node records and map placement</small></div></header><p class="settings-note">Changes here are saved in this browser and update the dashboard only. They do not create, power, or remove a physical ESP32. Connect the backend configuration API before using this to manage live inventory.</p><form class="settings-form" id="addNodeForm"><label>Node ID<input name="id" required maxlength="20" placeholder="e.g. GS-05"></label><label>Map area<select name="zone"><option value="river">Near river</option><option value="mountain">Mountain area</option></select></label><label>Latitude<input name="lat" type="number" min="-90" max="90" step="any" required placeholder="-90 to 90"></label><label>Longitude<input name="lon" type="number" min="-180" max="180" step="any" required placeholder="-180 to 180"></label><label class="wide">Primary sensor<select name="sensor"><option value="gas">MQ135 · Gas</option><option value="temperature">DS18B20 · Temperature</option><option value="vibration">SW-420 · Vibration</option></select></label><button type="submit">Add node record</button></form>${state.data.nodes.map(n=>`<div class="node-config-line"><span><b>${esc(n.id)}</b><small>${esc(n.status)} · ${esc(n.zone||'map position')} · ${n.lat}, ${n.lon} · ${Object.keys(n.sensors||{}).join(', ')||'no readings yet'}</small></span><button class="config-remove" data-remove-node="${esc(n.id)}">${state.pendingDelete===n.id?'Confirm delete':'Delete record'}</button></div>`).join("")}</section>`;}
function render(){
  if(!titles[state.view])state.view='overview';setHeading();
  document.getElementById('emergencyAlerts').innerHTML=emergencyMarkup();
  document.getElementById('gatewayStatus').textContent=String(state.data.gateway?.status||'unavailable').toUpperCase();
  document.getElementById('updatedAt').textContent=`UPDATED ${new Date(state.data.updatedAt).toLocaleTimeString()}`;
  const views={overview,network,nodes,heatmap,events,logs,settings};root.innerHTML=views[state.view]();
  root.querySelectorAll('[data-node]').forEach(el=>el.addEventListener('click',()=>{state.selected=el.dataset.node;if(state.view==='overview')state.view='nodes';render();}));
  root.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{state.view=a.hash.slice(1);render();}));
  const metric=document.getElementById('metric');if(metric)metric.addEventListener('change',()=>{state.metric=metric.value;render();});
  document.querySelectorAll('[data-alert-node]').forEach(btn=>btn.addEventListener('click',()=>{dismissedAlerts.add(`${btn.dataset.alertNode}:${btn.dataset.alertMetric}`);state.selected=btn.dataset.alertNode;state.metric=btn.dataset.alertMetric;state.view='heatmap';history.replaceState(null,'','#heatmap');render();}));
  const form=document.getElementById('addNodeForm');
  if(form)form.addEventListener('submit',e=>{
    e.preventDefault();const values=new FormData(form);const id=String(values.get('id')).trim();
    if(state.data.nodes.some(n=>n.id.toLowerCase()===id.toLowerCase())){window.alert('That node ID already exists.');return;}
    const zone=String(values.get('zone'));const slots=zone==='river'?[[47,42],[53,61],[43,51],[58,48]]:[[18,25],[78,23],[27,37],[70,38]];
    const slot=slots.filter(([x,y])=>!state.data.nodes.some(n=>n.mapPos?.[0]===x&&n.mapPos?.[1]===y))[0]||slots[state.data.nodes.length%slots.length];
    const sensor=String(values.get('sensor'));const lat=Number(values.get('lat')),lon=Number(values.get('lon'));
    state.data.nodes.push({id,status:'not configured',lat,lon,zone,mapPos:slot,lastSeen:'No telemetry received',route:{nextHop:'—',hops:null},sensors:{[sensor]:{value:null,unit:metricUnits[sensor]}}});
    try{localStorage.setItem('gridsense-node-config',JSON.stringify(state.data.nodes));}catch{}
    state.data.logs.unshift({time:new Date().toLocaleTimeString(),node:id,type:'CONFIG',values:'Dashboard node record added',delivery:'Local config',route:'Not connected'});
    render();
  });
  root.querySelectorAll('[data-remove-node]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.removeNode;
    if(state.pendingDelete!==id){state.pendingDelete=id;render();return;}
    state.data.nodes=state.data.nodes.filter(n=>n.id!==id);try{localStorage.setItem('gridsense-node-config',JSON.stringify(state.data.nodes));}catch{}
    state.data.logs.unshift({time:new Date().toLocaleTimeString(),node:id,type:'CONFIG',values:'Dashboard node record deleted',delivery:'Local config',route:'Not applicable'});
    state.pendingDelete=null;
    render();
  }));
}
document.getElementById('nav').addEventListener('click',e=>{const a=e.target.closest('[data-view]');if(!a)return;e.preventDefault();state.view=a.dataset.view;history.replaceState(null,'',`#${state.view}`);document.getElementById('sidebar').classList.remove('open');render();});
document.getElementById('menuButton').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('clock').textContent=new Intl.DateTimeFormat([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date());
async function start(){try{state.data=await dataSource.getSnapshot();document.getElementById('sourceStatus').textContent=state.data.source==='live'?'LIVE BACKEND':'SAMPLE DATA';render();}catch(error){document.getElementById('sourceStatus').textContent='DATA UNAVAILABLE';document.getElementById('viewRoot').innerHTML=`<section class="panel empty">Dashboard data could not be loaded. ${esc(error.message)}</section>`;}}
start();
