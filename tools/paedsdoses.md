---
layout: layout.html
title: Kids' Doses
description: A quick-reference tool for calculating common paediatric drug doses based on weight. Always cross-check with the BNFc or local guidelines.
image: /assets/images/medicine.png
date: 2025-04-08
---

<!-- Disclaimer Modal -->
<div id="disclaimer-modal" class="modal">
  <div class="modal-content">
    <h2>Disclaimer</h2>
    <p>
      This tool is intended as a quick reference guide for qualified prescribers to sense-check paediatric doses. It is not a substitute for clinical judgement.<br><br>
      Confirm doses with authoritative sources such as the BNFc or local prescribing guidelines.<br><br>
      <strong>Prescribers remain fully responsible for verifying doses.</strong>
    </p>
    <button onclick="acceptDisclaimer()">I Agree</button>
  </div>
</div>

<!-- Main Tool -->
<div id="dose-tool">
  <h2>Paediatric Dose Calculator</h2>
  <label for="drug">Select drug:</label>
  <select id="drug" onchange="checkFormCompletion()">
    <!-- <option value="">--Select--</option> -->
    <option value="acetaminophen">Acetaminophen (paracetamol)</option>
    <option value="amoxicillin">Amoxicillin</option>
    <option value="coamoxiclav">Co-amoxiclav</option>
    <option value="ibuprofen">Ibuprofen</option>
    <!-- Add more drugs here -->
  </select>

<label for="weight">Weight (kg):</label>
<input type="number" id="weight" step="0.1" oninput="checkFormCompletion()">

  <!-- <label for="age">Age (years):</label>
  <input type="number" id="age" placeholder="Optional fallback if weight unknown"> -->

<button id="calculate-button" onclick="calculateDose()" style="display: none;">Calculate </button>

<div class="results" id="resultbox" style="display: none;">
  <div id="result"></div>
</div>

<br>
<img src="/assets/images/medicine.png" class="profile_img_square">

</div>

<script>
function acceptDisclaimer() {
  document.getElementById("disclaimer-modal").style.display = "none";
  document.getElementById("dose-tool").style.display = "block";
  document.getElementById("weight").focus();
}

function checkFormCompletion() {
  const drug = document.getElementById("drug").value;
  const weight = document.getElementById("weight").value;
  const calculateButton = document.getElementById("calculate-button");

  if (drug && weight) {
    calculateButton.style.display = "inline-block";
  } else {
    calculateButton.style.display = "none";
  }
}


