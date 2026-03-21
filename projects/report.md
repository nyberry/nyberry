# HDPM_097 Discrete Event Simulation Project

Authors:  NA, NB, LB

## Abstract

(Write this last)

## Introduction

Discrete-event simulation (DES) is used to analyse patient flow, queues, capacity constraints and resource allocation in healthcare systems. In Python, the `SimPy` library provides a framework for implementing DES models, allowing entities, resources, delays and routing rules to be represented in code.

However, while DES studies are often published in the health services literature, the underlying code of models are frequently unavailable. This creates a problem for reproducibility: model logic, assumptions and parameterisation must be inferred from descriptions, figures and tables rather than from the original implementation.

This study focuses on the stroke pathway model reported by Monks et al. (2016), which examined capacity planning in acute and community stroke services. Their model represented the flow of stroke, high-risk transient ischaemic attack (TIA), complex neurological and other patients through an acute stroke unit, inpatient rehabilitation and early supported discharge, and used simulation outputs to estimate the probability of admission or transfer delay under alternative bed configurations. The paper was selected because it provides a clear pathway diagram, is explicit about distribution assumptions, and includes output tables and charts against which a recreation can be compared.

The project was designed not only as a modelling exercise but also as a research study in iterative model recreation using large language models (LLMs). Specifically, we explored whether a simulation described in natural language could be recreated in Python and `SimPy` through a structured sequence of prompts and refinements, and how that process differed when using different AI assistants.

The study therefore combines two related aims: first, to produce a working and understandable recreation of the Monks et al. model; and second, to compare manual and agentic AI-assisted workflows for building and validating that recreation.

## Methods

## 1. Selection of published model

We analysed 4 candidate articles. These are:
-  **Penn et al. (2019)** — *Towards generic modelling of hospital wards: Reuse and redevelopment of simple models*
-  **Lahr et al. (2013)** — *A Simulation-based Approach for Improving Utilization of Thrombolysis in Acute Brain Infarction*
-  **Griffiths et al. (2010)** — *A simulation model of bed-occupancy in a critical care unit*
-  **Monks et al. (2016)** — *A modelling tool for capacity planning in acute and community stroke services*

We compared these articles, considering:
-   **Model structure** — How clearly is the model logic described
-   **Data completeness** — Are distribution types and parameters fully reported?
-   **SimPy feasibility** — How naturally does the model map to SimPy constructs such as resources, queues and processes?
-   **Validation opportunity** — Are there reported outputs to validate a recreation against?
-   **Simplification scope** — Can the model be reasonably simplified, if necessary, while meeting the assignment's minimum complexity requirement?

The group agreed to proceed with the **Monks et al. (2016)** paper. The rationale for selection was that this study offered a clear model structure and pathway logic, sufficient reporting of parameters and process flow, and several published output tables suitable for validation. It also met the assignment requirement that the recreated model should have at least one type of patient and multiple activities, or multiple patient types and one activity. 

Monks et al. describe a discrete-event simulation model using aggregate parameter values derived from more than 2000 anonymised admission and discharge timestamps. The model mimics the flow of stroke, high-risk TIA, complex neurological and other patients from admission to an acute ward through to community rehabilitation and early supported discharge, and predicts the probability of admission or transfer delay under different bed-capacity scenarios.

## 2. Activities, resources and routing.

Before writing code, we extracted the model structure from the paper and appendix and translated it into a simplified conceptual representation suitable for implementation in `SimPy`. This process followed the assignment guidance to identify activities, resources, routing rules, and data inputs before generating or modifying code. The model logic is summarised in Figure 1.

![Figure 1. Conceptual discrete-event simulation model of the stroke pathway.](assets/figures/fig1.jpg)

Figure 1 was used as a reference diagram during model design and prompt engineering. In particular, it helped standardise terminology across prompts and manual edits by making the sequence of arrivals, acute occupancy, rehabilitation occupancy and discharge destinations explicit.

## 2.1 Entities

The model contains one entity type:
- Patient

Patients are categorised into four subtypes:
- Stroke
- TIA
- Complex Neurological
- Other

Each subtype has distinct inter-arrival distributions, length-of-stay distributions, and transfer probabilities.

## 2.2 Activities

In DES, activities are processes that consume simulation time. Based on the paper and supplementary appendix, the main activities in the recreated model were:

