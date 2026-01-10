---
layout: layout.html
title: Growth Charts
description: Plot weight and height on paediatric growth charts using age, sex, and date of measurement. Useful for visualising growth trends and identifying problems.
image: /assets/images/nurseandgirl.png
date: 2025-04-10
---

<h2>Plot Growth on Chart</h2>

<form id="input-section" onsubmit="return false;">
  <table style="margin: 0 auto; border-collapse: collapse;">
    <tr>
      <td style="text-align: right; padding: 0.5rem;"><label for="dob">Date of Birth:</label></td>
      <td style="padding: 0.5rem;"><input type="date" id="dob" style = "min-width: 180px; max-width: 180px;" oninput="checkFormCompletion()"></td>
    </tr>
    <tr>
      <td style="text-align: right; padding: 0.5rem;"><label for="dateofplot">Date of Plot:</label></td>
      <td style="padding: 0.5rem;"><input type="date" id="dateofplot" style = "min-width: 180px; max-width: 180px;" oninput="checkFormCompletion()">
      </td>
    </tr>
    <tr>
      <td style="text-align: right; padding: 0.5rem;"><label for="weight">Weight (kg):</label></td>
      <td style="padding: 0.5rem;"><input type="number" id="weight" min = "0" max = "150" step="0.01" oninput="checkFormCompletion()"></td>
    </tr>
    <tr>
      <td style="text-align: right; padding: 0.5rem;"><label for="height">Height (cm):</label></td>
      <td style="padding: 0.5rem;"><input type="number" id="height" min = "30" max = "250" step="1" oninput="checkFormCompletion()"></td>
    </tr>
    <tr>  
      <td><input type="radio" name="sex" value="girl" id="girl" onclick="updateCartoon()" checked><br><label for="girl">Girl</label></td>
      <td><input type="radio" name="sex" value="boy" id="boy" onclick="updateCartoon()"><br><label for="boy">Boy</label>
    </tr>
  </table>
  <div style="text-align: center; padding-top: 0.5rem;">
    <button id="calc-btn">Plot</button>
  </div>
</form>

<br>

<label onclick="toggleSex()">
  <img class="profile_img_square" id="cartoon" src="/assets/images/nurseandgirl.png">
</label>

<div id="growth-chart" style="display: none; margin-top: 1em; position: relative; max-width: 100%; border: 1px solid #ccc;">
  <img id="growth-chart-img" src="" alt="Growth Chart" style="width: 100%; display: block;">
  <canvas id="growth-canvas" style="position: absolute; top: 0; left: 0;  position: absolute; pointer-events: none;"></canvas>
</div>

<div style="text-align: center; margin-top: 1rem;">
  <button id="download-btn" style="display: none;">Download</button>
  <button id="reset-btn" style="display: none;">Clear</button>
</div>

<script>

let plotPoints = [];

function calculateAge(event) {
  if (event) event.preventDefault();

  const dob = new Date(document.getElementById("dob").value);
  const plotDate = new Date(document.getElementById("dateofplot").value);
  const weightKg = parseFloat(document.getElementById("weight").value);
  const heightCm = parseFloat(document.getElementById("height").value);
  const sex = document.querySelector('input[name="sex"]:checked').value;

  if (isNaN(dob.getTime()) || isNaN(plotDate.getTime())) {
    alert("Please enter valid dates.");
    return;
  }

  // Calculate age as of plotDate
  let ageYears = plotDate.getFullYear() - dob.getFullYear();
  let ageMonths = plotDate.getMonth() - dob.getMonth();
  let ageDays = plotDate.getDate() - dob.getDate();

  if (ageDays < 0) {
    ageMonths--;
    ageDays += new Date(plotDate.getFullYear(), plotDate.getMonth(), 0).getDate();
  }

  if (ageMonths < 0) {
    ageYears--;
    ageMonths += 12;
  }

// Compute decimal age
const decimalAge = ageYears + ageMonths / 12 + ageDays / 365.25;

  if (decimalAge > 20 || decimalAge < 0) {
    alert("Age must be between 0 and 20 years.");
    return;
  }

// Store the new point
  plotPoints.push({
    decimalAge,
    plotDate: document.getElementById("dateofplot").value,
    weightKg: isNaN(weightKg) ? null : weightKg,
    heightCm: isNaN(heightCm) ? null : heightCm
  });

// Keep plotPoints sorted by date (earliest first)
plotPoints.sort((a, b) => new Date(a.plotDate) - new Date(b.plotDate));

// Redraw the chart with all points
  drawChart(sex, decimalAge);

  // Show chart and buttons
  document.getElementById("growth-chart").style.display = "block";
  document.getElementById("download-btn").style.display = "inline-block";
  document.getElementById("reset-btn").style.display = "inline-block";
  document.getElementById("cartoon").style.display = "none";

if (plotPoints.length === 1) {
  disableInputsAfterFirstPlot();
} 

if (plotPoints.length >= 1) { 
  document.getElementById("calc-btn").innerHTML = "Add another plot";
  document.getElementById("weight").value = "";
  document.getElementById("height").value = "";
  document.getElementById("dateofplot").value = "";
  checkFormCompletion();
  }
}


