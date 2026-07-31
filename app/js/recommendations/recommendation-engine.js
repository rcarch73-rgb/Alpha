(function(global){
  'use strict';

  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const tests=global.HNRecommendationTests||{};
  const scorer=global.HNRecommendationScorer||{};
  const ranking=global.HNRecommendationRanking||{};

  function safeCalculate(plan){
    return tests.safeCalculate?tests.safeCalculate(plan):null;
  }

  function comparePlan(basePlan,baseResult,patch,label){
    return tests.comparePlan?tests.comparePlan(basePlan,baseResult,patch,label):null;
  }

  function candidate(config){
    return tests.candidate?tests.candidate(config):null;
  }

  function buildCandidates(plan,result){
    return tests.buildCandidates?tests.buildCandidates(plan,result):[];
  }

  function fallbackCandidates(plan,result){
    return tests.fallbackCandidates?tests.fallbackCandidates(plan,result):[];
  }

  function rank(plan,result,limit=3){
    const scored=scorer.scoreCandidates?scorer.scoreCandidates(buildCandidates(plan||{},result||{}),plan||{},result||{}):[];
    const fallback=scorer.scoreCandidates?scorer.scoreCandidates(fallbackCandidates(plan||{},result||{}),plan||{},result||{}):[];
    const ranked=ranking.rankCandidates?ranking.rankCandidates(scored.concat(fallback),Math.max(0,limit)):[].concat(scored,fallback).slice(0,Math.max(0,limit));
    return ranked;
  }

  global.HNRecommendationEngine={rank,buildCandidates,fallbackCandidates,safeCalculate,comparePlan};
})(typeof window!=='undefined'?window:globalThis);
