(function(global){
  'use strict';

  function isMeaningful(item){
    if(!item||!item.title)return false;
    const id=item.id||'';
    const excluded=new Set(['annual-review','benefit-estimates','assumption-review','account-refresh']);
    if(excluded.has(id))return false;
    return true;
  }

  function rankCandidates(items,limit=3){
    const requested=Math.max(0,limit);
    const ranked=(Array.isArray(items)?items:[])
      .filter(item=>item&&item.title)
      .sort((a,b)=>b.score-a.score);
    const meaningful=ranked.filter(isMeaningful);
    const fallback=ranked.filter(item=>!isMeaningful(item));
    return meaningful.concat(fallback).slice(0,requested);
  }

  global.HNRecommendationRanking={isMeaningful,rankCandidates};
})(typeof window!=='undefined'?window:globalThis);
