'use strict';
/* Harbour North Studio validation logic. Financial engine code is not included here. */
const DEV_KEY='harbourNorth.developerMode.v0.4.4';
const BUILD_META={appVersion:'0.4.4',engineBaseline:'RC3-B2',releaseType:'validation'};
function developerEnabled(){return localStorage.getItem(DEV_KEY)==='true'}
function syncDeveloperMode(){const enabled=developerEnabled();if($('validationNav'))$('validationNav').classList.toggle('hidden',!enabled);if($('developerModeBtn'))$('developerModeBtn').textContent=enabled?'Disable Developer Mode':'Enable Developer Mode';if(!enabled&&currentExploreView==='validation')showExploreView('settings')}
function stableFingerprint(input){let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}return ('00000000'+(h>>>0).toString(16)).slice(-8).toUpperCase()}
function validationInterfaceSignature(){const engine=window.HNVerifiedEngine||{};const adapterKeys=Object.keys(engine).sort();const calc=typeof engine.calculate==='function'?'calculate:function':'calculate:missing';return JSON.stringify({build:BUILD_META,adapterKeys,calc,verifiedScript:!!document.querySelector('script[src="js/verified-engine.js"]'),adapterScript:!!document.querySelector('script[src="js/engine-adapter.js"]')})}

function pickAnnualValue(row,names,fallback=null){for(const name of names){if(row&&row[name]!==undefined&&row[name]!==null&&row[name]!==''&&Number.isFinite(Number(row[name])))return Number(row[name])}return fallback}
function annualDisplay(value){return Number.isFinite(Number(value))?money(Number(value)):'—'}
function activeOtherIncomeForRecord(record){
 const age1=Number(record.age),yearOffset=age1-Number(plan.age1||0),age2=Number(plan.age2||0)+yearOffset;
 const sources=[];
 const add=(owner,age)=>{if(owner===2&&plan.household!=='couple')return;(plan[`otherIncome${owner}`]||[]).forEach(item=>{const start=Number(item.startAge||0),end=Number(item.endAge||110),amount=Number(item.amount||0);if(amount>0&&age>=start&&age<=end)sources.push({owner,person:owner===1?(plan.name1||'You'):(plan.name2||'Partner'),name:item.name||item.type||'Other income',type:item.type||'Other',amount,taxable:item.taxable!==false})})};
 add(1,age1);add(2,age2);
 return {sources,total:sources.reduce((sum,x)=>sum+x.amount,0),taxable:sources.filter(x=>x.taxable).reduce((sum,x)=>sum+x.amount,0),taxFree:sources.filter(x=>!x.taxable).reduce((sum,x)=>sum+x.amount,0)};
}
function activeCoreIncomeForRecord(record){
 const age1=Number(record.age),yearOffset=age1-Number(plan.age1||0),age2=Number(plan.age2||0)+yearOffset;
 const sources=[];
 const add=(owner,age)=>{
  if(owner===2&&plan.household!=='couple')return;
  const person=owner===1?(plan.name1||'You'):(plan.name2||'Partner');
  const pension=Number(plan[`pension${owner}`]||0),pensionStart=Number(plan[`pensionStart${owner}`]||0);
  const cpp=Number(plan[`cpp${owner}`]||0),cppStart=Number(plan[`cppStart${owner}`]||65);
  const oas=Number(plan[`oas${owner}`]||0),oasStart=Number(plan[`oasStart${owner}`]||65);
  const employment=Number(plan[`employment${owner}`]||0),retireAge=Number(plan[`retire${owner}`]||0);
  if(employment>0&&age<retireAge)sources.push({owner,person,type:'Employment',amount:employment,taxable:true});
  if(pension>0&&age>=pensionStart)sources.push({owner,person,type:'Pension',amount:pension,taxable:true});
  if(cpp>0&&age>=cppStart)sources.push({owner,person,type:'CPP',amount:cpp,taxable:true});
  if(oas>0&&age>=oasStart)sources.push({owner,person,type:'OAS',amount:oas,taxable:true});
 };
 add(1,age1);add(2,age2);
 const total=type=>sources.filter(x=>x.type===type).reduce((sum,x)=>sum+x.amount,0);
 return {sources,employment:total('Employment'),pension:total('Pension'),cpp:total('CPP'),oas:total('OAS'),total:sources.reduce((sum,x)=>sum+x.amount,0)};
}
function inspectorRecord(row,index,series){
 const previous=index>0?series[index-1]:null;
 const end=pickAnnualValue(row,['endingBalance','endBalance','balance','portfolioEnd','endingAssets','totalEnd','end'],0);
 const start=pickAnnualValue(row,['startingBalance','startBalance','portfolioStart','beginningBalance','openingBalance','totalStart','start'],previous?pickAnnualValue(previous,['endingBalance','endBalance','balance','portfolioEnd','endingAssets','totalEnd','end'],null):pickAnnualValue(result||{},['retirementStart'],null));
 const income=pickAnnualValue(row,['totalIncome','income','grossIncome','householdIncome','cashIncome','incomeTotal'],null);
 const tax=pickAnnualValue(row,['tax','totalTax','incomeTax','taxes','netTax'],null);
 const withdrawals=pickAnnualValue(row,['withdrawals','totalWithdrawals','portfolioWithdrawal','withdrawal','accountWithdrawals'],null);
 const spending=pickAnnualValue(row,['spending','annualSpend','expenses','targetSpending','netSpending'],plan?Number(plan.spend||0)*12:null);
 const record={year:row?.year??(new Date().getFullYear()+index),age:row?.age??(Number(plan?.retire1||0)+index),start,income,tax,withdrawals,spending,end,row,index};record.otherIncome=activeOtherIncomeForRecord(record);record.coreIncome=activeCoreIncomeForRecord(record);return record;
}
function renderYearInspector(selectedIndex=0){
 const series=result&&Array.isArray(result.series)?result.series:[];
 const rows=$('yearInspectorRows'),select=$('yearInspectorSelect'),summary=$('yearInspectorSummary'),trace=$('yearInspectorTrace'),note=$('yearInspectorNote'),source=$('yearInspectorSource');
 if(!rows||!select||!summary||!trace)return;
 if(!series.length){rows.innerHTML='<tr><td colspan="8" style="text-align:center">No annual projection records are available.</td></tr>';select.innerHTML='<option>No years available</option>';summary.innerHTML='';trace.innerHTML='';note.textContent='The loaded calculation result did not expose a series array.';if(source)source.textContent='No projection series';return}
 selectedIndex=Math.max(0,Math.min(Number(selectedIndex)||0,series.length-1));
 const records=series.map((row,i)=>inspectorRecord(row,i,series));
 select.innerHTML=records.map((r,i)=>`<option value="${i}" ${i===selectedIndex?'selected':''}>${r.year} · Age ${r.age}</option>`).join('');
 rows.innerHTML=records.map((r,i)=>{const parts=[['Emp',r.coreIncome.employment],['Pen',r.coreIncome.pension],['CPP',r.coreIncome.cpp],['OAS',r.coreIncome.oas],['Other',r.otherIncome.total]].filter(([,v])=>Number(v)>0).map(([k,v])=>`<span>${k} ${annualDisplay(v)}</span>`).join('');return `<tr data-year-index="${i}" class="${i===selectedIndex?'selected':''}"><td>${r.year}</td><td>${r.age}</td><td>${annualDisplay(r.start)}</td><td class="income-cell"><span class="income-total">${annualDisplay(r.income)}</span><div class="income-parts">${parts||'<span>No income</span>'}</div></td><td>${annualDisplay(r.tax)}</td><td>${annualDisplay(r.withdrawals)}</td><td>${annualDisplay(r.spending)}</td><td>${annualDisplay(r.end)}</td></tr>`}).join('');
 const r=records[selectedIndex];
 summary.innerHTML=[['Year',r.year],['Age',r.age],['Starting balance',annualDisplay(r.start)],['Total income',annualDisplay(r.income)],['Employment income',annualDisplay(r.coreIncome.employment)],['Pension income',annualDisplay(r.coreIncome.pension)],['CPP income',annualDisplay(r.coreIncome.cpp)],['OAS income',annualDisplay(r.coreIncome.oas)],['Other income',annualDisplay(r.otherIncome.total)],['Tax-free other income',annualDisplay(r.otherIncome.taxFree)],['Taxable other income',annualDisplay(r.otherIncome.taxable)],['Tax',annualDisplay(r.tax)],['Withdrawals',annualDisplay(r.withdrawals)],['Spending',annualDisplay(r.spending)],['Ending balance',annualDisplay(r.end)]].map(([k,v])=>`<div class="year-detail-item"><span>${k}</span><strong>${v}</strong></div>`).join('');
 const entries=Object.entries(r.row||{}).sort(([a],[b])=>a.localeCompare(b));
 const coreIncomeTrace=r.coreIncome.sources.length?r.coreIncome.sources.map(x=>`<div class="trace-row"><span>${x.person}: ${x.type} <small>(Taxable)</small></span><code>${money(x.amount)}</code></div>`).join(''):'<div class="trace-row"><span>CPP, OAS, pension and employment</span><code>None active</code></div>';
 const otherIncomeTrace=r.otherIncome.sources.length?r.otherIncome.sources.map(x=>`<div class="trace-row"><span>${x.person}: ${String(x.name).replace(/</g,'&lt;')} <small>(${x.taxable?'Taxable':'Tax-free'})</small></span><code>${money(x.amount)}</code></div>`).join(''):'<div class="trace-row"><span>Other income sources</span><code>None active</code></div>';
 trace.innerHTML=coreIncomeTrace+otherIncomeTrace+(entries.length?entries.map(([k,v])=>{let display;if(typeof v==='number')display=Number.isFinite(v)?(Math.abs(v)>=1000?money(v):String(v)):'Invalid';else if(v&&typeof v==='object')display=JSON.stringify(v);else display=String(v??'—');return `<div class="trace-row"><span>${k}</span><code>${display.replace(/</g,'&lt;')}</code></div>`}).join(''):'<p class="quiet">No additional engine fields were exposed for this year.</p>');
 note.textContent="CPP, OAS, pension, employment and other-income rows are matched to each person's age and start/end settings. Other income also displays its saved tax treatment. Engine fields below remain the unmodified annual record returned by the engine.";
 if(source)source.textContent=`${series.length} annual records · ${result.engine||'verified engine output'}`;
}


