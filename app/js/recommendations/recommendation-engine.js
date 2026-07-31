(function(){
  'use strict';

  const num=value=>Number.isFinite(Number(value))?Number(value):0;

  function candidate({id,title,summary,why,how,impact='Planning opportunity',confidence='Moderate',timing='Review annually',score=0,category='Planning'}){
    return {id,title,summary,why,how,impact,confidence,timing,score,category};
  }

  function buildCandidates(plan,result){
    const items=[];
    const ratio=num(result&&result.ratio);
    const rrsp=num(plan.rrsp1)+num(plan.rrsp2||0);
    const tfsa=num(plan.tfsa1)+num(plan.tfsa2||0);
    const retirementGap=Math.max(0,num(plan.retire1)-num(plan.age1));

    if(num(plan.bridgeYears)>0&&num(plan.incomeBridge)>0){
      items.push(candidate({
        id:'income-bridge',category:'Income timing',score:96,impact:'High impact',confidence:'High',timing:'Before retirement',
        title:'Plan the income-bridge years deliberately',
        summary:'Coordinate income and withdrawals before both partners are fully retired.',
        why:'The years between the first retirement date and the start of all pensions and government benefits can place unusual pressure on savings. Planning those years separately can improve tax flexibility and reduce unnecessary withdrawals.',
        how:'Review which income continues during the bridge, then test measured RRSP withdrawals and available TFSA funds rather than drawing from accounts reactively.'
      }));
    }

    if(ratio>0&&ratio<1){
      items.push(candidate({
        id:'plan-gap',category:'Plan sustainability',score:100,impact:'High impact',confidence:'High',timing:'Act now',
        title:'Test one modest change to close the plan gap',
        summary:'A small spending or retirement-date adjustment may restore the plan without adding complexity.',
        why:'Your current sustainable spending is below the target entered in the plan. A focused adjustment is usually more effective than adding several new assumptions or products.',
        how:'Use Scenarios to compare a slightly later retirement date and a modest reduction in monthly spending. Keep the smallest change that brings the plan back on track.'
      }));
    } else {
      items.push(candidate({
        id:'rrsp-drawdown',category:'Withdrawal strategy',score:82,impact:'Moderate impact',confidence:'Moderate',timing:'Before CPP and OAS begin',
        title:'Review early registered withdrawals',
        summary:'Measured RRSP withdrawals before CPP and OAS may smooth taxable income over retirement.',
        why:'Large registered balances can create higher taxable withdrawals later. Using lower-income years before government benefits begin may reduce future tax concentration.',
        how:'Compare the current withdrawal sequence with a scenario that draws a controlled amount from RRSP savings during the early retirement years.'
      }));
    }

    if(rrsp>0&&tfsa<rrsp*.15){
      items.push(candidate({
        id:'tfsa-flexibility',category:'Tax flexibility',score:78,impact:'Moderate impact',confidence:'Moderate',timing:retirementGap>1?'During remaining working years':'At retirement',
        title:'Build more tax-free flexibility',
        summary:'Your registered savings are much larger than your TFSA savings.',
        why:'TFSA funds can be withdrawn without increasing taxable income or affecting income-tested benefits. More tax-free capacity provides useful flexibility later in retirement.',
        how:'Review whether some future savings can be directed to the TFSA, while keeping RRSP contributions that still provide a meaningful current tax benefit.'
      }));
    }

    const cppStart=num(plan.cppStart1||65);
    if(num(plan.cpp1)>0&&cppStart<70&&ratio>=.95){
      items.push(candidate({
        id:'cpp-timing',category:'Guaranteed income',score:74,impact:'Planning opportunity',confidence:'Preliminary',timing:'One year before CPP begins',
        title:'Compare delaying CPP',
        summary:'Your plan may have enough flexibility to test a later CPP start date.',
        why:'Delaying CPP increases guaranteed, inflation-adjusted income later in life, but requires the portfolio to fund more of the earlier years.',
        how:'Run a scenario with CPP beginning at age 70 and compare lifetime cash flow, taxes, and ending assets before making a decision.'
      }));
    }

    items.push(candidate({
      id:'annual-review',category:'Plan maintenance',score:35,impact:'Planning opportunity',confidence:'High',timing:'Review annually',
      title:'Refresh the plan once each year',
      summary:'Update balances, income, and spending after meaningful changes.',
      why:'Retirement plans become more useful when they reflect current balances and real-life decisions. Frequent reactions to market movement can add noise, while a calm annual review keeps the plan relevant.',
      how:'Choose one consistent month each year to update the plan, and review it sooner only after a major financial or life change.'
    }));

    return items;
  }

  function rank(plan,result,limit=3){
    return buildCandidates(plan||{},result||{})
      .filter(item=>item&&item.title)
      .sort((a,b)=>b.score-a.score)
      .slice(0,Math.max(0,limit));
  }

  window.HNRecommendationEngine={rank,buildCandidates};
})();
