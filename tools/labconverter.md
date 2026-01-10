---
layout: layout.html
title: Lab Unit Converter
description: Convert common lab values between US and European units. A quick-reference tool for interpreting international lab results.
image: /assets/images/USUKbridge.png
date: 2025-04-08
---

<h2>Lab Unit Converter</h2>

<form id="unit-converter">
  <table>
    <thead>
      <tr>
        <th></th>
            <th>
                <img src="https://flagcdn.com/us.svg" alt="US flag" width="24"><br>mg/dl
            </th>
            <th>
                <img src="https://flagcdn.com/gb.svg" alt="UK flag" width="24"><br>mmol/L
            </th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Glucose</td>
        <td><input type="number" step="any" id="glucose-us"></td>
        <td><input type="number" step="any" id="glucose-uk"></td>
      </tr>
      <tr>
        <td>Total Cholesterol</td>
        <td><input type="number" step="any" id="chol-total-us"></td>
        <td><input type="number" step="any" id="chol-total-uk"></td>
      </tr>
      <tr>
        <td>LDL Cholesterol</td>
        <td><input type="number" step="any" id="ldl-us"></td>
        <td><input type="number" step="any" id="ldl-uk"></td>
      </tr>
      <tr>
        <td>HDL Cholesterol</td>
        <td><input type="number" step="any" id="hdl-us"></td>
        <td><input type="number" step="any" id="hdl-uk"></td>
      </tr>
      <tr>
        <td>Urate</td>
        <td><input type="number" step="any" id="urate-us"></td>
        <td><input type="number" step="any" id="urate-uk"></td>
      </tr>

  <!-- HbA1c heading -->
  <tr>
    <th></th>
    <th><img src="https://flagcdn.com/us.svg" alt="US flag" width="24"><br>%</th>
    <th><img src="https://flagcdn.com/gb.svg" alt="UK flag" width="24"><br>mmol/mol</th>
    <th></th>
  </tr>
  <!-- HbA1c row -->
  <tr>
    <td>HbA1c</td>
    <td><input type="number" step="any" id="hba1c-us"></td>
    <td><input type="number" step="any" id="hba1c-uk"></td>
  </tr>

    </tbody>

  </table>

  <br>
  <button type="submit">Convert</button>
  <button type="button" id="clear-btn">Clear</button>
</form>

<style>
  table {  margin: 0 auto; border-collapse: collapse; width: 100%; max-width: 600px;  table-layout: fixed; }
  th, td { padding: 0.2rem; border: 1px solid #ddd; width: 25%; text-align: center;}
</style>

<!-- lab converter info -->
<div id="converter-info" style="display: block; text-align: center; margin-top: 2rem;">

<hr>

### Americans Use Different Lab Units

The US prefers to measure things in milligrams per deciliter (mg/dL) - how heavy stuff floating in the blood is.

Meanwhile, the UK and most of the rest of the world use millimoles per liter (mmol/L) - how many molecules of stuff are in it.

And then there’s HbA1c. In the US, this is expressed as a percentage (of glycated hemoglobin), while in the UK it’s measured in millimoles per mole.

If you’ve ever looked at a lab report from across the Atlantic and thought “That number looks way off”, this converter can help you bridge The Pond.

<img src="/assets/images/USUKbridge.png" alt="cartoon">

</div>

<script>
document.getElementById('unit-converter').addEventListener('submit', function (e) {
  e.preventDefault();

  // Conversion factors
  const mgdl_to_mmolL_glucose = 0.0555;
  const mmolL_to_mgdl_glucose = 18.018;
  const hba1c_dcct_to_ifcc = x => (x - 2.15) * 10.929;
  const hba1c_ifcc_to_dcct = x => x / 10.929 + 2.15;
  const chol_conv = 0.0259;
  const chol_rev = 38.67;

  // Generic converter that handles individual row
function convertRow(usId, ukId, toUk, toUs, precisionUs = 0, precisionUk = 1) {
  const usEl = document.getElementById(usId);
  const ukEl = document.getElementById(ukId);
  const usVal = parseFloat(usEl.value);
  const ukVal = parseFloat(ukEl.value);

  if (!isNaN(usVal) && isNaN(ukVal)) {
    ukEl.value = toUk(usVal).toFixed(precisionUk);
    usEl.disabled = true;
    ukEl.disabled = true;
  } else if (!isNaN(ukVal) && isNaN(usVal)) {
    usEl.value = toUs(ukVal).toFixed(precisionUs);
    usEl.disabled = true;
    ukEl.disabled = true;
  }
}

  // Apply converter to each row
 // Glucose: US = 0 dp, UK = 1 dp
convertRow('glucose-us', 'glucose-uk',
  v => v * 0.0555,
  v => v * 18.018,
  0, 1);

// HbA1c: US = 1 dp, UK = 0 dp 
convertRow('hba1c-us', 'hba1c-uk',
  x => (x - 2.15) * 10.929,
  x => x / 10.929 + 2.15,
  1, 0);

// Total Cholesterol: US = 0 dp, UK = 1 dp
convertRow('chol-total-us', 'chol-total-uk',
  v => v * 0.0259,
  v => v * 38.67,
  0, 1);

// LDL: US = 0 dp, UK = 1 dp
convertRow('ldl-us', 'ldl-uk',
  v => v * 0.0259,
  v => v * 38.67,
  0, 1);

// HDL: US = 0 dp, UK = 1 dp
convertRow('hdl-us', 'hdl-uk',
  v => v * 0.0259,
  v => v * 38.67,
  0, 1);

// Urate: US = 0 dp, UK = 1 dp
convertRow('urate-us', 'urate-uk',
  v => v * 0.05948,
  v => v * 16.812,
  1, 2);
});


function setupMutualDisabling(id1, id2) {
  const el1 = document.getElementById(id1);
  const el2 = document.getElementById(id2);

  el1.addEventListener('input', () => {
    if (el1.value !== '') {
      el2.disabled = true;
    } else {
      el2.disabled = false;
    }
  });

  el2.addEventListener('input', () => {
    if (el2.value !== '') {
      el1.disabled = true;
    } else {
      el1.disabled = false;
    }
  });
}


// Set up mutual disabling for each pair
setupMutualDisabling('glucose-us', 'glucose-uk');
setupMutualDisabling('chol-total-us', 'chol-total-uk');
setupMutualDisabling('ldl-us', 'ldl-uk');
setupMutualDisabling('hdl-us', 'hdl-uk');
setupMutualDisabling('urate-us', 'urate-uk');
setupMutualDisabling('hba1c-us', 'hba1c-uk');


document.getElementById('clear-btn').addEventListener('click', function () {
  const inputs = document.querySelectorAll('#unit-converter input');
  inputs.forEach(input => {
    input.value = '';
    input.disabled = false;
  });
});

</script>
