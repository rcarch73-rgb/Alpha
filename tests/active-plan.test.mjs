import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveActivePlan, materializeActivePlan, normalizePlan } = require('../app/js/active-plan.js');

const samplePlan = {
  schemaVersion: 'foundation-0.4.4',
  planName: 'My retirement plan',
  name1: 'Ada',
  age1: 48,
  name2: 'Grace',
  age2: 46,
  spend: 7000,
  retire1: 60,
  retire2: 62,
  horizon: 95,
  rrsp1: 250000,
  tfsa1: 60000,
  nonreg1: 50000,
  employment1: 90000,
  cpp1: 14000,
  oas1: 9000,
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const fallbackPlan = {
  schemaVersion: 'foundation-0.4.4',
  accountFirstName: '',
  accountLastName: '',
  accountEmail: '',
  household: 'couple',
  name1: '',
  age1: 50,
  name2: '',
  age2: 50,
  spend: 5000,
  retire1: 65,
  retire2: 65,
  horizon: 95,
  rrsp1: 0,
  tfsa1: 0,
  nonreg1: 0,
  rrspContrib1: 0,
  rrspContribEnd1: 65,
  tfsaContrib1: 0,
  tfsaContribEnd1: 65,
  nonregContrib1: 0,
  nonregContribEnd1: 65,
  rrsp2: 0,
  tfsa2: 0,
  nonreg2: 0,
  rrspContrib2: 0,
  rrspContribEnd2: 65,
  tfsaContrib2: 0,
  tfsaContribEnd2: 65,
  nonregContrib2: 0,
  nonregContribEnd2: 65,
  employment1: 0,
  pension1: 0,
  pensionStart1: 65,
  cpp1: 0,
  cppStart1: 65,
  oas1: 0,
  oasStart1: 65,
  otherIncome1: [],
  employment2: 0,
  pension2: 0,
  pensionStart2: 65,
  cpp2: 0,
  cppStart2: 65,
  oas2: 0,
  oasStart2: 65,
  otherIncome2: [],
  updatedAt: null
};

test('valid active cloud plan wins over local fallback', () => {
  const resolved = resolveActivePlan({
    activePlanId: 'cloud-123',
    cloudPlan: samplePlan,
    savedPlan: fallbackPlan,
    workingPlan: fallbackPlan,
    fallbackPlan
  });

  assert.equal(resolved.source, 'active-cloud-id');
  assert.equal(resolved.plan.name1, 'Ada');
  assert.equal(resolved.plan.spend, 7000);
});

test('valid saved plan loads when activePlanId is missing', () => {
  const resolved = resolveActivePlan({
    activePlanId: null,
    cloudPlan: null,
    savedPlan: samplePlan,
    workingPlan: fallbackPlan,
    fallbackPlan
  });

  assert.equal(resolved.source, 'saved-plan');
  assert.equal(resolved.plan.planName, 'My retirement plan');
});

test('local working plan is used only when no better valid plan exists', () => {
  const resolved = resolveActivePlan({
    activePlanId: null,
    cloudPlan: null,
    savedPlan: null,
    workingPlan: samplePlan,
    fallbackPlan
  });

  assert.equal(resolved.source, 'working-plan');
  assert.equal(resolved.plan.name1, 'Ada');
});

test('invalid activePlanId is ignored safely', () => {
  const resolved = resolveActivePlan({
    activePlanId: '   ',
    cloudPlan: samplePlan,
    savedPlan: fallbackPlan,
    workingPlan: fallbackPlan,
    fallbackPlan
  });

  assert.equal(resolved.source, 'incomplete');
  assert.equal(resolved.plan.name1, '');
});

test('cloud hydration replacing a local plan triggers one recalculation and one rerender', () => {
  let calculations = 0;
  let renders = 0;
  const calculatePlan = plan => {
    calculations += 1;
    return { sustainable: 5000, ending: 600000, ratio: 1.1, confidence: 80, status: 'close', plan };
  };

  const first = materializeActivePlan({
    activePlanId: null,
    savedPlan: fallbackPlan,
    workingPlan: fallbackPlan,
    fallbackPlan,
    calculatePlan,
    render: () => { renders += 1; }
  });

  const second = materializeActivePlan({
    activePlanId: 'cloud-123',
    cloudPlan: samplePlan,
    savedPlan: fallbackPlan,
    workingPlan: fallbackPlan,
    fallbackPlan,
    calculatePlan,
    render: () => { renders += 1; }
  });

  assert.equal(first.source, 'incomplete');
  assert.equal(second.source, 'active-cloud-id');
  assert.equal(calculations, 1);
  assert.equal(renders, 2);
  assert.equal(second.plan.name1, 'Ada');
});

test('pageState is never created from the fallback plan when a valid intended plan exists', () => {
  const state = materializeActivePlan({
    activePlanId: null,
    savedPlan: samplePlan,
    workingPlan: fallbackPlan,
    fallbackPlan,
    calculatePlan: plan => ({ sustainable: 1500, ending: 450000, ratio: 1.2, confidence: 90, status: 'ontrack', plan })
  });

  assert.equal(state.source, 'saved-plan');
  assert.equal(state.plan.name1, 'Ada');
  assert.notEqual(state.plan.spend, 5000);
});

test('verified-engine.js remains unchanged', () => {
  const path = new URL('../app/js/verified-engine.js', import.meta.url);
  const file = readFileSync(path, 'utf8');
  const hash = createHash('sha256').update(file).digest('hex');
  assert.equal(hash, 'f57544ffbf8cd5c4711d41f6cea95c8c82754db8e9ab74e573b684295a7de9eb');
});
