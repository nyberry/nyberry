---
layout: layout.html
title: Classifier part 1
description: Draw a triangle, circle, or square and let a neural net classify it.
image: /assets/images/shapes-tool.png
date: 2026-04-06
---

<h2>Shape Classifier</h2>

<p>
  Draw a shape on the grid below and the browser will classify it as a
  <strong>triangle</strong>, <strong>circle</strong>, or <strong>square</strong>.
</p>

<div class="shape-tool">
  <section class="shape-panel">
    <div class="shape-toolbar" role="toolbar" aria-label="Drawing controls">
      <label class="shape-brush">
        Brush
        <input id="shape-brush-size" type="range" min="1" max="3" value="1">
      </label>
      <button type="button" id="shape-clear-btn">Clear</button>
    </div>

    <canvas
      id="shape-grid"
      class="shape-canvas"
      width="26"
      height="26"
      aria-label="26 by 26 pixel drawing grid"
    ></canvas>

  </section>

  <section class="shape-panel">
    <div class="shape-actions">
      <button type="button" id="shape-classify-btn">Classify</button>
    </div>
    <p id="shape-prediction" class="shape-prediction" hidden></p>

    <ul id="shape-probabilities" class="shape-probabilities" hidden></ul>

    <canvas
      id="shape-preview"
      class="shape-preview"
      width="26"
      height="26"
      aria-label="Normalized preview of the drawing"
    ></canvas>
  </section>
</div>

<hr>

### In an nutshell

This is a miniature image-classification system. It runs client-side in a browser.

It is a multilayer perceptron with hidden layers, trained off-line on procedurally generated triangles, circles, and squares.

### What it is trying to do

This tool is solving a very simple image-recognition problem.

The input is a tiny black-and-white image with 26 x 26 = 676 pixels.
Each pixel is either off (0) or on (1).

The output is a set of three probabilities: circle, square, and triangle.

The task is: "Given these 676 0s and 1s, which of the three shapes is most likely?"

Although this is a simple task, the same general idea is used in larger image-classification systems, and that's why I thought it would be an interesting thing to build and share.

### The input

When you draw on the canvas, you are switching cells on and off in a grid.

The browser script keeps an internal array of all the 1s and 0s in the grid, and updates it as you draw.

### Normalization

If two people draw the same shape, one may draw it in the top-left corner and one in the middle.
One may draw it small and one large.

If we fed those raw drawings straight into the network, the model would have to learn many extra variations of the same idea. It would need to recognize a circle on the left, a circle on the right, a large circle, and a small circle as separate-looking inputs.

That makes the task much harder.

So before classification, the script tries to standardize the drawing. It finds the smallest box containing the drawn pixels, crops to that box, rescales it so it fits neatly inside a 26 x 26 frame, and then recenters it.

This means the model spends less of its capacity learning "where" the shape is and more learning "what" the shape is.

The normalized preview shows what the neural net actually sees.

### Synthetic training data

Off-line, a training script created 3,240 fake examples automatically.

For each class of shape, it generated 1080 variants with different sizes, positions, rotations, stroke thicknesses, and a small amount of noise.

This is "procedurally generated" or "synthetic" data. Doing things this way is useful because it is fast, easy to scale, and gives perfectly known labels.

The weakness is that synthetic data may be cleaner than human doodles. So the model may perform better on computer-generated examples than on messy real sketches.

### The neural network

The model is a small multilayer perceptron (**MLP**).

Its architecture has an input layer of 676 values, a first hidden layer of 64 neurons, a second hidden layer of 32 neurons, and an output layer of 3 neurons.

Each neuron takes in numbers, gives some of them more importance than others, adds them up, applies a rule, and passes the result on.

So the model structure is:

`676 -> 64 -> 32 -> 3`

The hidden layers let the model learn combinations of features, not just raw pixels.

For example, a hidden neuron might become sensitive to curved pixels arranged in a loop, to three line segments meeting in corners, or to four edges with roughly right angles.

These are learned from the data during training.

### Weights and biases

Each connection between neurons has a number attached to it called a **weight**.

A positive weight means an input pushes the answer upward, a negative weight means it pushes the answer downward, and a larger absolute value means the input matters more.

Each neuron also has a **bias**, which is like its starting offset before it looks at the input.

So a neuron is doing something like:

"Start here, add up all the incoming signals with their weights, then decide how active to become."

Training is basically the business of choosing these weights and biases well.

### Feeding the input forward

Once a normalized image has been prepared, the browser runs a forward pass through the network.

