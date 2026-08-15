---
title: "Kimi K3 Deep Dive: The World's Largest Open-Source Model — How Good Is It Really?"
domain: ai
format: news
date: 2026-08-15
intro: "In July 2026, Moonshot AI released Kimi K3 with 2.8 trillion parameters, making it the world's largest open-source model — and for the first time it outright beat closed-source flagships on the frontend coding leaderboard. This article walks through its core technology, benchmark scores, pricing, and where to use it, so you know exactly where it excels and whether it's worth your time."
image: "https://img.lingflux.com/2026/08/571adb2c06517070adb8f0f31ab2892e.png"
tags: ["Kimi K3", "Moonshot AI", "Open-Source Model", "LLM", "Artificial Analysis", "LMArena"]
---

> **One-sentence summary**: With 2.8 trillion parameters, Kimi K3 tops the world's open-source models and, for the first time, beats closed-source flagships on the coding leaderboard. Here's where it excels, what it costs, and where to use it.

> Data current as of August 12, 2026
> This article draws on data from Xinhua News Agency, Artificial Analysis, LMArena, Moonshot's official release materials, and several third-party evaluations. It's worth re-checking the latest leaderboards before publishing.

---

## 1. Introduction: Open-source models finally touch the "ceiling"

On July 16, 2026 — one day before the opening of the World Artificial Intelligence Conference (WAIC) in Shanghai — Moonshot AI dropped a bombshell: **Kimi K3**.

Its titles sound like hype, but they're all factual:

- **2.8 trillion total parameters**, currently the largest open-source model in the world, far ahead of DeepSeek V4 Pro (1.6 trillion) and Zhipu's GLM-5 series (744 billion);
- **the world's first open-source model at the 3-trillion-parameter scale**;
- **the first time in open-source history that a model has outright beaten closed-source flagships on a mainstream leaderboard** — on the frontend coding blind-test leaderboard Frontend Code Arena, Kimi K3 took the top spot with a score of 1679, edging out Anthropic's Claude Fable 5 and OpenAI's GPT-5.6 Sol.

As Xinhua News Agency put it, this "marks a new step forward in the development of AI models in China." But for ordinary users, the more practical questions are: Where does it excel? What does it mean for me? Where can I actually use it? This article explains all of that in one place.

---

## 2. What is Kimi K3?

### 2.1 Basic profile

| Item | Details |
|---|---|
| Developer | Moonshot AI (founded in 2023 by Tsinghua-alumnus entrepreneur Yang Zhilin, with Alibaba and Tencent among its investors) |
| Release date | Announced July 16, 2026; full weights open-sourced July 27, 2026 |
| Architecture | MoE (Mixture-of-Experts) model, 93 layers, 896 experts total, with only 16 activated per token |
| Total / active parameters | 2.8 trillion / roughly tens of billions (sparse activation, so inference cost is far lower than its size suggests) |
| Context window | 1 million tokens (1,048,576), flat pricing with no tiering |
| Modality | Natively supports text + image understanding (MoonViT-V2 vision encoder); some channels already support video input |
| Open-source license | Custom Kimi K3 License (MIT-like, with revenue-tier clauses) |

### 2.2 Two core technical innovations

Kimi K3's appeal isn't just its "size" — it's also in how it processes information:

**1. KDA hybrid linear attention (Kimi Delta Attention)**

In a traditional Transformer, full attention's compute grows near-quadratically with text length — double the content and compute roughly quadruples. That's the root reason ultra-long context has been so hard to ship. In 69 of its 93 layers, K3 uses Moonshot's in-house KDA linear attention module, pushing compute toward near-**linear** growth. The result: KV cache is cut by about 75%, and million-token decoding throughput improves by roughly 6.3×. Simply put, with the same compute it can "read" longer and think deeper.

**2. Attention Residuals (AttnRes)**

The bigger and deeper a model gets, the more information tends to decay and distort as it passes between layers, and the more likely training is to collapse. Attention residual techniques let the model selectively retrieve representations across depth rather than mechanically stacking layer by layer — the equivalent of installing a "stabilizer" in a 2.8-trillion-parameter giant. Officially, the combination of the two techniques gives K3 roughly **2.5× the training-scaling efficiency** of K2.

### 2.3 Open-source strategy: anyone can download, but big players have to "check in"

On July 27, K3's full weights and technical report landed on Hugging Face and GitHub. The license is broadly MIT-like: anyone can use, modify, distribute, and fine-tune it for free. There are only two revenue-related restrictions:

- Cloud providers reselling K3 inference at scale in a "model-as-a-service" manner must sign a separate agreement with Moonshot once their trailing-12-month revenue exceeds $200,000;
- Commercial products with over 100 million monthly active users or over $2 million in monthly revenue must clearly display "Kimi K3" in their interface.

For the vast majority of developers and small-to-medium businesses, this effectively means "free for commercial use."

