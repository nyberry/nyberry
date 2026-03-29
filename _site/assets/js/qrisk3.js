(function () {
  const form = document.getElementById("qrisk-form");
  if (!form) {
    return;
  }

  const scoreOutput = document.getElementById("qrisk-score");
  const statusOutput = document.getElementById("qrisk-status");
  const summaryOutput = document.getElementById("qrisk-summary");
  const payloadOutput = document.getElementById("qrisk-payload");
  const maleOnlyWrapper = document.querySelector("[data-male-only]");
  const erectileField = form.elements.erectile_dysfunction_or_treatment;
  const infoButtons = document.querySelectorAll("[data-info-target]");

  const presets = {
    male: {
      sex: "male",
      age: 52,
      bmi: 22,
      ethnicity: 1,
      cholesterol_hdl_ratio: 4,
      systolic_blood_pressure: 120,
      systolic_blood_pressure_std_dev: 0,
      smoking_status: 0,
      townsend_score: 0,
      blood_pressure_treatment: false,
      family_history_cvd: false
    },
    female: {
      sex: "female",
      age: 60,
      bmi: 31.2,
      ethnicity: 2,
      cholesterol_hdl_ratio: 4.8,
      systolic_blood_pressure: 142,
      systolic_blood_pressure_std_dev: 10,
      smoking_status: 0,
      townsend_score: 0,
      blood_pressure_treatment: true,
      diabetes_type_2: true
    }
  };

  form.addEventListener("reset", function () {
    window.requestAnimationFrame(function () {
      applyPreset("male");
      renderCalculatedState();
    });
  });

  form.elements.sex.addEventListener("change", function () {
    syncSexFields();
    renderCalculatedState();
  });

  document.querySelectorAll("[data-preset]").forEach(function (button) {
    button.addEventListener("click", function () {
      applyPreset(button.dataset.preset);
      renderCalculatedState();
    });
  });

  form.addEventListener("input", function () {
    renderCalculatedState();
  });

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-info-target]");

    if (button) {
      event.preventDefault();
      event.stopPropagation();
      const targetId = button.getAttribute("data-info-target");
      const popover = document.getElementById(targetId);
      const willShow = popover.hasAttribute("hidden");
      closeAllPopovers();
      if (willShow) {
        popover.removeAttribute("hidden");
      }
      return;
    }

    if (!event.target.closest(".qrisk-info-wrap")) {
      closeAllPopovers();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeAllPopovers();
    }
  });

  applyPreset("male");
  renderCalculatedState();

  function applyPreset(name) {
    const preset = presets[name];
    Array.from(form.elements).forEach(function (field) {
      if (!field.name) {
        return;
      }

      if (field.type === "checkbox") {
        field.checked = Boolean(preset[field.name]);
      } else if (preset[field.name] !== undefined) {
        field.value = String(preset[field.name]);
      }
    });
    syncSexFields();
  }

  function syncSexFields() {
    const isMale = form.elements.sex.value === "male";
    maleOnlyWrapper.hidden = !isMale;
    erectileField.disabled = !isMale;
    if (!isMale) {
      erectileField.checked = false;
    }
  }

  function readInput() {
    const input = {
      sex: form.elements.sex.value,
      age: Number(form.elements.age.value),
      atrial_fibrillation: form.elements.atrial_fibrillation.checked,
      on_atypical_antipsychotics: form.elements.on_atypical_antipsychotics.checked,
      on_regular_steroids: form.elements.on_regular_steroids.checked,
      erectile_dysfunction_or_treatment: form.elements.erectile_dysfunction_or_treatment.checked,
      migraine: form.elements.migraine.checked,
      rheumatoid_arthritis: form.elements.rheumatoid_arthritis.checked,
      chronic_kidney_disease_stage_3_to_5: form.elements.chronic_kidney_disease_stage_3_to_5.checked,
      severe_mental_illness: form.elements.severe_mental_illness.checked,
      systemic_lupus_erythematosus: form.elements.systemic_lupus_erythematosus.checked,
      blood_pressure_treatment: form.elements.blood_pressure_treatment.checked,
      diabetes_type_1: form.elements.diabetes_type_1.checked,
      diabetes_type_2: form.elements.diabetes_type_2.checked,
      bmi: Number(form.elements.bmi.value),
      ethnicity: Number(form.elements.ethnicity.value),
      family_history_cvd: form.elements.family_history_cvd.checked,
      cholesterol_hdl_ratio: Number(form.elements.cholesterol_hdl_ratio.value),
      systolic_blood_pressure: Number(form.elements.systolic_blood_pressure.value),
      systolic_blood_pressure_std_dev: Number(form.elements.systolic_blood_pressure_std_dev.value),
      smoking_status: Number(form.elements.smoking_status.value),
      townsend_score: Number(form.elements.townsend_score.value),
      survivor_span: 10
    };

    if (input.sex === "female") {
      input.erectile_dysfunction_or_treatment = false;
    }

    return input;
  }

  function renderCalculatedState() {
    try {
      const input = readInput();
      const score = calculateQrisk3(input);
      scoreOutput.textContent = score.toFixed(2) + "%";
      summaryOutput.textContent =
        "Estimated QRISK3 10-year cardiovascular risk is " +
        score.toFixed(2) +
        "% for a " +
        input.sex +
        " patient aged " +
        input.age +
        ".";
      statusOutput.textContent = "Calculated";
      statusOutput.classList.remove("error");
      payloadOutput.textContent = JSON.stringify(input, null, 2);
    } catch (error) {
      scoreOutput.textContent = "--";
      summaryOutput.textContent = error.message;
      statusOutput.textContent = "Check inputs";
      statusOutput.classList.add("error");
      payloadOutput.textContent = JSON.stringify(readInput(), null, 2);
    }
  }

  function closeAllPopovers() {
    infoButtons.forEach(function (button) {
      const targetId = button.getAttribute("data-info-target");
      const popover = document.getElementById(targetId);
      if (popover) {
        popover.setAttribute("hidden", "");
      }
    });
  }

  function validateInput(input) {
    if (input.age < 25 || input.age > 84) {
      throw new Error("QRISK3 age must be between 25 and 84 inclusive.");
    }
    if (input.bmi <= 0) {
      throw new Error("BMI must be greater than 0.");
    }
    if (input.cholesterol_hdl_ratio <= 0) {
      throw new Error("Cholesterol/HDL ratio must be greater than 0.");
    }
    if (input.systolic_blood_pressure <= 0) {
      throw new Error("Systolic blood pressure must be greater than 0.");
    }
    if (input.systolic_blood_pressure_std_dev < 0) {
      throw new Error("Systolic blood pressure standard deviation cannot be negative.");
    }
    if (input.diabetes_type_1 && input.diabetes_type_2) {
      throw new Error("A person cannot be marked as both type 1 and type 2 diabetic.");
    }
  }

  function calculateQrisk3(input) {
    validateInput(input);
    return input.sex === "male" ? maleScore(input) : femaleScore(input);
  }

  function maleScore(data) {
    const survivor = Array(16).fill(0);
    survivor[10] = 0.977268040180206;
    const ethnicity = [0, 0, 0.27719248760308279, 0.47446360714931268, 0.52961729919689371, 0.035100159186299017, -0.35807899669327919, -0.4005648523216514, -0.41522792889830173, -0.26321348134749967];
    const smoke = [0, 0.19128222863388983, 0.55241588192645552, 0.63835053027506072, 0.78983819881858019];
    const ageDecades = data.age / 10;
    const age1 = Math.pow(ageDecades, -1) - 0.234766781330109;
    const age2 = Math.pow(ageDecades, 3) - 77.284080505371094;
    const bmiScaled = data.bmi / 10;
    const bmi1 = Math.pow(bmiScaled, -2) - 0.149176135659218;
    const bmi2 = Math.pow(bmiScaled, -2) * Math.log(bmiScaled) - 0.141913309693336;
    const ratio = data.cholesterol_hdl_ratio - 4.300998687744141;
    const sbp = data.systolic_blood_pressure - 128.57157897949219;
    const sbps5 = data.systolic_blood_pressure_std_dev - 8.756621360778809;
    const town = data.townsend_score - 0.52630490064621;
    let a = 0;
    a += ethnicity[data.ethnicity];
    a += smoke[data.smoking_status];
    a += age1 * -17.839781666005575;
    a += age2 * 0.0022964880605765492;
    a += bmi1 * 2.4562776660536358;
    a += bmi2 * -8.3011122314711354;
    a += ratio * 0.17340196856327111;
    a += sbp * 0.012910126542553305;
    a += sbps5 * 0.010251914291290456;
    a += town * 0.033268201277287295;
    a += Number(data.atrial_fibrillation) * 0.88209236928054657;
    a += Number(data.on_atypical_antipsychotics) * 0.13046879855173513;
    a += Number(data.on_regular_steroids) * 0.45485399750445543;
    a += Number(data.erectile_dysfunction_or_treatment) * 0.22251859086705383;
    a += Number(data.migraine) * 0.25584178074159913;
    a += Number(data.rheumatoid_arthritis) * 0.20970658013956567;
    a += Number(data.chronic_kidney_disease_stage_3_to_5) * 0.71853261288274384;
    a += Number(data.severe_mental_illness) * 0.12133039882047164;
    a += Number(data.systemic_lupus_erythematosus) * 0.4401572174457522;
    a += Number(data.blood_pressure_treatment) * 0.51659871082695474;
    a += Number(data.diabetes_type_1) * 1.2343425521675175;
    a += Number(data.diabetes_type_2) * 0.85942071430932221;
    a += Number(data.family_history_cvd) * 0.54055469009390156;
    [[1, -0.21011133933516346, -0.00049854870275326121], [2, 0.75268676447503191, -0.00079875633317385414], [3, 0.99315887556405791, -0.00083706184266251296], [4, 2.1331163414389076, -0.00078400319155637289]].forEach(function (item) {
      const flag = data.smoking_status === item[0] ? 1 : 0;
      a += age1 * flag * item[1];
      a += age2 * flag * item[2];
    });
    a += age1 * Number(data.atrial_fibrillation) * 3.4896675530623207;
    a += age1 * Number(data.on_regular_steroids) * 1.1708133653489108;
    a += age1 * Number(data.erectile_dysfunction_or_treatment) * -1.506400985745431;
    a += age1 * Number(data.migraine) * 2.3491159871402441;
    a += age1 * Number(data.chronic_kidney_disease_stage_3_to_5) * -0.50656716327223694;
    a += age1 * Number(data.blood_pressure_treatment) * 6.5114581098532671;
    a += age1 * Number(data.diabetes_type_1) * 5.3379864878006531;
    a += age1 * Number(data.diabetes_type_2) * 3.6461817406221311;
    a += age1 * bmi1 * 31.004952956033886;
    a += age1 * bmi2 * -111.29157184391643;
    a += age1 * Number(data.family_history_cvd) * 2.7808628508531887;
    a += age1 * sbp * 0.018858524469865853;
    a += age1 * town * -0.1007554870063731;
    a += age2 * Number(data.atrial_fibrillation) * -0.00034995608340636049;
    a += age2 * Number(data.on_regular_steroids) * -0.0002496045095297166;
    a += age2 * Number(data.erectile_dysfunction_or_treatment) * -0.0011058218441227373;
    a += age2 * Number(data.migraine) * 0.00019896446041478631;
    a += age2 * Number(data.chronic_kidney_disease_stage_3_to_5) * -0.0018325930166498813;
    a += age2 * Number(data.blood_pressure_treatment) * 0.00063838053104165013;
    a += age2 * Number(data.diabetes_type_1) * 0.0006409780808752897;
    a += age2 * Number(data.diabetes_type_2) * -0.00024695695588868315;
    a += age2 * bmi1 * 0.0050380102356322029;
    a += age2 * bmi2 * -0.013074483002524319;
    a += age2 * Number(data.family_history_cvd) * -0.00024791809907396037;
    a += age2 * sbp * -0.00001271874191588457;
    a += age2 * town * -0.000093299642323272888;
    return 100 * (1 - Math.pow(survivor[data.survivor_span], Math.exp(a)));
  }

  function femaleScore(data) {
    const survivor = Array(16).fill(0);
    survivor[10] = 0.988876402378082;
    const ethnicity = [0, 0, 0.28040314332995425, 0.56298994142075398, 0.29590000851116516, 0.072785379877982545, -0.17072135508857317, -0.39371043314874971, -0.32632495283530272, -0.17127056883241784];
    const smoke = [0, 0.13386833786546262, 0.56200858012438537, 0.66749593377502547, 0.84948177644830847];
    const ageDecades = data.age / 10;
    const age1 = Math.pow(ageDecades, -2) - 0.053274843841791;
    const age2 = ageDecades - 4.332503318786621;
    const bmiScaled = data.bmi / 10;
    const bmi1 = Math.pow(bmiScaled, -2) - 0.154946178197861;
    const bmi2 = Math.pow(bmiScaled, -2) * Math.log(bmiScaled) - 0.144462317228317;
    const ratio = data.cholesterol_hdl_ratio - 3.47632646560669;
    const sbp = data.systolic_blood_pressure - 123.13001251220703;
    const sbps5 = data.systolic_blood_pressure_std_dev - 9.002537727355957;
    const town = data.townsend_score - 0.392308831214905;
    let a = 0;
    a += ethnicity[data.ethnicity];
    a += smoke[data.smoking_status];
    a += age1 * -8.1388109247726188;
    a += age2 * 0.79733376689699098;
    a += bmi1 * 0.29236092275460052;
    a += bmi2 * -4.1513300213837665;
    a += ratio * 0.15338035820802554;
    a += sbp * 0.013131488407103424;
    a += sbps5 * 0.0078894541014586095;
    a += town * 0.077223790588590108;
    a += Number(data.atrial_fibrillation) * 1.5923354969269663;
    a += Number(data.on_atypical_antipsychotics) * 0.25237642070115557;
    a += Number(data.on_regular_steroids) * 0.59520725304601851;
    a += Number(data.migraine) * 0.301267260870345;
    a += Number(data.rheumatoid_arthritis) * 0.21364803435181942;
    a += Number(data.chronic_kidney_disease_stage_3_to_5) * 0.65194569493845833;
    a += Number(data.severe_mental_illness) * 0.12555308058820178;
    a += Number(data.systemic_lupus_erythematosus) * 0.75880938654267693;
    a += Number(data.blood_pressure_treatment) * 0.50931593683423004;
    a += Number(data.diabetes_type_1) * 1.7267977510537347;
    a += Number(data.diabetes_type_2) * 1.0688773244615468;
    a += Number(data.family_history_cvd) * 0.45445319020896213;
    [[1, -4.7057161785851891, -0.075589244643193026], [2, -2.7430383403573337, -0.11951192874867074], [3, -0.86608088829392182, -0.10366306397571923], [4, 0.90241562369710648, -0.13991853591718389]].forEach(function (item) {
      const flag = data.smoking_status === item[0] ? 1 : 0;
      a += age1 * flag * item[1];
      a += age2 * flag * item[2];
    });
    a += age1 * Number(data.atrial_fibrillation) * 19.938034889546561;
    a += age1 * Number(data.on_regular_steroids) * -0.98408045235936281;
    a += age1 * Number(data.migraine) * 1.7634979587872999;
    a += age1 * Number(data.chronic_kidney_disease_stage_3_to_5) * -3.5874047731694114;
    a += age1 * Number(data.systemic_lupus_erythematosus) * 19.690303738638292;
    a += age1 * Number(data.blood_pressure_treatment) * 11.872809733921812;
    a += age1 * Number(data.diabetes_type_1) * -1.2444332714320747;
    a += age1 * Number(data.diabetes_type_2) * 6.8652342000009599;
    a += age1 * bmi1 * 23.802623412141742;
    a += age1 * bmi2 * -71.184947692087007;
    a += age1 * Number(data.family_history_cvd) * 0.99467807940435127;
    a += age1 * sbp * 0.034131842338615485;
    a += age1 * town * -1.0301180802035639;
    a += age2 * Number(data.atrial_fibrillation) * -0.076182651011162505;
    a += age2 * Number(data.on_regular_steroids) * -0.12005364946742472;
    a += age2 * Number(data.migraine) * -0.065586917898699859;
    a += age2 * Number(data.chronic_kidney_disease_stage_3_to_5) * -0.22688873086442507;
    a += age2 * Number(data.systemic_lupus_erythematosus) * 0.077347949679016273;
    a += age2 * Number(data.blood_pressure_treatment) * 0.00096857823588174436;
    a += age2 * Number(data.diabetes_type_1) * -0.28724064624488949;
    a += age2 * Number(data.diabetes_type_2) * -0.097112252590695489;
    a += age2 * bmi1 * 0.52369958933664429;
    a += age2 * bmi2 * 0.045744190122323759;
    a += age2 * Number(data.family_history_cvd) * -0.076885051698423038;
    a += age2 * sbp * -0.0015082501423272358;
    a += age2 * town * -0.031593414674962329;
    return 100 * (1 - Math.pow(survivor[data.survivor_span], Math.exp(a)));
  }
})();
