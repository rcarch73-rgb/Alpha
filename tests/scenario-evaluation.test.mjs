import test from 'node:test';
import assert from 'node:assert/strict';
import scenarioEvaluation from '../app/js/scenario-evaluation.js';

const { createScenarioEvaluation } = scenarioEvaluation;

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
