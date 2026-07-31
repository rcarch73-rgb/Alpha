(function(){
  'use strict';
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(num(v));
  const escape=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const el=id=>document.getElementById(id);

  function greeting(name){
    const hour=new Date().getHours();
    const day=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
    return `${day}${name?`, ${name}`:''}`;
  }
  function health(label,value,tone='good'){return `<div class="overview-health-row"><span>${escape(label)}</span><strong class="${tone}">${escape(value)}</strong></div>`}
  function render(plan,result){
    if(!plan||!result)return;
    const first=plan.name1||plan.accountFirstName||'';
    const ratio=num(result.ratio);
    const status=result.status|| (ratio>=1?'ontrack':ratio>=.9?'close':'attention');
    const greetingEl=el('dashboardGreeting'); if(greetingEl)greetingEl.textContent=greeting(first);
    const target=el('dashboardTarget'); if(target)target.textContent=`Your target: ${money(plan.spend)}/month`;
    const retirementPortfolio=el('dashboardRetirementPortfolio'); if(retirementPortfolio)retirementPortfolio.textContent=money(result.retirementStart);
    const retireStatus=el('dashboardRetireStatus'); if(retireStatus)retireStatus.textContent=status==='ontrack'?'Supported by the current projection':status==='close'?'Close to the current target':'An adjustment is worth reviewing';

    const confidenceTone=num(result.confidence)>=80?'Strong':num(result.confidence)>=65?'Moderate':'Developing';
    const flexibility=ratio>=1.12?'Excellent':ratio>=1?'Good':ratio>=.9?'Limited':'Needs attention';
    const portfolio=num(result.ending)>0?'Strong':'Needs attention';
    const income=status==='ontrack'?'On track':status==='close'?'Close':'Needs attention';
    const healthEl=el('dashboardHealth');
    if(healthEl)healthEl.innerHTML=[
      health('Retirement income',income,status==='attention'?'attention':status==='close'?'watch':'good'),
      health('Portfolio longevity',portfolio,portfolio==='Strong'?'good':'attention'),
      health('Planning flexibility',flexibility,ratio>=1?'good':ratio>=.9?'watch':'attention'),
      health('Income timing',num(plan.cppStart1)>=65&&num(plan.oasStart1)>=65?'Planned':'Review','good')
    ].join('');

    let recommendations=[];
    try{recommendations=window.HNRecommendationEngine?.rank(plan,result,3)||[]}catch(error){console.warn('Dashboard opportunities unavailable.',error)}
    const opp=el('dashboardOpportunities');
    if(opp){
      opp.innerHTML=recommendations.length?recommendations.map((item,index)=>`<div class="overview-opportunity"><span class="overview-opportunity-number">${index+1}</span><div><strong>${escape(item.title)}</strong><small>${escape(item.summary||item.impactText||item.timing)}</small></div><button type="button" data-dashboard-opportunity="${escape(item.id)}">Explain →</button></div>`).join(''):'<p class="quiet">No significant changes are recommended right now. Review the plan annually or after a meaningful life change.</p>';
    }

    const updated=plan.updatedAt?new Date(plan.updatedAt):null;
    const updatedLabel=updated&&!Number.isNaN(updated.getTime())?updated.toLocaleString('en-CA',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Not recorded';
    const changes=el('dashboardChanges');
    if(changes)changes.innerHTML=`
      <div class="overview-activity-item"><span class="overview-activity-icon">✓</span><div><strong>Plan calculations are current</strong><small>Last updated ${escape(updatedLabel)}</small></div></div>
      <div class="overview-activity-item"><span class="overview-activity-icon">✓</span><div><strong>${recommendations.length||3} opportunities reviewed</strong><small>Ranked from the information in this plan</small></div></div>
      <div class="overview-activity-item"><span class="overview-activity-icon">✓</span><div><strong>Cloud and browser saving available</strong><small>Your save status appears at the top of the page</small></div></div>`;

    const reviewDate=el('dashboardReviewDate');
    if(reviewDate){const d=new Date();d.setFullYear(d.getFullYear()+1);reviewDate.textContent=d.toLocaleDateString('en-CA',{month:'long',year:'numeric'});}
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-dashboard-opportunity]');
    if(!button)return;
    const opportunityId=button.dataset.dashboardOpportunity;
    try{sessionStorage.setItem('hn.focusOpportunity',opportunityId)}catch(_){}
    location.hash='#explore/recommendations';
    setTimeout(()=>window.HNRecommendations?.openOpportunity?.(opportunityId),60);
  });
  window.HNDashboard={render};
})();
