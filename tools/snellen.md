---
layout: layout.html
title: Visual Acuity Test
description: Snellen and Logmar charts plates for screening visual acuity. Suitable for use on a phone or computer.
image: /assets/images/snellen1.png
date: 2025-04-09
---

<img id="snellen-img" src="/assets/images/snellen1.png" alt="Snellen Chart" style=" max-width: 100%; height: auto; display: block; margin: 0 auto;">

<script>
  const snellenImg = document.getElementById('snellen-img');
  const img1 = '/assets/images/snellen1.png';
  const img2 = '/assets/images/snellen2.png';
  let isToggled = false;

  // Hover effect
  snellenImg.addEventListener('mouseover', () => {
    if (!isToggled) {
      snellenImg.src = img2;
    }
  });

  snellenImg.addEventListener('mouseout', () => {
    if (!isToggled) {
      snellenImg.src = img1;
    }
  });

  // Toggle on click
  snellenImg.addEventListener('click', () => {
    isToggled = !isToggled;
    snellenImg.src = isToggled ? img2 : img1;
  });
</script>