function calculateDose() {
  const drug = document.getElementById("drug").value;
  const weight = parseFloat(document.getElementById("weight").value);

  let result = "";

  if (drug === "acetaminophen") {
    if (isNaN(weight)) {
      result = "Please enter a valid weight in kg.";
    } else {
      const doselo = 10 * weight;
      const dosehioral = 15 * weight;
      const dosehirectal = 20 * weight;
      const maxDailyDose = Math.min(75 * weight, 4000);
      result = `
        <strong>Acetaminophen / Paracetamol</strong><br><br>
        <strong>Oral Dose:</strong> ${doselo.toFixed(0)} to ${dosehioral.toFixed(0)} mg every 4-6 hours.<br>
        <strong>Rectal Dose:</strong> ${doselo.toFixed(0)} to ${dosehirectal.toFixed(0)} mg every 4-6 hours.<br>
        <strong>Max Daily Dose:</strong> ${maxDailyDose.toFixed(0)} mg/day (not more than 5 doses).<br>
        <br><br>Source: UpToDate 2025-05-20
      `;
    }
  }

else if (drug === "amoxicillin") {
    if (isNaN(weight)) {
      result = "Please enter a valid weight in kg.";
    } else {
      const dose40 = Math.min(40 * weight, 4000);
      const dose40_2 = dose40/2;
      const dose40_3 = dose40/3;
      const dose40_2liq = dose40_2/50;
      const dose40_3liq = dose40_3/50;
      const dose90 = Math.min(90 * weight, 4000);
      const dose90_2 = dose90/2;
      const dose90_2liq = dose90_2/50;

      result = `
        <img src="https://flagcdn.com/us.svg" alt="US flag" width="24"><strong>Amoxicillin 40mg/kg</strong><br><br>
        <strong>Dose:</strong> ${dose40_2.toFixed(0)} mg every 12 hours, which is ${dose40_2liq.toFixed(1)} ml of 250mg/5ml solution
        <hr>
        <img src="https://flagcdn.com/us.svg" alt="US flag" width="24">
        <strong>Amoxicillin 90mg/kg</strong><br><br>
        <strong>Dose:</strong> ${dose90_2.toFixed(0)} mg every 12 hours, which is ${dose90_2liq.toFixed(1)} ml of 250mg/5ml solution<br>
        <hr>
        The bigger dose may be appropriate in communities with a high prevalence of penicillin-resistant S. pneumoniae<br><br>
        Source: UpToDate 2025-05-20
      `;
    }
  }

else if (drug === "coamoxiclav") {
    if (isNaN(weight)) {
      result = "Please enter a valid weight in kg.";
    } else {
      const dose40 = Math.min(40 * weight, 4000);
      const dose40_2 = dose40/2;
      const dose40_2liq = dose40_2/80;
      const dose90 = Math.min(90 * weight, 4000);
      const dose90_2 = dose90/2;
      const dose90_2liq = dose90_2/120;
      result = `
        <img src="https://flagcdn.com/us.svg" alt="US flag" width="24"><strong>Amoxicillin 40mg/kg per day with clavulanate 5.7mg/kg per day in 2 doses</strong><br><br>
        <strong>Dose:</strong> ${dose40_2.toFixed(0)} mg every 12 hours, which is ${dose40_2liq.toFixed(1)} ml of 400/57mg per 5ml solution<br>
        <hr>
        <img src="https://flagcdn.com/us.svg" alt="US flag" width="24"><strong>Amoxicillin 90mg/kg per day with clavulanate 6.4mg/kg per day in 2 doses</strong><br><br>
        <strong>Dose:</strong> ${dose90_2.toFixed(0)} mg every 12 hours, which is ${dose90_2liq.toFixed(1)} ml of 600/42.9mg per 5ml solution<br>
        <hr>
        The bigger dose may be appropriate in communities with a high prevalence of penicillin-resistant S. pneumoniae<br><br>
        Source: UpToDate 2025-05-20
      `;
    }
  }
  
  else if (drug === "ibuprofen") {
    if (isNaN(weight)) {
      result = "Please enter a valid weight in kg.";
    } else {
      const doseLow = 4 * weight;
      const doseHigh = 10 * weight;
       const maxDailyDose = Math.min(40 * weight, 3200);
      result = `
        <strong>Ibuprofen</strong><br><br>
        <strong>Oral Dose:</strong> ${doseLow.toFixed(0)} to ${doseHigh.toFixed(0)} mg every 6–8 hours.<br>
        <strong>Max Daily Dose:</strong> ${maxDailyDose.toFixed(0)} mg/day.
        <br><br>Source: UpToDate 2025-05-20
      `;
    }  
  }  

  else {
    result = "Please select a drug.";
  }

  document.getElementById("result").innerHTML = result;
  document.getElementById("resultbox").style.display = "block";
}

</script>

<style>
  .modal {
    position: fixed;
    top: 0; left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    max-width: 600px;
    text-align: left;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  }

  .modal-content h2 {
    margin-top: 0;
  }

  .modal-content button {
    background-color: #007BFF;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }

  .modal-content button:hover {
    background-color: #0056b3;
  }

  label {
    display: block;
    margin-top: 1rem;
  }

  input, select {
    width: 100%;
    padding: 0.5rem;
    margin-top: 0.25rem;
    box-sizing: border-box;
  }

  button.calculate {
    margin-top: 1rem;
    background-color: #28a745;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }

  button.calculate:hover {
    background-color: #218838;
  }

  #result {
    margin-top: 1rem;
    font-weight: bold;
  }
</style>
