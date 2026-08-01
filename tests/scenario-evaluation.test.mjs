import test from 'node:test';
import assert from 'node:assert/strict';
import scenarioEvaluation from '../app/js/scenario-evaluation.js';
import { scoreCandidates } from '../app/js/recommendations/recommendation-scorer.js';
import { rankCandidates } from '../app/js/recommendations/recommendation-ranking.js';

const { createScenarioEvaluation, createRetirementAgeSweep } = scenarioEvaluation;

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
