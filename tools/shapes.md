---
layout: layout.html
title: Shape Classifier
description: Draw a triangle, circle, or square on a 26 x 26 grid and let a tiny browser neural net guess the shape.
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

### How this works

This is a tiny toy model: a multilayer perceptron with hidden layers, trained on procedurally generated triangles, circles, and squares.

It is fully client-side, easy to inspect, and fast to run.

### What the model is trying to do

At heart, this tool is solving a very simple image-recognition problem.

The input is a tiny black-and-white image with `26 x 26 = 676` pixels.
Each pixel is either "off" (`0`) or "on" (`1`).

The output is a set of three probabilities: circle, square, and triangle.

So the task is:

"Given these 676 numbers, which of the three shapes is most likely?"

This is a miniature version of the same general idea used in larger image-classification systems.
The difference is that here everything is deliberately small enough to inspect and understand.

### What happens when you draw in the browser

When you draw on the large canvas, you are not painting a photograph.
You are really switching cells on and off in a `26 x 26` grid.

The browser script keeps an internal array of 676 numbers, updates it as you draw, redraws the visible grid, and creates a normalized version before classification.

The visible drawing canvas is enlarged for comfort, but the underlying data stay at `26 x 26`.
That is why the drawing looks blocky and pixelated: the model only sees a tiny image.

### Why there is a "normalized preview"

If two people draw the same shape, one may draw it in the top-left corner and one in the middle.
One may draw it small and one large.

If we fed those raw drawings straight into the network, the model would have to learn many extra variations of the same idea. It would need to recognize a circle on the left, a circle on the right, a large circle, and a small circle as separate-looking inputs.

That makes the task much harder.

So before classification, the script tries to standardize the drawing. It finds the smallest box containing the drawn pixels, crops to that box, rescales it so it fits neatly inside the `26 x 26` frame, and then recenters it.

This means the model spends less of its capacity learning "where" the shape is and more learning "what" the shape is.

In plain language, the drawing canvas captures what you drew, while the normalized preview shows what the neural net actually sees.

### How the synthetic training data were made

There is no hand-labelled patient-style dataset behind this.
Instead, the training script creates large numbers of fake examples automatically.

For each class, it generates many variants with different sizes, positions, rotations, stroke thicknesses, and a small amount of noise.

So rather than drawing thousands of shapes by hand and labelling them one by one, the code says:

"Make me lots of plausible circles, lots of plausible squares, and lots of plausible triangles."

This is what "procedurally generated" or "synthetic" data means here.

That is useful because it is fast, cheap, and easy to scale. It also gives perfectly known labels, because the generator itself made the shape.

The weakness is that synthetic data may be cleaner than human doodles.
So the model may perform better on computer-generated examples than on messy real sketches.

### How the shapes are drawn during training

The training script does not start from images.
It starts from geometry.

For example, a circle is made by choosing a centre point and radius, then turning on pixels near the circular edge. A square is made by choosing a centre, side length, and rotation, then turning on pixels near the four sides. A triangle is made by choosing three corners and turning on pixels near the three edges.

After that, the generator may thicken the stroke slightly, add or remove a few pixels as noise, and shift the shape a little.

Only then is the image normalized in the same style as the browser input.

This is important.
The model is trained not on ideal mathematical coordinates, but on little pixel images that resemble what the browser will later provide.

### What the neural network actually is

The current model is a small multilayer perceptron, usually shortened to **MLP**.

Its architecture has an input layer of `676` values, a first hidden layer of `64` neurons, a second hidden layer of `32` neurons, and an output layer of `3` neurons.

You can think of each neuron as a small calculator.
It takes in numbers, gives some of them more importance than others, adds them up, applies a rule, and passes the result on.

So the model structure is:

`676 -> 64 -> 32 -> 3`

The hidden layers let the model learn combinations of features, not just raw pixels.

For example, a hidden neuron might become sensitive to curved pixels arranged in a loop, to three line segments meeting in corners, or to four edges with roughly right angles.

These are not written into the code by hand.
They are learned from the data during training.

### What "weights" and "biases" mean

Each connection between neurons has a number attached to it called a **weight**.

Very roughly, a positive weight means an input pushes the answer upward, a negative weight means it pushes the answer downward, and a larger absolute value means the input matters more.

Each neuron also has a **bias**, which is like its starting offset before it looks at the input.

So a neuron is doing something like:

"Start here, add up all the incoming signals with their weights, then decide how active to become."

The whole business of training is basically the business of choosing these weights and biases well.

### What happens in one forward pass

Once a normalized image has been prepared, the browser runs a forward pass through the network.

That means the 676 pixel values are fed into the first hidden layer, each hidden neuron computes a weighted sum plus a bias, and a ReLU activation is applied. Those outputs then become the input to the second hidden layer. The same thing happens again, and the final layer produces three raw scores, one for each class. A softmax step then turns those raw scores into probabilities that add up to 100%.

