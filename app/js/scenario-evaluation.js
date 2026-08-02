(function(global){
  'use strict';

  function cloneValue(value){
    if(Array.isArray(value))return value.map(cloneValue);
    if(value && typeof value==='object'){
      return Object.fromEntries(Object.entries(value).map(([key,nested])=>[key,cloneValue(nested)]));
    }
    return value;
  }

  function createScenarioEvaluation(basePlan, calculate, patch, baselineResult=null){
    const base=cloneValue(basePlan);
    const candidate=cloneValue(basePlan);

    Object.entries(patch||{}).forEach(([key,value])=>{
      candidate[key]=value;
    });

    const baseline=baselineResult || (typeof calculate==='function'?calculate(base):null);
    const scenario=typeof calculate==='function'?calculate(candidate):null;

    if(!baseline||!scenario)return null;

    const safeNumber=value=>Number.isFinite(Number(value))?Number(value):0;
    const sustainableDelta=safeNumber(scenario.sustainable)-safeNumber(baseline.sustainable);
    const endingDelta=safeNumber(scenario.ending)-safeNumber(baseline.ending);
    const ratioDelta=safeNumber(scenario.ratio)-safeNumber(baseline.ratio);

    return {
      planBefore: base,
      planAfter: candidate,
      baseline,
      scenario,
      deltas:{sustainable:sustainableDelta,ending:endingDelta,ratio:ratioDelta},
      summary:[
        sustainableDelta.toFixed(2),
        endingDelta.toFixed(2),
        ratioDelta.toFixed(2)
      ].join(' | ')
    };
  }

  function createRetirementAgeSweep(basePlan, calculate, options={}){
    const base=cloneValue(basePlan||{});
    const calculateEngine=typeof calculate==='function'?calculate:global.HNVerifiedEngine?.calculate;
    if(typeof calculateEngine!=='function')return [];

    const currentAge=Number(base.age1);
    const horizon=Number(base.horizon||95);
    const currentRetireAge=Number(base.retire1||65);
    const baseResult=calculateEngine(base);
    if(!baseResult||!Number.isFinite(Number(baseResult.sustainable))||!Number.isFinite(Number(baseResult.ending)))return [];

    const candidateAges=[currentRetireAge-2,currentRetireAge-1,currentRetireAge,currentRetireAge+1,currentRetireAge+2];
    return candidateAges.reduce((items,age)=>{
      const ageValue=Number(age);
      const isValid=Number.isFinite(ageValue)&&ageValue>=currentAge&&ageValue<=horizon&&ageValue>0;
      if(!isValid)return items;

      const patch={retire1:ageValue};
      const evaluation=createScenarioEvaluation(base, calculateEngine, patch, baseResult);
      if(!evaluation||!evaluation.scenario||!Number.isFinite(Number(evaluation.scenario.sustainable))||!Number.isFinite(Number(evaluation.scenario.ending)))return items;

      const scenario=evaluation.scenario;
      const taxes=Array.isArray(scenario.rows)&&scenario.rows.length?Number(scenario.rows[scenario.rows.length-1]?.projection?.tax||0):
        (Array.isArray(scenario.series)&&scenario.series.length?Number(scenario.series[scenario.series.length-1]?.tax||0):0);
      const label=ageValue<currentRetireAge?`Retirement age ${ageValue}`:ageValue>currentRetireAge?`Retirement age ${ageValue}`:`Current retirement age`;
      const id=ageValue<currentRetireAge?`retirement-age-minus-${currentRetireAge-ageValue}`:ageValue>currentRetireAge?`retirement-age-plus-${ageValue-currentRetireAge}`:'retirement-age-current';
      items.push({
        id,
        title:label,
        description:`Test the effect of changing retirement age to ${ageValue}.`,
        modifiedInputs:patch,
        monthlyIncome:Number(scenario.sustainable),
        endingAssets:Number(scenario.ending),
        confidence:Number(scenario.confidence),
        taxes,
        success:Boolean(Number.isFinite(Number(scenario.sustainable))&&Number.isFinite(Number(scenario.ending))),
        planBefore:evaluation.planBefore,
        planAfter:evaluation.planAfter,
        baseline:evaluation.baseline,
        scenario,
        deltas:evaluation.deltas,
        summary:evaluation.summary
      });
      return items;
    },[]);
  }

  if(typeof module!=='undefined'&&module.exports){
    module.exports={createScenarioEvaluation,createRetirementAgeSweep};
  }

  global.createScenarioEvaluation=createScenarioEvaluation;
  global.HNScenarioEvaluation={createScenarioEvaluation,createRetirementAgeSweep};
})(typeof window!=='undefined'?window:globalThis);