### Activity 1 - Arrival at acute stoke unit
- inter-arrival times (IAT): exponential
- separate IATs for each patient group:
  - Acute stroke, 1.2 days
  - TIA, 9.3 days
  - Complex neurological, 3.6 days
  - Other, 3.2 days

### Activity 2 - Acute ward stay
- Duration: Lognormal distribution
- Parameters differ by patient type:
  - Acute stroke, no ESD: 7.4 days
  - Acute stroke, ESD: 4.6 days
  - Acute stroke mortality: 7.0 days
  - TIA: 1.8 days
  - Complex neurological: 4.0 days
  - Other: 3.8 days

### Activity 3 - Rehabilitation ward stay (if routed)
- Duration: Lognormal distribution
- Parameters from the supplementary appendix rehabilitation length-of-stay table

## 2.3 Resources

The published Monks et al. model is described as unconstrained in the sense that patient demand is simulated without bed-capacity blocking within the core model logic. Instead, occupancy is audited over time and the probability of delay is calculated by comparing the occupancy distribution with candidate bed numbers.

For that reason, the recreated model treats the following bed numbers as the *base scenario* representing the observed service configuration rather than as fixed internal queue capacities:

- Acute stroke beds: 10 beds
- Rehab beds: 12 beds

These values were used as the reference configuration for the current-admissions validation scenario, after which alternative bed capacities were explored.

## 2.4 Routing Logic

After completion of acute ward stay, patients are routed probabilistically according to the transfer matrix (appendix: table S3):
- Acute -> Rehab unit
- Acute -> Early Supported Discharge (ESD)
- Acute -> Other (for example, own home, care home, or death)

From Rehab:
- Rehab -> ESD
- Rehab -> Other

This routing is implemented using multinomial sampling.

Together, these activities, resources and routing rules formed the minimum viable model design. The final recreation retained multiple patient types and multiple pathway stages, but simplified some aspects of the original implementation where reporting in the paper was incomplete or where a simpler mechanism was sufficient for a transparent Python recreation.

## 2.5 Scenario design and execution settings

The paper reports a warm-up period of three years, a run length of five years, and 150 replications per scenario. These settings were adopted as the target design for the recreated model. During intermediate development, smaller runs were sometimes used to speed up debugging and prompt iteration; however, validation notebooks were structured around the published settings wherever possible.

The main scenarios considered in the recreated study were:

- Current admissions
- 5% more admissions
- Pooling of acute and rehabilitation beds
- No complex neurological patients
- Ring-fenced acute stroke beds

These scenarios were selected because they are explicitly reported in the paper and supplementary appendix, making it possible to compare the recreated outputs with published tables and figures.

## 3. Iterative development of the model using LLM

The recreation process followed an iterative design strategy consistent with the assignment brief. Rather than attempting to generate the full model in a single prompt, the model was built in layers. Each iteration focused on a specific modelling task, such as extracting parameters, implementing arrivals, auditing occupancy, estimating `p(delay)`, or reproducing a published scenario table. After each iteration, the code was tested and either accepted, revised manually, or re-specified in a subsequent prompt.

This iterative process had two main purposes. First, it reduced the risk of introducing large undetected errors into the model. Second, it provided a structured way to compare different forms of model development: manual coding, prompt-based generation with external LLMs, and agentic AI-assisted refinement in Codex.

## 3.1 Manual baseline and model design

The manual component of the study involved reading the paper and appendix, extracting explicit model assumptions, drawing up a conceptual model, and deciding how the system could be represented in `SimPy`. This included identifying patient groups, arrival processes, lognormal length-of-stay distributions, routing matrices, warm-up and run-length settings, and the published scenario outputs that would later be used for validation.

Manual work was also used to:

- identify ambiguities in the paper
- decide which simplifications were acceptable
- review AI-generated code for correctness and clarity
- interpret differences between recreated and published results

This baseline design stage was essential because the published article did not provide runnable source code and some parts of the original logic had to be inferred from the text and appendices.

## 3.2 Gemini-assisted iterations

[Placeholder for colleague: describe the Gemini workflow, prompts used, what code was generated, how many iterations were needed, what worked well, and what required manual correction.]

## 3.3 Claude-assisted iterations

