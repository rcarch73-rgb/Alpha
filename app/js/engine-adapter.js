(function(global){
'use strict';
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const currentYear=()=>new Date().getFullYear();
const birthDateFromAge=age=>`${currentYear()-Math.max(0,Math.trunc(n(age)))}-01-01`;
const id=(p,i)=>`${p}-${i}`;
function legacyPlan(p, monthlySpend){
  const couple=p.household==='couple';
  const primary=p.name1||'You', partner=p.name2||'Partner';
  const people=[{id:'p1',role:'primary',name:primary,birthDate:birthDateFromAge(p.age1),retirementAge:n(p.retire1)||65,employmentStatus:'Employed'}];
  if(couple)people.push({id:'p2',role:'partner',name:partner,birthDate:birthDateFromAge(p.age2),retirementAge:n(p.retire2)||65,employmentStatus:'Employed'});
  const accounts=[];
  const add=(name,type,balance,owner,contribution=0,endAge=0)=>{if(n(balance)>0||n(contribution)>0)accounts.push({id:id('a',accounts.length+1),name,type,owner,balance:n(balance),returnRate:n(p.returnRate)||5,annualContribution:n(contribution)*12,contributionEndAge:n(endAge)||n(p.retire1)});};
  if(Object.prototype.hasOwnProperty.call(p,'rrsp1')){
    add(`${primary} RRSP / RRIF`,'RRSP/RRIF',p.rrsp1,primary,p.rrspContrib1,p.rrspContribEnd1);add(`${primary} TFSA`,'TFSA',p.tfsa1,primary,p.tfsaContrib1,p.tfsaContribEnd1);add(`${primary} non-registered`,'Non-registered',p.nonreg1,primary,p.nonregContrib1,p.nonregContribEnd1);
    if(couple){add(`${partner} RRSP / RRIF`,'RRSP/RRIF',p.rrsp2,partner,p.rrspContrib2,p.rrspContribEnd2);add(`${partner} TFSA`,'TFSA',p.tfsa2,partner,p.tfsaContrib2,p.tfsaContribEnd2);add(`${partner} non-registered`,'Non-registered',p.nonreg2,partner,p.nonregContrib2,p.nonregContribEnd2);}
  }else{
    add('Registered savings','RRSP/RRIF',p.rrsp,primary,p.contrib,p.contribEndAge);add('Tax-free savings','TFSA',p.tfsa,primary,0,p.retire1);add('Non-registered savings','Non-registered',p.nonreg,primary,0,p.retire1);
  }
  const incomeSources=[];
  const addIncome=(name,type,owner,amount,startAge,endAge,indexed=true,taxable=true)=>{if(n(amount)>0)incomeSources.push({id:id('i',incomeSources.length+1),name,type,owner,annualAmount:n(amount),startAge:n(startAge),endAge:n(endAge),indexed,taxable});};
  const detailed=Object.prototype.hasOwnProperty.call(p,'employment1');
  if(detailed){
    addIncome(`${primary} employment income`,'Employment',primary,p.employment1,n(p.age1),n(p.retire1),true,true);
    addIncome(`${primary} pension`,'Pension',primary,p.pension1,p.pensionStart1,110,true,true);
    addIncome(`${primary} CPP`,'CPP',primary,p.cpp1,p.cppStart1,110,true,true);
    addIncome(`${primary} OAS`,'OAS',primary,p.oas1,p.oasStart1,110,true,true);
    if(Array.isArray(p.otherIncome1))p.otherIncome1.forEach(x=>addIncome(x.name||x.type||`${primary} other income`,x.type||'Other income',primary,x.amount,x.startAge,x.endAge,true,x.taxable!==false));else addIncome(p.otherLabel1||`${primary} other income`,'Other income',primary,p.otherAmount1,p.otherStart1,p.otherEnd1,true,true);
    if(couple){
      addIncome(`${partner} employment income`,'Employment',partner,p.employment2,n(p.age2),n(p.retire2),true,true);
      addIncome(`${partner} pension`,'Pension',partner,p.pension2,p.pensionStart2,110,true,true);
      addIncome(`${partner} CPP`,'CPP',partner,p.cpp2,p.cppStart2,110,true,true);
      addIncome(`${partner} OAS`,'OAS',partner,p.oas2,p.oasStart2,110,true,true);
      if(Array.isArray(p.otherIncome2))p.otherIncome2.forEach(x=>addIncome(x.name||x.type||`${partner} other income`,x.type||'Other income',partner,x.amount,x.startAge,x.endAge,true,x.taxable!==false));else addIncome(p.otherLabel2||`${partner} other income`,'Other income',partner,p.otherAmount2,p.otherStart2,p.otherEnd2,true,true);
    }
  }else{
    const primaryRet=n(p.retire1)||65;
    addIncome('Current household employment income','Employment',primary,p.currentIncome,0,primaryRet,true,true);
    if(n(p.incomeBridge)>0&&n(p.bridgeYears)>0){const bridgeOwner=couple?partner:primary;const bridgeStart=couple?Math.max(0,n(p.age2)+(primaryRet-n(p.age1))):primaryRet;addIncome('Continuing employment income','Employment',bridgeOwner,p.incomeBridge,bridgeStart,bridgeStart+n(p.bridgeYears),true,true);}
    addIncome('Pension income','Pension',couple?partner:primary,p.pension,couple?n(p.retire2):primaryRet,110,true,true);
    addIncome('CPP, OAS and other stable income','Government benefits',primary,p.benefits,65,110,true,true);
  }
  return {hasPartner:couple,people,household:{province:p.province||'British Columbia',planningAge:n(p.horizon)||95,inflationRate:n(p.inflationRate)||2,incomeIndexRate:n(p.inflationRate)||2,returnRate:n(p.returnRate)||5,emergencyFundAmount:0},accounts,incomeSources,debts:[],expenses:[{id:'e1',name:'Retirement lifestyle',category:'Lifestyle',amount:n(monthlySpend),frequency:'Monthly',startAge:n(p.retire1)||65,endAge:n(p.horizon)||95}],events:[],planningModel:{withdrawalStrategy:{mode:'balanced'}}};
}
function runLegacy(p, monthlySpend){
  const plan=legacyPlan(p,monthlySpend), startYear=currentYear(), planningAge=n(p.horizon)||95;
  const timeline=global.HNTimeline.buildTimeline(plan,{startYear,planningAge});
  const incomes=global.HNIncome.buildIncomeProjection(plan,timeline,{startYear,indexRate:n(p.inflationRate)||2});
  const rows=global.HNProjection.buildProjection(plan,incomes,{startYear,indexRate:n(p.inflationRate)||2});
  return {plan,rows};
}
function isSupported(rows){return rows.length>0&&rows.every(r=>n(r.projection.unfunded)<1)&&n(rows.at(-1).projection.endingInvestments)>=0;}
function calculate(p){
  const target=n(p.spend), targetRun=runLegacy(p,target), rows=targetRun.rows;
  let lo=0,hi=Math.max(target*2,15000);
  for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(isSupported(runLegacy(p,mid).rows))lo=mid;else hi=mid;}
  const sustainable=lo, ratio=sustainable/Math.max(1,target);
  const retirementYear=currentYear()+Math.max(0,n(p.retire1)-n(p.age1));
  const retirementRow=rows.find(r=>r.year>=retirementYear)||rows[0];
  const inflation=(n(p.inflationRate)||2)/100;
  const real=vYear=>Math.pow(1+inflation,Math.max(0,vYear-currentYear()));
  const series=rows.filter(r=>r.year>=retirementYear).map(r=>({year:r.year,age:(r.people[0]?.age??0),balance:n(r.projection.endingInvestments)/real(r.year),tax:n(r.projection.tax)/real(r.year),withdrawals:n(r.projection.withdrawals)/real(r.year),unfunded:n(r.projection.unfunded)/real(r.year)}));
  const ending=n(rows.at(-1)?.projection.endingInvestments)/real(rows.at(-1)?.year||currentYear()), anyUnfunded=rows.some(r=>n(r.projection.unfunded)>1);
  const status=!anyUnfunded&&ratio>=1.05?'ontrack':ratio>=.9?'close':'attention';
  const confidence=Math.max(20,Math.min(96,Math.round(50+Math.min(1.2,ratio)*35-(anyUnfunded?18:0))));
  return {engine:'verified',series,retirementStart:n(retirementRow?.projection.startingInvestments)/real(retirementRow?.year||currentYear()),sustainable,ending,ratio,status,confidence,annualSpend:target*12,yearsTo:Math.max(0,n(p.retire1)-n(p.age1)),yearsRet:Math.max(1,n(p.horizon)-n(p.retire1)),rows,tests:runSelfTests()};
}
function runSelfTests(){
  const results=[global.HNTimeline,global.HNIncome,global.HNTax,global.HNProjection].map(m=>m.runSelfTests());
  return {ok:results.every(r=>r.ok),total:results.reduce((s,r)=>s+r.total,0),failed:results.flatMap(r=>r.failed)};
}
global.HNVerifiedEngine={calculate,runSelfTests,legacyPlan};
})(typeof window!=='undefined'?window:globalThis);