---

## 3. Head-to-head: where it actually stands on the leaderboards

Benchmarks should be read in two categories: **independently re-tested by third-party institutions** (high credibility) versus **vendor-reported** (reference only). Let's start with the two most meaningful composite leaderboards.

### 3.1 Artificial Analysis Intelligence Index (objective scores, early-August 2026 data)

| Rank | Model | Intelligence Index | Type |
|---|---|---|---|
| 1 | Claude Opus 5 (max) | 63 | Closed |
| 3 | Claude Fable 5 | 62 | Closed |
| 5 | GPT-5.6 Sol (max) | 61 | Closed |
| **6** | **Kimi K3 (max)** | **60** | **Open** |
| 7 | GPT-5.6 Sol (xhigh) | 59 | Closed |
| 9 | Qwen3.8 Max | 58 | Closed |

**Kimi K3 is the highest-ranked open-source model on the whole leaderboard, and the #1 Chinese model.** Its gap to the top-five closed-source flagships is just 1–3 points — that's "same tier, frontier," not a generation behind.

### 3.2 LMArena (human blind-vote testing, August 2026)

| Model | Text Elo | Notes |
|---|---|---|
| Claude Fable 5 | 1525 | Text #1 |
| Claude Opus 5 | 1522 | New flagship |
| GPT-5.6 Sol | 1514 | OpenAI flagship |
| **Kimi K3** | **≈1500** | **On par with the closed-source first tier; coding sub-leaderboard #1** |
| GLM-5.2 | 1483 | Open |
| DeepSeek V4 Pro | 1462 | Open |

The coding sub-leaderboard deserves the most attention: **Kimi K3 took first place on Frontend Code Arena with a 1679 Elo** (Claude Fable 5 at 1631, GPT-5.6 Sol at 1618), winning first place in 6 of 7 sub-domains. This is the first time an open-source model has topped an Arena-series leaderboard — the previous generation K2.6 was still in 18th place, a jump of 17 positions in one generation.

### 3.3 Specialized capability comparison (Moonshot official data + third-party compilation)

