(function(global){
  'use strict';

  function clonePlan(plan){
    if(!plan||typeof plan!=='object')return null;
    try{return JSON.parse(JSON.stringify(plan));}catch(_){return {...plan};}
  }

  function num(value){
    return Number.isFinite(Number(value))?Number(value):0;
  }

  function hasMeaningfulPlanValue(value){
    if(value===null||value===undefined||value==='')return false;
    if(typeof value==='string'){
      const trimmed=value.trim();
      if(!trimmed)return false;
      const numeric=Number(trimmed);
      if(Number.isFinite(numeric))return numeric>0;
      return true;
    }
    if(typeof value==='number')return Number.isFinite(value)&&value>0;
    if(Array.isArray(value))return value.some(hasMeaningfulPlanValue);
    if(typeof value==='object')return Object.values(value).some(hasMeaningfulPlanValue);
    return false;
  }

  function isMeaningfulPlan(plan){
    if(!plan||typeof plan!=='object')return false;
    const source=plan;
    const hasNonDefaultRetirementShape =
      num(source.age1)!==50 ||
      num(source.age2)!==50 ||
      num(source.retire1)!==65 ||
      num(source.retire2)!==65 ||
      num(source.spend)!==5000 ||
      num(source.rrsp1)+num(source.rrsp2)+num(source.tfsa1)+num(source.tfsa2)+num(source.nonreg1)+num(source.nonreg2) > 0 ||
      num(source.employment1)+num(source.employment2)+num(source.pension1)+num(source.pension2)+num(source.cpp1)+num(source.cpp2)+num(source.oas1)+num(source.oas2) > 0 ||
      (Array.isArray(source.otherIncome1)&&source.otherIncome1.some(item=>hasMeaningfulPlanValue(item?.amount))) ||
      (Array.isArray(source.otherIncome2)&&source.otherIncome2.some(item=>hasMeaningfulPlanValue(item?.amount)));
    return hasNonDefaultRetirementShape;
  }

  function normalizePlan(plan, fallbackPlan){
    const source=plan&&typeof plan==='object'?plan:(fallbackPlan&&typeof fallbackPlan==='object'?fallbackPlan:{});
    if(!source||typeof source!=='object')return clonePlan(fallbackPlan)||{};
    return {...clonePlan(source)};
  }

  function getPlanStamp(plan){
    const source=plan&&typeof plan==='object'?plan:{};
    const updatedAt=source.updatedAt||source.updated_at||source.updatedAtUtc||'';
    const parsed=updatedAt?Date.parse(updatedAt):NaN;
    return Number.isFinite(parsed)?parsed:0;
  }

  function getSourcePriority(source){
    switch(source){
      case 'active-cloud-id':return 5;
      case 'selected-saved-plan':return 4;
      case 'most-recent-saved-plan':return 3;
      case 'working-plan':return 2;
      default:return 0;
    }
  }

  function resolveActivePlan(options={}){
    const {
      activePlanId,
      cloudPlan,
      selectedPlan,
      mostRecentSavedPlan,
      workingPlan,
      fallbackPlan
    }=options||{};
    const normalizedFallback=normalizePlan(fallbackPlan||{});

    if(typeof activePlanId==='string'&&activePlanId.trim()&&isMeaningfulPlan(cloudPlan)){
      return {plan:normalizePlan(cloudPlan,normalizedFallback),source:'active-cloud-id',isComplete:true};
    }

    if(isMeaningfulPlan(selectedPlan)){
      return {plan:normalizePlan(selectedPlan,normalizedFallback),source:'selected-saved-plan',isComplete:true};
    }

    if(isMeaningfulPlan(mostRecentSavedPlan)){
      return {plan:normalizePlan(mostRecentSavedPlan,normalizedFallback),source:'most-recent-saved-plan',isComplete:true};
    }

    if(isMeaningfulPlan(workingPlan)){
      return {plan:normalizePlan(workingPlan,normalizedFallback),source:'working-plan',isComplete:true};
    }

    return {plan:normalizePlan(normalizedFallback,normalizedFallback),source:'incomplete',isComplete:false};
  }

  function materializeActivePlan(options={}){
    const resolved=resolveActivePlan(options);
    const plan=normalizePlan(resolved.plan, options.fallbackPlan||{});
    let calculation=null;
    if(resolved.source!=='incomplete'&&typeof options.calculatePlan==='function'){
      calculation=options.calculatePlan(plan);
    }
    if(typeof options.render==='function'){
      options.render({plan,calculation,source:resolved.source});
    }
    return {plan,calculation,source:resolved.source,isComplete:resolved.isComplete};
  }

  function createStartupCoordinator(options={}){
    const state={generation:0,currentSelection:null};

    function shouldReplace(currentSelection,nextSelection){
      if(!currentSelection){return true;}
      if(!nextSelection){return false;}
      const currentPriority=getSourcePriority(currentSelection.source);
      const nextPriority=getSourcePriority(nextSelection.source);
      if(nextPriority>currentPriority)return true;
      if(nextPriority<currentPriority)return false;
      return (nextSelection.stamp||0)>(currentSelection.stamp||0)+1000;
    }

    function apply(candidate={}){
      const fallbackPlan=normalizePlan(candidate.fallbackPlan||options.fallbackPlan||{});
      const resolved=resolveActivePlan({
        activePlanId:candidate.activePlanId ?? options.activePlanId,
        cloudPlan:candidate.cloudPlan ?? options.cloudPlan,
        selectedPlan:candidate.selectedPlan ?? options.selectedPlan,
        mostRecentSavedPlan:candidate.mostRecentSavedPlan ?? options.mostRecentSavedPlan,
        workingPlan:candidate.workingPlan ?? options.workingPlan,
        fallbackPlan
      });
      const nextSelection={
        plan:normalizePlan(resolved.plan,fallbackPlan),
        source:resolved.source,
        isComplete:resolved.isComplete,
        stamp:getPlanStamp(resolved.plan),
        generation:state.generation+1
      };
      if(!shouldReplace(state.currentSelection,nextSelection)){
        return {applied:false, selection:state.currentSelection};
      }
      state.generation+=1;
      nextSelection.generation=state.generation;
      state.currentSelection=nextSelection;
      let calculation=null;
      if(nextSelection.isComplete&&typeof options.calculatePlan==='function'){
        calculation=options.calculatePlan(nextSelection.plan);
      }
      const result={plan:nextSelection.plan,calculation,source:nextSelection.source,isComplete:nextSelection.isComplete,generation:nextSelection.generation};
      if(typeof options.render==='function'){
        options.render(result);
      }
      return {applied:true, selection:nextSelection, result};
    }

    return {apply,getState:()=>state.currentSelection};
  }

  const api={
    clonePlan,
    normalizePlan,
    isMeaningfulPlan,
    resolveActivePlan,
    materializeActivePlan,
    createStartupCoordinator,
    getPlanStamp,
    getSourcePriority
  };

  global.HNActivePlan=api;
  if(typeof module!=='undefined'&&module.exports){module.exports=api;}
})(typeof window!=='undefined'?window:globalThis);
