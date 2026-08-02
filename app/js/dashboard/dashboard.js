(function(){
  'use strict';
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(num(v));
  const escape=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const el=id=>document.getElementById(id);
  let currentRecommendations=[];
  let activeScenario=null;

  function greeting(name){
    const hour=new Date().getHours();
    const day=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
    return `${day}${name?`, ${name}`:''}`;
  }
  function health(label,value,tone='good'){return `<div class="overview-health-row"><span>${escape(label)}</span><strong class="${tone}">${escape(value)}</strong></div>`}
  function render(plan,result,recommendations,readinessOverride){
    if(!plan)return;
    const normalizedPlan=window.HNRecommendationState?.normalizePlan?.(plan)||plan;
    const readiness=readinessOverride||window.pageState?.readiness||window.HNRecommendationState?.getPlanReadiness?.(normalizedPlan, result);
    const calculation=readiness?.isComplete ? (window.HNRecommendationState?.resolveCalculation?.(window.pageState,result)||null) : null;
    const resolvedRecommendations=readiness?.isComplete ? (Array.isArray(recommendations)&&recommendations.length?recommendations:(Array.isArray(window.pageState?.recommendations)?window.pageState.recommendations:[])) : [];
    const metricMap=window.HNRecommendationState?.getDashboardMetricMap?.(calculation)||{};
    const first=normalizedPlan.name1||normalizedPlan.accountFirstName||'';
    const ratio=num(calculation?.ratio);
    const status=calculation?.status|| (ratio>=1?'ontrack':ratio>=.9?'close':'attention');
    const greetingEl=el('dashboardGreeting'); if(greetingEl)greetingEl.textContent=greeting(first);
    const target=el('dashboardTarget'); if(target)target.textContent=`Your target: ${money(normalizedPlan.spend)}/month`;
    const retirementPortfolio=el('dashboardRetirementPortfolio'); if(retirementPortfolio)retirementPortfolio.textContent=readiness?.isComplete? (window.HNRecommendationState?.formatMetricValue?.(calculation?.retirementStart) || 'Unavailable') : 'Not calculated';
    const retireStatus=el('dashboardRetireStatus'); if(retireStatus)retireStatus.textContent=readiness?.isComplete?(status==='ontrack'?'Supported by the current projection':status==='close'?'Close to the current target':'An adjustment is worth reviewing'):'Complete your plan to unlock the projection';

    const confidenceTone=num(calculation?.confidence)>=80?'Strong':num(calculation?.confidence)>=65?'Moderate':'Developing';
    const flexibility=ratio>=1.12?'Excellent':ratio>=1?'Good':ratio>=.9?'Limited':'Needs attention';
    const portfolio=Number.isFinite(Number(metricMap.portfolioLongevity))?'Strong':'Unavailable';
    const income=ratio>=1.12?'On track':ratio>=1?'On track':ratio>=.9?'Close':'Needs attention';
    const healthEl=el('dashboardHealth');
    if(healthEl)healthEl.innerHTML=readiness?.isComplete?[
      health('Retirement income',income,ratio>=1?'good':ratio>=.9?'watch':'attention'),
      health('Portfolio longevity',portfolio,portfolio==='Strong'?'good':'attention'),
      health('Planning flexibility',flexibility,ratio>=1?'good':ratio>=.9?'watch':'attention'),
      health('Income timing',num(normalizedPlan.cppStart1)>=65&&num(normalizedPlan.oasStart1)>=65?'Planned':'Review','good')
    ].join():health('Plan health','Complete your plan','attention');

    currentRecommendations=resolvedRecommendations;
    const opp=el('dashboardOpportunities');
    const heading=el('dashboardOpportunitiesHeading');
    const emptyState=readiness?.isComplete?window.HNRecommendationState?.getRecommendationEmptyState?.(status,resolvedRecommendations)||'':null;
    const emptyHeading=readiness?.isComplete?window.HNRecommendationState?.getRecommendationHeading?.(status,resolvedRecommendations)||'Your plan needs attention':'Your plan needs attention';
    if(heading){heading.textContent=readiness?.isComplete && !resolvedRecommendations.length ? emptyHeading : (readiness?.isComplete ? 'Your three opportunities' : 'Complete your plan to see opportunities');}
    if(opp){
      opp.innerHTML=readiness?.isComplete?(resolvedRecommendations.length?resolvedRecommendations.map((item,index)=>`<div class="overview-opportunity"><span class="overview-opportunity-number">${index+1}</span><div><strong>${escape(item.title)}</strong><small>${escape(item.summary||item.impactText||item.timing)}</small></div><button type="button" data-dashboard-opportunity="${escape(item.id)}">Explain this →</button></div>`).join(''):(emptyState?`<p class="quiet">${escape(emptyState)}</p>`:'<p class="quiet">No significant changes are recommended right now.</p>')):`<p class="quiet">Add your income, savings, retirement age, and spending target to generate results and recommendations.</p>`;
    }

    const updated=normalizedPlan.updatedAt?new Date(normalizedPlan.updatedAt):null;
    const updatedLabel=updated&&!Number.isNaN(updated.getTime())?updated.toLocaleString('en-CA',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Not recorded';
    const changes=el('dashboardChanges');
    if(changes)changes.innerHTML=readiness?.isComplete?`
      <div class="overview-activity-item"><span class="overview-activity-icon">✓</span><div><strong>Plan calculations are current</strong><small>Last updated ${escape(updatedLabel)}</small></div></div>
      <div class="overview-activity-item"><span class="overview-activity-icon">✓</span><div><strong>${resolvedRecommendations.length?resolvedRecommendations.length:0} opportunities reviewed</strong><small>Ranked from the information in this plan</small></div></div>
      <div class="overview-activity-item"><span class="overview-activity-icon">✓</span><div><strong>Cloud and browser saving available</strong><small>Your save status appears at the top of the page</small></div></div>`:`<div class="overview-activity-item"><span class="overview-activity-icon">!</span><div><strong>Complete your plan</strong><small>Add your income, savings, retirement age, and spending target to generate results and recommendations.</small></div></div>`;

    const reviewDate=el('dashboardReviewDate');
    if(reviewDate){const d=new Date();d.setFullYear(d.getFullYear()+1);reviewDate.textContent=d.toLocaleDateString('en-CA',{month:'long',year:'numeric'});} 
    renderSavedScenarios(normalizedPlan);
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


  const scenarioLabels={retire1:'Retirement age',retire2:'Partner retirement age',spend:'Monthly spending',returnRate:'Investment return',inflationRate:'Inflation',province:'Province',horizon:'Planning horizon'};
  function currentPlan(){return window.HNCloudBridge?.getPlan?.()||null}
  function calculatePlan(plan){
    try{return window.HNVerifiedEngine?.calculate?.(plan)||null}catch(error){console.warn('Scenario Coach calculation failed.',error);return null}
  }
  function scenarioFor(item){
    const plan=currentPlan();
    if(!plan)return null;
    if(item?.comparison?.patch){
      const patch=structuredClone(item.comparison.patch);
      return {name:item.comparison.label||item.title,patch};
    }
    if(item?.id==='assumption-review'){
      return {name:'More conservative assumptions',patch:{returnRate:Math.max(0,num(plan.returnRate||5)-1),inflationRate:Math.min(8,num(plan.inflationRate||2)+.5)}};
    }
    return null;
  }
  function changedRows(plan,patch){
    return Object.entries(patch||{}).filter(([key,value])=>String(plan?.[key]??'')!==String(value??'')).map(([key,value])=>{
      const before=plan?.[key];
      const format=v=>key==='spend'?`${money(v)}/month`:key==='returnRate'||key==='inflationRate'?`${num(v)}%`:String(v??'—');
      return `<div class="scenario-change-row"><span>${escape(scenarioLabels[key]||key)}</span><strong>${escape(format(before))}</strong><b>→</b><strong>${escape(format(value))}</strong></div>`;
    }).join('');
  }
  function ensureScenarioCoach(){
    let panel=el('scenarioCoachPanel');
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id='scenarioCoachPanel';
    panel.className='scenario-coach hidden';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');
    panel.innerHTML='<div class="scenario-coach-backdrop" data-close-scenario-coach></div><section class="scenario-coach-card" aria-labelledby="scenarioCoachTitle"><button class="scenario-coach-close" type="button" data-close-scenario-coach aria-label="Close">×</button><div id="scenarioCoachContent"></div></section>';
    document.body.appendChild(panel);
    return panel;
  }
  function openScenarioCoach(item){
    const definition=scenarioFor(item),plan=currentPlan();
    if(!definition||!plan)return;
    const base=calculatePlan(plan);
    const alternativePlan={...structuredClone(plan),...definition.patch};
    const alternative=calculatePlan(alternativePlan);
    if(!base||!alternative){window.toast?.('This comparison could not be calculated.');return}

    const evaluation=window.HNScenarioEvaluation?.createScenarioEvaluation?.(plan,calculatePlan,definition.patch)||null;
    const comparison=evaluation?{
      current:{sustainable:num(evaluation.baseline.sustainable),ending:num(evaluation.baseline.ending),ratio:num(evaluation.baseline.ratio)},
      alternative:{sustainable:num(evaluation.scenario.sustainable),ending:num(evaluation.scenario.ending),ratio:num(evaluation.scenario.ratio)}
    }:{
      current:{sustainable:num(base.sustainable),ending:num(base.ending),ratio:num(base.ratio)},
      alternative:{sustainable:num(alternative.sustainable),ending:num(alternative.ending),ratio:num(alternative.ratio)}
    };

    activeScenario={id:`scenario-${Date.now()}`,name:definition.name,sourceOpportunityId:item.id,sourceOpportunityTitle:item.title,patch:definition.patch,createdAt:new Date().toISOString(),current:comparison.current,alternative:comparison.alternative};
    const sustainableDelta=activeScenario.alternative.sustainable-activeScenario.current.sustainable;
    const endingDelta=activeScenario.alternative.ending-activeScenario.current.ending;
    const panel=ensureScenarioCoach(),content=el('scenarioCoachContent');
    content.innerHTML=`
      <div class="eyebrow">Scenario Coach</div>
      <h2 id="scenarioCoachTitle">See the difference</h2>
      <p class="scenario-coach-lead">This temporary comparison changes only the inputs listed below. Your saved plan remains untouched.</p>
      <section class="scenario-change-list"><h3>What changes</h3>${changedRows(plan,definition.patch)||'<p class="quiet">No input changes were found.</p>'}</section>
      <div class="scenario-coach-compare">
        <section><span>Current plan</span><strong>${money(activeScenario.current.sustainable)}/mo</strong><small>Sustainable spending</small><strong>${money(activeScenario.current.ending)}</strong><small>Ending assets</small></section>
        <section class="suggested"><span>Suggested scenario</span><strong>${money(activeScenario.alternative.sustainable)}/mo</strong><small>Sustainable spending</small><strong>${money(activeScenario.alternative.ending)}</strong><small>Ending assets</small></section>
      </div>
      <div class="scenario-coach-delta"><strong>Modelled difference</strong><span>${sustainableDelta>=0?'+':''}${money(sustainableDelta)}/month sustainable spending · ${endingDelta>=0?'+':''}${money(endingDelta)} ending assets</span></div>
      <p class="scenario-coach-note">This is a planning comparison based on the same verified engine and assumptions as your primary plan. It is not a prediction or personal financial advice.</p>
      <div class="scenario-coach-actions"><button class="btn secondary" type="button" data-close-scenario-coach>Keep current plan</button><button class="btn secondary" type="button" data-open-scenario-controls>Adjust comparison</button><button class="btn primary" type="button" data-save-coached-scenario>Save as scenario</button></div>`;
    panel.classList.remove('hidden');document.body.classList.add('scenario-coach-open');panel.querySelector('.scenario-coach-close')?.focus();
  }
  function closeScenarioCoach(){el('scenarioCoachPanel')?.classList.add('hidden');document.body.classList.remove('scenario-coach-open')}
  function applyPatchToScenarioControls(patch){
    const mapping={retire1:'scenarioAge',spend:'scenarioSpend',returnRate:'scenarioReturn',inflationRate:'scenarioInflation',province:'scenarioProvince',horizon:'scenarioHorizon'};
    Object.entries(mapping).forEach(([key,id])=>{if(Object.prototype.hasOwnProperty.call(patch,key)&&el(id)){el(id).value=patch[key];el(id).dispatchEvent(new Event(id==='scenarioProvince'?'change':'input',{bubbles:true}))}});
  }
  function openScenarioControls(){
    if(!activeScenario)return;
    closeScenarioCoach();closeDecision();
    window.go?.('explore');setTimeout(()=>{window.showExploreView?.('scenarios');applyPatchToScenarioControls(activeScenario.patch)},60);
  }
  function saveScenario(){
    if(!activeScenario)return;
    const plan=currentPlan();if(!plan)return;
    const proposed=(prompt('Name this scenario',activeScenario.name)||'').trim();if(!proposed)return;
    const saved=Array.isArray(plan.savedScenarios)?structuredClone(plan.savedScenarios):[];
    const scenario={...structuredClone(activeScenario),name:proposed};
    saved.unshift(scenario);
    const updated={...structuredClone(plan),savedScenarios:saved.slice(0,20),updatedAt:new Date().toISOString()};
    window.HNCloudBridge?.applyPlan?.(updated);
    activeScenario=scenario;renderSavedScenarios(updated);closeScenarioCoach();window.toast?.('Scenario saved');
  }
  function ensureSavedScenarioShelf(){
    const view=el('scenariosView');if(!view)return null;
    let shelf=el('savedScenarioShelf');
    if(!shelf){shelf=document.createElement('section');shelf.id='savedScenarioShelf';shelf.className='card saved-scenario-shelf';const layout=view.querySelector('.scenario-layout');layout?.insertAdjacentElement('afterend',shelf)}
    return shelf;
  }
  function renderSavedScenarios(plan=currentPlan()){
    const shelf=ensureSavedScenarioShelf();if(!shelf)return;
    const scenarios=Array.isArray(plan?.savedScenarios)?plan.savedScenarios:[];
    shelf.innerHTML=`<div class="overview-card-head"><div><div class="eyebrow">Saved comparisons</div><h3>Scenario Coach</h3></div><span class="quiet">${scenarios.length} saved</span></div>${scenarios.length?`<div class="saved-scenario-list">${scenarios.map(s=>`<article data-saved-scenario="${escape(s.id)}"><div><strong>${escape(s.name)}</strong><small>${escape(s.sourceOpportunityTitle||'Planning comparison')} · ${new Date(s.createdAt).toLocaleDateString('en-CA')}</small></div><div><button class="btn secondary small-btn" type="button" data-load-saved-scenario>Open</button><button class="btn text danger" type="button" data-delete-saved-scenario>Delete</button></div></article>`).join('')}</div>`:'<p class="quiet">Comparisons saved from an opportunity will appear here. They do not alter the primary plan.</p>'}`;
  }
  function scenarioById(id){return (currentPlan()?.savedScenarios||[]).find(s=>s.id===id)}
  function loadSavedScenario(id){const scenario=scenarioById(id);if(!scenario)return;activeScenario=structuredClone(scenario);window.go?.('explore');setTimeout(()=>{window.showExploreView?.('scenarios');applyPatchToScenarioControls(scenario.patch);el('scenariosView')?.scrollIntoView({behavior:'smooth',block:'start'})},60)}
  function deleteSavedScenario(id){const plan=currentPlan();if(!plan)return;const scenario=scenarioById(id);if(!scenario||!confirm(`Delete “${scenario.name}”?`))return;const updated={...structuredClone(plan),savedScenarios:(plan.savedScenarios||[]).filter(s=>s.id!==id),updatedAt:new Date().toISOString()};window.HNCloudBridge?.applyPlan?.(updated);renderSavedScenarios(updated);window.toast?.('Scenario deleted')}

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
        <section class="wide overview-decision-action"><h3>How to make the change</h3><p>${escape(item.how||'Open the relevant plan inputs, review the suggested change, and rebuild the plan before deciding whether to keep it.')}</p><div class="overview-decision-buttons">${scenarioFor(item)?`<button class="btn primary" type="button" data-create-opportunity-scenario="${escape(item.id)}">Create comparison →</button>`:''}<button class="btn secondary" type="button" data-opportunity-action data-screen="${escape(action.screen)}" data-view="${escape(action.view||'')}" data-field="${escape(action.field||'')}">${escape(action.label)} →</button></div>${scenarioFor(item)?'':`<p class="quiet overview-comparison-unavailable">A trustworthy comparison needs additional inputs or controls before Harbour North can model this opportunity.</p>`}</section>
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
    if(event.target.closest('[data-close-scenario-coach]')){closeScenarioCoach();return;}
    const createScenarioButton=event.target.closest('[data-create-opportunity-scenario]');
    if(createScenarioButton){const item=currentRecommendations.find(x=>x.id===createScenarioButton.dataset.createOpportunityScenario);if(item)openScenarioCoach(item);return;}
    if(event.target.closest('[data-open-scenario-controls]')){openScenarioControls();return;}
    if(event.target.closest('[data-save-coached-scenario]')){saveScenario();return;}
    const loadButton=event.target.closest('[data-load-saved-scenario]');if(loadButton){loadSavedScenario(loadButton.closest('[data-saved-scenario]')?.dataset.savedScenario);return;}
    const deleteButton=event.target.closest('[data-delete-saved-scenario]');if(deleteButton){deleteSavedScenario(deleteButton.closest('[data-saved-scenario]')?.dataset.savedScenario);return;}
    const actionButton=event.target.closest('[data-opportunity-action]');
    if(actionButton){
      const {screen,view,field}=actionButton.dataset;
      closeDecision();
      if(typeof window.go==='function')window.go(screen||'picture');
      if(view)setTimeout(()=>window.showExploreView?.(view),0);
      if(field)setTimeout(()=>{const target=el(field);target?.scrollIntoView({behavior:'smooth',block:'center'});target?.focus?.();target?.classList.add('opportunity-input-highlight');setTimeout(()=>target?.classList.remove('opportunity-input-highlight'),2600)},180);
    }
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeScenarioCoach();closeDecision()}});
  window.HNDashboard={render};
})();
