---
title: "Making Sense of Uncertainty"
layout: layout.html
description: Diagnosis, Confusion, Bayes, and Machine Learning.
image: /blog/images/uncertainty.png
date: 2026-01-15
tags: [blog, comments]
order: 200
---

Doctors and data scientists often ask the same question:

> Given imperfect information, how confident should I be in this decision?

Clinicians talk about sensitivity, specificity, and likelihood ratios.
Data scientists talk about confusion matrices, accuracy, and precision.

They are describing the same ideas, just in different terms.

This post is an attempt to capture these concepts in one place. To clarify my own thinking, and maybe as a reference for others working at the interface between healthcare and data science.

## Sensitivity and Specificity: How good is a diagnostic test?

Imagine a simple test that tries to detect a disease: yes or no. And people either truly have the disease, or don't.

## Sensitivity

Sensitivty refers to the ability of a test to correctly identify a disease in people who have it:

> If the person truly has the disease, how likely is a the test to be positive?

D-dimer is a sensitive test for deep vein thrombosis (DVT). Modern lab tests have a sensitivity of about 95%. If 100 people truly have DVT, a d-dimer test will diagnose DVT in 95.

A sensitive test has a high *negative predictive value (NPV)*. It is good at ruling out a diagnosis.

Coupled with a low clinically assessed probability, a negative d-dimer test can effectively rule out a DVT and avoid the need for imaging tests. This touches on Bayes theorem, which will we'll get to soon.

## Specificity

Specificity refers to the ability of a test to correctly identify those *without* the disease:

> If the person truly does not have the disease, how likely is the test to be negative?

This can be a more challenging proposition, containing a double negative.

D-dimer is not a very specific test for DVT. It's a marker for the general process of clot formation and breakdown. Lots of other conditions can affect it, like pregnancy, cancer, infections, and recent surgery. Only around 60% of people who do NOT have DVT will have a negative d-dimer, and so the specificity for DVT is only around 60%.

Doppler ultrasound scanning has a specificity of around 95% for DVT. So, 95% of people who don't have DVT will have a negative scan. Only 5% of people who don't have DVT will have a positive scan. A positive test rules the disease in, and doctors can be pretty confident starting treatment.

However, the sensitivity of doppler ultrasound can be as low as 50% for below knee DVT in asymptomatic patients. If the test is negative, they may still have a DVT and so a doctor might feel much less confident in NOT treating them. There are workarounds such as rescanning after a week - no-one said medicine was going to be easy.

## SN-N-OUT SP-P-IN 

Sensitivity and specificity can be confusing cousins, but thankfully we have the SN-N-OUT SP-P-IN trick to help remember which is which. 


- If a test has high SeNsitivity, and the result is Negative, it helps rule a disease OUT.
- If a test has high SPecificity, and the result is Positive, it helps rule the disease IN.

<img src="images/uncertainty/snoutspin.jpeg" alt="snoutspin" class="blog-img">


## Likelihood Ratios

Likelihood ratios are Bayes in a clincally usable form.

The positive likelihood ratio (LR+) answers:
> "How much more likely is a positive result in someone with the disease, than without?"

$LR+ = \frac{Sensitivity}{1-Specificity}$

A test with a high LR+ (>10) can provide strong evidence to rule a condition in. low LR+ (close to 1) is pretty useless.

And the negative likelihood ratio (LR-) answers:
> “How much less likely is a negative result in someone with disease than in someone without disease?”

$LR- = \frac{1-Sensitivity}{Specificity}$

A test with a low LR- (<.1) can provide strong evidence to rule a condition out.



## Predictive Values

It's important to remember that sensitivity and specificity are just properties of a test. To figure out whether a patient has a disease requires a little more thought.

Once you ask:

> Given this result, what is the probability the patient has the disease?

You’ve crossed into Bayesian territory, whether you like it or not.

The Positive Predictive Value (PPV) of a test is given by $PPV = \frac{True Positives}{All Positive Tests}$

This depends heavily on disease prevalence.

Even if it has good sensitivity and specificity, a test can have woeful predictive value in a low prevalence population. This is particularly something to think about when screening for rare diseases.

## Bayes Theorem

<img src="images/uncertainty/ThomasBayes.webp" alt="Thomas Bayes" class="blog-img">

Thomas Bayes (c. 1701–1761) was an English mathematician, renowned for his foundational work in probability, particularly the theorem that bears his name.

Bayes' Theorem provides a mathematical way to update an estimate of how likely something is, after you have seen new evidence. It is crucial in healthcare and also in AI, machine learning, and data science. 

Bayes says:

> Posterior probability = Prior belief × Strength of new evidence

Applied to diagnostic testing, What you think after a test (posterior probability) depends on what you thought before (prior probability), and on how informative or 'surprising' the test result is

Mathematically:  

$P(\text{Disease} \mid \text{Test}) =
\frac{P(\text{Test} \mid \text{Disease}) \, P(\text{Disease})}
     {P(\text{Test})}$




## Example: tests for chest pain


Two patients have some soreness in the chest.
- 35-year-old athlete, aches after sport
- 75-year-old smoker, gets pain walking up a hill 

The initial sense that the first probably doesn't have angina, and the second probably does, is your *clinical prior* and you cannot escape having one.

A treadmill exercise ECG (exercise stress test) result can mean very different things depending on the pre-test probability.

