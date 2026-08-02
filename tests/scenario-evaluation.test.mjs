import test from 'node:test';
import assert from 'node:assert/strict';
import '../app/js/verified-engine.js';
import '../app/js/engine-adapter.js';
import scenarioEvaluation from '../app/js/scenario-evaluation.js';
import recommendationTests from '../app/js/recommendations/recommendation-tests.js';
import recommendationScorer from '../app/js/recommendations/recommendation-scorer.js';
import recommendationRanking from '../app/js/recommendations/recommendation-ranking.js';

const { createScenarioEvaluation, createRetirementAgeSweep } = scenarioEvaluation;
const { evaluateCandidateResult, scoreCandidates } = recommendationScorer;
const { rankCandidates } = recommendationRanking;

test('createScenarioEvaluation clones and compares a single change', () => {
  const basePlan = {
    spend: 5000,
    retire1: 65,
    rrsp1: 300000,
    tfsa1: 80000,
    household: 'single',
    age1: 45,
    name1: 'Ari'
  };

  const engine = plan => ({
    sustainable: plan.spend * 0.8,
    ending: plan.rrsp1 + plan.tfsa1,
    ratio: plan.spend > 0 ? (plan.spend * 0.8) / plan.spend : 0
  });

  const result = createScenarioEvaluation(basePlan, engine, { retire1: 67 });

  assert.ok(result);
  assert.equal(result.planBefore.retire1, 65);
  assert.equal(result.planAfter.retire1, 67);
  assert.equal(result.baseline.sustainable, 4000);
  assert.equal(result.scenario.sustainable, 4000);
  assert.equal(result.deltas.sustainable, 0);
  assert.equal(result.deltas.ending, 0);
  assert.equal(result.deltas.ratio, 0);
  assert.equal(result.summary, '0.00 | 0.00 | 0.00');
});

test('retirement-age sweep creates valid candidates and preserves the base plan', () => {
  const basePlan = {
    spend: 4000,
    retire1: 65,
    age1: 55,
    rrsp1: 100000,
    tfsa1: 20000,
    nonreg1: 5000,
    household: 'single',
    returnRate: 5,
    inflationRate: 2,
    horizon: 95
  };

  let calls = 0;
  const engine = plan => {
    calls += 1;
    return {
      sustainable: Number(plan.spend) + Number(plan.retire1) * 10,
      ending: Number(plan.rrsp1) + Number(plan.tfsa1) + Number(plan.nonreg1),
      ratio: 1.05,
      confidence: 78,
      rows: [{ projection: { tax: 1000 } }]
    };
  };

  const sweep = createRetirementAgeSweep(basePlan, engine);

  assert.equal(sweep.length, 5);
  assert.equal(basePlan.retire1, 65);
  assert.ok(sweep.every(item => item.planBefore.retire1 === 65));
  assert.ok(sweep.every(item => Object.keys(item.modifiedInputs).length === 1));
  assert.ok(sweep.every(item => Object.prototype.hasOwnProperty.call(item.modifiedInputs, 'retire1')));
  assert.equal(calls, 6);
});

test('cpp optimization sweep creates scoped candidates and preserves the base plan', () => {
  const basePlan = {
    spend: 4000,
    retire1: 65,
    age1: 55,
    rrsp1: 100000,
    tfsa1: 20000,
    nonreg1: 5000,
    household: 'single',
    cpp1: 15000,
    cppStart1: 65,
    returnRate: 5,
    inflationRate: 2,
    horizon: 95
  };

  const engine = plan => ({
    sustainable: Number(plan.spend) + Number(plan.cppStart1) * 10,
    ending: Number(plan.rrsp1) + Number(plan.tfsa1) + Number(plan.nonreg1),
    ratio: 1.05,
    confidence: 80,
    rows: [{ projection: { tax: 1100 } }]
  });

  const sweep = recommendationTests.buildCppOptimizationSweep(basePlan, engine);
  assert.equal(sweep.length, 3);
  assert.equal(basePlan.cppStart1, 65);
  assert.ok(sweep.every(item => item.planBefore.cppStart1 === 65));
  assert.ok(sweep.every(item => Object.keys(item.modifiedInputs).every(key => key === 'cppStart1')));
});

test('oas optimization sweep generates ages 65 through 70 for valid plans and preserves the base plan', () => {
  const basePlan = {
    spend: 4000,
    retire1: 65,
    age1: 55,
    rrsp1: 100000,
    tfsa1: 20000,
    nonreg1: 5000,
    household: 'single',
    oas1: 8500,
    oasStart1: 64,
    returnRate: 5,
    inflationRate: 2,
    horizon: 95
  };

  let calls = 0;
  const engine = plan => {
    calls += 1;
    return {
      sustainable: Number(plan.spend) + Number(plan.oasStart1) * 10,
      ending: Number(plan.rrsp1) + Number(plan.tfsa1) + Number(plan.nonreg1),
      ratio: 1.05,
      confidence: 80,
      rows: [{ projection: { tax: 1100 } }]
    };
  };

  const sweep = recommendationTests.buildOasOptimizationSweep(basePlan, engine);
  assert.equal(sweep.length, 6);
  assert.equal(basePlan.oasStart1, 64);
  assert.ok(sweep.every(item => item.planBefore.oasStart1 === 64));
  assert.ok(sweep.every(item => Object.keys(item.modifiedInputs).every(key => key === 'oasStart1')));
  assert.equal(calls, 7);
});

