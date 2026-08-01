(function(global){
  'use strict';

  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const fmtCurrency=value=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(num(value));
  const RecommendationWeights={
    monthlyIncome:0.40,
    endingAssets:0.20,
    confidence:0.20,
    taxEfficiency:0.10,
    flexibility:0.10
  };

  function normalizeWeights(weights={}){
    const defaults=RecommendationWeights;
    const merged={...defaults,...weights};
    const total=Object.values(merged).reduce((sum,value)=>sum+Math.max(0,num(value)),0);
    if(total<=0)return defaults;
    return Object.fromEntries(Object.entries(merged).map(([key,value])=>[key,Math.max(0,num(value))/total]));
  }

  function isCandidateResult(item){
    return !!item&&typeof item==='object'&&(Object.prototype.hasOwnProperty.call(item,'monthlyIncome')||Object.prototype.hasOwnProperty.call(item,'endingAssets')||Object.prototype.hasOwnProperty.call(item,'confidence')||Object.prototype.hasOwnProperty.call(item,'taxes'));
  }

  function getBaselineMetrics(plan,result){
    const baselineResult=result||global.window?.result||{};
    const baselineIncome=num(baselineResult.sustainable);
    const baselineEnding=num(baselineResult.ending);
    const baselineConfidence=num(baselineResult.confidence);
    const baselineTax=num(baselineResult.taxes || (Array.isArray(baselineResult.rows)&&baselineResult.rows.length?baselineResult.rows[baselineResult.rows.length-1]?.projection?.tax:0));
    return {baselineIncome,baselineEnding,baselineConfidence,baselineTax};
  }

  function scoreValue(delta,baseline){
    if(baseline<=0)return delta>0?100:0;
    return Math.max(0,Math.min(100,delta/baseline*100));
  }

  function flexibilityValue(item){
    const inputs=item&&item.modifiedInputs&&typeof item.modifiedInputs==='object'?item.modifiedInputs:{};
    const count=Object.keys(inputs).filter(key=>inputs[key]!==undefined&&inputs[key]!==null).length;
    return Math.max(0,Math.min(100,100-Math.max(0,count-1)*20));
  }

  function buildReasons({incomeScore,endingScore,confidenceScore,taxScore,flexibilityScore,incomeDelta,endingAssetsDelta,confidenceDelta,taxDelta}){
    const improvements=[];
    const disadvantages=[];
    if(incomeScore>0)improvements.push(`Monthly sustainable income improved by ${fmtCurrency(incomeDelta)}.`);
    else if(incomeDelta<0)disadvantages.push(`Monthly sustainable income declined by ${fmtCurrency(Math.abs(incomeDelta))}.`);
    if(endingScore>0)improvements.push(`Ending assets increased by ${fmtCurrency(endingAssetsDelta)}.`);
    else if(endingAssetsDelta<0)disadvantages.push(`Ending assets declined by ${fmtCurrency(Math.abs(endingAssetsDelta))}.`);
    if(confidenceScore>0)improvements.push(`Confidence improved by ${Math.round(confidenceDelta)} points.`);
    else if(confidenceDelta<0)disadvantages.push(`Confidence declined by ${Math.round(Math.abs(confidenceDelta))} points.`);
    if(taxScore>0)improvements.push(`Estimated taxes decreased by ${fmtCurrency(taxDelta)}.`);
    else if(taxDelta<0)disadvantages.push(`Estimated taxes increased by ${fmtCurrency(Math.abs(taxDelta))}.`);
    if(flexibilityScore>0)improvements.push('The scenario changed a single assumption and kept the adjustment simple.');
    const reasons=[...improvements,...disadvantages];
    if(!reasons.length)reasons.push('No measurable improvement was detected against the current plan.');
    return {improvements,disadvantages,reasons};
  }

  function evaluateCandidateResult(item,plan,result,options={}){
    const weights=normalizeWeights(options.weights);
    const baseline=getBaselineMetrics(plan,result);
    const monthlyIncome=num(item&&item.monthlyIncome);
    const endingAssets=num(item&&item.endingAssets);
    const confidence=num(item&&item.confidence);
    const taxes=num(item&&item.taxes);

    const incomeDelta=monthlyIncome-baseline.baselineIncome;
    const endingAssetsDelta=endingAssets-baseline.baselineEnding;
    const confidenceDelta=confidence-baseline.baselineConfidence;
    const taxDelta=baseline.baselineTax>0?baseline.baselineTax-taxes:0;
    const flexibilityDelta=flexibilityValue(item);

    const incomeScore=scoreValue(incomeDelta,baseline.baselineIncome);
    const endingScore=scoreValue(endingAssetsDelta,baseline.baselineEnding);
    const confidenceScore=Math.max(0,Math.min(100,confidenceDelta));
    const taxScore=scoreValue(taxDelta,baseline.baselineTax);
    const flexibilityScore=Math.max(0,Math.min(100,flexibilityDelta));

    const score=Math.round((incomeScore*weights.monthlyIncome + endingScore*weights.endingAssets + confidenceScore*weights.confidence + taxScore*weights.taxEfficiency + flexibilityScore*weights.flexibility)*100)/100;
    const explanations=buildReasons({incomeScore,endingScore,confidenceScore,taxScore,flexibilityScore,incomeDelta,endingAssetsDelta,confidenceDelta,taxDelta});

    return {
      score,
      incomeDelta,
      endingAssetsDelta,
      confidenceDelta,
      taxDelta,
      reasons:explanations.reasons,
      improvements:explanations.improvements,
      disadvantages:explanations.disadvantages
    };
  }

  function scoreCandidate(item,plan,result,options={}){
    if(isCandidateResult(item))return evaluateCandidateResult(item,plan,result,options).score;
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

  function scoreCandidates(items,plan,result,options={}){
    return (Array.isArray(items)?items:[]).map(item=>{
      if(isCandidateResult(item)){
        const scored=evaluateCandidateResult(item,plan,result,options);
        return {...item,...scored};
      }
      return {...item,score:scoreCandidate(item,plan,result,options),reasons:[]};
    });
  }

  if(typeof module!=='undefined'&&module.exports){module.exports=global.HNRecommendationScorer={normalizeWeights,scoreCandidate,scoreCandidates,evaluateCandidateResult};}
  global.HNRecommendationScorer={normalizeWeights,scoreCandidate,scoreCandidates,evaluateCandidateResult};
})(typeof window!=='undefined'?window:globalThis);
