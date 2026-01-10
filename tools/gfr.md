---
layout: layout.html
title: Kidney Calculator
description: A clinical calculator for estimating kidney function using both eGFR and Creatinine Clearance. Useful for staging CKD and guiding drug dosing.
image: /assets/images/kidney.png
date: 2025-04-09
---

<h2>Kidney Function Calculator</h2>

<form id="kidney-form">
  <table style="margin: 0 auto; border-collapse: collapse;">
    <tr>
      <td style="text-align: right; padding: 0.5rem;"><label for="age">Age (years):</label></td>
      <td style="padding: 0.5rem;"><input type="number" id="age"></td>
    </tr>
    <tr>
      <td style="text-align: right; padding: 0.5rem;"><label for="weight">Weight (kg):</label></td>
      <td style="padding: 0.5rem;"><input type="number" id="weight"></td>
    </tr>
    <tr>
      <td style="text-align: right; padding: 0.5rem;"><label for="creatinine">Creatinine:</label></td>
      <td style="padding: 0.5rem;"><input type="number" id="creatinine"></td>
    </tr>
    <tr>
      <td><label><input type="radio" name="sex" value="male" checked>Male</label></td>
      <td><label><input type="radio" name="sex" value="female">Female</label></td>
    </tr>
  </table>
</form>

<div class="results" id="output" style="display:none"></div>

<br>
<img src="/assets/images/kidney.png" alt="kidney" style="width: 200px;">

<!-- GFR info (initially hidden) -->
<div id="gfr-info" style="display: none; text-align: centre; margin-top: 2rem;">

<hr>

<h3>eGFR</h3>

The estimated glomerular filtration rate (eGFR) is the preferred method for describing kidney function in most clinical situations.<

It is calculated using the CKD-EPI equation, which takes into account a person’s age, sex, and serum creatinine level. This estimate reflects the filtration capacity of the kidneys and is used for diagnosing, staging, and monitoring chronic kidney disease (CKD).

eGFR is standardised to a body surface area of 1.73 m², which allows for comparison across individuals.

<hr>

<h3>Creatinine Clearance</h3>

Creatinine Clearance (CrCl) provides an estimate of the actual rate at which the kidneys are clearing creatinine from the blood.

It is calculated using the Cockcroft-Gualt equation. Unlike eGFR, CrCl incorporates body weight, making it relevant when accurate weight-based dosing is needed- such as with aminoglycoside antibiotics, anticoagulants, and chemotherapy drugs.

<hr>
<h3>Formulas</h3>

<img src="/assets/images/kidneyEquations.png" alt="equations">
<hr>

<h2>CKD</h2>

Chronic Kidney Disease (CKD) is a common, progressive condition where the kidneys gradually lose function over time. It is usually asymptomatic in its early stages and is often detected through routine blood tests showing a reduced eGFR or evidence of kidney damage, such as proteinuria.

CKD is staged from 1 to 5, with stage 3 or worse (eGFR <60) indicating moderate to severe impairment.

CKD is strongly associated with cardiovascular risk, diabetes, and hypertension. Early detection allows interventions like blood pressure control, glycaemic management, and ACE inhibitors which can slow progression. Monitoring eGFR over time helps guide treatment decisions, detect complications, and plan specialist referral when needed.

  <img src="/assets/images/ckdStages.png" alt="CKD stages">

<hr>

<h2>More info</h2>

[National Kidney Foundation. eGFR Calculators and Equation Overview](https://www.kidney.org/professionals/kdoqi/gfr_calculator)

[NICE. Chronic Kidney Disease: Assessment and Management (NG203)](https://www.nice.org.uk/guidance/ng203)

[KDIGO. Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease](https://kdigo.org/guidelines/ckd-evaluation-and-management/)

</div>

<script>
  const inputs = document.querySelectorAll("input");
  const output = document.getElementById("output");

  inputs.forEach(input => input.addEventListener("input", calculate));

  function calculate() {
    const age = parseFloat(document.getElementById("age").value);
    const weight = parseFloat(document.getElementById("weight").value);
    const creatinine = parseFloat(document.getElementById("creatinine").value);
    const sex = document.querySelector("input[name='sex']:checked")?.value;

    if (!sex || isNaN(age) || isNaN(creatinine)) {
      output.innerHTML = "";
      document.getElementById('gfr-info').style.display = 'none';
      document.getElementById('output').style.display = 'none';
      return;
    }
// Determine creatinine units
const isMgDl = creatinine < 25;
const creat_mgdl = isMgDl ? creatinine : creatinine / 88.4;
const creat_display = isMgDl
    ? `${creatinine.toFixed(1)} mg/dL`
    : `${creatinine.toFixed(0)} µmol/L`;


// CKD-EPI 2021 formula (race-free)
const k = sex === 'female' ? 0.7 : 0.9;
const a = sex === 'female' ? -0.241 : -0.302;
const s = sex === 'female' ? 1.012 : 1.000;

const ratio = creat_mgdl / k;
const minPart = Math.min(ratio, 1);
const maxPart = Math.max(ratio, 1);

const eGFR = 142 *
             Math.pow(minPart, a) *
             Math.pow(maxPart, -1.200) *
             Math.pow(0.9938, age) *
             s;

 // CrCl (Cockcroft-Gault)
  let html = `<strong>Creatinine:</strong> ${creat_display}<br><br>`;
  html += `<strong>eGFR (CKD-EPI):</strong> ${eGFR.toFixed(1)} mL/min/1.73m²`;

    if (!isNaN(weight)) {
      const sexFactor = sex === 'male' ? 1 : 0.85;
      const crcl = ((140 - age) * weight * sexFactor) / (72 * creat_mgdl);
      html += `<br><strong>CrCl (Cockcroft-Gault):</strong> ${crcl.toFixed(1)} mL/min<br><br>`;
    }

  // CKD Stage
  let stage = "";
  if (eGFR >= 90) stage = "normal, or stage 1 if proteinuria";
  else if (eGFR >= 60) stage = "normal, or Stage 2 if proteinuria";
  else if (eGFR >= 45) stage = "Stage 3a";
  else if (eGFR >= 30) stage = "Stage 3b";
  else if (eGFR >= 15) stage = "Stage 4";
  else stage = "Stage 5";

  html += `<strong>CKD Stage:</strong> ${stage}`;

    output.innerHTML = html;
    document.getElementById('gfr-info').style.display = 'block';
    document.getElementById('output').style.display = 'block';

  }
</script>
