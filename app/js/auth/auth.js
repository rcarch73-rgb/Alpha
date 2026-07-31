(() => {
  'use strict';
  const SUPABASE_URL='https://hztzyenhnbbyisokqqgj.supabase.co';
  const SUPABASE_KEY='sb_publishable_vsHcfFEuI7Nfic15vxdZrg_dj0QM49A';
  const ACTIVE_KEY='harbourNorth.activePlanId';
  const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let session=null, syncTimer=null, suppressSync=false;
  const el=id=>document.getElementById(id);
  const activePlanId=()=>localStorage.getItem(ACTIVE_KEY);
  const setActivePlanId=id=>id?localStorage.setItem(ACTIVE_KEY,id):localStorage.removeItem(ACTIVE_KEY);
  const setMessage=(text,type='')=>{const m=el('signInMessage');if(!m)return;m.textContent=text;m.className=`auth-message ${type}`.trim()};
  const setBusy=(button,busy,label)=>{if(!button)return;if(busy){button.dataset.old=button.textContent;button.disabled=true;button.textContent=label}else{button.disabled=false;button.textContent=button.dataset.old||button.textContent}};
  function updateUI(){
    const user=session?.user,email=user?.email||'';
    el('accountButton')?.classList.toggle('hidden',!user);
    if(el('accountButton'))el('accountButton').textContent=email||'Account';
    if(el('cloudAccountCopy'))el('cloudAccountCopy').textContent=user?`Signed in as ${email}. Your plans are protected by row-level security.`:'Sign in to securely sync your plans across devices.';
    if(el('cloudAccountBtn')){el('cloudAccountBtn').classList.toggle('hidden',!!user);el('cloudAccountBtn').textContent='Sign in'}
    el('cloudSyncBtn')?.classList.toggle('hidden',!user);el('signOutBtn')?.classList.toggle('hidden',!user);
    if(el('saveStatus'))el('saveStatus').textContent=user?'Cloud connected':'Saved locally';
  }
  async function saveCloudPlan(showToast=false){
    if(!session?.user||suppressSync)return false;
    const plan=window.HNCloudBridge?.getPlan?.(), id=activePlanId();
    if(!plan||!id)return false;
    const payload={plan_name:plan.planName||`${plan.name1||'My'} retirement plan`,plan_data:plan,updated_at:new Date().toISOString()};
    const {error}=await client.from('plans').update(payload).eq('id',id).eq('user_id',session.user.id);
    if(error)throw error;
    if(el('saveStatus'))el('saveStatus').textContent='Synced to cloud';
    if(showToast)window.toast?.('Plan synced to cloud');
    window.dispatchEvent(new CustomEvent('hn:cloud-plan-saved',{detail:{id}}));
    return true;
  }
  function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>saveCloudPlan(false).catch(e=>{console.error('Cloud sync failed',e);if(el('saveStatus'))el('saveStatus').textContent='Saved locally · sync pending'}),700)}
  async function ensureInitialPlan(){
    if(!session?.user)return;
    const {count,error}=await client.from('plans').select('id',{count:'exact',head:true}).eq('user_id',session.user.id);
    if(error)throw error;
    if(count===0&&window.HNCloudBridge?.hasLocalPlan?.()){
      const plan=window.HNCloudBridge.getPlan();
      const name=plan.planName||`${plan.name1||'My'} retirement plan`;
      const {data, error:insertError}=await client.from('plans').insert({user_id:session.user.id,plan_name:name,plan_data:plan,updated_at:new Date().toISOString()}).select('id').single();
      if(insertError)throw insertError;setActivePlanId(data.id);
    }
  }
  async function handleSignedIn(){updateUI();await ensureInitialPlan();await window.HNPlans?.render?.()}
  async function createAccount(){
    if(!client)return window.toast?.('Authentication failed to load');
    const first=el('accountFirstName').value.trim(),last=el('accountLastName').value.trim(),email=el('accountEmail').value.trim(),password=el('accountPassword').value,confirm=el('accountPasswordConfirm').value;
    if(!first||!email||!password)return window.toast?.('Enter your name, email and password');
    if(!/^\S+@\S+\.\S+$/.test(email))return window.toast?.('Enter a valid email address');
    if(password.length<8)return window.toast?.('Use at least 8 characters for your password');if(password!==confirm)return window.toast?.('Passwords do not match');
    const button=el('createAccountBtn');setBusy(button,true,'Creating account…');
    try{const {data,error}=await client.auth.signUp({email,password,options:{data:{first_name:first,last_name:last}}});if(error)throw error;session=data.session;
      const plan=window.HNCloudBridge.getPlan();plan.accountFirstName=first;plan.accountLastName=last;plan.accountEmail=email;plan.name1=plan.name1||first;window.HNCloudBridge.applyPlan(plan);
      el('accountPassword').value='';el('accountPasswordConfirm').value='';
      if(session){await handleSignedIn();window.go('myPlans');window.toast?.('Account created')}
      else{window.go('signIn');setMessage('Account created. Check your email to confirm it, then sign in.','success')}
    }catch(e){console.error(e);window.toast?.(e.message||'Account creation failed')}finally{setBusy(button,false)}
  }
  async function signIn(){
    const email=el('signInEmail').value.trim(),password=el('signInPassword').value,button=el('signInBtn');if(!email||!password)return setMessage('Enter your email and password.','error');
    setBusy(button,true,'Signing in…');setMessage('');
    try{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;session=data.session;await handleSignedIn();window.go('myPlans');window.toast?.('Signed in successfully')}
    catch(e){setMessage(e.message||'Sign in failed.','error')}finally{setBusy(button,false)}
  }
  async function resetPassword(){const email=el('signInEmail').value.trim();if(!email)return setMessage('Enter your email address first.','error');try{const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;setMessage('Password reset email sent.','success')}catch(e){setMessage(e.message||'Unable to send reset email.','error')}}
  async function signOut(){try{await client.auth.signOut();session=null;setActivePlanId(null);updateUI();window.go('welcome');window.toast?.('Signed out')}catch(e){window.toast?.(e.message||'Sign out failed')}}
  function setSuppressSync(value){suppressSync=!!value}
  async function init(){
    if(!client){console.error('Supabase library not loaded');return}
    const {data}=await client.auth.getSession();session=data.session;updateUI();if(session)handleSignedIn().catch(console.error);
    client.auth.onAuthStateChange((_event,newSession)=>{session=newSession;updateUI()});
    el('signInBtn')?.addEventListener('click',signIn);el('forgotPasswordBtn')?.addEventListener('click',resetPassword);el('cloudAccountBtn')?.addEventListener('click',()=>window.go('signIn'));el('cloudSyncBtn')?.addEventListener('click',()=>saveCloudPlan(true).catch(e=>window.toast?.(e.message||'Cloud sync failed')));el('signOutBtn')?.addEventListener('click',signOut);el('accountButton')?.addEventListener('click',()=>window.go('myPlans'));
    window.addEventListener('hn:plan-saved',scheduleSync);
  }
  window.HNAuth={client,createAccount,signIn,signOut,saveCloudPlan,getSession:()=>session,getActivePlanId:activePlanId,setActivePlanId,setSuppressSync};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
