(function(){
  'use strict';
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(num(v));
  const escape=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const el=id=>document.getElementById(id);
  let currentRecommendations=[];

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
    try{recommendations=window.HNRecommendationEngine?.rank(plan,result,3)||[];currentRecommendations=recommendations}catch(error){console.warn('Dashboard opportunities unavailable.',error)}
    const opp=el('dashboardOpportunities');
    if(opp){
      opp.innerHTML=recommendations.length?recommendations.map((item,index)=>`<div class="overview-opportunity"><span class="overview-opportunity-number">${index+1}</span><div><strong>${escape(item.title)}</strong><small>${escape(item.summary||item.impactText||item.timing)}</small></div><button type="button" data-dashboard-opportunity="${escape(item.id)}">Explain this →</button></div>`).join(''):'<p class="quiet">No significant changes are recommended right now. Review the plan annually or after a meaningful life change.</p>';
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

  function rankExplanation(item,index){
    const others=currentRecommendations.filter((_,i)=>i!==index);
    const lead=index===0
      ? 'This opportunity ranked first because it is expected to have the greatest effect on the current plan.'
      : `This opportunity ranked ${index===1?'second':'third'} because the items above it address a more immediate or larger planning priority.`;
    const comparison=others.length
      ? `It was weighed against ${others.map(x=>x.title.toLowerCase()).join(' and ')}.`
      : '';
    return `${lead} ${comparison}`.trim();
  }

  function actionFor(item){
    const map={
      'cpp-timing':{screen:'picture',field:'cppStart1',label:'Review CPP timing in my plan'},
      'oas-timing':{screen:'picture',field:'oasStart1',label:'Review OAS timing in my plan'},
      'rrsp-drawdown':{screen:'picture',field:'rrsp1',label:'Review RRSP details in my plan'},
      'tfsa-flexibility':{screen:'picture',field:'tfsa1',label:'Review TFSA details in my plan'},
      'income-bridge':{screen:'picture',field:'otherIncomeList1',label:'Review income sources in my plan'},
      'benefit-estimates':{screen:'picture',field:'cpp1',label:'Update CPP and OAS estimates'},
      'account-refresh':{screen:'picture',field:'rrsp1',label:'Update account balances'},
      'spending-flexibility':{screen:'goal',field:'spend',label:'Review my spending target'},
      'plan-gap':{screen:'goal',field:'spend',label:'Adjust my goal'},
      'retirement-age':{screen:'goal',field:'retire1',label:'Review retirement timing'},
      'assumption-review':{screen:'explore',view:'scenarios',field:'scenarioReturn',label:'Review planning assumptions'},
      'annual-review':{screen:'explore',view:'review',label:'Open my Plan Review'}
    };
    return map[item.id]||{screen:'picture',label:'Review this in my plan'};
  }

  function ensureDecisionPanel(){
    let panel=el('overviewOpportunityPanel');
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id='overviewOpportunityPanel';
    panel.className='overview-opportunity-panel hidden';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');
    panel.innerHTML='<div class="overview-opportunity-panel-backdrop" data-close-opportunity></div><section class="overview-opportunity-panel-card" aria-labelledby="overviewOpportunityTitle"><button class="overview-opportunity-close" type="button" data-close-opportunity aria-label="Close">×</button><div id="overviewOpportunityContent"></div></section>';
    document.body.appendChild(panel);
    return panel;
  }

  function openDecision(item,index){
    const panel=ensureDecisionPanel();
    const content=el('overviewOpportunityContent');
    const action=actionFor(item);
    const evidence=(item.evidence||[]).map(x=>`<span>✓ ${escape(x)}</span>`).join('');
    const tradeoff=item.comparison?.summary||item.comparisonNote||'This opportunity should be reviewed alongside your full retirement plan before making a change.';
    content.innerHTML=`
      <div class="eyebrow">Opportunity ${index+1} of ${currentRecommendations.length}</div>
      <h2 id="overviewOpportunityTitle">${escape(item.title)}</h2>
      <p class="overview-opportunity-lead">${escape(item.summary||'')}</p>
      <div class="overview-decision-grid">
        <section><h3>Why this ranked here</h3><p>${escape(rankExplanation(item,index))}</p></section>
        <section><h3>Expected impact</h3><p><strong>${escape(item.impactText||item.impact||'Planning opportunity')}</strong></p></section>
        <section class="wide"><h3>Why this may improve your plan</h3><p>${escape(item.why||'')}</p></section>
        <section class="wide"><h3>What Harbour North evaluated</h3><div class="overview-decision-evidence">${evidence||'<span>Current plan inputs</span>'}</div></section>
        <section class="wide"><h3>What to consider before changing it</h3><p>${escape(tradeoff)}</p></section>
        <section class="wide overview-decision-action"><h3>How to make the change</h3><p>${escape(item.how||'Open the relevant plan inputs, review the suggested change, and rebuild the plan before deciding whether to keep it.')}</p><button class="btn primary" type="button" data-opportunity-action data-screen="${escape(action.screen)}" data-view="${escape(action.view||'')}" data-field="${escape(action.field||'')}">${escape(action.label)} →</button></section>
      </div>`;
    panel.classList.remove('hidden');
    document.body.classList.add('opportunity-panel-open');
    panel.querySelector('.overview-opportunity-close')?.focus();
  }

  function closeDecision(){
    el('overviewOpportunityPanel')?.classList.add('hidden');
    document.body.classList.remove('opportunity-panel-open');
  }

  document.addEventListener('click',event=>{
    const opportunity=event.target.closest('[data-dashboard-opportunity]');
    if(opportunity){
      const id=opportunity.dataset.dashboardOpportunity;
      const index=currentRecommendations.findIndex(item=>item.id===id);
      if(index>=0)openDecision(currentRecommendations[index],index);
      return;
    }
    if(event.target.closest('[data-close-opportunity]')){closeDecision();return;}
    const actionButton=event.target.closest('[data-opportunity-action]');
    if(actionButton){
      const {screen,view,field}=actionButton.dataset;
      closeDecision();
      if(typeof window.go==='function')window.go(screen||'picture');
      if(view)setTimeout(()=>window.showExploreView?.(view),0);
      if(field)setTimeout(()=>{const target=el(field);target?.scrollIntoView({behavior:'smooth',block:'center'});target?.focus?.();target?.classList.add('opportunity-input-highlight');setTimeout(()=>target?.classList.remove('opportunity-input-highlight'),2600)},180);
    }
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDecision()});
  window.HNDashboard={render};
})();
