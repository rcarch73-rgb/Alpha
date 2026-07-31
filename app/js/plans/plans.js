(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const relativeTime=value=>{const ms=Date.now()-Date.parse(value||0);if(!Number.isFinite(ms))return 'Recently';const mins=Math.max(0,Math.round(ms/60000));if(mins<1)return 'Just now';if(mins<60)return `${mins} minute${mins===1?'':'s'} ago`;const hrs=Math.round(mins/60);if(hrs<24)return `${hrs} hour${hrs===1?'':'s'} ago`;const days=Math.round(hrs/24);if(days<7)return `${days} day${days===1?'':'s'} ago`;return new Intl.DateTimeFormat('en-CA',{dateStyle:'medium'}).format(new Date(value))};
  const session=()=>window.HNAuth?.getSession?.();
  const client=()=>window.HNAuth?.client;
  function setMessage(text,type=''){const node=el('plansMessage');if(!node)return;node.textContent=text;node.className=`auth-message ${type}`.trim()}
  async function listPlans(){const user=session()?.user;if(!user)return[];const {data,error}=await client().from('plans').select('id,plan_name,plan_data,created_at,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false});if(error)throw error;return data||[]}
  function card(plan){const data=plan.plan_data||{},name=plan.plan_name||data.planName||'Retirement plan';return `<article class="plan-card" data-plan-id="${plan.id}"><div class="plan-card-main"><div class="plan-icon">◜</div><div><h3>${escapeHtml(name)}</h3><p class="quiet">${escapeHtml(data.name1||'Retirement')} · Retire at ${Number(data.retire1)||'—'} · ${escapeHtml(relativeTime(plan.updated_at))}</p></div></div><div class="plan-card-actions"><button class="btn primary small-btn" data-plan-action="open">Open</button><button class="btn secondary small-btn" data-plan-action="rename">Rename</button><button class="btn secondary small-btn" data-plan-action="duplicate">Duplicate</button><button class="btn text danger" data-plan-action="delete">Delete</button></div></article>`}
  async function render(){
    const user=session()?.user;if(!user)return;
    if(el('plansUserEmail'))el('plansUserEmail').textContent=user.email||'';
    const first=user.user_metadata?.first_name||window.HNCloudBridge?.getPlan?.()?.accountFirstName||'';
    if(el('plansGreeting'))el('plansGreeting').textContent=first?`Welcome back, ${first}`:'Welcome back';
    setMessage('');
    try{const plans=await listPlans();el('plansList').innerHTML=plans.map(card).join('');el('plansList').classList.toggle('hidden',plans.length===0);el('plansEmpty').classList.toggle('hidden',plans.length!==0)}
    catch(e){console.error(e);setMessage(e.message||'Unable to load your plans.','error')}
  }
  async function createPlan(){
    const user=session()?.user;if(!user)return window.go('signIn');
    const name=(prompt('Name this retirement plan','My retirement plan')||'').trim();if(!name)return;
    const plan=window.HNCloudBridge.createFreshPlan();plan.planName=name;plan.accountEmail=user.email||'';plan.accountFirstName=user.user_metadata?.first_name||'';plan.updatedAt=new Date().toISOString();
    const {data,error}=await client().from('plans').insert({user_id:user.id,plan_name:name,plan_data:plan,updated_at:new Date().toISOString()}).select('id').single();if(error)throw error;
    window.HNAuth.setActivePlanId(data.id);window.HNAuth.setSuppressSync(true);window.HNCloudBridge.applyPlan(plan);window.HNAuth.setSuppressSync(false);window.go('household');window.toast?.('New plan created');
  }
  async function openPlan(id){
    const user=session()?.user;const {data,error}=await client().from('plans').select('id,plan_name,plan_data').eq('id',id).eq('user_id',user.id).single();if(error)throw error;
    const plan={...(data.plan_data||{}),planName:data.plan_name||data.plan_data?.planName};window.HNAuth.setActivePlanId(id);window.HNAuth.setSuppressSync(true);window.HNCloudBridge.applyPlan(plan);window.HNAuth.setSuppressSync(false);window.go('brief');window.toast?.('Plan opened');
  }
  async function renamePlan(id){const plans=await listPlans(),found=plans.find(p=>p.id===id);if(!found)return;const name=(prompt('Rename this plan',found.plan_name||'Retirement plan')||'').trim();if(!name||name===found.plan_name)return;const updated={...(found.plan_data||{}),planName:name,updatedAt:new Date().toISOString()};const {error}=await client().from('plans').update({plan_name:name,plan_data:updated,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',session().user.id);if(error)throw error;if(window.HNAuth.getActivePlanId()===id){window.HNAuth.setSuppressSync(true);window.HNCloudBridge.applyPlan(updated);window.HNAuth.setSuppressSync(false)}await render();window.toast?.('Plan renamed')}
  async function duplicatePlan(id){const plans=await listPlans(),found=plans.find(p=>p.id===id);if(!found)return;const name=(prompt('Name the duplicate',`${found.plan_name||'Retirement plan'} copy`)||'').trim();if(!name)return;const copy={...(structuredClone(found.plan_data||{})),planName:name,updatedAt:new Date().toISOString()};const {error}=await client().from('plans').insert({user_id:session().user.id,plan_name:name,plan_data:copy,updated_at:new Date().toISOString()});if(error)throw error;await render();window.toast?.('Plan duplicated')}
  async function deletePlan(id){const plans=await listPlans(),found=plans.find(p=>p.id===id);if(!found||!confirm(`Delete “${found.plan_name||'this plan'}”? This cannot be undone.`))return;const {error}=await client().from('plans').delete().eq('id',id).eq('user_id',session().user.id);if(error)throw error;if(window.HNAuth.getActivePlanId()===id)window.HNAuth.setActivePlanId(null);await render();window.toast?.('Plan deleted')}
  async function action(event){const button=event.target.closest('[data-plan-action]');if(!button)return;const card=button.closest('[data-plan-id]'),id=card?.dataset.planId;if(!id)return;button.disabled=true;try{const a=button.dataset.planAction;if(a==='open')await openPlan(id);if(a==='rename')await renamePlan(id);if(a==='duplicate')await duplicatePlan(id);if(a==='delete')await deletePlan(id)}catch(e){console.error(e);setMessage(e.message||'That action could not be completed.','error')}finally{button.disabled=false}}
  function init(){el('createPlanBtn')?.addEventListener('click',()=>createPlan().catch(e=>setMessage(e.message||'Unable to create plan.','error')));el('createFirstPlanBtn')?.addEventListener('click',()=>createPlan().catch(e=>setMessage(e.message||'Unable to create plan.','error')));el('plansSignOutBtn')?.addEventListener('click',()=>window.HNAuth.signOut());el('plansList')?.addEventListener('click',action);window.addEventListener('hn:cloud-plan-saved',()=>{if(document.getElementById('myPlans')?.classList.contains('active'))render()})}
  window.HNPlans={render,listPlans,createPlan,openPlan};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
