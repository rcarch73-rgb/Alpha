(function(global){
  'use strict';

  const num=value=>Number.isFinite(Number(value))?Number(value):0;

  const defaultOptions={
    minimumScore:50,
    maxOpportunities:3,
    incomeTolerance:-1000,
    confidenceTolerance:-1
  };

  function normalizeOptions(options={}){
    return {
      ...defaultOptions,
      ...options,
      minimumScore:num(options.minimumScore ?? defaultOptions.minimumScore),
      maxOpportunities:Math.max(0,Math.min(3,Math.trunc(num(options.maxOpportunities ?? defaultOptions.maxOpportunities))))
    };
  }

  function isMeaningful(item){
    if(!item||!item.title)return false;
    const id=item.id||'';
    const excluded=new Set(['annual-review','benefit-estimates','assumption-review','account-refresh']);
    if(excluded.has(id))return false;
    return true;
  }

  function createPlanningOpportunity(item,options={}){
    const modifiedInputs=item&&item.modifiedInputs&&typeof item.modifiedInputs==='object'?item.modifiedInputs:{};
    const evidence=Array.isArray(item?.evidence)&&item.evidence.length?item.evidence:['Measured plan improvement'];
    const tradeoffs=Array.isArray(item?.tradeoffs)&&item.tradeoffs.length?item.tradeoffs:[
      'This change may require review of tax or cash-flow assumptions before it is adopted.'
    ];
    return {
      id:item?.id || 'planning-opportunity',
      title:item?.title || 'Planning opportunity',
      summary:item?.description || item?.summary || 'A tested change that improved the plan output.',
      testedChange:item?.title || 'Plan adjustment',
      score:num(item?.score),
      reasons:Array.isArray(item?.reasons)&&item.reasons.length?item.reasons:[],
      modifiedInputs,
      evidence,
      tradeoffs
    };
  }

  function isEligible(item,options={}){
    const opts=normalizeOptions(options);
    if(!item||!item.title)return false;
    if(item.success===false)return false;
    if(num(item.confidenceDelta)<opts.confidenceTolerance)return false;
    if(num(item.incomeDelta)<opts.incomeTolerance)return false;
    if(num(item.score)<opts.minimumScore)return false;
    const isCppStrategy=typeof item.id==='string' && /^cpp-at-/.test(item.id);
    const isOasStrategy=typeof item.id==='string' && /^oas-at-/.test(item.id);
    if(isCppStrategy||isOasStrategy){
      const hasPositiveImpact=num(item.incomeDelta)>0||num(item.endingAssetsDelta)>0||num(item.confidenceDelta)>0||num(item.taxDelta)>0||num(item.guaranteedIncomeTimingDelta)>0;
      if(!hasPositiveImpact)return false;
      if(num(item.incomeDelta)<-1000 || num(item.confidenceDelta)<-3)return false;
    }
    return true;
  }

  function rankCandidates(items,limit=3,options={}){
    const opts=normalizeOptions({
      ...options,
      maxOpportunities:limit
    });
    const ranked=(Array.isArray(items)?items:[])
      .filter(item=>item&&item.title)
      .sort((a,b)=>num(b.score)-num(a.score));
    const eligible=ranked.filter(item=>isEligible(item,opts));
    const meaningful=eligible.filter(isMeaningful);
    const fallback=eligible.filter(item=>!isMeaningful(item));
    const opportunities=meaningful.concat(fallback).slice(0,opts.maxOpportunities).map(item=>createPlanningOpportunity(item,opts));
    return opportunities;
  }

  if(typeof module!=='undefined'&&module.exports){module.exports=global.HNRecommendationRanking={defaultOptions,isMeaningful,isEligible,createPlanningOpportunity,rankCandidates};}
  global.HNRecommendationRanking={defaultOptions,isMeaningful,isEligible,createPlanningOpportunity,rankCandidates};
})(typeof window!=='undefined'?window:globalThis);
