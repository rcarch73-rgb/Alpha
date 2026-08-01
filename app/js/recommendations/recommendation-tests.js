(function(global){
  'use strict';

  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const money=value=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(num(value));

  function safeCalculate(plan,calculateEngine){
    try{
      const calculate=calculateEngine||global.HNVerifiedEngine&&global.HNVerifiedEngine.calculate;
      if(typeof calculate!=='function')return null;
      const answer=calculate(plan);
      return answer&&Number.isFinite(num(answer.sustainable))?answer:null;
    }catch(error){
      console.warn('Recommendation comparison could not be calculated.',error);
      return null;
    }
  }

  function comparePlan(basePlan,baseResult,patch,label,calculateEngine){
    const alternativePlan={...clone(basePlan),...patch};
    const alternative=safeCalculate(alternativePlan,calculateEngine);
    if(!alternative)return null;
    const sustainableDelta=num(alternative.sustainable)-num(baseResult&&baseResult.sustainable);
    const endingDelta=num(alternative.ending)-num(baseResult&&baseResult.ending);
    const ratioDelta=num(alternative.ratio)-num(baseResult&&baseResult.ratio);
    return {
      label,
      patch,
      current:{sustainable:num(baseResult&&baseResult.sustainable),ending:num(baseResult&&baseResult.ending),ratio:num(baseResult&&baseResult.ratio)},
      alternative:{sustainable:num(alternative.sustainable),ending:num(alternative.ending),ratio:num(alternative.ratio)},
      sustainableDelta,endingDelta,ratioDelta,
      summary:`${sustainableDelta>=0?'+':''}${money(sustainableDelta)} per month of modelled sustainable spending and ${endingDelta>=0?'+':''}${money(endingDelta)} in ending assets.`
    };
  }

  function candidate(config){
    return {
      id:config.id,
      title:config.title,
      summary:config.summary,
      why:config.why,
      how:config.how,
      impact:config.impact||'Planning opportunity',
      impactText:config.impactText||'',
      confidence:config.confidence||'Moderate',
      timing:config.timing||'Review annually',
      score:num(config.score),
      category:config.category||'Planning',
      evidence:Array.isArray(config.evidence)?config.evidence:[],
      comparison:config.comparison||null,
      comparisonNote:config.comparisonNote||''
    };
  }

  function buildCandidates(plan,result,options={}){
    const items=[];
    const calculateEngine=options.calculateEngine||global.HNVerifiedEngine&&global.HNVerifiedEngine.calculate;
    const ratio=num(result&&result.ratio);
    const rrsp=num(plan.rrsp1)+num(plan.rrsp2||0);
    const tfsa=num(plan.tfsa1)+num(plan.tfsa2||0);
    const retirementGap=Math.max(0,num(plan.retire1)-num(plan.age1));
    const annualSpend=num(plan.spend)*12;
    const totalSavings=rrsp+tfsa+num(plan.nonreg1)+num(plan.nonreg2||0);

    if(ratio>0&&ratio<1){
      const oneYearLater=comparePlan(plan,result,{retire1:num(plan.retire1)+1,retire2:plan.household==='couple'?num(plan.retire2)+1:num(plan.retire2)},'Retire one year later',calculateEngine);
      const lowerSpend=Math.max(1000,Math.round(num(plan.spend)*.95/100)*100);
      const spendingComparison=comparePlan(plan,result,{spend:lowerSpend},`Reduce spending to ${money(lowerSpend)}/month`,calculateEngine);
      const comparison=[oneYearLater,spendingComparison].filter(Boolean).sort((a,b)=>b.ratioDelta-a.ratioDelta)[0]||null;
      items.push(candidate({
        id:'plan-gap',category:'Plan sustainability',score:110+(1-ratio)*100,impact:'High impact',confidence:'High',timing:'Act now',comparison,
        title:'Test one modest change to close the plan gap',
        summary:'A focused adjustment may restore the plan without forcing several changes at once.',
        why:'Your current spending target is above the amount supported by the projection. Harbour North prioritizes the smallest practical change because it is easier to understand, test, and maintain.',
        how:'Start with the comparison below. Keep the smallest adjustment that brings sustainable spending back in line with your target.',
        impactText:comparison?comparison.summary:`Current sustainable spending is ${money(result&&result.sustainable)} per month versus a ${money(plan.spend)} target.`,
        evidence:['Sustainable spending','Portfolio longevity','Retirement timing','Household cash flow']
      }));
    }

    if(num(plan.bridgeYears)>0&&num(plan.incomeBridge)>0){
      items.push(candidate({
        id:'income-bridge',category:'Income timing',score:98,impact:'High impact',confidence:'High',timing:'Before retirement',
        title:'Plan the income-bridge years deliberately',
        summary:'Coordinate income and withdrawals before both partners are fully retired.',
        why:'The years between the first retirement date and the start of all pensions and government benefits can place unusual pressure on savings. Treating those years separately can improve tax flexibility and reduce reactive withdrawals.',
        how:'Confirm which income continues during the bridge, then compare measured RRSP withdrawals and available TFSA funds before changing the saved plan.',
        impactText:`The bridge spans ${num(plan.bridgeYears)} year${num(plan.bridgeYears)===1?'':'s'} and includes approximately ${money(plan.incomeBridge)} of annual income.`,
        evidence:['Retirement dates','Temporary income','Pension start dates','Government benefits'],
        comparisonNote:'A reliable dollar comparison requires withdrawal-order controls that are not yet exposed in the customer scenario screen.'
      }));
    }

    if(ratio>=1&&rrsp>0){
      const registeredShare=totalSavings?rrsp/totalSavings:0;
      items.push(candidate({
        id:'rrsp-drawdown',category:'Withdrawal strategy',score:78+registeredShare*18,impact:registeredShare>.75?'High impact':'Moderate impact',confidence:'Moderate',timing:'Before CPP and OAS begin',
        title:'Review early registered withdrawals',
        summary:'Measured RRSP withdrawals in lower-income years may smooth taxable income over retirement.',
        why:'A large registered balance can create concentrated taxable withdrawals later. Using some lower-income years before CPP and OAS begin may improve flexibility, but the best amount depends on annual tax results.',
        how:'Compare controlled early RRSP withdrawals against the current withdrawal sequence. Look for lower lifetime tax without weakening portfolio longevity.',
        impactText:`Registered savings represent approximately ${Math.round(registeredShare*100)}% of the investment accounts entered in this plan.`,
        evidence:['RRSP balance','CPP timing','OAS timing','Projected taxable income'],
        comparisonNote:'The verified engine supports the calculation, but the customer scenario screen does not yet expose withdrawal-order controls. No dollar benefit is claimed until that comparison is available.'
      }));
    }

    if(rrsp>0&&tfsa<rrsp*.2){
      const ratioText=rrsp?Math.round(tfsa/rrsp*100):0;
      items.push(candidate({
        id:'tfsa-flexibility',category:'Tax flexibility',score:76+(tfsa<rrsp*.1?12:0),impact:'Moderate impact',confidence:'Moderate',timing:retirementGap>1?'During remaining working years':'At retirement',
        title:'Build more tax-free flexibility',
        summary:'Your registered savings are considerably larger than your TFSA savings.',
        why:'TFSA withdrawals do not increase taxable income or directly reduce income-tested benefits. More tax-free capacity can make future spending and tax decisions easier.',
        how:'Review whether some future savings can be directed to the TFSA while preserving RRSP contributions that still provide a meaningful current tax benefit.',
        impactText:`Your TFSA balance is approximately ${ratioText}% of your registered balance.`,
        evidence:['RRSP balance','TFSA balance','Tax flexibility','Benefit preservation'],
        comparisonNote:'Contribution-room and marginal-tax inputs are required before Harbour North can responsibly calculate a dollar impact.'
      }));
    }

    const cppStart=num(plan.cppStart1||65);
    if(num(plan.cpp1)>0&&cppStart<70&&ratio>=.95){
      items.push(candidate({
        id:'cpp-timing',category:'Guaranteed income',score:72+(ratio>=1.05?8:0),impact:'Planning opportunity',confidence:'Preliminary',timing:'One year before CPP begins',
        title:'Compare delaying CPP',
        summary:'Your plan may have enough portfolio flexibility to test a later CPP start date.',
        why:'Delaying CPP can increase guaranteed, inflation-adjusted income later in life, but the portfolio must support more of the earlier years. The correct choice depends on longevity, tax, and cash-flow trade-offs.',
        how:'Obtain the CPP estimate for each available start age, then compare age 65 and age 70 using those actual benefit amounts.',
        impactText:`The current plan starts CPP at age ${cppStart}.`,
        evidence:['CPP start age','Portfolio longevity','Guaranteed income','Early-retirement cash flow'],
        comparisonNote:'Changing only the start age while keeping the same annual CPP amount would be misleading. Harbour North needs the age-70 CPP estimate before showing a dollar comparison.'
      }));
    }

    if(annualSpend>0&&ratio>=1.15){
      const higherSpend=Math.round(num(plan.spend)*1.05/100)*100;
      const comparison=comparePlan(plan,result,{spend:higherSpend},`Test ${money(higherSpend)}/month spending`,calculateEngine);
      items.push(candidate({
        id:'spending-flexibility',category:'Lifestyle flexibility',score:58,impact:'Planning opportunity',confidence:'Moderate',timing:'Review before retirement',comparison,
        title:'Decide how to use the plan’s extra flexibility',
        summary:'The projection supports more than the spending target currently entered.',
        why:'A healthy margin can support additional lifestyle spending, a stronger legacy, or more conservative assumptions. The important decision is how you want to use that flexibility.',
        how:'Test a modest spending increase and compare it with keeping the extra margin as a reserve or legacy goal.',
        impactText:comparison?comparison.summary:`Modelled sustainable spending exceeds the target by ${money(num(result.sustainable)-num(plan.spend))} per month.`,
        evidence:['Sustainable spending','Ending assets','Lifestyle target','Planning margin']
      }));
    }

    items.push(candidate({
      id:'annual-review',category:'Plan maintenance',score:35,impact:'Planning opportunity',confidence:'High',timing:'Review annually',
      title:'Refresh the plan once each year',
      summary:'Update balances, income, and spending after meaningful changes.',
      why:'Retirement plans are most useful when they reflect current balances and real-life decisions. Reacting to every market move adds noise; a calm annual review keeps the plan relevant.',
      how:'Choose one consistent month each year to update the plan, and review it sooner only after a major financial or life change.',
      impactText:'Keeps recommendations grounded in current information.',
      evidence:['Account balances','Income changes','Spending changes','Retirement dates'],
      comparisonNote:'This is a maintenance action rather than a financial scenario.'
    }));

    return items;
  }

  function fallbackCandidates(plan,result){
    const items=[];
    const cppEntered=num(plan.cpp1)+(plan.household==='couple'?num(plan.cpp2):0);
    const oasEntered=num(plan.oas1)+(plan.household==='couple'?num(plan.oas2):0);
    const assumptions=[
      `Investment return: ${num(plan.returnRate)||5}%`,
      `Inflation: ${num(plan.inflationRate)||2}%`,
      `Planning horizon: age ${num(plan.horizon)||95}`
    ];

    if(cppEntered>0||oasEntered>0){
      items.push(candidate({
        id:'benefit-estimates',category:'Government benefits',score:34,impact:'Planning opportunity',confidence:'High',timing:'Review annually',
        title:'Confirm your CPP and OAS estimates',
        summary:'Keep government-benefit amounts and start ages aligned with your latest statements.',
        why:'CPP and OAS can materially affect the retirement-income bridge and later guaranteed income. Current estimates make the projection more useful and reduce avoidable surprises.',
        how:'Update the plan whenever a new CPP estimate or OAS entitlement amount becomes available, especially before changing a start age.',
        impactText:'Improves the reliability of projected retirement income.',
        evidence:['CPP amount','OAS amount','Benefit start ages','Guaranteed income'],
        comparisonNote:'This is an input-quality action. A financial comparison requires alternate age-specific benefit estimates.'
      }));
    }

    items.push(candidate({
      id:'assumption-review',category:'Planning assumptions',score:32,impact:'Planning opportunity',confidence:'High',timing:'Review annually',
      title:'Confirm the assumptions behind the plan',
      summary:'Make sure return, inflation, and planning horizon still reflect how you want to plan.',
      why:'Small assumption changes can meaningfully alter a long retirement projection. Reviewing them periodically keeps the result grounded without reacting to short-term market noise.',
      how:'Review the three core assumptions once a year and change them only when your long-term planning view changes.',
      impactText:assumptions.join(' · '),
      evidence:['Investment return','Inflation','Planning horizon','Long-term uncertainty'],
      comparisonNote:'Use the Scenarios screen to test a more conservative or optimistic assumption set without changing the saved plan.'
    }));

    items.push(candidate({
      id:'account-refresh',category:'Plan maintenance',score:31,impact:'Planning opportunity',confidence:'High',timing:'After annual statements arrive',
      title:'Refresh your account balances',
      summary:'Replace estimates with current RRSP, TFSA, and non-registered balances.',
      why:'Current balances are one of the strongest drivers of the projection. Updating them annually keeps sustainable spending and ending-asset estimates relevant.',
      how:'Use your latest statements and update all account balances during the same annual review.',
      impactText:'Keeps the projection tied to your actual savings.',
      evidence:['RRSP balance','TFSA balance','Non-registered balance','Contribution levels'],
      comparisonNote:'This is a data-maintenance action rather than a temporary scenario.'
    }));

    return items;
  }

  function resolvePlan(plan, fallback){
    const source=plan&&typeof plan==='object'?plan:(fallback&&typeof fallback==='object'?fallback:global.plan);
    if(!source||typeof source!=='object')return {};
    return clone(source);
  }

  function runCandidateTest(options={}){
    const plan=resolvePlan(options.plan,global.plan);
    const modifiedInputs=options.modifiedInputs||{};
    if(!modifiedInputs||typeof modifiedInputs!=='object')throw new TypeError('Candidate tests require modifiedInputs.');
    const modifiedPlan={...plan,...modifiedInputs};
    const calculateEngine=options.calculateEngine||global.HNVerifiedEngine&&global.HNVerifiedEngine.calculate;
    const engineResult=safeCalculate(modifiedPlan,calculateEngine);
    const monthlyIncome=engineResult&&Number.isFinite(num(engineResult.sustainable))?num(engineResult.sustainable):null;
    const endingAssets=engineResult&&Number.isFinite(num(engineResult.ending))?num(engineResult.ending):null;
    const taxes=engineResult&&Array.isArray(engineResult.rows)&&engineResult.rows.length?num(engineResult.rows[engineResult.rows.length-1]?.projection?.tax):
      (engineResult&&Array.isArray(engineResult.series)&&engineResult.series.length?num(engineResult.series[engineResult.series.length-1]?.tax):null);
    return {
      id:options.id,
      title:options.title,
      description:options.description,
      modifiedInputs,
      monthlyIncome,
      endingAssets,
      confidence:engineResult&&Number.isFinite(num(engineResult.confidence))?num(engineResult.confidence):null,
      taxes,
      success:Boolean(engineResult&&Number.isFinite(num(engineResult.sustainable))&&Number.isFinite(num(engineResult.ending)))
    };
  }

  function cppAtAge(plan,age,calculateEngine){
    const current=resolvePlan(plan,global.plan);
    const modifiedInputs={};
    if(current.household==='couple'){ 
      if(num(current.cpp1)>0||num(current.cppStart1)>0){modifiedInputs.cppStart1=age;}
      if(num(current.cpp2)>0||num(current.cppStart2)>0){modifiedInputs.cppStart2=age;}
    }else if(num(current.cpp1)>0||num(current.cppStart1)>0){
      modifiedInputs.cppStart1=age;
    }
    return runCandidateTest({
      id:`cpp-at-${age}`,
      title:`CPP starts at age ${age}`,
      description:`Test the effect of starting CPP at age ${age}.`,
      plan:current,
      calculateEngine,
      modifiedInputs
    });
  }

  function cppAt60(plan,calculateEngine){
    return cppAtAge(plan,60,calculateEngine);
  }

  function cppAt65(plan,calculateEngine){
    return cppAtAge(plan,65,calculateEngine);
  }

  function cppAt70(plan,calculateEngine){
    return cppAtAge(plan,70,calculateEngine);
  }

  function runCppStrategyDiagnostic(){
    const calculateEngine=global.HNVerifiedEngine&&global.HNVerifiedEngine.calculate;
    if(typeof calculateEngine!=='function')return null;
    const basePlan=resolvePlan(global.plan,global.plan);
    const plan60=clone(basePlan);
    const plan65=clone(basePlan);
    const plan70=clone(basePlan);
    if(plan60.household==='couple'){
      if(num(plan60.cpp1)>0||num(plan60.cppStart1)>0)plan60.cppStart1=60;
      if(num(plan60.cpp2)>0||num(plan60.cppStart2)>0)plan60.cppStart2=60;
    }else if(num(plan60.cpp1)>0||num(plan60.cppStart1)>0){
      plan60.cppStart1=60;
    }
    if(plan65.household==='couple'){
      if(num(plan65.cpp1)>0||num(plan65.cppStart1)>0)plan65.cppStart1=65;
      if(num(plan65.cpp2)>0||num(plan65.cppStart2)>0)plan65.cppStart2=65;
    }else if(num(plan65.cpp1)>0||num(plan65.cppStart1)>0){
      plan65.cppStart1=65;
    }
    if(plan70.household==='couple'){
      if(num(plan70.cpp1)>0||num(plan70.cppStart1)>0)plan70.cppStart1=70;
      if(num(plan70.cpp2)>0||num(plan70.cppStart2)>0)plan70.cppStart2=70;
    }else if(num(plan70.cpp1)>0||num(plan70.cppStart1)>0){
      plan70.cppStart1=70;
    }
    const result60=cppAt60(basePlan,calculateEngine);
    const result65=cppAt65(basePlan,calculateEngine);
    const result70=cppAt70(basePlan,calculateEngine);
    console.log(JSON.stringify({result60,result65,result70},null,2));
    console.log(JSON.stringify({
      cpp60:{cppStart1:plan60.cppStart1,cppStart2:plan60.cppStart2},
      cpp65:{cppStart1:plan65.cppStart1,cppStart2:plan65.cppStart2},
      cpp70:{cppStart1:plan70.cppStart1,cppStart2:plan70.cppStart2}
    },null,2));
    return {result60,result65,result70,plans:{cpp60:plan60,cpp65:plan65,cpp70:plan70}};
  }

  function retirementAgePlus1(plan,calculateEngine){
    const current=resolvePlan(plan,global.plan);
    return runCandidateTest({
      id:'retirement-age-plus-1',
      title:'Retirement age +1 year',
      description:'Test the effect of delaying retirement by one year.',
      plan:current,
      calculateEngine,
      modifiedInputs:{retire1:num(current.retire1)+1}
    });
  }

  function retirementAgePlus2(plan,calculateEngine){
    const current=resolvePlan(plan,global.plan);
    return runCandidateTest({
      id:'retirement-age-plus-2',
      title:'Retirement age +2 years',
      description:'Test the effect of delaying retirement by two years.',
      plan:current,
      calculateEngine,
      modifiedInputs:{retire1:num(current.retire1)+2}
    });
  }

  function reduceSpending250(plan,calculateEngine){
    const current=resolvePlan(plan,global.plan);
    return runCandidateTest({
      id:'reduce-spending-250',
      title:'Reduce spending by $250/month',
      description:'Test the effect of lowering monthly spending by $250.',
      plan:current,
      calculateEngine,
      modifiedInputs:{spend:Math.max(0,num(current.spend)-250)}
    });
  }

  function reduceSpending500(plan,calculateEngine){
    const current=resolvePlan(plan,global.plan);
    return runCandidateTest({
      id:'reduce-spending-500',
      title:'Reduce spending by $500/month',
      description:'Test the effect of lowering monthly spending by $500.',
      plan:current,
      calculateEngine,
      modifiedInputs:{spend:Math.max(0,num(current.spend)-500)}
    });
  }

  function increaseSavings250(plan,calculateEngine){
    const current=resolvePlan(plan,global.plan);
    return runCandidateTest({
      id:'increase-savings-250',
      title:'Increase savings by $250/month',
      description:'Test the effect of increasing monthly retirement savings contributions by $250.',
      plan:current,
      calculateEngine,
      modifiedInputs:{rrspContrib1:num(current.rrspContrib1)+250}
    });
  }

  function increaseSavings500(plan,calculateEngine){
    const current=resolvePlan(plan,global.plan);
    return runCandidateTest({
      id:'increase-savings-500',
      title:'Increase savings by $500/month',
      description:'Test the effect of increasing monthly retirement savings contributions by $500.',
      plan:current,
      calculateEngine,
      modifiedInputs:{rrspContrib1:num(current.rrspContrib1)+500}
    });
  }

  function runSelfTests(){
    const failures=[];let total=0;
    const test=(name,fn)=>{total++;try{if(!fn())failures.push(name)}catch{failures.push(name)}};
    test('Plan-gap candidate generated for a weak plan',()=>buildCandidates({spend:5000,rrsp1:100000,tfsa1:10000,retire1:65,age1:40,household:'single',bridgeYears:0,incomeBridge:0,cpp1:0,cppStart1:65}, {ratio:0.85,sustainable:4200,ending:500000}).some(item=>item.id==='plan-gap'));
    test('Fallback assumptions remain available',()=>fallbackCandidates({cpp1:1000,cpp2:0,household:'single',returnRate:5,inflationRate:2,horizon:95},{ratio:1}).some(item=>item.id==='assumption-review'));
    test('CPP at 60 test returns a candidate result',()=>Boolean(cppAt60({spend:4000,retire1:65,age1:55,rrsp1:100000,tfsa1:20000,nonreg1:5000,household:'single',cpp1:15000,cppStart1:65,returnRate:5,inflationRate:2,horizon:95})));
    test('CPP at 65 test returns a candidate result',()=>Boolean(cppAt65({spend:4000,retire1:65,age1:55,rrsp1:100000,tfsa1:20000,nonreg1:5000,household:'single',cpp1:15000,cppStart1:65,returnRate:5,inflationRate:2,horizon:95})));
    test('CPP at 70 test returns a candidate result',()=>Boolean(cppAt70({spend:4000,retire1:65,age1:55,rrsp1:100000,tfsa1:20000,nonreg1:5000,household:'single',cpp1:15000,cppStart1:65,returnRate:5,inflationRate:2,horizon:95})));
    test('Retirement age test returns a candidate result',()=>Boolean(retirementAgePlus1({spend:4000,retire1:65,age1:55,rrsp1:100000,tfsa1:20000,nonreg1:5000,household:'single',returnRate:5,inflationRate:2,horizon:95}))); 
    test('Spending reduction test returns a candidate result',()=>Boolean(reduceSpending250({spend:4000,retire1:65,age1:55,rrsp1:100000,tfsa1:20000,nonreg1:5000,household:'single',returnRate:5,inflationRate:2,horizon:95})));
    return {ok:failures.length===0,total,failed:failures};
  }

  global.HNRecommendationTests={safeCalculate,comparePlan,candidate,buildCandidates,fallbackCandidates,money,num,clone,runSelfTests,runCppStrategyDiagnostic,cppAt60,cppAt65,cppAt70,retirementAgePlus1,retirementAgePlus2,reduceSpending250,reduceSpending500,increaseSavings250,increaseSavings500};
  if(typeof window!=='undefined' && global!==window){
    window.HNRecommendationTests=global.HNRecommendationTests;
  }
})(typeof window!=='undefined'?window:globalThis);