function checkFormCompletion() {
  const height = document.getElementById("height").value;
  const weight = document.getElementById("weight").value;
  const dob = document.getElementById("dob").value;
  const dateofplot = document.getElementById("dateofplot").value;
  const button = document.getElementById("calc-btn");

  const formComplete = (height || weight) && dob && dateofplot;
  button.disabled = !formComplete;
}

function mapValueToPixels(value, fromMin, fromMax, toMin, toMax) {
  const ratio = (value - fromMin) / (fromMax - fromMin);
  return toMin + ratio * (toMax - toMin);
}

function mapAgeToX_under3(ageMonths) {
  return mapValueToPixels(ageMonths, 0, 36, 305, 1368);
}

function mapWeightToY_under3(weightKg) {
  return mapValueToPixels(weightKg, 1.4, 22, 2000, 286);
}

function mapHeightToY_under3(heightCm) {
  return mapValueToPixels(heightCm, 37, 106, 1418, 268);
}

function mapAgeToX_2to20(ageYears) {
  return mapValueToPixels(ageYears, 2, 20, 302, 1376);
}

function mapWeightToY_2to20(weightKg) {
  return mapValueToPixels(weightKg, 6, 110, 2000, 835);
}

function mapHeightToY_2to20(heightCm) {
  return mapValueToPixels(heightCm, 75, 195, 1618, 274);
}

function getMappingFunctions(sex, decimalAge) {
  const useUnder3 = decimalAge < 3;

  return {
    mapAgeToX: useUnder3 ? mapAgeToX_under3 : mapAgeToX_2to20,
    mapWeightToY: useUnder3 ? mapWeightToY_under3 : mapWeightToY_2to20,
    mapHeightToY: useUnder3 ? mapHeightToY_under3 : mapHeightToY_2to20,
    ageUnit: useUnder3 ? "months" : "years"
  };
}


function drawCross(ctx, x, y, size = 10, color = "black") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();
}

