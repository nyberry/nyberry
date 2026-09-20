---
layout: layout.html
title: nyberry
templateEngineOverride: liquid
---

<img class="profile_img" src="/assets/images/headshot.jpg" alt="Centered Image">

<section class="home-hero">
  <p class="eyebrow">AI . Data Science . Health </p>

  <p class="hero-lede">
    Some eclectic and widely dispersed thoughts on machine learning, language models, simulations, optimisers, classifiers, and how these can sometimes be used in healthcare.
  </p>
</section>

<section class="home-section">
  <div class="grid card-grid">
    {% for page in collections.pages %}
      {% assign tags = page.data.tags | default: "" %}
      {% assign item_type = "item" %}
      {% if tags contains "blog" %}
        {% assign item_type = "article" %}
      {% elsif page.url contains "/tools/" %}
        {% assign item_type = "tool" %}
      {% elsif page.url contains "/projects/" %}
        {% assign item_type = "project" %}
      {% elsif page.url contains "/games/" %}
        {% assign item_type = "game" %}
      {% endif %}
      <a href="{{ page.url }}" class="card">
        <span class="card-image-wrap"><img src="{{ page.data.image }}" alt="{{ page.data.title }}"></span>
        <span class="card-kicker">{% if page.data.date %}{{ page.date | date: "%Y-%m-%d" }} · {{ item_type }}{% else %}Featured · {{ item_type }}{% endif %}</span>
        <h3>{{ page.data.title }}</h3>
        <p>{{ page.data.description }}</p>
      </a>
    {% endfor %}
  </div>
</section>

<hr>

<div class="site-disclaimer">
  <h3>Disclaimer</h3>
  <p>
    This site is intended as a light reference tool and should not be relied upon as a sole source of information for clinical decision-making. There may be errors. Clinical users must verify all information against authoritative sources such as national guidelines or clinical protocols, and are responsibile for safe use.
  </p>
  <p><a href="https://clini.co.uk/nybmedical/">&copy; 2026 NYB Medical Limited</a></p>
</div>