| Benchmark | Kimi K3 | Claude Fable 5 | GPT-5.6 Sol | Claude Opus 4.8 |
|---|---|---|---|---|
| SWE Marathon (ultra-long-sequence development) | **42 (#1)** | 35 | 39 | 40 |
| Program Bench (software reverse engineering) | **77.8 (#1)** | 76.8 | 77.6 | 71.9 |
| Terminal-Bench 2.1 (terminal ops) | 88.3 | 84.6 | **88.8** | 84.6 |
| FrontierSWE (hard software engineering) | 81.2 | **86.6** | 71.3 | 66.7 |
| BrowseComp (deep web research) | **91.2 (SOTA)** | 88.0 | 90.4 | 84.3 |
| Automation Bench (office automation) | **30.8 (#1)** | 29.1 | 29.7 | 27.2 |
| SpreadsheetBench 2 (Excel modeling) | **#1** | — | — | — |
| GPQA-Diamond (scientific reasoning) | 93.5 | 92.6 | **94.1** | 91.0 |
| MMMU-Pro (visual reasoning) | 81.6 | 81.2 | **83.0** | 78.9 |
| OmniDocBench (document understanding) | **91.1 (#1)** | 89.8 | 85.8 | 87.9 |

(Note: some items were tested with different agent frameworks by different parties, so cross-vendor comparison is reference-only.)

**A one-sentence summary of K3's capability profile:**

- ✅ **Long-horizon coding and frontend development**: currently unmatched in the open-source world, with multiple #1 finishes;
- ✅ **Deep research and office automation**: BrowseComp set a new record;
- ✅ **Ultra-long document understanding**: 1-million-token context plus a #1 in document understanding, ideal for analyzing whole code repos and large volumes of material;
- ⚠️ **Overall experience**: Moonshot itself admits that in interaction details and the subjective "feel" of task completion, it still trails Claude Fable 5 and GPT-5.6 Sol slightly; third-party tests measured output at roughly 36–55 tokens/s, not fast, and it burns through more tokens in thinking mode.

### 3.4 Value for money: "cheap" is relative

| Model | Input ($/M tokens) | Output ($/M tokens) | Cache-hit input |
|---|---|---|---|
| Kimi K3 | 3.0 | 15.0 | 0.30 |
| Claude Fable 5 | 10.0 | 50.0 | — |
| Claude Opus 4.8 | 5.0 | 25.0 | — |
| GPT-5.6 Sol | 5.0 | 30.0 | — |
| Kimi K2.6 | 0.95 | 4.0 | 0.16 |

Domestic official pricing is ¥20/M tokens for input, ¥100/M tokens for output, and ¥2/M tokens for cache hits.

K3 costs roughly one-third of Claude Fable 5, but is 4–5× pricier than its own K2.6. The key money-saving trick is **caching**: in coding scenarios, Moonshot says cache-hit rates can exceed 90%, with the hit portion priced at one-tenth of input; OpenRouter measured an effective input cost of about $0.55/M tokens. Third-party estimates put a single agent-coding round (100K input + 20K output) at about $0.60 on K3 versus about $2.00 on Fable 5.

---

## 4. Where can you actually use Kimi K3?

This is the part everyone cares about most, and it's what I've been hunting for lately — I'm recording it here to share, ordered by barrier to entry from low to high:

### 4.1 WorkBuddy (one of the most hassle-free ways)

[https://www.workbuddy.cn/](https://www.workbuddy.cn/events/invite?inviteCode=421qev5h73caj0) (WorkBuddy invite link)

Why not recommend the official Kimi website first? Because right now it's simply not open — no idea when subscriptions will open up, I've been waiting for two weeks. Unless you're an existing Kimi member, in which case you can skip right ahead, haha.

**WorkBuddy already has Kimi K3 built in** — the conversation you're reading right now is actually running on Kimi K3. For ordinary users and office scenarios who don't want to wrestle with API keys or fiddle with parameters, just open WorkBuddy and use it directly: write documents, build spreadsheets, read PDFs, run code, generate web pages — K3's long context and Agent capabilities work out of the box in WorkBuddy. It's also one of the shortest paths for domestic users to experience K3's full capabilities with zero barrier to entry.

### 4.2 Kimi's official product lineup

https://kimi.com

- **Kimi Web / App** (kimi.com / kimi.moonshot.cn): sign up and chat, free tier has context and rate limits, membership unlocks the full 1M context;
- **Kimi Work**: a desktop knowledge-work environment (Windows / Apple-silicon Mac, from version 3.1.0);
- **Kimi Code**: a terminal coding Agent, install via `npm i @moonshot-ai/kimi-code`, switch to K3 with `/model`.

### 4.3 Official API (developers)

- Platforms: platform.moonshot.cn (China) / platform.kimi.ai (international);
- Fully OpenAI-SDK-compatible, model ID `kimi-k3`, point `base_url` at `https://api.moonshot.ai/v1` to migrate your existing code.

```python
from openai import OpenAI

client = OpenAI(
    api_key="your API key",
    base_url="https://api.moonshot.ai/v1"
)
resp = client.chat.completions.create(
    model="kimi-k3",
    messages=[{"role": "user", "content": "Help me analyze this code"}]
)
```

### 4.4 Third-party platforms

- **OpenRouter**: model ID `moonshotai/kimi-k3`, same price as official with no markup;
- **SiliconFlow**: friendly for domestic access;
- **Cloudflare Workers AI, Groq**: also listed;
- **Self-hosting**: download weights from Hugging Face / GitHub, supports vLLM / SGLang, MXFP4/NVFP4 quantization — but production-grade deployment needs a 64+ GPU super-node, so it's mostly for casual observers.

### 4.5 A small heads-up

After K3's launch, demand was so strong that Kimi's official membership temporarily paused new purchases (starting July 20, prioritizing existing users). If the official channel gets crowded, WorkBuddy, OpenRouter, and SiliconFlow are all reliable alternatives.

---

## 5. Final thoughts

Kimi K3's significance may take a few years to fully become clear:

1. **It proves open source can catch up with closed source.** 2.8 trillion parameters, #1 on the Arena coding leaderboard, #1 open-source on the Intelligence Index — the era of "open source = second-rate" is over;
2. **It proves a Chinese team can do foundational architecture innovation.** KDA linear attention and attention residuals aren't engineering brute force — they're original solutions to two world-class problems: "computing ultra-long context cheaply" and "training ultra-large models stably";
3. **It drove down the price of frontier capability.** One-third of Claude's price, plus weights anyone can download, means more products and research will grow on K3's shoulders.

Of course, we should stay clear-eyed: on overall experience it still trails the two or three strongest closed-source models, its inference speed isn't fast, and thinking mode burns tokens hard. It's not a universal key — but if you're facing hard-nut tasks like **long documents, whole-repo code, deep research, or frontend development**, Kimi K3 is the strongest answer the open-source world can currently offer — and you can use it right now just by opening WorkBuddy.

---

## References

1. Xinhua News Agency: "New Breakthrough: Chinese Company Releases the World's Largest Open-Source Model Kimi K3," 2026-07-17
2. Artificial Analysis Intelligence Index, August 2026 data
3. LMArena leaderboard, August 2026 snapshot
4. Moonshot AI official release materials and the Kimi K3 technical report, July 2026
5. PureAI / Neowin / SiliconFlow / dev.to and other third-party evaluations, July–August 2026

> Disclaimer: Some benchmark scores in this article are vendor-reported, and results under different test frameworks are not fully comparable; pricing and available channels are subject to each platform's real-time pages.