test('oas optimization skips plans without OAS benefit information and handles couples correctly', () => {
  const singlePlan = { spend: 4000, retire1: 65, age1: 55, rrsp1: 100000, tfsa1: 20000, nonreg1: 5000, household: 'single', oasStart1: 65, returnRate: 5, inflationRate: 2, horizon: 95 };
  const couplePlan = { spend: 4000, retire1: 65, age1: 55, rrsp1: 100000, tfsa1: 20000, nonreg1: 5000, household: 'couple', oas1: 8500, oasStart1: 65, oas2: 9000, oasStart2: 65, returnRate: 5, inflationRate: 2, horizon: 95 };

  assert.equal(recommendationTests.buildOasOptimizationSweep(singlePlan, () => ({ sustainable: 5000, ending: 500000, ratio: 1.0, confidence: 80, rows: [{ projection: { tax: 1100 } }] })).length, 0);
  assert.equal(recommendationTests.buildOasOptimizationSweep(couplePlan, () => ({ sustainable: 5000, ending: 500000, ratio: 1.0, confidence: 80, rows: [{ projection: { tax: 1100 } }] })).length, 6);
});

test('scorer output includes delta and explanation fields for OAS candidates', () => {
  const baseline = { sustainable: 5000, ending: 500000, ratio: 1.0, confidence: 78, rows: [{ projection: { tax: 1100 } }] };
  const item = {
    id: 'oas-at-66',
    title: 'OAS starts at age 66',
    description: 'Test',
    modifiedInputs: { oasStart1: 66 },
    monthlyIncome: 5100,
    endingAssets: 505000,
    confidence: 80,
    taxes: 1000,
    success: true,
    guaranteedIncomeTimingDelta: -1,
    availableMetrics: { income: true, ending: true, confidence: true, taxes: true, guaranteedIncomeTiming: true },
    planBefore: { oasStart1: 65, oas1: 8500 },
    planAfter: { oasStart1: 66, oas1: 8500 }
  };

  const result = evaluateCandidateResult(item, { spend: 4000, oasStart1: 65, oas1: 8500 }, baseline);
  assert.equal(result.guaranteedIncomeTimingDelta, 1);
  assert.ok(Array.isArray(result.improvements));
  assert.ok(Array.isArray(result.disadvantages));
  assert.ok(Array.isArray(result.unavailableMetrics));
  assert.ok(result.reasons.some(reason => reason.includes('Guaranteed income')) || result.unavailableMetrics.length > 0);
});

test('ranking excludes neutral and harmful OAS candidates while preserving the public API', () => {
  const good = {
    id: 'oas-at-66',
    title: 'OAS starts at age 66',
    description: 'Test',
    modifiedInputs: { oasStart1: 66 },
    monthlyIncome: 5100,
    endingAssets: 505000,
    confidence: 80,
    taxes: 1000,
    success: true,
    score: 64,
    guaranteedIncomeTimingDelta: -1,
    availableMetrics: { income: true, ending: true, confidence: true, taxes: true, guaranteedIncomeTiming: true },
    incomeDelta: 100,
    endingAssetsDelta: 5000,
    confidenceDelta: 2,
    taxDelta: 100,
    reasons: ['Improved income'],
    improvements: ['Improved income'],
    disadvantages: [],
    unavailableMetrics: []
  };
  const bad = {
    id: 'oas-at-67',
    title: 'OAS starts at age 67',
    description: 'Test',
    modifiedInputs: { oasStart1: 67 },
    monthlyIncome: 4800,
    endingAssets: 490000,
    confidence: 72,
    taxes: 1200,
    success: true,
    score: 40,
    guaranteedIncomeTimingDelta: -2,
    availableMetrics: { income: true, ending: true, confidence: true, taxes: true, guaranteedIncomeTiming: true },
    incomeDelta: -200,
    endingAssetsDelta: -10000,
    confidenceDelta: -6,
    taxDelta: -100,
    reasons: ['Worse income'],
    improvements: [],
    disadvantages: ['Worse income'],
    unavailableMetrics: []
  };

  const ranked = rankCandidates([good, bad], 3, {});
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, 'oas-at-66');
  assert.equal(typeof recommendationTests.buildCandidates, 'function');
  assert.equal(typeof recommendationTests.buildOasOptimizationSweep, 'function');
});

test('invalid retirement ages are excluded and sweep results remain scorer/ranking compatible', () => {
  const invalidPlan = {
    spend: 4000,
    retire1: 65,
    age1: 70,
    rrsp1: 100000,
    tfsa1: 20000,
    nonreg1: 5000,
    household: 'single',
    returnRate: 5,
    inflationRate: 2,
    horizon: 70
  };

  const engine = plan => ({
    sustainable: Number(plan.spend) + Number(plan.retire1) * 10,
    ending: 500000,
    ratio: 1.1,
    confidence: 82,
    rows: [{ projection: { tax: 1200 } }]
  });

  const sweep = createRetirementAgeSweep(invalidPlan, engine);
  assert.equal(sweep.length, 0);

  const scored = scoreCandidates([{
    id: 'retirement-age-plus-1',
    title: 'Retirement age +1 year',
    description: 'Test',
    modifiedInputs: { retire1: 66 },
    monthlyIncome: 6000,
    endingAssets: 600000,
    confidence: 82,
    taxes: 1200,
    success: true
  }], { spend: 4000, retire1: 65 }, { sustainable: 5000, ending: 500000, ratio: 1.1, confidence: 78, taxes: 1000 });
  assert.equal(typeof scored[0].score, 'number');
  assert.ok(rankCandidates(scored, 3, {}).length >= 0);
});