function goldenNumber(value){const x=Number(value);return Number.isFinite(x)?x:null}
function goldenRows(answer){return Array.isArray(answer?.rows)?answer.rows:Array.isArray(answer?.series)?answer.series:[]}
function goldenSnapshot(answer){return JSON.stringify({sustainable:goldenNumber(answer?.sustainable),ending:goldenNumber(answer?.ending),retirementStart:goldenNumber(answer?.retirementStart),ratio:goldenNumber(answer?.ratio),status:answer?.status,rows:goldenRows(answer).map(r=>({year:r.year,age:r.age,balance:goldenNumber(r.balance??r.endingBalance??r.endBalance),tax:goldenNumber(r.tax??r.totalTax),income:goldenNumber(r.income??r.totalIncome)}))})}
function goldenBase(overrides={}){
 const p=structuredClone(defaults);
 Object.assign(p,{schemaVersion:'foundation-0.4.4-golden',household:'single',name1:'Golden',age1:55,retire1:60,horizon:90,spend:4000,province:'British Columbia',rrsp1:300000,tfsa1:75000,nonreg1:25000,rrspContrib1:500,rrspContribEnd1:60,tfsaContrib1:250,tfsaContribEnd1:60,nonregContrib1:0,nonregContribEnd1:60,employment1:70000,pension1:0,pensionStart1:65,cpp1:15000,cppStart1:65,oas1:8500,oasStart1:65,otherIncome1:[],name2:'Partner',age2:50,retire2:65,rrsp2:0,tfsa2:0,nonreg2:0,employment2:0,pension2:0,cpp2:0,oas2:0,otherIncome2:[],returnRate:5,inflationRate:2,updatedAt:null},overrides);
 p.rrsp=n(p.rrsp1)+n(p.rrsp2);p.tfsa=n(p.tfsa1)+n(p.tfsa2);p.nonreg=n(p.nonreg1)+n(p.nonreg2);return normalizedScenarioPlan(p)
}
function goldenCalculate(testPlan){const fn=window.HNVerifiedEngine?.calculate;if(typeof fn!=='function')throw new Error('Verified adapter unavailable');return fn(testPlan)}
function goldenResult(name,expected,observed,pass,detail={}){return{name,expected,observed,pass:!!pass,detail}}
function runGoldenTests(showToast=true){
 const tests=[];let engineError=null;
 try{
  const base=goldenBase(),a=goldenCalculate(base),b=goldenCalculate(structuredClone(base));
  tests.push(goldenResult('Deterministic calculation','Same fixed input returns the same output',goldenSnapshot(a)===goldenSnapshot(b)?'Identical results':'Results changed',goldenSnapshot(a)===goldenSnapshot(b)));
  const rows=goldenRows(a),expectedYears=Math.max(1,base.horizon-base.age1+1);
  tests.push(goldenResult('Projection horizon',`${expectedYears} annual retirement records`,`${rows.length} records`,rows.length===expectedYears,{expectedYears,actualYears:rows.length}));
  const zero=goldenCalculate(goldenBase({rrsp1:0,tfsa1:0,nonreg1:0,rrspContrib1:0,tfsaContrib1:0,employment1:0,cpp1:0,oas1:0,pension1:0,spend:3000}));
  const zeroFinite=[zero?.sustainable,zero?.ending,zero?.ratio].every(v=>Number.isFinite(Number(v)));
  tests.push(goldenResult('Zero-resource plan','Returns finite values without crashing',zeroFinite?'Finite outputs':'Invalid output',zeroFinite));
  const noCpp=goldenCalculate(goldenBase({cpp1:0})),withCpp=goldenCalculate(goldenBase({cpp1:15000}));
  tests.push(goldenResult('CPP inclusion','Adding CPP does not reduce sustainable spending',`${money(noCpp.sustainable)} → ${money(withCpp.sustainable)}`,n(withCpp.sustainable)>=n(noCpp.sustainable),{without:n(noCpp.sustainable),with:n(withCpp.sustainable)}));
  const noPension=goldenCalculate(goldenBase({pension1:0})),withPension=goldenCalculate(goldenBase({pension1:24000,pensionStart1:65}));
  tests.push(goldenResult('Pension inclusion','Adding pension income does not reduce sustainable spending',`${money(noPension.sustainable)} → ${money(withPension.sustainable)}`,n(withPension.sustainable)>=n(noPension.sustainable),{without:n(noPension.sustainable),with:n(withPension.sustainable)}));
  const noOther=goldenCalculate(goldenBase({otherIncome1:[]})),withOther=goldenCalculate(goldenBase({otherIncome1:[{type:'Other',name:'Golden income',amount:12000,startAge:60,endAge:70,taxable:false}]}));
  tests.push(goldenResult('Other-income inclusion','Adding tax-free other income does not reduce sustainable spending',`${money(noOther.sustainable)} → ${money(withOther.sustainable)}`,n(withOther.sustainable)>=n(noOther.sustainable),{without:n(noOther.sustainable),with:n(withOther.sustainable)}));
  const singleWithPartner=goldenCalculate(goldenBase({household:'single',rrsp2:900000,tfsa2:200000,employment2:150000,pension2:60000,cpp2:20000,oas2:9000}));
  const singleWithoutPartner=goldenCalculate(goldenBase({household:'single',rrsp2:0,tfsa2:0,employment2:0,pension2:0,cpp2:0,oas2:0}));
  const singlePass=goldenSnapshot(singleWithPartner)===goldenSnapshot(singleWithoutPartner);
  tests.push(goldenResult('Single-person isolation','Partner inputs are ignored in single mode',singlePass?'No partner leakage':'Output changed',singlePass));
  const lowSavings=goldenCalculate(goldenBase({rrsp1:100000,tfsa1:0,nonreg1:0})),highSavings=goldenCalculate(goldenBase({rrsp1:500000,tfsa1:100000,nonreg1:50000}));
  tests.push(goldenResult('Savings monotonicity','More starting assets do not reduce sustainable spending',`${money(lowSavings.sustainable)} → ${money(highSavings.sustainable)}`,n(highSavings.sustainable)>=n(lowSavings.sustainable),{low:n(lowSavings.sustainable),high:n(highSavings.sustainable)}));
  const stress=goldenCalculate(goldenBase({age1:40,retire1:45,horizon:110,spend:12000,returnRate:0,inflationRate:8,rrsp1:1000,tfsa1:0,nonreg1:0,employment1:0,cpp1:0,oas1:0,pension1:0,otherIncome1:[]}));
  const stressFinite=[stress?.sustainable,stress?.ending,stress?.ratio].every(v=>Number.isFinite(Number(v)))&&goldenRows(stress).length>0;
  tests.push(goldenResult('Long-horizon stress case','Extreme valid inputs return a complete finite projection',stressFinite?`${goldenRows(stress).length} finite records`:'Invalid stress result',stressFinite));
 }catch(e){engineError=e;tests.push(goldenResult('Golden suite execution','All cases execute through the verified adapter',e.message,false))}
 const passed=tests.filter(t=>t.pass).length,all=tests.length>0&&passed===tests.length;
 const rowsEl=$('goldenTestRows');if(rowsEl)rowsEl.innerHTML=tests.map(t=>`<tr><td>${t.name}</td><td>${t.expected}</td><td>${t.observed}</td><td class="${t.pass?'check-pass':'check-fail'}">${t.pass?'PASS':'FAIL'}</td></tr>`).join('');
 if($('goldenOverall'))$('goldenOverall').textContent=all?'PASS':'FAIL';if($('goldenCount'))$('goldenCount').textContent=`${passed} / ${tests.length}`;if($('goldenRunTime'))$('goldenRunTime').textContent=new Date().toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'});
 window.HNGoldenReport={generatedAt:new Date().toISOString(),build:BUILD_META,overall:all?'PASS':'FAIL',passed,total:tests.length,tests,engineError:engineError?.message||null};
 if(showToast)toast(all?'Golden tests passed':'Golden tests found an issue');return window.HNGoldenReport
}

