---
layout: layout.html
title: BMI Calculator
description: Enter height and weight to calculate and explain body mass index. With a summary of the limitations of BMI.
image: /assets/images/scales.png
---

<h2>BMI Calculator</h2>

<form id="bmi-form">
  <label for="height">Height (cm):</label>
  <input type="number" id="height" min="50" max="250" required oninput="checkFormCompletion();  updateImperial();">
  <div id="height-imperial" class="footnote"></div>
  <br>
  <label for="weight">Weight (kg):</label>
  <input type="number" id="weight" min="5" max="250" required step="0.1" oninput="checkFormCompletion();  updateImperial();">
  <div id="weight-imperial" class="footnote"></div>
  <div id="weight-stone" class="footnote"></div>
  <br>
  <button type="submit" disabled="true">Calculate BMI</button>
</form>

<br>

<div id="bmi-result" style="display: none;" class="results">
    <h3 id="bmi-value"><h3>
</div>

<img src="/assets/images/scales.png" alt="scales" width=300px>

<!-- BMI info (initially hidden) -->
<div id="bmi-info" style="display: none; text-align: centre; margin-top: 2rem;">

  <hr>

<h3>Body Mass Index</h3>

Body mass index (BMI) is derived by dividing the weight of a person by the square of their height. It is a "rule of thumb" measure, used to broadly categorize a person as underweight, normal weight, or as having overweight or obesity.

<br>
<div class="center-table">
  <table class="grid-table">
    <thead>
      <tr>
        <th>BMI</th>
        <th>Category</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>less than 18</td><td>underweight</td></tr>
      <tr><td>18 - 24.9</td><td>normal weight</td></tr>
      <tr><td>25 - 29.9</td><td>overweight</td></tr>
      <tr><td>more than 30 </td><td>obesity</td></tr>
    </tbody>
  </table>
</div>
<br>

In 2021, <a href="https://digital.nhs.uk/data-and-information/publications/statistical/health-survey-for-england/2021">28% of adults in the UK</a> were classed as obese and 64% of adults were classed as overweight or obese.

For children and teens, BMI is interpreted differently, using sex-specific BMI-for-age percentiles. [This calculator](https://www.cdc.gov/bmi/child-teen-calculator/index.html) reports BMI, BMI percentile, and BMI category for children and teens 2 through 19.

<hr>
<h3>Relevance</h3>

Obesity is linked with an increased risk of heart disease, type 2 diabetes, and some cancers. Both low and high BMIs are associated with increased all cause mortality, with the risk increasing with distance from the 20-25 range.

<hr>
<h3>Limitations</h3>

BMI should be interpreted alongside other indicators such as waist circumference, fitness level, and metabolic health.

It does not differentiate between fat and muscle mass. Athletes or individuals with higher muscle content may be classified as overweight or even obese, despite having low body fat and excellent cardiovascular health.

Similarly, BMI does not account for fat distribution, which is an important factor in health risk. Visceral fat (fat around the abdominal organs) poses a higher health risk than fat stored in other areas, but BMI cannot distinguish this.

BMI does not account for age, sex, or ethnicity- all of which influence body composition. Older adults may lose muscle mass and gain fat without a significant change in BMI, and some ethnic groups may experience metabolic risks at lower BMI thresholds than others.

</div>

<script>

function updateImperial() {
  const heightCm = parseFloat(document.getElementById('height').value);
  const weightKg = parseFloat(document.getElementById('weight').value);

  // Convert cm to ft/in
  if (!isNaN(heightCm)) {
    const totalInches = heightCm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    document.getElementById('height-imperial').textContent = `${feet} ft ${inches} in`;
  } else {
    document.getElementById('height-imperial').textContent = '';
  }

  // Convert kg to lb and stones
  if (!isNaN(weightKg)) {
    const poundsTotal = weightKg * 2.20462;
    const pounds = poundsTotal.toFixed(0);
    const stones = Math.floor(poundsTotal / 14);
    const poundsRemainder = Math.round(poundsTotal % 14);

    document.getElementById('weight-imperial').textContent = `${pounds} lbs`;
    document.getElementById('weight-stone').textContent = `${stones} st ${poundsRemainder} lbs`;
  } else {
    document.getElementById('weight-imperial').textContent = '';
    document.getElementById('weight-stone').textContent = '';
  }
}


function checkFormCompletion() {
  const height = parseFloat(document.getElementById('height').value);
  const weight = parseFloat(document.getElementById('weight').value);
  const button = document.querySelector('#bmi-form button');

  const validHeight = !isNaN(height) && height >= 50 && height <= 250;
  const validWeight = !isNaN(weight) && weight >= 5 && weight <= 250;

  button.disabled = !(validHeight && validWeight);
}

  document.getElementById('bmi-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const height = parseFloat(document.getElementById('height').value) / 100;
    const weight = parseFloat(document.getElementById('weight').value);
    const bmi = (weight / (height * height)).toFixed(1);

    let category = '';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal weight';
    else if (bmi < 30) category = 'E66 Overweight';
    else if (bmi < 35) category = 'E66.811 Obesity 1';
    else if (bmi < 40) category = 'E66.812 Obesity 2';
    else category = 'E66.813 Obesity 3';

    document.getElementById('bmi-value').textContent = `BMI ${bmi} kg/m² (${category})`;
    document.getElementById('bmi-result').style.display = "block";
    document.getElementById('bmi-info').style.display = 'block';
  });
</script>
