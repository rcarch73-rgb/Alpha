import { supabase, isSupabaseConfigured } from './supabase.js';

if (!isSupabaseConfigured || !supabase) {
  console.info('Harbour North cloud save is disabled in local alpha mode.');
} else {

const TABLE = 'plans';
const ACTIVE_PLAN_KEY = 'harbourNorth.activePlanId';
const DEBOUNCE_MS = 1800;

let user = null;
let timer = null;
let saving = false;
let pending = false;
let applyingRemote = false;

const statusEl = document.getElementById('hnCloudStatus');

function setStatus(text, state = '') {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.classList.remove('syncing', 'saved', 'error');
  if (state) statusEl.classList.add(state);
}

function bridge() {
  return window.HNCloudBridge;
}

function activePlanId() {
  try {
    return localStorage.getItem(ACTIVE_PLAN_KEY) || null;
  } catch {
    return null;
  }
}

function planNameOf(plan) {
  const named = String(plan?.planName || '').trim();
  return named || 'Retirement plan';
}

function timeOf(plan) {
  const value = plan?.meta?.updatedAt;
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

async function findCloudPlan() {
  const id = activePlanId();
  if (!id || !user) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, plan_name, plan_data, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function writeCloudPlan(capturedPlan, capturedId) {
  if (!user || !bridge() || applyingRemote) return;
  if (saving) {
    pending = true;
    return;
  }

  saving = true;
  pending = false;
  setStatus('Cloud: saving…', 'syncing');

  try {
    const id = capturedId ?? activePlanId();
    if (!id) {
      setStatus('Cloud: saved locally', 'saved');
      return;
    }

    const plan = capturedPlan ?? bridge().getPlan();
    const values = {
      plan_name: planNameOf(plan),
      plan_data: plan,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLE)
      .update(values)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) {
      setStatus('Cloud: saved locally', 'saved');
      return;
    }

    setStatus('Cloud: saved', 'saved');
    window.dispatchEvent(new CustomEvent('hn:cloud-saved'));
    window.dispatchEvent(new CustomEvent('hn:cloud-plan-saved', { detail: { id } }));
  } catch (error) {
    console.error('Harbour North cloud save failed:', error);
    setStatus('Cloud: save failed', 'error');
  } finally {
    saving = false;
    if (pending) scheduleSave(250);
  }
}

function scheduleSave(delay = DEBOUNCE_MS) {
  if (!user || applyingRemote) return;
  const id = activePlanId();
  const plan = bridge()?.getPlan?.();
  const snapshot = plan ? structuredClone(plan) : null;
  clearTimeout(timer);
  setStatus('Cloud: changes pending', 'syncing');
  timer = setTimeout(() => writeCloudPlan(snapshot, id), delay);
}

async function reconcile() {
  const b = bridge();
  if (!b) throw new Error('Planner storage bridge is unavailable.');

  if (!activePlanId()) {
    setStatus('Cloud: saved locally', 'saved');
    return;
  }

  setStatus('Cloud: checking…', 'syncing');
  const cloudRow = await findCloudPlan();
  const localPlan = b.getPlan();

  if (!cloudRow?.plan_data) {
    setStatus('Cloud: saved locally', 'saved');
    return;
  }

  const cloudPlan = cloudRow.plan_data;
  const cloudTime = Math.max(timeOf(cloudPlan), Date.parse(cloudRow.updated_at || '') || 0);
  const localTime = timeOf(localPlan);

  // The newest copy wins. On equal timestamps, keep the browser copy and refresh cloud.
  if (cloudTime > localTime + 1000) {
    applyingRemote = true;
    setStatus('Cloud: loading plan…', 'syncing');
    try {
      b.applyPlan(cloudPlan);
      setStatus('Cloud: loaded', 'saved');
    } finally {
      applyingRemote = false;
    }
  } else {
    await writeCloudPlan();
  }
}

async function initialise() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    user = data.session?.user || null;
    if (!user) return;
    await reconcile();
  } catch (error) {
    console.error('Harbour North cloud connection failed:', error);
    setStatus('Cloud: unavailable', 'error');
  }
}

window.addEventListener('hn:plan-saved', () => scheduleSave());
statusEl?.addEventListener('click', () => writeCloudPlan());
window.addEventListener('beforeunload', () => {
  if (timer) writeCloudPlan();
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    user = null;
    clearTimeout(timer);
    return;
  }
  if (session?.user && !user) {
    user = session.user;
    reconcile().catch(error => {
      console.error(error);
      setStatus('Cloud: unavailable', 'error');
    });
  }
});

initialise();

}
