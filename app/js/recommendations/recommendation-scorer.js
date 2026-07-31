(function(global){
  'use strict';

  const num=value=>Number.isFinite(Number(value))?Number(value):0;

  function scoreCandidate(item,plan,result){
    const ratio=num(result&&result.ratio);
    const sustainable=num(result&&result.sustainable);
    const target=num(plan&&plan.spend);
    const gap=Math.max(0,target-sustainable);
    const candidateScore=num(item&&item.score);
    const contextAdjustments={
      'plan-gap': Math.max(0, Math.round((gap>0?gap/1000:0) + (ratio>0&&ratio<1?20:0))),
      'income-bridge': ratio>0&&ratio<1 ? 8 : 0,
      'rrsp-drawdown': ratio>=1 ? 6 : 0,
      'tfsa-flexibility': ratio>=1 ? 4 : 0,
      'cpp-timing': ratio>=.95 ? 3 : 0,
      'spending-flexibility': ratio>=1.15 ? 5 : 0,
      'annual-review': 0,
      'benefit-estimates': 0,
      'assumption-review': 0,
      'account-refresh': 0
    };
    return candidateScore + (contextAdjustments[item.id]||0);
  }

  function scoreCandidates(items,plan,result){
    return (Array.isArray(items)?items:[]).map(item=>({
      ...item,
      score:scoreCandidate(item,plan,result)
    }));
  }

  global.HNRecommendationScorer={scoreCandidate,scoreCandidates};
})(typeof window!=='undefined'?window:globalThis);