function drawChart(sex, latestAge) {
  const useUnder3 = latestAge < 3;
  const imageType = `${sex === 'girl' ? 'F' : 'M'}${useUnder3 ? '03' : '220'}`;
  const imagePath = `/assets/images/growth${imageType}.png`;

  const chartDiv = document.getElementById("growth-chart");
  const chartImg = document.getElementById("growth-chart-img");

  chartImg.onload = () => {
    const canvas = document.getElementById("growth-canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = chartImg.naturalWidth;
    canvas.height = chartImg.naturalHeight;
    canvas.style.width = chartImg.width + "px";
    canvas.style.height = chartImg.height + "px";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { mapAgeToX, mapWeightToY, mapHeightToY, ageUnit } = getMappingFunctions(sex, latestAge);

    plotPoints.forEach(pt => {
      const ageX = mapAgeToX(ageUnit === "months" ? pt.decimalAge * 12 : pt.decimalAge);
      if (pt.weightKg !== null) drawCross(ctx, ageX, mapWeightToY(pt.weightKg), 12, "black");
      if (pt.heightCm !== null) drawCross(ctx, ageX, mapHeightToY(pt.heightCm), 12, "black");
    });

    drawDataTable(ctx, getDataTableRows(), imageType);

  };
  chartImg.src = imagePath;
}

// Draws text into a predefined table area on the canvas
function drawDataTable(ctx, dataRows, imageType) {
  // Define column coordinates and startY based on imageType
  const config = {
    "M03": {
      columns: { Date: 610, Age: 730, Weight: 835, Height: 960 },
      startY: 1738,
    },
    "M220": {
      columns: { Date: 170, Age: 315, Weight: 460, Height: 600 },
      startY: 321,
    },
    "F03": {
      columns: { Date: 630, Age: 750, Weight: 855, Height: 990 },
      startY: 1738,
    },
    "F220": {
      columns: { Date: 176, Age: 325, Weight: 468, Height: 615 },
      startY: 321,
    }
  };

  const { columns, startY } = config[imageType] || {};
  if (!columns || startY === undefined) {
    console.error(`Invalid imageType: ${imageType}`);
    return;
  }

  // Set styles
  ctx.fillStyle = "black";
  ctx.font = "20px sans-serif";
  ctx.textBaseline = "top";

  const rowHeight = 30;

  // Draw each row
  dataRows.forEach((row, i) => {
    const y = startY + i * rowHeight;
    ctx.fillText(row.Date, columns.Date, y);
    ctx.fillText(row.Age, columns.Age, y);
    ctx.fillText(row.Weight, columns.Weight, y);
    ctx.fillText(row.Height, columns.Height, y);
  });
}


function getDataTableRows() {
  return plotPoints.map(pt => {
    const totalMonths = Math.round(pt.decimalAge * 12);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const ageFormatted = `${years} Y ${months} M`;

    return {
      Date: pt.plotDate,
      Age: ageFormatted,
      Weight: pt.weightKg !== null ? `${pt.weightKg.toFixed(1)}kg` : "",
      Height: pt.heightCm !== null ? `${pt.heightCm.toFixed(0)}cm` : ""
    };
  });
}

function updateCartoon() {
  const girlRadio = document.getElementById("girl");
  const cartoon = document.getElementById("cartoon");

  if (girlRadio.checked) {
    cartoon.src = "/assets/images/nurseandgirl.png";
  } else {
    cartoon.src = "/assets/images/nurseandboy.png";
  }
}

function toggleSex() {
  const girlRadio = document.getElementById("girl");
  const boyRadio = document.getElementById("boy");
  const cartoon = document.getElementById("cartoon");

  if (girlRadio.checked) {
    boyRadio.checked = true;
    cartoon.src = "/assets/images/nurseandboy.png";
  } else {
    girlRadio.checked = true;
    cartoon.src = "/assets/images/nurseandgirl.png";
  }

  // Update any other logic, e.g. hiding/showing buttons, recalculating form, etc.
  checkFormCompletion();
}


document.getElementById("download-btn").addEventListener("click", () => {
  const baseImage = document.getElementById("growth-chart-img");
  const overlayCanvas = document.getElementById("growth-canvas");

  const combinedCanvas = document.createElement("canvas");
  combinedCanvas.width = baseImage.naturalWidth;
  combinedCanvas.height = baseImage.naturalHeight;

  const ctx = combinedCanvas.getContext("2d");
  ctx.drawImage(baseImage, 0, 0, combinedCanvas.width, combinedCanvas.height);
  ctx.drawImage(overlayCanvas, 0, 0, combinedCanvas.width, combinedCanvas.height);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const link = document.createElement("a");
  link.download = `growth-chart-${dateStr}.png`;
  link.href = combinedCanvas.toDataURL("image/png");
  link.click();
});


// Clear/reset chart button
document.getElementById("reset-btn").addEventListener("click", () => {
  plotPoints = [];
  document.getElementById("growth-chart").style.display = "none";
  document.getElementById("cartoon").style.display = "block";
  document.getElementById("reset-btn").style.display = "none";
  document.getElementById("download-btn").style.display = "none";
  document.getElementById("calc-btn").innerHTML = "Plot";
  setDateOfPlotToToday();
  enableInputsOnReset(); 
});



// function that sets dateofplot to today
function setDateOfPlotToToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedToday = `${yyyy}-${mm}-${dd}`;

  const dateInput = document.getElementById("dateofplot");
  if (dateInput) {
    dateInput.value = formattedToday;
    checkFormCompletion();
  }
}

// Disable DOB and sex radio buttons after first plot
function disableInputsAfterFirstPlot() {
  document.getElementById("dob").disabled = true;
  document.getElementById("girl").disabled = true;
  document.getElementById("boy").disabled = true;
}

// Enable DOB and sex on reset
function enableInputsOnReset() {
  document.getElementById("dob").disabled = false;
  document.getElementById("girl").disabled = false;
  document.getElementById("boy").disabled = false;
}


// Fill today's date on page load
window.onload = function() {
  setDateOfPlotToToday();
  document.getElementById("calc-btn").disabled = true;
  }

// Add event listener to plot button
document.getElementById("calc-btn").addEventListener("click", calculateAge);

</script>