[Placeholder for colleague: describe the Claude workflow, prompts used, what code was generated, how many iterations were needed, what worked well, and what required manual correction.]

## 3.4 Codex-assisted iterations

Codex was used as an agentic coding environment rather than as a single-turn code generator. In practice, this meant that the workflow combined code inspection, file editing, testing, notebook construction and iterative validation within the same environment. The development process proceeded through a sequence of numbered notebooks. The first iterations focused on project setup and parameter extraction; subsequent iterations implemented the occupancy-audit model, calibration logic, scenario analysis, and the final iteration is a consolidation of all previous iterations.

Compared with one-shot prompting, the Codex workflow was closer to paired programming. Model behaviour could be checked after each change, and prompts could be framed as bounded engineering tasks such as:

- encode the paper parameters explicitly
- build the occupancy audit model
- reproduce the delay trade-off curve
- compare the recreated outputs against Table 2
- create a final technical appendix notebook

This was a controlled and test-driven recreation process, although manual review was still required to detect modelling assumptions, interpret ambiguous reporting, and decide whether numerical differences from the published tables were acceptable.

## 3.5 Comparison of manual and AI-assisted approaches

Across all approaches, the most effective workflow was iterative rather than one-shot. In manual work, iteration was needed to refine the conceptual model and assumptions. In AI-assisted work, iteration was needed to tighten prompts, reduce ambiguity, inspect generated code, and correct errors. The broad pattern observed was that AI tools were useful for accelerating implementation and refactoring, but they did not remove the need for interpretation, testing, or critical review. 

## 4. Validation and testing

Validation and testing were carried out at three levels.

First, input validation was used to confirm that the encoded model parameters matched the paper and supplementary appendix. This included checking arrival rates from the model diagram, lognormal length-of-stay summaries, routing matrices, and published bed-capacity scenarios.

Second, implementation testing was used to check that core model mechanics behaved as intended. Unit tests were written for distribution utilities, parameter registries, scenario helpers, pooling calculations, exclusion scenarios and validation-table generation. Smoke tests were also used to confirm that the occupancy-audit model ran successfully and produced the expected audit columns.

Third, output validation compared the recreated model against the published results. This was done by reproducing the main occupancy and delay outputs reported by Monks et al., including:

- the acute occupancy distribution
- the acute delay trade-off curve
- current admissions versus 5% more admissions
- pooling scenarios
- the effect of removing complex neurological patients
- ring-fenced stroke-bed scenarios

The primary validation metric was the difference between published and recreated `p(delay)` values for the relevant bed configurations. In addition to numerical comparison, qualitative agreement was also assessed by comparing the overall shape and pattern of figures and trade-off tables.

Where outputs differed, these discrepancies were not treated simply as failures. Instead, they were interpreted in the context of the report’s research aim: to assess how closely a published DES model can be recreated from natural-language documentation, and to identify where ambiguity, simplification, or implementation choices most strongly affect the results.

## Results

The final recreated model was implemented as simulation in Python using `SimPy`. The technical appendix contains the full runnable notebook, the supporting Python package, and the intermediate iteration notebooks showing how the model was refined. In total, the Codex-assisted strand produced ten numbered notebooks, progressing from project setup and parameter extraction to scenario validation and consolidation into a final end-to-end appendix notebook.

The recreated model successfully reproduced the main qualitative behaviour of the Monks et al. study. In the base scenario, the simulated acute occupancy distribution had a similar unimodal shape to the published occupancy probability density function, and the recreated acute delay trade-off curve showed the same stepped decline in `p(delay)` as bed numbers increased. This indicates that the core pathway logic, arrival structure and length-of-stay assumptions were sufficient to recover the broad behaviour of the original model.

### Figure 2. Recreated acute occupancy distribution

![Recreated acute occupancy distribution](technical_appendix/final_appendix/docs/figures/final_appendix_acute_occupancy_distribution.png)

This figure shows the simulated distribution of daily occupancy in the acute stroke unit under the current-admissions scenario. As in Monks et al., the distribution is concentrated around the mean occupancy and displays a right tail reflecting the probability of temporarily high bed demand. The figure is important because the later delay calculations are derived from this occupancy audit rather than from direct blocking of patients in a fixed-capacity ward.

### Figure 3. Recreated acute bed trade-off curve

