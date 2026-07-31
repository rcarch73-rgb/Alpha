(function(){
  'use strict';

  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const money=value=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(Number(value)||0);
  const badgeClass=impact=>impact==='Moderate impact'?'moderate':impact==='Planning opportunity'?'planning':'';

  function getRecommendations(){
    if(!window.HNRecommendationEngine)return [];
    if(!window.result&&typeof window.calculate==='function')window.result=window.calculate();
    return window.HNRecommendationEngine.rank(window.plan||{},window.result||{},3);
  }

  function evidenceList(items){
    return `<div class="next-step-evidence"><h4>Why we think this</h4><div>${items.map(item=>`<span>✓ ${escapeHtml(item)}</span>`).join('')}</div></div>`;
  }

  function comparisonMarkup(item){
    if(item.comparison){
      const c=item.comparison;
      return `<div class="next-step-comparison hidden" data-next-step-comparison>
        <div class="comparison-title">${escapeHtml(c.label)}</div>
        <div class="comparison-grid">
          <div><span>Current sustainable spending</span><strong>${money(c.current.sustainable)}/mo</strong></div>
          <div class="alternative"><span>Compared result</span><strong>${money(c.alternative.sustainable)}/mo</strong></div>
          <div><span>Current ending assets</span><strong>${money(c.current.ending)}</strong></div>
          <div class="alternative"><span>Compared ending assets</span><strong>${money(c.alternative.ending)}</strong></div>
        </div>
        <p>${escapeHtml(c.summary)} This is a temporary comparison and does not change your saved plan.</p>
      </div>`;
    }
    return `<div class="next-step-comparison hidden review-note" data-next-step-comparison><div class="comparison-title">What can be compared</div><p>${escapeHtml(item.comparisonNote||'A reliable dollar comparison is not available for this opportunity yet.')}</p></div>`;
  }

  function card(item,index){
    const open=index===0;
    return `<article class="next-step-card${open?' open':''}" data-next-step-card="${escapeHtml(item.id)}">
      <button class="next-step-toggle" type="button" aria-expanded="${open}" data-next-step-toggle>
        <span class="next-step-number">${index+1}</span>
        <span class="next-step-heading"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.summary)}</span></span>
        <span class="next-step-badge ${badgeClass(item.impact)}">${escapeHtml(item.impact)}</span>
        <span class="next-step-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="next-step-details">
        <div class="next-step-detail-grid">
          <div class="next-step-copy">
            <h4>Why this matters</h4><p>${escapeHtml(item.why)}</p>
            <div class="next-step-impact"><span>Expected impact</span><strong>${escapeHtml(item.impactText||item.impact)}</strong></div>
            ${evidenceList(item.evidence||[])}
            <div class="next-step-action"><strong>How to act:</strong> ${escapeHtml(item.how)}</div>
            <button class="btn secondary next-step-compare-btn" type="button" data-see-difference>${item.comparison?'See the difference':'What would it take to compare?'}</button>
            ${comparisonMarkup(item)}
          </div>
          <div class="next-step-meta">
            <div><span>Category</span><strong>${escapeHtml(item.category)}</strong></div>
            <div><span>Confidence</span><strong>${escapeHtml(item.confidence)}</strong></div>
            <div><span>When</span><strong>${escapeHtml(item.timing)}</strong></div>
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
    if(!items.length){
      list.innerHTML='<section class="card next-step-empty"><h3>Your plan looks well positioned.</h3><p class="quiet">There are no significant planning changes to prioritize right now. Review the plan annually or after a meaningful change.</p></section>';
      return;
    }
    list.innerHTML=items.map(card).join('');
  }

  document.addEventListener('click',event=>{
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
    if(!wasOpen){
      selected.classList.add('open');
      toggle.setAttribute('aria-expanded','true');
    }
  });

  function renderWhenVisible(){
    const view=document.getElementById('recommendationsView');
    if(view&&!view.classList.contains('hidden'))render();
  }

  window.addEventListener('hn:plan-saved',renderWhenVisible);
  document.addEventListener('DOMContentLoaded',renderWhenVisible);
  setTimeout(renderWhenVisible,0);

  window.HNRecommendations={getRecommendations,render};
})();