function renderValidation(){if(!developerEnabled())return;runValidation(false);renderYearInspector(0);runGoldenTests(false)}
function runValidation(showToast=true){
 let localResult=null;try{localResult=calculate()}catch(e){console.error(e)}
 const engineLoaded=!!window.HNVerifiedEngine&&typeof window.HNVerifiedEngine.calculate==='function';
 const uiSustainable=$('sustainable')?.textContent||'—',uiEnding=$('metricLegacy')?.textContent||'—',uiRetire=$('metricRetire')?.textContent||'—';
 const expectedSustainable=localResult?money(localResult.sustainable):'Unavailable',expectedEnding=localResult?money(localResult.ending):'Unavailable',expectedRetire='Age '+plan.retire1;
 const checks=[
  {name:'Verified adapter available',expected:'calculate() function',observed:engineLoaded?'Available':'Missing',pass:engineLoaded},
  {name:'Sustainable spending matches brief',expected:expectedSustainable,observed:uiSustainable,pass:!!localResult&&uiSustainable===expectedSustainable},
  {name:'Ending assets match brief',expected:expectedEnding,observed:uiEnding,pass:!!localResult&&uiEnding===expectedEnding},
  {name:'Retirement age matches brief',expected:expectedRetire,observed:uiRetire,pass:uiRetire===expectedRetire},
  {name:'Projection series is populated',expected:'At least 1 year',observed:localResult&&Array.isArray(localResult.series)?`${localResult.series.length} years`:'Unavailable',pass:!!localResult&&Array.isArray(localResult.series)&&localResult.series.length>0},
  {name:'Result values are finite',expected:'Finite sustainable and ending values',observed:localResult&&Number.isFinite(Number(localResult.sustainable))&&Number.isFinite(Number(localResult.ending))?'Finite':'Invalid',pass:!!localResult&&Number.isFinite(Number(localResult.sustainable))&&Number.isFinite(Number(localResult.ending))}
 ];
 const passed=checks.filter(x=>x.pass).length,all=passed===checks.length;
 $('validationChecks').innerHTML=checks.map(x=>`<tr><td>${x.name}</td><td>${x.expected}</td><td>${x.observed}</td><td class="${x.pass?'check-pass':'check-fail'}">${x.pass?'PASS':'FAIL'}</td></tr>`).join('');
 $('validationEngine').textContent=engineLoaded?'Loaded':'Unavailable';$('validationCount').textContent=`${passed} / ${checks.length}`;$('validationOverall').textContent=all?'PASS':'FAIL';$('validationHeadline').textContent=all?'Validation checks passed':'Validation requires attention';$('validationSummary').textContent=all?'The current plan result reconciles with the primary Retirement Brief outputs.':'One or more integration or consistency checks failed. The financial engine was not modified.';
 renderYearInspector(0);
 const signature=validationInterfaceSignature();$('validationFingerprint').textContent=`HN-${stableFingerprint(signature)} · ${signature}`;
 window.HNValidationReport={generatedAt:new Date().toISOString(),build:BUILD_META,overall:all?'PASS':'FAIL',passed,total:checks.length,checks,fingerprint:`HN-${stableFingerprint(signature)}`};
 if(showToast)toast(all?'Validation passed':'Validation found an issue');return window.HNValidationReport
}
function exportValidationReport(){const report=runValidation(false);const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='harbour-north-v0.4.4-validation-report.json';a.click();URL.revokeObjectURL(a.href);toast('Validation report exported')}
