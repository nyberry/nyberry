Pet classifier data notes
=========================

The current pets model is a bootstrap model trained on synthetic full-body cartoon
cat and mouse drawings, so the page works before we have a cleaned real dataset.

When we are ready to replace that with real web-scraped line drawings, the
trainer can also read:

  scripts/pets-data/examples.json

Expected format:

[
  {
    "label": "cat",
    "pixels": [0, 0, 1, ... 1600 total values ...]
  },
  {
    "label": "mouse",
    "pixels": [0, 1, 1, ... 1600 total values ...]
  }
]

Each example should already be a normalized 40 x 40 black-and-white array.

A practical next step is to add a browser-based importer that:
1. loads scraped cat and mouse line drawings,
2. converts them to 40 x 40 binary arrays,
3. exports examples.json for the trainer.