The 676 pixel values are fed into the first hidden layer, each hidden neuron computes a weighted sum plus a bias, and a **ReLU** activation is applied. Those outputs then become the input to the second hidden layer. The same thing happens again, and the final layer produces three raw scores, one for each class. A **softmax** step then turns those raw scores into probabilities that add up to 100%.

**ReLU**

This stands for "rectified linear unit".
It means that if a neuron’s value is below zero, it is set to zero, and if it is above zero, it is kept.

This makes the network nonlinear, which is one of the reasons it can learn more interesting patterns than a purely linear model.

**Softmax**

The output layer does not directly produce probabilities. It produces three scores/ Softmax converts those into a probability-style distribution.

So if the raw outputs were something like:

circle `1.2`, square `0.3`, and triangle `2.7`,

softmax turns them into something like:

circle `0.17`, square `0.07`, and triangle `0.76`.

The largest value becomes the model’s best guess.

### Training the model

Training means showing the model many examples where the correct answer is already known, then adjusting the weights and biases so the model improves.

For each training image, the model makes a prediction, compares it with the true label, measures the mistake, pushes that error backward through the network, and nudges the weights and biases so the same mistake becomes less likely next time.

That backward step is called **backpropagation**.

The main idea is to work out which parameters most contributed to the mistake, and in which direction they should move.

This process is repeated over and over for many examples.

An **epoch** means one full pass through the training set. The training script trains for 55 epochs, shuffling the examples between rounds so the model does not learn them in a fixed order.

### The learning rate

The **learning rate** controls how big each correction step is.

If it is too large, training can become unstable and the model can overshoot good settings. If it is too small, training can be very slow and the model may improve only a little at a time. The steps must be large enough to learn, but small enough not to bounce around wildly.

### Weight decay

The training script also uses a small amount of **weight decay**.

This gently discourages weights from becoming unnecessarily large. Amodel that memorizes the training data too aggressively may perform worse on new examples. Weight decay is one simple way of nudging the model toward smoother, more general patterns.

### Validation accuracy

In training, one set of synthetic examples is used for training, while a separate set was held back. The trained model is then tested on that held-back set.

If the model performs well there, that suggests it has learned something broader than just memorizing the training cases.

A high validation score means that Tte model generalizes well to more shapes generated in the same style.

It does not necessarily mean that it will generalise well to human generated shapes... you be the judge.

The saved model's validation accuracy is 0.991


### Classification

In the browser, the sequence is:

The normalized image is fed through the neural network, the three output probabilities are computed, the most likely label is displayed, and the class probabilities are shown underneath.

The user-facing result is only the shape classication and probability, but under the hood the full pipeline involves drawing, normalization, a forward pass, probability conversion, and display.

### This all runs in your browser

The inference here all occurs locally in your broswer, using JavaScript.

No server is needed, no drawing data need to be sent anywhere, the result appears immediately, and the whole model can be inspected as a JSON file.

It shows that a neural network does not have to mean a cloud service or a giant opaque system. Sometimes it can just be a small set of numbers running in a normal web page.



<style>
  .shape-tool {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    margin: 1.5rem 0;
  }

  .shape-panel {
    background: #f7f7f5;
    border: 1px solid #ddd;
    border-radius: 16px;
    padding: 1rem;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
  }

  .shape-toolbar,
  .shape-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.9rem;
  }

  .shape-actions {
    justify-content: center;
  }

  .shape-brush {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
  }

  #shape-clear-btn {
    margin-left: auto;
  }

  .shape-canvas,
  .shape-preview {
    width: min(100%, 320px);
    aspect-ratio: 1;
    display: block;
    margin: 0 auto 1rem;
    border-radius: 12px;
    border: 1px solid #d4d0c8;
    background: #fffdf8;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    touch-action: none;
  }

  .shape-preview {
    width: min(100%, 180px);
    margin-bottom: 0.5rem;
  }

  .shape-prediction {
    min-height: 1.5rem;
  }

  .shape-prediction {
    font-size: 1.15rem;
    font-weight: 600;
  }

  .shape-probabilities {
    list-style: none;
    padding: 0;
    margin: 0 0 1.25rem;
  }

  .shape-probabilities li {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #e5e0d6;
    padding: 0.4rem 0;
    gap: 1rem;
  }

  @media (max-width: 640px) {
    .shape-toolbar,
    .shape-actions {
      gap: 0.5rem;
    }

    .shape-panel {
      padding: 0.9rem;
    }
  }
</style>

<script type="module" src="/assets/js/shapes-tool.js"></script>