![Recreated acute delay trade-off curve](technical_appendix/final_appendix/docs/figures/final_appendix_acute_delay_tradeoff.png)

This figure reproduces the logic of the paper’s trade-off curve by showing how the estimated probability of delay falls as acute bed numbers increase. The stepped form of the curve is consistent with the published figure and demonstrates that relatively small changes in bed numbers can produce large changes in delay probability at low capacity levels, followed by diminishing returns as more capacity is added.

### Current admissions versus 5% more admissions

The recreated model was closest to the published results when delay was estimated using the Erlang-loss-style occupancy calculation described in the paper rather than a naive threshold probability. Under the current-admissions scenario, the mean absolute error between published and recreated `p(delay)` values was small for both acute and rehabilitation beds. Similar agreement was observed for the `5% more admissions` scenario.

**Table 1. Acute beds: published versus recreated results for current admissions and 5% more admissions**

| Beds | Published current p(delay) | Recreated current p(delay) | Published +5% p(delay) | Recreated +5% p(delay) |
|---|---:|---:|---:|---:|
| 10 | 0.14 | 0.14 | 0.16 | 0.16 |
| 11 | 0.09 | 0.09 | 0.11 | 0.11 |
| 12 | 0.06 | 0.06 | 0.07 | 0.07 |
| 13 | 0.04 | 0.04 | 0.05 | 0.05 |
| 14 | 0.02 | 0.02 | 0.03 | 0.03 |

**Table 2. Rehabilitation beds: published versus recreated results for current admissions and 5% more admissions**

| Beds | Published current p(delay) | Recreated current p(delay) | Published +5% p(delay) | Recreated +5% p(delay) |
|---|---:|---:|---:|---:|
| 12 | 0.11 | 0.11 | 0.13 | 0.13 |
| 13 | 0.08 | 0.08 | 0.09 | 0.09 |
| 14 | 0.05 | 0.05 | 0.07 | 0.06 |
| 15 | 0.03 | 0.03 | 0.04 | 0.04 |
| 16 | 0.02 | 0.02 | 0.02 | 0.03 |

These results suggest that the recreated occupancy-audit model provides a good approximation to the reported base-case and increased-demand results, for both the acute and rehab wards.

### Effect of complex neurological patients on flow

The recreated model captured the direction of effect for the `no complex neurological patients` scenario, with lower delay probabilities in both acute and rehabilitation units once that patient group was removed. Agreement was stronger for the acute unit than for rehabilitation, suggesting that the recreated pathway captures the main demand effect of complex neurological patients, but may simplify some downstream consequences of their rehabilitation use.

**Table 3. Acute beds: published versus recreated results for current admissions and no complex neurological patients**

| Beds | Published current p(delay) | Recreated current p(delay) | Published no-complex p(delay) | Recreated no-complex p(delay) |
|---|---:|---:|---:|---:|
| 10 | 0.14 | 0.14 | 0.09 | 0.09 |
| 11 | 0.09 | 0.09 | 0.05 | 0.05 |
| 12 | 0.06 | 0.06 | 0.03 | 0.03 |
| 13 | 0.04 | 0.04 | 0.02 | 0.02 |
| 14 | 0.02 | 0.02 | 0.01 | 0.01 |
| 15 | 0.01 | 0.01 | 0.01 | 0.01 |

**Table 4. Rehabilitation beds: published versus recreated results for current admissions and no complex neurological patients**

| Beds | Published current p(delay) | Recreated current p(delay) | Published no-complex p(delay) | Recreated no-complex p(delay) |
|---|---:|---:|---:|---:|
| 12 | 0.11 | 0.11 | 0.03 | 0.05 |
| 13 | 0.08 | 0.08 | 0.02 | 0.03 |
| 14 | 0.05 | 0.05 | 0.01 | 0.02 |
| 15 | 0.03 | 0.03 | 0.01 | 0.01 |
| 16 | 0.02 | 0.02 | 0.00 | 0.00 |

### Pooling of acute and rehabilitation beds

The pooled-bed scenarios reproduced the broad finding that complete pooling and additional beds reduce delay, although some partial-pooling rows differed more noticeably from the published table. This is consistent with the fact that pooled-bed results in the recreation were derived analytically from audited occupancy distributions rather than by reproducing the exact original implementation in SIMUL8.

**Table 5. Pooling scenarios: published versus recreated `p(delay)`**

