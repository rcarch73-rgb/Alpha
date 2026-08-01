(function(global){
  'use strict';

  function cloneValue(value){
    if(Array.isArray(value))return value.map(cloneValue);
    if(value && typeof value==='object'){
      return Object.fromEntries(Object.entries(value).map(([key,nested])=>[key,cloneValue(nested)]));
    }
    return value;
  }

  function createScenarioEvaluation(basePlan, calculate, patch){
    const base=cloneValue(basePlan);
    const candidate=cloneValue(basePlan);

    Object.entries(patch||{}).forEach(([key,value])=>{
      candidate[key]=value;
    });

    const baseline=typeof calculate==='function'?calculate(base):null;
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
        sustainableDelta>=0?`+${sustainableDelta.toFixed(2)}`:sustainableDelta.toFixed(2),
        endingDelta>=0?`+${endingDelta.toFixed(2)}`:endingDelta.toFixed(2),
        ratioDelta>=0?`+${ratioDelta.toFixed(2)}`:ratioDelta.toFixed(2)
      ].join(' | ')
    };
  }

  if(typeof module!=='undefined'&&module.exports){
    module.exports={createScenarioEvaluation};
  }

  global.createScenarioEvaluation=createScenarioEvaluation;
  global.HNScenarioEvaluation={createScenarioEvaluation};
})(typeof window!=='undefined'?window:globalThis);
