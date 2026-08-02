(function(global){
  'use strict';

  const num=value=>Number.isFinite(Number(value))?Number(value):0;

  function normalizePlan(plan={}){
    const source=plan&&typeof plan==='object'?plan:{};
    return {
      ...source,
      spend:num(source.spend),
      age1:num(source.age1),
      retire1:num(source.retire1)
    };
  }

  function hasMeaningfulInputValue(value){
    if(value===null||value===undefined||value==='')return false;
    if(typeof value==='string'){
      const trimmed=value.trim();
      if(!trimmed)return false;
      const numeric=Number(trimmed);
      if(Number.isFinite(numeric))return numeric>0;
      return true;
    }
    if(typeof value==='number')return Number.isFinite(value)&&value>0;
    if(Array.isArray(value))return value.some(hasMeaningfulInputValue);
    if(typeof value==='object')return Object.values(value).some(hasMeaningfulInputValue);
    return false;
  }

  function getPlanReadiness(plan, calculation){
    const source=plan&&typeof plan==='object'?plan:{};
    const normalized=normalizePlan(source);
    const hasValidCurrentAge=normalized.age1>=18&&normalized.age1<=120;
    const hasValidRetirementAge=normalized.retire1>=45&&normalized.retire1<=100;
    const hasPositiveSpend=num(normalized.spend)>0;
    const meaningfulInputs=[
      normalized.employment1,
      normalized.pension1,
      normalized.cpp1,
      normalized.oas1,
      normalized.employment2,
      normalized.pension2,
      normalized.cpp2,
      normalized.oas2,
      normalized.rrsp1,
      normalized.tfsa1,
      normalized.nonreg1,
      normalized.rrsp2,
      normalized.tfsa2,
      normalized.nonreg2,
      normalized.currentIncome,
      normalized.pension,
      normalized.benefits,
      normalized.rrsp,
      normalized.tfsa,
      normalized.nonreg,
      normalized.otherIncome1,
      normalized.otherIncome2
    ];
    const hasMeaningfulIncomeOrSavings=meaningfulInputs.some(hasMeaningfulInputValue);
    const isComplete=hasValidCurrentAge&&hasValidRetirementAge&&hasPositiveSpend&&hasMeaningfulIncomeOrSavings;
    return {
      isComplete,
      displayState:isComplete?'Ready':'Plan incomplete',
      heading:isComplete?'Your planning opportunities':'Complete your plan to see opportunities',
      message:isComplete?'':'Add your income, savings, retirement age, and spending target to generate results and recommendations.',
      actionLabel:isComplete?'Review my plan':'Complete your plan',
      actionTarget:'picture',
      planReadiness:isComplete?'ready':'incomplete',
      calculation
    };
  }

  function createPageState(plan, calculation, recommendations, readiness){
    const normalizedPlan=normalizePlan(plan || {});
    const derivedReadiness=readiness||getPlanReadiness(normalizedPlan, calculation);
    return {
      plan: normalizedPlan,
      calculation: calculation || null,
      recommendations: Array.isArray(recommendations)?recommendations:[],
      readiness: derivedReadiness
    };
  }

  function resolveCalculation(state, fallbackResult){
    const explicitStateCalculation=state && typeof state==='object' ? state.calculation : null;
    if(explicitStateCalculation && typeof explicitStateCalculation==='object' && (
      Object.prototype.hasOwnProperty.call(explicitStateCalculation,'sustainable') ||
      Object.prototype.hasOwnProperty.call(explicitStateCalculation,'ending') ||
      Object.prototype.hasOwnProperty.call(explicitStateCalculation,'retirementStart') ||
      Object.prototype.hasOwnProperty.call(explicitStateCalculation,'ratio') ||
      Object.prototype.hasOwnProperty.call(explicitStateCalculation,'status') ||
      Object.prototype.hasOwnProperty.call(explicitStateCalculation,'confidence') ||
      Object.prototype.hasOwnProperty.call(explicitStateCalculation,'series') ||
      Object.prototype.hasOwnProperty.call(explicitStateCalculation,'engine')
    )){
      return explicitStateCalculation;
    }

    const candidates=[
      fallbackResult && typeof fallbackResult==='object' && Object.keys(fallbackResult).length ? fallbackResult : null,
      globalThis?.pageState && typeof globalThis.pageState==='object' ? globalThis.pageState.calculation : null,
      globalThis?.result && typeof globalThis.result==='object' && Object.keys(globalThis.result).length ? globalThis.result : null
    ];
    for(const candidate of candidates){
      if(candidate && typeof candidate==='object' && (
        Object.prototype.hasOwnProperty.call(candidate,'sustainable') ||
        Object.prototype.hasOwnProperty.call(candidate,'ending') ||
        Object.prototype.hasOwnProperty.call(candidate,'retirementStart') ||
        Object.prototype.hasOwnProperty.call(candidate,'ratio') ||
        Object.prototype.hasOwnProperty.call(candidate,'status') ||
        Object.prototype.hasOwnProperty.call(candidate,'confidence') ||
        Object.prototype.hasOwnProperty.call(candidate,'series') ||
        Object.prototype.hasOwnProperty.call(candidate,'engine')
      )){
        if(candidate !== null && candidate !== undefined && !Object.prototype.hasOwnProperty.call(candidate,'__resolveCalculationFallback')){
          return candidate;
        }
      }
    }
    const plan=globalThis?.plan && typeof globalThis.plan==='object'?globalThis.plan:null;
    const hasExplicitState=Boolean(state && typeof state==='object' && Object.keys(state).length);
    if(!hasExplicitState && !fallbackResult && !globalThis?.pageState && !globalThis?.result){
      return null;
    }
    try{
      const engineResult=globalThis?.HNVerifiedEngine?.calculate?.(plan||{});
      if(engineResult && typeof engineResult==='object' && (
        Object.prototype.hasOwnProperty.call(engineResult,'sustainable') ||
        Object.prototype.hasOwnProperty.call(engineResult,'ending') ||
        Object.prototype.hasOwnProperty.call(engineResult,'retirementStart') ||
        Object.prototype.hasOwnProperty.call(engineResult,'ratio') ||
        Object.prototype.hasOwnProperty.call(engineResult,'status') ||
        Object.prototype.hasOwnProperty.call(engineResult,'confidence') ||
        Object.prototype.hasOwnProperty.call(engineResult,'series') ||
        Object.prototype.hasOwnProperty.call(engineResult,'engine')
      )){
        return engineResult;
      }
    }catch(_){ }
    return null;
  }

  function formatMetricValue(value){
    if(value===0 || value==='0')return '$0';
    if(value===undefined || value===null || Number.isNaN(value))return 'Unavailable';
    const numeric=num(value);
    if(!Number.isFinite(numeric) || Number.isNaN(Number(value)))return 'Unavailable';
    return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(numeric);
  }

  function getProjectionDisplayValue(readiness, value){
    if(!readiness || !readiness.isComplete)return 'Not calculated';
    return formatMetricValue(value);
  }

  function getDashboardMetricMap(calculation){
    return {
      endingAssets: calculation?.ending,
      retirementIncome: calculation?.sustainable,
      portfolioLongevity: calculation?.ending,
      planningFlexibility: calculation?.ratio
    };
  }

  function getRecommendationHeading(statusOrItems, items){
    const hasItems=Array.isArray(statusOrItems)?statusOrItems.length>0:Array.isArray(items)&&items.length>0;
    if(hasItems)return 'Your planning opportunities';
    return 'No significant planning opportunities were identified';
  }

  function getRecommendationEmptyState(statusOrItems, items){
    const hasItems=Array.isArray(statusOrItems)?statusOrItems.length>0:Array.isArray(items)&&items.length>0;
    if(hasItems)return '';
    return 'No significant planning opportunities were identified.';
  }

  const api={
    normalizePlan,
    createPageState,
    resolveCalculation,
    formatMetricValue,
    getProjectionDisplayValue,
    getDashboardMetricMap,
    getPlanReadiness,
    getRecommendationHeading,
    getRecommendationEmptyState
  };

  global.HNRecommendationState=api;
  if(typeof module!=='undefined'&&module.exports){module.exports=api;}
})(typeof window!=='undefined'?window:globalThis);