| Dedicated acute | Dedicated rehab | Pooled | Published acute | Recreated acute | Published rehab | Recreated rehab |
|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 22 | 0.057 | 0.068 | 0.057 | 0.068 |
| 0 | 0 | 26 | 0.016 | 0.018 | 0.016 | 0.018 |
| 14 | 12 | 0 | 0.020 | 0.021 | 0.117 | 0.109 |
| 11 | 11 | 4 | 0.031 | 0.048 | 0.077 | 0.091 |
| 11 | 10 | 5 | 0.027 | 0.041 | 0.080 | 0.092 |
| 10 | 10 | 6 | 0.033 | 0.045 | 0.057 | 0.066 |
| 10 | 9 | 7 | 0.030 | 0.042 | 0.060 | 0.067 |
| 9 | 9 | 8 | 0.035 | 0.045 | 0.049 | 0.054 |
| 9 | 8 | 9 | 0.034 | 0.044 | 0.051 | 0.054 |

### Ring-fenced acute stroke beds

The ring-fenced stroke-bed scenario showed the largest divergence from the published results. In the recreation, ring-fencing was implemented by comparing delay against stroke-only occupancy within the acute unit. This produced a stronger reduction in delay than was reported by Monks et al. While the direction of effect was correct, the magnitude suggests that the recreated ring-fencing rule is likely more restrictive, or more idealised, than the mechanism used in the original model.

**Table 6. Acute beds: published versus recreated results for current admissions and ring-fenced stroke beds**

| Beds | Published current p(delay) | Recreated current p(delay) | Published ring-fenced p(delay) | Recreated ring-fenced p(delay) |
|---|---:|---:|---:|---:|
| 10 | 0.14 | 0.14 | 0.08 | 0.04 |
| 11 | 0.09 | 0.09 | 0.05 | 0.02 |
| 12 | 0.06 | 0.06 | 0.03 | 0.01 |
| 13 | 0.04 | 0.04 | 0.02 | 0.00 |
| 14 | 0.02 | 0.02 | 0.01 | 0.00 |
| 15 | 0.01 | 0.01 | 0.00 | 0.00 |

Overall, the study provides evidence that a published healthcare DES can be recreated in Python and `SimPy` to a useful degree of fidelity using an iterative workflow. The strongest agreement was achieved in the core current-admissions and `5% more admissions` scenarios, while scenarios involving more policy interpretation, such as pooling and ring-fencing, showed larger but still interpretable deviations. Full figures, validation tables and scenario outputs are presented in the technical appendix notebook.

## Discussion

[Placeholder: interpret the main findings in relation to the research question. Suggested points to address:

- To what extent was the Monks et al. model successfully recreated?
- Which aspects of the paper were reported well enough to support recreation?
- Which aspects of the paper were ambiguous or under-specified?
- How did the manual, Gemini, Claude and Codex workflows differ in practice?
- What types of prompts appeared most effective for DES recreation?
- Where did the recreated model diverge from the published model, and why?
- What are the main limitations of the current recreation?
- Use of agentic AI for complex tasks
- If the study were repeated, what would be done differently?]

## Conclusions

[Placeholder: write a short concluding paragraph summarising:

- whether the recreation was successful
- whether iterative LLM-assisted design was useful
- what the study suggests about reproducibility of published DES models
- the main caution or limitation to retain in interpreting the results]

## References

Acharya, D.B., Kuppan, K. and Divya, B. (2025) ‘Agentic AI: Autonomous intelligence for complex goals: A comprehensive survey’, *IEEE Access*, 13, pp. 18912-18936. Available at: https://doi.org/10.1109/ACCESS.2025.3532853

Law, A.M. (2015) *Simulation modeling and analysis*. 5th edn. New York: McGraw-Hill Education.

Matloff, N. (2008) *Introduction to discrete-event simulation and the SimPy language*. Davis, CA: University of California, Davis. Available at: https://heather.cs.ucdavis.edu/~matloff/156/PLN/DESimIntro.pdf

Monks, T., Worthington, D., Allen, M., Pitt, M., Stein, K. and James, M.A. (2016) ‘A modelling tool for capacity planning in acute and community stroke services’, *BMC Health Services Research*, 16, p. 530. Available at: https://doi.org/10.1186/s12913-016-1789-4
