(function(){
  'use strict';

  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const money=value=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(num(value));
  const badgeClass=value=>value==='High impact'?'high':value==='Moderate impact'?'moderate':'planning';

  function getRecommendations(){
    if(!window.HNRecommendationEngine)return [];
    if(!window.result&&typeof window.calculate==='function')window.result=window.calculate();
    return window.HNRecommendationEngine.rank(window.plan||{},window.result||{},3);
  }

  function planState(){
    const plan=window.plan||{};
    const result=window.result||{};
    const ratio=num(result.ratio);
    const target=num(plan.spend);
    const sustainable=num(result.sustainable);
    if(ratio>=1.12)return {tone:'strong',label:'Your retirement plan is in strong shape.',copy:`The current projection supports your ${money(target)} monthly spending target with additional planning flexibility.`};
    if(ratio>=1)return {tone:'good',label:'Your retirement plan is on track.',copy:`The current projection supports your ${money(target)} monthly spending target based on the assumptions entered.`};
    if(ratio>=.9)return {tone:'watch',label:'Your plan is close to the target.',copy:`The current projection supports about ${money(sustainable)} per month. A focused adjustment may close the remaining gap.`};
    return {tone:'attention',label:'Your plan would benefit from an adjustment.',copy:`The current projection supports about ${money(sustainable)} per month versus your ${money(target)} target.`};
  }

  function ensureSummary(){
    const view=document.getElementById('recommendationsView');
    const list=document.getElementById('recommendationList');
    if(!view||!list)return null;
    let summary=document.getElementById('opportunitySummary');
    if(!summary){
      summary=document.createElement('section');
      summary.id='opportunitySummary';
      summary.className='opportunity-summary';
      list.parentNode.insertBefore(summary,list);
    }
    return summary;
  }

  function renderSummary(items){
    const summary=ensureSummary();
    if(!summary)return;
    const state=planState();
    const plan=window.plan||{};
    const result=window.result||{};
    const first=items[0];
    const name=escapeHtml(plan.name1||plan.accountFirstName||'Your');
    summary.innerHTML=`
      <div class="opportunity-summary-status ${state.tone}"><span aria-hidden="true">${state.tone==='attention'?'!':'✓'}</span>${escapeHtml(state.label)}</div>
      <div class="opportunity-summary-grid">
        <div>
          <div class="eyebrow">Your retirement guide</div>
          <h3>${name}, here are the three opportunities worth reviewing next.</h3>
          <p>${escapeHtml(state.copy)}${first?` The highest-priority opportunity is <strong>${escapeHtml(first.title.toLowerCase())}</strong>.`:''}</p>
        </div>
        <div class="opportunity-summary-metrics">
          <div><span>Sustainable spending</span><strong>${money(result.sustainable)}/mo</strong></div>
          <div><span>Target spending</span><strong>${money(plan.spend)}/mo</strong></div>
          <div><span>Last reviewed</span><strong>Today</strong></div>
        </div>
      </div>`;
  }

  function evidenceList(items){
    return `<div class="next-step-evidence"><h4>What we evaluated</h4><div>${items.map(item=>`<span>✓ ${escapeHtml(item)}</span>`).join('')}</div></div>`;
  }

  function difficulty(item){
    if(['annual-review','benefit-estimates','assumption-review','account-refresh'].includes(item.id))return 'Easy';
    if(['cpp-timing','spending-flexibility'].includes(item.id))return 'Easy to compare';
    if(['rrsp-drawdown','tfsa-flexibility','income-bridge'].includes(item.id))return 'Requires planning';
    return 'Moderate';
  }

  function rankReason(item,index){
    if(index===0){
      if(item.id==='plan-gap')return 'Most important plan adjustment';
      if(item.category==='Guaranteed income')return 'Strongest guaranteed-income opportunity';
      if(item.category==='Withdrawal strategy')return 'Largest tax-planning opportunity';
      return 'Highest-priority opportunity';
    }
    if(item.category==='Tax flexibility'||item.category==='Withdrawal strategy')return 'Improves future tax flexibility';
    if(item.category==='Plan maintenance'||item.category==='Planning assumptions')return 'Protects the quality of your plan';
    return 'Supports long-term plan resilience';
  }

  const actionMap={
    'plan-gap':{label:'Compare the adjustment',screen:'explore',view:'scenarios'},
    'income-bridge':{label:'Review income sources',screen:'picture',focus:'employment1'},
    'rrsp-drawdown':{label:'Review RRSP strategy inputs',screen:'picture',focus:'rrsp1'},
    'tfsa-flexibility':{label:'Review TFSA inputs',screen:'picture',focus:'tfsa1'},
    'cpp-timing':{label:'Review CPP timing',screen:'picture',focus:'cppStart1'},
    'spending-flexibility':{label:'Review spending target',screen:'goal',focus:'spend'},
    'annual-review':{label:'Open Plan Review',screen:'explore',view:'review'},
    'benefit-estimates':{label:'Update CPP and OAS estimates',screen:'picture',focus:'cpp1'},
    'assumption-review':{label:'Review assumptions',screen:'explore',view:'scenarios',focus:'scenarioReturn'},
    'account-refresh':{label:'Update account balances',screen:'picture',focus:'rrsp1'}
  };

  function rankingExplanation(item,index,items){
    const ahead=items[index-1];
    const behind=items[index+1];
    const position=index+1;
    let lead='';
    if(position===1) lead=`This opportunity ranks first because it addresses the most immediate or highest-impact issue identified in the current plan: ${item.category.toLowerCase()}.`;
    else lead=`This opportunity ranks ${position===2?'second':'third'} because ${ahead?`“${ahead.title}” currently has a more immediate or larger projected effect. `:''}It still ranks ahead of lower-priority maintenance actions because it can materially improve ${item.category.toLowerCase()}.`;
    const comparison=behind?` It ranks ahead of “${behind.title}” because the current plan data gives this issue greater urgency or potential benefit.`:'';
    return lead+comparison;
  }

  function rankingMarkup(item,index,items){
    const alternatives=items.filter((_,i)=>i!==index).map((other,i)=>`<li><strong>${escapeHtml(other.title)}</strong><span>${i<index?'Higher current priority':'Lower current priority'} · ${escapeHtml(other.category)}</span></li>`).join('');
    return `<div class="next-step-ranking"><h4>Why this opportunity ranks here</h4><p>${escapeHtml(rankingExplanation(item,index,items))}</p><ul>${alternatives}</ul></div>`;
  }

  function actionMarkup(item){
    const action=actionMap[item.id]||{label:'Review this opportunity',screen:'explore',view:'recommendations'};
    return `<button class="btn primary next-step-plan-action" type="button" data-plan-action data-screen="${escapeHtml(action.screen)}" data-view="${escapeHtml(action.view||'')}" data-focus="${escapeHtml(action.focus||'')}">${escapeHtml(action.label)} →</button><p class="next-step-action-note">This opens the relevant plan inputs. Nothing changes until you edit and save the plan.</p>`;
  }

  function comparisonMarkup(item){
    if(item.comparison){
      const c=item.comparison;
      return `<div class="next-step-comparison hidden" data-next-step-comparison>
        <div class="comparison-title">See the difference: ${escapeHtml(c.label)}</div>
        <div class="comparison-grid">
          <div><span>Current sustainable spending</span><strong>${money(c.current.sustainable)}/mo</strong></div>
          <div class="alternative"><span>Compared result</span><strong>${money(c.alternative.sustainable)}/mo</strong></div>
          <div><span>Current ending assets</span><strong>${money(c.current.ending)}</strong></div>
          <div class="alternative"><span>Compared ending assets</span><strong>${money(c.alternative.ending)}</strong></div>
        </div>
        <p>${escapeHtml(c.summary)} This comparison is temporary and does not change the saved plan.</p>
      </div>`;
    }
    return `<div class="next-step-comparison hidden review-note" data-next-step-comparison><div class="comparison-title">What is needed to compare this reliably</div><p>${escapeHtml(item.comparisonNote||'A reliable dollar comparison is not available for this opportunity yet.')}</p></div>`;
  }

  function card(item,index,items){
    const open=index===0;
    return `<article class="next-step-card${open?' open':''}" data-next-step-card="${escapeHtml(item.id)}">
      <button class="next-step-toggle" type="button" aria-expanded="${open}" data-next-step-toggle>
        <span class="next-step-number">${index+1}</span>
        <span class="next-step-heading"><small>${escapeHtml(rankReason(item,index))}</small><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.summary)}</span></span>
        <span class="next-step-badge ${badgeClass(item.impact)}">${escapeHtml(item.impact)}</span>
        <span class="next-step-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="next-step-details">
        <div class="next-step-detail-grid">
          <div class="next-step-copy">
            <h4>Why this opportunity matters</h4><p>${escapeHtml(item.why)}</p>
            ${rankingMarkup(item,index,items)}
            <div class="next-step-impact"><span>Expected impact</span><strong>${escapeHtml(item.impactText||item.impact)}</strong></div>
            ${evidenceList(item.evidence||[])}
            <button class="btn secondary next-step-compare-btn" type="button" data-see-difference>${item.comparison?'See the difference':'What would it take to compare?'}</button>
            ${comparisonMarkup(item)}
            <div class="next-step-plan-change"><h4>How to make this change</h4><p>${escapeHtml(item.how)}</p>${actionMarkup(item)}</div>
          </div>
          <div class="next-step-meta">
            <div><span>Opportunity</span><strong>${escapeHtml(item.category)}</strong></div>
            <div><span>Confidence</span><strong>${escapeHtml(item.confidence)}</strong></div>
            <div><span>Difficulty</span><strong>${escapeHtml(difficulty(item))}</strong></div>
            <div><span>When to review</span><strong>${escapeHtml(item.timing)}</strong></div>
          </div>
        </div>
      </div>
    </article>`;
  }

  function render(){
    const list=document.getElementById('recommendationList');
    if(!list)return;
    list.className='next-steps-list';
    const items=getRecommendations();
    renderSummary(items);
    if(!items.length){
      list.innerHTML='<section class="card next-step-empty"><h3>Your plan looks well positioned.</h3><p class="quiet">There are no significant planning changes to prioritize right now. Review the plan annually or after a meaningful change.</p></section>';
      return;
    }
    const focus=(()=>{try{return sessionStorage.getItem('hn.focusOpportunity')||''}catch(_){return ''}})();
    list.innerHTML=items.map((item,index)=>card(item,index,items)).join('');
    if(focus)openOpportunity(focus);
  }

  document.addEventListener('click',event=>{
    const planAction=event.target.closest('[data-plan-action]');
    if(planAction){
      const screen=planAction.dataset.screen;
      const view=planAction.dataset.view;
      const focus=planAction.dataset.focus;
      location.hash=screen==='explore'&&view?`#explore/${view}`:`#${screen}`;
      setTimeout(()=>{const target=focus&&document.getElementById(focus);if(target){target.focus({preventScroll:true});target.scrollIntoView({behavior:'smooth',block:'center'});target.closest('.field')?.classList.add('plan-field-highlight');setTimeout(()=>target.closest('.field')?.classList.remove('plan-field-highlight'),2200)}},120);
      return;
    }
    const compareButton=event.target.closest('[data-see-difference]');
    if(compareButton){
      const card=compareButton.closest('[data-next-step-card]');
      const panel=card&&card.querySelector('[data-next-step-comparison]');
      if(panel){
        const hidden=panel.classList.toggle('hidden');
        compareButton.textContent=hidden?(panel.classList.contains('review-note')?'What would it take to compare?':'See the difference'):'Hide comparison';
      }
      return;
    }
    const toggle=event.target.closest('[data-next-step-toggle]');
    if(!toggle)return;
    const selected=toggle.closest('[data-next-step-card]');
    const list=selected&&selected.parentElement;
    if(!selected||!list)return;
    const wasOpen=selected.classList.contains('open');
    list.querySelectorAll('[data-next-step-card]').forEach(card=>{
      card.classList.remove('open');
      const button=card.querySelector('[data-next-step-toggle]');
      if(button)button.setAttribute('aria-expanded','false');
    });
    if(!wasOpen){selected.classList.add('open');toggle.setAttribute('aria-expanded','true');}
  });

  function openOpportunity(id){
    const list=document.getElementById('recommendationList');
    if(!list)return;
    const selected=[...list.querySelectorAll('[data-next-step-card]')].find(card=>card.dataset.nextStepCard===id);
    if(!selected)return;
    list.querySelectorAll('[data-next-step-card]').forEach(card=>{
      const active=card===selected;
      card.classList.toggle('open',active);
      card.querySelector('[data-next-step-toggle]')?.setAttribute('aria-expanded',String(active));
    });
    selected.scrollIntoView({behavior:'smooth',block:'start'});
    selected.classList.add('opportunity-focus-pulse');
    setTimeout(()=>selected.classList.remove('opportunity-focus-pulse'),1500);
    try{sessionStorage.removeItem('hn.focusOpportunity')}catch(_){}
  }

  function renderWhenVisible(){
    const view=document.getElementById('recommendationsView');
    if(view&&!view.classList.contains('hidden'))render();
  }

  window.addEventListener('hn:plan-saved',renderWhenVisible);
  window.addEventListener('hn:cloud-plan-loaded',renderWhenVisible);
  document.addEventListener('DOMContentLoaded',renderWhenVisible);
  setTimeout(renderWhenVisible,0);

  window.HNRecommendations={getRecommendations,render,openOpportunity};
})();