Unfortunately it is not a very discerning test, with a sensitivity of 80% and a specificity of just 70%.  

This implies:


$LR+ = \frac{0.80}{1-0.70} = 2.67$, and $LR- = \frac{1-0.80}{0.70} = 0.286$

Coronary heart disease is very uncommon in young, low risk patients. You might judge the pretest risk (the clinical prior) for the younger athlete to be just 5%.

If an exercise test is positive:
- pre-test odds = 0.05 / 0.95 = 0.053
- post-test odds = 0.053 x 2.67 = 0.14
- post-test probability = 0.14 / (1+0.14) = 12.3%

If the test is negative:
- post-test odds = 0.053 * 0.286 = 0.015
- post-test probability = 0.015/ (1+0.015) = 1.5%

Positive or negative, the condition is still unlikley and the test hasn't helped move things on very much. Maybe we didn't need to do the test.

For the older patient, the clinical prior (also known as gut feeling or spidey sense) may be much higher, perhaps 75%.

In this case, applying Bayes theorem we find that the probability will be about 89% after a positive test, and about 46% after a negative test.

Actually, in this case a negative test is not hugely reassuring, the condition is about as likely as a coin flip. Maybe we shouldn't have done it here either. It is a weak test.

A test result only changes your mind if it would be unexpected given your starting assumption.

If you already think a disease is unlikely, and the test result is something you often see in healthy people, your belief barely shifts.

If you already think a disease is likely, and the test result is noisy or unreliable, again, your belief hardly shifts.

But if a disease seems unlikely and the test result would be very unusual without the disease, your belief must change. A strong test matters most when it contradicts your initial expectation.

Bayes’ theorem is simply the formal description of this process:

> How much your belief changes depends on how incompatible the result is with what you thought before.

Or, more clinically:

> A test only changes your mind if it makes your previous belief uncomfortable.


## Relevance to Machine Learning

Now let's rename things.

Now let’s quietly rename things.

Clinical Term	ML Term
True positive	True positive
False positive	False positive
Sensitivity	Recall
Specificity	True negative rate
PPV	Precision
Disease prevalence	Class imbalance

A confusion matrix is just the 2×2 table you’ve always known, now given a trendy name.

From it, we derive:

Accuracy

𝑇
𝑃
+
𝑇
𝑁
All predictions
All predictions
TP+TN
	​


Often misleading in imbalanced datasets (hello rare diseases).

Precision
“If the model predicts positive, how often is it right?”
(≈ PPV)

Recall
“Of all true positives, how many did we catch?”
(≈ Sensitivity)

In healthcare ML, accuracy is usually the least interesting metric.

What fascinates me is not that medicine and machine learning use different terminology –
it’s that they’re wrestling with the same uncertainty, just at different scales.

Clinicians: “Should I act on this test?”

Models: “Should I classify this as positive?”

Both live or die by:

Base rates

Trade-offs

Explicit thinking about error

## ROC Curves and Thresholds

Most diagnostic tests don’t give a simple yes/no answer. They give a number:

Troponin level

D-dimer value

Risk score

Model probability

To turn that number into a decision, we choose a threshold.

Above this value: treat as positive.
Below this value: treat as negative.

But changing the threshold always involves a trade-off.

The ROC curve

A Receiver Operating Characteristic (ROC) curve shows what happens as you slide the threshold from “very strict” to “very relaxed”.

Y-axis: Sensitivity (true positive rate)

X-axis: 1 − Specificity (false positive rate)

Each point on the curve is a different threshold.

Key idea:

The ROC curve describes how well a test can separate disease from non-disease — independent of where you set the threshold.

Area Under the Curve (AUC)

AUC = 0.5 → useless (coin flip)

AUC = 1.0 → perfect discrimination

But here’s the crucial clinical insight:

A high AUC does not tell you which threshold to use.

That decision depends on harms, benefits, and context, not statistics alone.

Clinical translation

D-dimer uses a low threshold → prioritises sensitivity → few missed clots

Troponin thresholds balance sensitivity against unnecessary admissions

AI triage tools often output probabilities — but someone still has to choose the cut-off

ROC curves show what’s possible, not what’s sensible.

## Calibration vs Discrimination

These two concepts are often confused — and both matter.

Discrimination: can the test rank patients correctly?

Discrimination asks:

Can the test tell high-risk patients from low-risk patients?

Measured by AUC

About ordering, not absolute truth

A model with good discrimination tends to give:

Higher scores to sicker patients

Lower scores to healthier ones

Even if the probabilities themselves are wrong.

Calibration: are the probabilities believable?

Calibration asks:

When the model says “20% risk”, does that actually happen about 20% of the time?

A model can:

Rank patients perfectly (great discrimination)

But systematically over- or under-estimate risk (poor calibration)

Clinical analogy

Discrimination: “Who should I worry about more?”

Calibration: “Can I trust this number enough to act on it?”

Risk calculators used for:

Starting statins

Anticoagulation

ICU admission

must be well calibrated, not just good at ranking.

## Overfitting and Over-diagnosis

A model is overfitted when it:

- Learns noise instead of signal
- Performs brilliantly on training data
- Fails badly on new data

It has memorised the past, not learned the future.

Over-diagnosis, in medicine, happens when we:

- Detect abnormalities that would never cause harm
- Label patients unnecessarily
- Create treatment cascades without benefit

Examples are thyroid microcarcinomas, incidentalomas, and PSA screening.