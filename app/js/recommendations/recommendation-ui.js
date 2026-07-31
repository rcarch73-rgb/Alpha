(function(){
  'use strict';

  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const badgeClass=impact=>impact==='Moderate impact'?'moderate':impact==='Planning opportunity'?'planning':'';

  function getRecommendations(){
    if(!window.HNRecommendationEngine)return [];
    if(!window.result&&typeof window.calculate==='function')window.result=window.calculate();
    return window.HNRecommendationEngine.rank(window.plan||{},window.result||{},3);
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
            <div class="next-step-action"><strong>How to act:</strong> ${escapeHtml(item.how)}</div>
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

  window.HNRecommendations={getRecommendations,render};
})();