Two terms here are worth unpacking:

**ReLU**

This stands for "rectified linear unit".
It simply means that if a neuron’s value is below zero, it is set to zero, and if it is above zero, it is kept.

This makes the network nonlinear, which is one of the reasons it can learn more interesting patterns than a purely linear model.

**Softmax**

The output layer does not directly produce probabilities.
It produces three scores.
Softmax converts those into a probability-style distribution.

So if the raw outputs were something like:

circle `1.2`, square `0.3`, and triangle `2.7`,

softmax turns them into something like:

circle `0.17`, square `0.07`, and triangle `0.76`.

The largest value becomes the model’s best guess.

### How training works

Training means showing the model many examples where the correct answer is already known, then adjusting the weights and biases so the model improves.

For each training image, the model makes a prediction, compares it with the true label, measures the mistake, pushes that error backward through the network, and nudges the weights and biases so the same mistake becomes less likely next time.

That backward step is called **backpropagation**.

You do not need the full calculus to understand the main idea.
The important concept is:

"Which parameters most contributed to the mistake, and in which direction should they move?"

This process is repeated over and over for many examples.

An **epoch** means one full pass through the training set.
The current script trains for multiple epochs, shuffling the examples between rounds so the model does not learn them in a fixed order.

### What the learning rate does

The **learning rate** controls how big each correction step is.

If it is too large, training can become unstable and the model can overshoot good settings. If it is too small, training can be very slow and the model may improve only a little at a time. So training is a balancing act: the steps must be large enough to learn, but small enough not to bounce around wildly.

### What weight decay is

The training script also uses a small amount of **weight decay**.

This gently discourages weights from becoming unnecessarily large.
You can think of it as a mild penalty for overcomplicated solutions.

Why do this?

Because a model that memorizes the training data too aggressively may perform worse on new examples.
Weight decay is one simple way of nudging the model toward smoother, more general patterns.

### What validation accuracy means

After training, the script reports a **validation accuracy**.

This means one set of synthetic examples is used for training, while a separate set is held back. The trained model is then tested on that held-back set.

If the model performs well there, that suggests it has learned something broader than just memorizing the training cases.

However, there is an important caveat:

The validation set is still synthetic.
It is separate from training, but it comes from the same code generator.

So a high validation score means:

"The model generalizes well to more fake shapes generated in the same style."

It does **not** necessarily mean:

"The model will perform equally well on every human sketch."

That is why a real test set of human doodles would be the next honest benchmark.

### What happens when you press "Classify drawing"

In the browser, the sequence is:

Your current grid is normalized first. If there are too few active pixels, the script assumes nothing meaningful has been drawn. Otherwise, the normalized image is fed through the neural network, the three output probabilities are computed, the most likely label is displayed, and the class probabilities are shown underneath.

So the user-facing result is only the final few lines on the page, but under the hood there is a full pipeline involving drawing, normalization, a forward pass, probability conversion, and display.

### Why the model can still be wrong

Even though this is a "real" neural network, it is still a tiny toy system.

It can struggle when a circle is left open, when a square looks more like a rectangle, when a triangle is very skewed, when the user scribbles heavily, when strokes are broken or faint, when the doodle is partly filled in, or when the drawing style differs from the synthetic generator.

This is not a bug so much as a reminder of what machine learning really is:

The model does not understand shapes in the way a person does.
It has learned statistical patterns from examples.

### Why run it entirely in the browser

There are a few nice things about doing inference locally in JavaScript:

No server is needed, no drawing data need to be sent anywhere, the result appears immediately, and the whole model can be inspected as a JSON file.

That makes it a good educational example.
It shows that a neural network does not have to mean a huge cloud service or a giant opaque system.
Sometimes it can just be a small set of numbers running in a normal web page.

### A clinical analogy

One way to think about the network is as a very large set of weighted heuristics.

Doctors often make pattern-based judgments such as, "This cluster of features makes diagnosis A more likely," or, "This other cluster pushes me toward diagnosis B." Taken together, the balance of evidence points in one direction.

A neural network is not reasoning clinically, and it has no genuine understanding.
But mathematically it does something with a family resemblance. It combines many small signals, gives more weight to some than others, builds intermediate patterns from simpler ones, and ends with a ranking of possibilities.

The crucial difference is that the network’s internal heuristics are learned from data rather than explicitly written out in prose.

### What would improve it next

The most useful next upgrades would probably be more human-like synthetic data, a small real test set of human drawings, smoother stroke interpolation in the browser, slightly better preprocessing, and possibly more shape classes later. In other words, the interesting challenge now is less "make the network bigger" and more "make the training examples and input pipeline closer to real use."

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
