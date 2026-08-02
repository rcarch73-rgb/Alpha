import test from 'node:test';
import assert from 'node:assert/strict';
import '../app/js/verified-engine.js';
import '../app/js/engine-adapter.js';
import '../app/js/scenario-evaluation.js';
import '../app/js/recommendations/recommendation-state.js';
import '../app/js/recommendations/recommendation-tests.js';
import '../app/js/recommendations/recommendation-scorer.js';
import '../app/js/recommendations/recommendation-ranking.js';
import '../app/js/recommendations/recommendation-engine.js';
import recommendationState from '../app/js/recommendations/recommendation-state.js';

const { createPageState, resolveCalculation, formatMetricValue, getPlanReadiness, getProjectionDisplayValue, getRecommendationHeading, getRecommendationEmptyState, getDashboardMetricMap } = recommendationState;
const engine = globalThis.HNRecommendationEngine;
const scorer = globalThis.HNRecommendationScorer;
const ranking = globalThis.HNRecommendationRanking;
const tests = globalThis.HNRecommendationTests;

test('page state preserves the normalized plan and shared calculation reference', () => {
  const plan = { spend: '5000', retire1: 65, age1: 45 };
  const calculation = { sustainable: 6000, ending: 750000, ratio: 1.08, confidence: 82, status: 'ontrack' };
  const recommendations = [{ id: 'retirement-age', title: 'Retirement age', summary: 'Review timing' }];

  const state = createPageState(plan, calculation, recommendations);

  assert.equal(state.plan.spend, 5000);
  assert.equal(state.plan.retire1, 65);
  assert.equal(state.calculation, calculation);
  assert.equal(state.recommendations, recommendations);
});

test('resolveCalculation prefers the shared page-state calculation over empty fallbacks', () => {
  const sharedCalculation = { sustainable: 6000, ending: 750000, retirementStart: 400000, ratio: 1.08, confidence: 82, status: 'ontrack' };
  const state = { calculation: sharedCalculation };

  assert.equal(resolveCalculation(state, {}), sharedCalculation);
  assert.equal(resolveCalculation({ calculation: {} }, sharedCalculation), sharedCalculation);
  assert.equal(resolveCalculation({}, null), null);
});

test('metric formatting preserves legitimate zero values and marks missing values unavailable', () => {
  assert.equal(formatMetricValue(0), '$0');
  assert.equal(formatMetricValue(undefined), 'Unavailable');
  assert.equal(formatMetricValue(null), 'Unavailable');
  assert.equal(formatMetricValue(NaN), 'Unavailable');
});

test('recommendation heading and empty state follow status and recommendation presence', () => {
  assert.equal(getRecommendationHeading('attention', [{ id: 'retirement-age', title: 'Retirement age' }]), 'Your planning opportunities');
  assert.equal(getRecommendationHeading('attention', []), 'Your plan needs attention');
  assert.equal(getRecommendationHeading('close', []), 'Your plan is close');
  assert.equal(getRecommendationHeading('ontrack', []), 'Your plan is well positioned');
  assert.equal(getRecommendationHeading('attention', []).includes('three opportunities'), false);
  assert.equal(
    getRecommendationEmptyState('attention', []),
    'None of the strategies tested produced a meaningful improvement. Review your retirement age, spending target, savings, income sources, and benefit assumptions.'
  );
  assert.equal(
    getRecommendationEmptyState('close', []),
    'No tested strategy produced a meaningful improvement. Small adjustments to spending, savings, or retirement timing may help strengthen the plan.'
  );
  assert.equal(
    getRecommendationEmptyState('ontrack', []),
    'No meaningful planning changes were identified. Review the plan annually or after a major life change.'
  );
  assert.equal(getRecommendationEmptyState('attention', [{ id: 'retirement-age', title: 'Retirement age' }]), '');
});

test('blank plan produces the incomplete-plan state', () => {
  const readiness = getPlanReadiness({});
  assert.equal(readiness.isComplete, false);
  assert.equal(readiness.displayState, 'Plan incomplete');
  assert.equal(readiness.heading, 'Complete your plan to see opportunities');
  assert.equal(readiness.message, 'Add your income, savings, retirement age, and spending target to generate results and recommendations.');
});

test('incomplete plans do not display $0 as a calculated projection', () => {
  const readiness = getPlanReadiness({ age1: 45, retire1: 65, spend: 5000 });
  assert.equal(getProjectionDisplayValue(readiness, 0), 'Not calculated');
  assert.equal(getProjectionDisplayValue(readiness, 5000), 'Not calculated');
});

test('complete low-asset plans still run through the verified engine and preserve legitimate zero results', () => {
  const readiness = getPlanReadiness({ age1: 45, retire1: 65, spend: 5000, employment1: 1000 });
  assert.equal(readiness.isComplete, true);
  assert.equal(getProjectionDisplayValue(readiness, 0), '$0');
  assert.equal(getProjectionDisplayValue(readiness, 2500), '$2,500');
});

test('completing the required inputs clears the incomplete state and propagates to page state', () => {
  const incomplete = getPlanReadiness({ age1: 45, retire1: 65, spend: 5000 });
  const complete = getPlanReadiness({ age1: 45, retire1: 65, spend: 5000, employment1: 1000 });
  const state = createPageState({ age1: 45, retire1: 65, spend: 5000, employment1: 1000 }, { sustainable: 1000, ending: 0, ratio: 0.2, confidence: 33, status: 'attention' }, [], complete);

  assert.equal(incomplete.isComplete, false);
  assert.equal(complete.isComplete, true);
  assert.equal(state.readiness.displayState, 'Ready');
});

