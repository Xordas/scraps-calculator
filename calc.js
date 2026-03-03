 /*
 * abbreviations i used (i forget sometimes so i made this)
 * it makes the code cleaner i swear
 * ppr = Price Per Roll
 * dc  = Default roll Chance
 * ppu = Price Per Upgrade
 * ui  = Upgrade chance Increase
 * cpr = Current Per roll chance
 * tgt = Target chance
 * bgt = Budget
 * u   = upgrades
 * r   = rolls
 * tc  = Total Cost
 * uc  = Upgrade Cost
 * p   = probability
 * att = attempts
 * res = results
 * td  = Target Decimal, so 50% is .5
 * P   = Probability (decimal)
 * maxU = Max Upgrades
 * maxR = Max Rolls
 * sp  = Success Probability
 * rem = Remaining
 * cum = Cumulative, clearly like what else could it be
 * Other stuff is easy to understand or just a variable name (most of the time)
 */
 
 
 
 let currentMode = 'target';
  let chartInst = null;
  let shopItems = [];

  let selectedItemIndex = null;

  async function loadItems() {
    try { // Cors :(
      const res = await fetch('https://cors-anywhere.com/https://api.scraps.hackclub.com/shop/items');
      const raw = await res.json();
      shopItems = raw.map(i => ({
        name: i.name,
        image_url: i.image,
        stock: i.count,
        base_roll_cost: i.displayRollCost,
        base_chance: i.baseProbability,
        upgrade_cost: i.nextUpgradeCost,
        upgrade_chance_increase: i.boostAmount,
        price: i.price
      }));
      renderDropdown('');
    } catch(e) {
      const dropdown = document.getElementById('itemDropdown');
      dropdown.innerHTML = '<div class="item-dropdown-empty">couldn\'t load items</div>';
    }
  }


  function renderDropdown(query) {
    const dropdown = document.getElementById('itemDropdown');
    const q = query.toLowerCase().trim();
    const filtered = q ? shopItems.filter(item => item.name.toLowerCase().includes(q)) : shopItems;
    
    if (filtered.length === 0) {
      dropdown.innerHTML = '<div class="item-dropdown-empty">no items found, try refreshing the page</div>';
      return;
    }
    
    dropdown.innerHTML = filtered.map((item, filteredIdx) => {
      const originalIdx = shopItems.indexOf(item);
      const stockText = item.stock != null ? ` <span style="color:var(--muted2)">·</span> ${item.stock} in stock` : '';
      const isSelected = originalIdx === selectedItemIndex ? ' selected' : '';
      return `<div class="item-dropdown-item${isSelected}" data-idx="${originalIdx}">${item.name}${stockText}</div>`;
    }).join('');
    
    dropdown.querySelectorAll('.item-dropdown-item').forEach(el => {
      el.addEventListener('click', () => selectItem(parseInt(el.dataset.idx)));
    });
  }

  function selectItem(idx) {
    selectedItemIndex = idx;
    const item = shopItems[idx];
    document.getElementById('itemSearchInput').value = item.name;
    document.getElementById('itemDropdown').classList.remove('show');
    document.getElementById('PricePerRollInput').value = item.base_roll_cost;
    document.getElementById('DefaultRollChanceInput').value = item.base_chance;
    document.getElementById('PricePerUpgradeInput').value = item.upgrade_cost;
    document.getElementById('UpgradeChanceIncreaseInput').value = item.upgrade_chance_increase;
    document.getElementById('ItemPriceInput').value = item.price ?? '';
    renderDropdown('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('itemSearchInput');
    const dropdown = document.getElementById('itemDropdown');
    
    input.addEventListener('focus', () => {
      dropdown.classList.add('show');
      renderDropdown(input.value);
    });
    
    input.addEventListener('input', () => {
      dropdown.classList.add('show');
      renderDropdown(input.value);
    });
    
    document.addEventListener('click', (e) => {
      if (!document.getElementById('itemPicker').contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });
  });


  loadItems();

  function setMode(m) {
    currentMode = m;
    document.getElementById('mainGrid').className = 'main-grid mode-' + m;
    document.getElementById('tab-general').classList.toggle('active', m === 'general');
    document.getElementById('tab-target').classList.toggle('active', m === 'target');
    document.getElementById('tab-budget').classList.toggle('active', m === 'budget');
  }
  setMode('general');

  function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = msg; el.classList.add('show');
  }
  function clearError() { document.getElementById('errorMsg').classList.remove('show'); }

  function validateCommonFields(ppr, dc, ppu, ui) {
    if ([ppr, dc, ppu, ui].some(v => isNaN(v))) return 'fill in all common fields.';
    if (ppr <= 0) return 'Price per Roll must be greater than 0.';
    if (ppu <= 0) return 'Price per Upgrade must be greater than 0.';
    if (dc <= 0 || dc > 100) return 'Default Roll Chance must be between 0 and 100 (exclusive).';
    if (ui <= 0) return 'Upgrade Chance Increase must be greater than 0.';
    return null;
  }



  function animateTile(id, delay) {
    const el = document.getElementById(id);
    el.style.transitionDelay = delay + 's';
    el.classList.remove('show');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  }

  function drawChart(cpr, optRolls) {
    const maxX = Math.max(optRolls * 2, 12);
    const labels = [], data = [], optData = [];
    const P = cpr / 100;
    for (let r = 0; r <= maxX; r++) {
      labels.push(r);
      const v = P >= 1 ? 100 : (1 - Math.pow(1 - P, r)) * 100;
      data.push(v);
      optData.push(r === optRolls ? v : null);
    }
    if (chartInst) chartInst.destroy();
    chartInst = new Chart(document.getElementById('probChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Success %', data,
            borderColor: '#338eda', backgroundColor: 'rgba(51,142,218,.06)',
            borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4,
          },
          {
            label: 'Optimal', data: optData,
            borderColor: 'transparent', backgroundColor: '#33d6a0',
            pointRadius: 7, pointHoverRadius: 9, showLine: false,
          }
        ]

      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 650, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#222', borderColor: '#333', borderWidth: 1,
            titleColor: '#888', bodyColor: '#f0f0f0',
            callbacks: {
              title: c => 'roll ' + c[0].label,
              label: c => c.dataset.label === 'Success %'
                ? ' ' + c.parsed.y.toFixed(2) + '%'
                : ' optimal point (' + c.parsed.y.toFixed(2) + '%)'
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#555', font: { size: 10 } },
            grid:  { color: 'rgba(255,255,255,.03)' },
            title: { display: true, text: 'number of rolls', color: '#555', font: { size: 11 } }
          },
          y: {
            min: 0, max: 100,
            ticks: { color: '#555', font: { size: 10 }, callback: v => v + '%' },
            grid:  { color: 'rgba(255,255,255,.03)' },
          }
        }
      }
    });
  }

  function buildSteps(upgrades, rolls, ppr, ppu, pityThreshold, cpr) {
    const tbody = document.getElementById('StepsBody');
    tbody.innerHTML = '';
    let cum = 0;
    let rowIdx = 1;
    for (let i = 0; i < upgrades; i++) {
      const cost = Math.floor(ppu / Math.pow(1.05, i));
      cum += cost;
      const tr = tbody.insertRow();
      tr.innerHTML = `<td>${rowIdx}</td><td>Upgrade #${i+1}</td><td><span class="row-badge rb-up">upgrade</span></td><td>${cost.toFixed(2)}</td><td>${cum.toFixed(2)}</td><td></td>`;
      rowIdx++;
    }
    const perRollChance = cpr / 100;
    for (let r = 1; r <= rolls; r++) {
      const marginal = Math.floor(ppr * Math.pow(1.05, r - 1));
      cum += marginal;
      const isPity = pityThreshold > 0 && cum >= pityThreshold;
      const cumulativeChance = (1 - Math.pow(1 - perRollChance, r)) * 100;
      const tr = tbody.insertRow();
      if (isPity) {
        tr.innerHTML = `<td>${rowIdx}</td><td>Roll #${r} - <strong style="color:var(--orange)">guaranteed! (pity)</strong></td><td><span class="row-badge rb-pity">pity</span></td><td>${marginal.toFixed(2)}</td><td>${cum.toFixed(2)}</td><td>100%</td>`;
        break;
      }
      tr.innerHTML = `<td>${rowIdx}</td><td>Roll #${r}</td><td><span class="row-badge rb-roll">roll</span></td><td>${marginal.toFixed(2)}</td><td>${cum.toFixed(2)}</td><td>${cumulativeChance.toFixed(2)}%</td>`;
      rowIdx++;
    }
  }

  function showResults(res, mode, budget) {
    document.getElementById('emptyCard').style.display = 'none'; //  waiter waiter! more document.getElementById please!
    document.getElementById('resultsSection').classList.add('show');

    document.getElementById('sv-prob').textContent = (res.prob * 100).toFixed(2) + '%';
    setTimeout(() => { document.getElementById('probBar').style.width = Math.min(res.prob * 100, 100) + '%'; }, 80);

    const ui = parseFloat(document.getElementById('UpgradeChanceIncreaseInput').value);
    document.getElementById('sv-upgrades').textContent = res.upgrades;
    document.getElementById('sv-upgrsub').textContent = '+' + (res.upgrades * ui).toFixed(1) + '% chance boost';

    document.getElementById('sv-rolls').textContent = res.rolls;
    document.getElementById('sv-rollsub').textContent = res.cpr.toFixed(2) + '% per roll';

    if (mode === 'target') {
      document.getElementById('costLbl').textContent = 'total cost';
      document.getElementById('sv-cost').textContent = res.cost.toFixed(2);
      document.getElementById('budgetCard').style.display = 'none';

    } else if (mode === 'budget') {
      document.getElementById('costLbl').textContent = 'cost used';
      document.getElementById('sv-cost').textContent = res.cost.toFixed(2);
      document.getElementById('sv-costsub').textContent = 'of ' + budget + ' (' + ((res.cost/budget)*100).toFixed(1) + '%)';
      document.getElementById('budgetCard').style.display = 'block';

      setTimeout(() => { document.getElementById('budgetBar').style.width = Math.min((res.cost/budget)*100,100) + '%'; }, 80);
      document.getElementById('budgetUsedLbl').textContent = 'used: ' + res.cost.toFixed(2);
      document.getElementById('budgetLeftLbl').textContent = 'left: ' + (budget - res.cost).toFixed(2);
    } else {

      document.getElementById('costLbl').textContent = 'cost';
      document.getElementById('sv-cost').textContent = res.cost.toFixed(2);
      document.getElementById('sv-costsub').textContent = 'scraps';
      document.getElementById('budgetCard').style.display = 'none';
    }

    [14,16,20,24].forEach((rate,i) => {
      document.getElementById('t'+(i+1)).textContent = (res.cost / rate).toFixed(2) + 'h';
    });

    ['st-prob','st-upgrades','st-rolls','st-cost'].forEach((id,i) => animateTile(id, i * 0.05));
  
    const rawItemPrice = parseFloat(document.getElementById('ItemPriceInput').value);
    const stepsThreshold = rawItemPrice > 0 ? rawItemPrice * 1.25 : 0;
    drawChart(res.cpr, res.rolls);
    buildSteps(res.upgrades, res.rolls,
      parseFloat(document.getElementById('PricePerRollInput').value),
      parseFloat(document.getElementById('PricePerUpgradeInput').value),
      stepsThreshold, res.cpr);

    document.getElementById('computeInfo').textContent =
      `computed in ${res.elapsed.toFixed(2)} ms · ${res.attempts.toLocaleString()} combinations tested`;
  }

  // formula for this: sum of floor(ppr * 1.05^0) + floor(ppr * 1.05^1) + ... + floor(ppr * 1.05^(r-1))
  // I HATE THIS SO MUCH
  function rollCostTotal(ppr, r) {
    if (r <= 0) return 0;
    let sum = 0;
    for (let i = 0; i < r; i++) sum += Math.floor(ppr * Math.pow(1.05, i));
    return sum;
  }

  function getPityRoll(ppr, uCost, pityThreshold) {
    if (!pityThreshold || pityThreshold <= 0) return Infinity;
    if (uCost >= pityThreshold) return 1;
    let sum = 0;
    for (let i = 0; i < 100000; i++) {
      sum += Math.floor(ppr * Math.pow(1.05, i));
      if (uCost + sum >= pityThreshold) return i + 1;
    }
    return Infinity;
  }

  /* % odds one */
  function calcTarget(ppr, dc, ppu, ui, target, pityThreshold) {
    const td = target / 100;
    const t0 = performance.now();
    let att = 0, bestCost = Infinity, bu = 0, br = 0, bcpr = 0;
    const maxU = Math.ceil((100-dc)/ui);
    const uCosts = [0];
    for (let i=0;i<maxU;i++) uCosts.push(uCosts[i] + Math.floor(ppu / Math.pow(1.05,i)));
    const baseP = Math.min(dc/100,.9999);
    const maxR = baseP > 0 ? Math.ceil(Math.log(1-td)/Math.log(1-baseP)) : 1e6;
    for (let u=0;u<=maxU;u++) {
      let cpr = dc + u*ui; if (cpr>100) cpr=100;
      const P = cpr/100, uc = uCosts[u];
      const pityRoll = getPityRoll(ppr, uc, pityThreshold);
      for (let r=1;r<=Math.min(maxR, pityRoll);r++) {
        att++;
        const p = r >= pityRoll ? 1 : (P>=1 ? 1 : 1-Math.pow(1-P,r));
        if (p >= td) {
          const tc = uc + rollCostTotal(ppr, r);
          if (tc < bestCost) { bestCost=tc; bu=u; br=r; bcpr=cpr; }
          break;
        }
      }
    }
    const chosenPityRoll = getPityRoll(ppr, uCosts[bu], pityThreshold);
    const prob = br >= chosenPityRoll
      ? 1
      : (bcpr >= 100 ? 1 : 1-Math.pow(1-bcpr/100, br));
    return { prob, upgrades:bu, rolls:br, cpr:bcpr, cost:bestCost, attempts:att, elapsed:performance.now()-t0 };
  }

  /* budget one */
  function calcBudget(ppr, dc, ppu, ui, budget, pityThreshold) {
    const t0 = performance.now();
    let att=0, bestP=-1, bu=0, br=0, bcpr=0, bestCost=0;
    const EPS=1e-6, maxU=Math.ceil((100-dc)/ui);
    const uCosts=[0];
    for (let i=0;i<maxU;i++) uCosts.push(uCosts[i]+Math.floor(ppu/Math.pow(1.05,i)));
    for (let u=0;u<=maxU;u++) {
      let cpr=dc+u*ui; if(cpr>100)cpr=100;
      const P=cpr/100, uc=uCosts[u];
      if(uc>budget) break;
      const rem=budget-uc;
      // find the max rolls we can do (capped at pity roll)
      const pityRoll = getPityRoll(ppr, uc, pityThreshold);
      let maxR=0; { let s=0; for(let i=0;;i++){ s+=Math.floor(ppr*Math.pow(1.05,i)); if(s>rem)break; maxR=i+1; } }
      maxR = Math.min(maxR, pityRoll);
      for (let r=1;r<=maxR;r++) {
        att++;
        let sp = r >= pityRoll ? 1 : (1-Math.pow(1-P,r));
        if(sp>=0.995)sp=1;
        const tc=uc+rollCostTotal(ppr, r);
        if(tc>budget) break;
        if(sp>bestP||(Math.abs(sp-bestP)<EPS&&tc<bestCost)){
          bestP=sp; bu=u; br=r; bcpr=cpr; bestCost=tc;
        }
        if(sp>=1) break;
      }
    }
    const chosenPityRoll = getPityRoll(ppr, uCosts[bu], pityThreshold);
    const prob = br >= chosenPityRoll ? 1 : bestP;
    return { prob, upgrades:bu, rolls:br, cpr:bcpr, cost:bestCost, attempts:att, elapsed:performance.now()-t0 };
  }

  /* general one, pretty much target 90% */
  function calcGeneral(ppr, dc, ppu, ui, pityThreshold) {
    const t0 = performance.now();
    const maxU = Math.ceil((100 - dc) / ui);
    const uCosts = [0];
    for (let i = 0; i < maxU; i++) uCosts.push(uCosts[i] + Math.floor(ppu / Math.pow(1.05, i)));

    let bestCost = Infinity, bu = 0, br = 1, bcpr = dc, bestProb = 0;
    let att = 0;

    for (let u = 0; u <= maxU; u++) {
      att++;
      let cpr = dc + u * ui; if (cpr > 100) cpr = 100;
      const P = Math.min(cpr / 100, 1);
      const uc = uCosts[u];
      const pityRoll = getPityRoll(ppr, uc, pityThreshold);

      let planRolls;
      if (P >= 1) {
        planRolls = 1;
      } else {
        const naturalRolls = Math.ceil(Math.log(0.1) / Math.log(1 - P));
        planRolls = isFinite(pityRoll) ? Math.min(naturalRolls, pityRoll) : naturalRolls;
      }

      const planProb = (isFinite(pityRoll) && planRolls >= pityRoll)
        ? 1
        : (P >= 1 ? 1 : 1 - Math.pow(1 - P, planRolls));
      const planCost = uc + rollCostTotal(ppr, planRolls);

      if (planCost < bestCost) {
        bestCost = planCost;
        bu = u;
        br = planRolls;
        bcpr = cpr;
        bestProb = planProb;

      }
    }

    return {
      prob: bestProb, upgrades: bu, rolls: br, cpr: bcpr,
      cost: bestCost, attempts: att, elapsed: performance.now() - t0
    };
  }

  function calculate() {
    clearError();
    const btn = document.getElementById('CalculateButton');
    btn.textContent = 'calculating…'; btn.classList.add('loading');
    setTimeout(() => {
      try {
        const ppr = parseFloat(document.getElementById('PricePerRollInput').value);
        const dc  = parseFloat(document.getElementById('DefaultRollChanceInput').value);
        const ppu = parseFloat(document.getElementById('PricePerUpgradeInput').value);
        const ui  = parseFloat(document.getElementById('UpgradeChanceIncreaseInput').value);
        const commonErr = validateCommonFields(ppr, dc, ppu, ui);
        if (commonErr) { showError(commonErr); return; }
        const rawItemPrice = parseFloat(document.getElementById('ItemPriceInput').value);
        const pityThreshold = rawItemPrice > 0 ? rawItemPrice * 1.25 : 0;
        let res;
        if (currentMode === 'general') {
          res = calcGeneral(ppr,dc,ppu,ui,pityThreshold);
          showResults(res,'general',null);
        } else if (currentMode === 'target') {
          const tgt = parseFloat(document.getElementById('TargetChanceInput').value);
          if (isNaN(tgt)) { showError('enter a target chance.'); return; }
          if (tgt <= 0 || tgt > 100) { showError('Target chance must be between 0 and 100.'); return; }

          res = calcTarget(ppr,dc,ppu,ui,tgt,pityThreshold);
          if (!isFinite(res.cost)) { showError('no valid combination found, check your inputs.'); return; }

          showResults(res,'target',null);
        } else {
          const bgt = parseFloat(document.getElementById('BudgetInput').value);
          if (isNaN(bgt)) { showError('enter a budget.'); return; }
          if (bgt <= 0) { showError('Budget must be greater than 0.'); return; }
          res = calcBudget(ppr,dc,ppu,ui,bgt,pityThreshold);
          if (res.prob < 0) { showError('budget too small, cannot afford any rolls.'); return; }
          showResults(res,'budget',bgt);

        }
      } catch(e) { showError('error: ' + e.message); }
      finally { btn.textContent = 'calculate'; btn.classList.remove('loading'); }
    }, 25);
  }