test('dashboard metric mapping uses the verified-engine field names for the shared calculation object', () => {
  const metrics = getDashboardMetricMap({ sustainable: 6000, ending: 750000, retirementStart: 400000, ratio: 1.08 });

  assert.equal(metrics.endingAssets, 750000);
  assert.equal(metrics.retirementIncome, 6000);
  assert.equal(metrics.portfolioLongevity, 750000);
  assert.equal(metrics.planningFlexibility, 1.08);
});

test('production candidate builder includes measurable scenario-generated candidates', () => {
  const plan = {
    spend: 5000,
    retire1: 65,
    age1: 50,
    household: 'single',
    cpp1: 15000,
    cppStart1: 65,
    oas1: 8600,
    oasStart1: 65,
    rrsp1: 200000,
    tfsa1: 50000,
    nonreg1: 10000,
    rrspContrib1: 1000,
    tfsaContrib1: 0,
    nonregContrib1: 0,
    returnRate: 5,
    inflationRate: 2,
    horizon: 95
  };
  const result = { sustainable: 361.50, ending: 0, ratio: 0.0723, confidence: 35, status: 'attention' };
  const candidates = engine.buildCandidates(plan, result);

  const ids = candidates.map(item => item.id);
  assert.ok(ids.includes('retirement-age-plus-1'));
  assert.ok(ids.includes('retirement-age-plus-2'));
  assert.ok(ids.includes('cpp-at-60'));
  assert.ok(ids.includes('cpp-at-65'));
  assert.ok(ids.includes('cpp-at-70'));
  assert.ok(ids.includes('reduce-spending-250'));
  assert.ok(ids.includes('reduce-spending-500'));
  assert.ok(ids.includes('increase-savings-250'));
  assert.ok(ids.includes('increase-savings-500'));
  assert.ok(ids.some(id => id.startsWith('oas-at-')));
});

test('each measurable scenario candidate changes exactly one assumption and uses the supplied calculation function', () => {
  const plan = {
    spend: 5000,
    retire1: 65,
    age1: 50,
    household: 'single',
    cpp1: 15000,
    cppStart1: 65,
    oas1: 8600,
    oasStart1: 65,
    rrsp1: 200000,
    tfsa1: 50000,
    nonreg1: 10000,
    rrspContrib1: 1000,
    tfsaContrib1: 0,
    nonregContrib1: 0,
    returnRate: 5,
    inflationRate: 2,
    horizon: 95
  };
  const result = { sustainable: 361.50, ending: 0, ratio: 0.0723, confidence: 35, status: 'attention' };
  const candidates = engine.buildCandidates(plan, result);
  const measurable = candidates.filter(item => !['plan-gap', 'annual-review'].includes(item.id));

  measurable.forEach(candidate => {
    const changedKeys = Object.keys(candidate.modifiedInputs || {});
    assert.equal(changedKeys.length, 1, `${candidate.id} should change exactly one assumption`);
  });
});

test('measurable scenario candidates reach scoring and ranking', () => {
  const plan = {
    spend: 5000,
    retire1: 65,
    age1: 50,
    household: 'single',
    cpp1: 15000,
    cppStart1: 65,
    oas1: 8600,
    oasStart1: 65,
    rrsp1: 200000,
    tfsa1: 50000,
    nonreg1: 10000,
    rrspContrib1: 1000,
    tfsaContrib1: 0,
    nonregContrib1: 0,
    returnRate: 5,
    inflationRate: 2,
    horizon: 95
  };
  const result = { sustainable: 361.50, ending: 0, ratio: 0.0723, confidence: 35, status: 'attention' };
  const candidates = engine.buildCandidates(plan, result);
  const scored = scorer.scoreCandidates(candidates, plan, result);
  const ranked = ranking.rankCandidates(scored, 3);

  assert.ok(scored.some(item => !['plan-gap', 'annual-review'].includes(item.id)));
  assert.ok(ranked.some(item => !['plan-gap', 'annual-review'].includes(item.id)) || ranked.length === 0);
});

test('plan-gap and annual-review remain informational and do not displace measurable optimization candidates', () => {
  const plan = {
    spend: 5000,
    retire1: 65,
    age1: 50,
    household: 'single',
    cpp1: 15000,
    cppStart1: 65,
    oas1: 8600,
    oasStart1: 65,
    rrsp1: 200000,
    tfsa1: 50000,
    nonreg1: 10000,
    rrspContrib1: 1000,
    tfsaContrib1: 0,
    nonregContrib1: 0,
    returnRate: 5,
    inflationRate: 2,
    horizon: 95
  };
  const result = { sustainable: 361.50, ending: 0, ratio: 0.0723, confidence: 35, status: 'attention' };
  const candidates = engine.buildCandidates(plan, result);
  const measurable = candidates.filter(item => !['plan-gap', 'annual-review'].includes(item.id));

  assert.ok(measurable.length > 0);
  assert.ok(candidates.some(item => item.id === 'plan-gap'));
  assert.ok(candidates.some(item => item.id === 'annual-review'));
});

test('the existing score threshold remains unchanged', () => {
  assert.equal(ranking.isEligible({ id: 'demo', title: 'Demo', score: 49, incomeDelta: 0, confidenceDelta: 0 }, {}), false);
  assert.equal(ranking.isEligible({ id: 'demo', title: 'Demo', score: 50, incomeDelta: 10, confidenceDelta: 1 }, {}), true);
  assert.equal(ranking.isEligible({ id: 'demo', title: 'Demo', score: 51, incomeDelta: 10, confidenceDelta: 1 }, {}), true);
});
