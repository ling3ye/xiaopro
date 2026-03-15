---
title: "OpenClaw Tutorial: Build a Double Color Ball Prediction Website in 1 Hour!"
domain: ai
platforms: ["mac", "windows", "linux"]
format: "tutorial"
date: 2026-03-15
intro: "A step-by-step guide to creating custom skills in OpenClaw and using AI conversations to build an LSTM-powered lottery prediction website—from requirements to testing to final deployment, all without writing a single line of code."
image: "https://img.lingflux.com/2026/03/85e592835608cc53041951e03f4b52fd.png"
tags: ["OpenClaw", "AI Tools", "LSTM", "Double Color Ball", "ClawdHub", "Skill Creation", "No-Code Development"]
---


> ⚠️ Disclaimer: This content is for educational purposes only and does not constitute any investment advice. Whether you buy lottery tickets is your business—remember to treat me to dinner if you win, but don't come looking for me if you lose.

---

## What You'll Learn

On the surface, this project is about building a lottery prediction website. But really, you'll go through:

- Manually creating custom skills in OpenClaw
- Using LSTM deep learning models to process time series data
- Integrating frontend and backend to run a complete web application

Is the prediction accurate? Honestly, an LSTM model facing highly random number combinations is theoretically no better than random picking. But this system will consistently give you a result, not a different one every time—that alone beats a lot of people's intuition.

---

## Part 0: Let OpenClaw Automatically Create Skills

Don't know where to start? No need to rush—you can just ask it directly:

```
What are the steps to create a skill? Describe each step in detail.
```

It will list everything out. Then ask it to create an example, and when done, tell you where it saved the file and how to call it—essentially asking it to demonstrate once while you watch and learn.

With that foundation, go ahead and create your own skill manually.

Check out the video first:
<br>
<iframe width="560" height="315" src="https://www.youtube.com/embed/JG6JlTcPitE?si=cl44gjuh0uRN_yjV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

---

## Part 1: Manually Create Skills in OpenClaw

### Where Is the Skills Folder

For macOS users, the workspace is hidden in a `.openclaw` folder in your user directory:

```
~/.openclaw/workspace/
```

Once inside, create a new `skills` folder. The structure should look like this:

```
skills/
└── your-skill-name/
    ├── SKILL.md        ← Core skill instructions
    └── other files     ← (Optional) can be empty
```

`SKILL.md` is your "work agreement" with the AI—you write clearly what you want it to do, how to do it, and what to watch out for, and it follows the prescription.

### What Goes in SKILL.md

At minimum, it should include:

| Field | Purpose |
|------|---------|
| Skill Name | For AI to recognize |
| Trigger Conditions | When to call this skill |
| Execution Steps | Step-by-step instructions |
| Notes | What not to do |

---

## Part 2: Install the Skill Ecosystem (ClawdHub)

Manually created skills have limited capabilities. To run a complete web project, you need skill packages like App Builder and Tailwind CSS—and these are installed through ClawdHub.

### Step 1: Install ClawdHub Itself

This requires terminal (command line) operation. Enter:

```bash
npm i -g clawhub
```

After installation, run the login command:

```bash
clawhub login
```

A browser window will pop up asking you to bind your GitHub account. Only after binding is ClawdHub truly activated.

> **Why do you need to login first?** ClawdHub's skill repository is hosted on remote servers. Without logging in, it can't find any skills at all, so all installation commands will fail. Many people get stuck here, thinking it's a network issue—when really they just missed `clawhub login`.

### Step 2: Install Project-Required Skills

After logging in, return to the OpenClaw conversation and send:

```
Help me install the App Builder and Tailwind CSS skills
```

Normally it will download automatically. If it fails, check in order:

1. **Confirm you're logged into ClawdHub**—eight out of ten times, this is the reason
2. **Check your network**—some regions have unstable access to ClawdHub servers, wait and try again
3. **Manual installation**—visit [clawhub.ai](https://clawhub.ai/) to find the corresponding skill, copy the skill folder directly to your `skills/` directory, bypassing the network issue (file structure reference Part 1)

### Verify Skills Are Installed

After all installations are complete, ask:

```
What skills do you have now?
```

It will list all loaded skill names. Only when your installed skills appear in the list can you start working.

---

## Part 3: LSTM Models—What Exactly Are They Doing Here

### Why Not Use Ordinary Statistical Methods

The most intuitive approach is to count the frequency of each number and find "hot" and "cold" numbers. The problem is this method implicitly assumes each draw is influenced by history—but lottery ball drawing is a physically random process. If 7 came out last time, it doesn't mean 7 will appear more or less frequently this time. Frequency statistics here are essentially just making you feel good about yourself.

LSTM is different. It doesn't assume patterns exist—it looks for them in the data itself. If there really is some temporal correlation, it will learn it. If not, it won't learn it, and that's fine. At least it's honest.

### How LSTM Works (No Formulas Version)

LSTM stands for Long Short-Term Memory.

When ordinary neural networks process data, each input is independent—what happened with the previous input has no effect on the next. LSTM's special feature is a "memory line" running through the entire sequence.

You can imagine it as an editor working on a serialized story. Ordinary networks forget what happened before and start from scratch each time. LSTM keeps a "notebook," recording which plot points are important and which can be forgotten. When reading a new chapter, it decides whether to update or discard the notebook's contents before making judgments.

Applied to lottery data: Use past N draws as input sequences. LSTM automatically adjusts weights during training, attempting to find numerical patterns between draws, then uses those patterns to predict the next draw.

*(At this point, even I'm getting a bit clouded...)*

### Model Structure (Simplified)

```
Historical draw records (past N draws)
        ↓
  Data preprocessing + normalization
        ↓
   LSTM layer (learns sequence patterns)
        ↓
   Dense output layer (generates predictions)
        ↓
  Denormalization → final numbers
```

### An Honest Explanation

This model can perform quite well on the training set—after all, it's trained on historical data, then predicting history, so naturally there's some hit rate.

The real test is on future data. Lottery numbers are theoretically independent, identically distributed random variables. The "patterns" LSTM learns are likely just noise in the data that the model mistakes for signals—like seeing a dragon in clouds when the sky never intended that.

So the value of this system is less as a "prediction tool" and more as a complete exercise in time series modeling—data processing, model training, result evaluation, frontend-backend integration, going through the entire pipeline—that's what you really learn.

---

## Part 4: Create a Double Color Ball Prediction System Through Conversation

The focus of this section isn't code—it's how to collaborate with AI to complete a complete project.

Throughout the process, you only need to do three things: clearly state what you want, verify results, and provide feedback on issues. The code is written by AI, the architecture is built by AI—your role is closer to a project manager than a developer.

One prerequisite: You need a rough understanding of some technical terms—like Next.js, Tailwind CSS. You don't need to know how to write them or understand the code, but you should know what they do and what technical paths are available. And that's exactly what AI is best at answering.

### Step 1: Send Requirements

Don't explain sentence by sentence—describe the entire project's requirements at once. Here's the prompt I sent to OpenClaw:

```
Use app-builder and tailwindcss to help me develop a Double Color Ball statistical prediction web frontend
(Next.js + Tailwind CSS + Chart.js):

1. Must integrate my existing ssq-lstm-predict Skill
   (path: ~/.openclaw/workspace/skills/ssq-lstm-predict),
   call its lottery_lstm.py on the page to get:
   - Current omission count for all numbers (red balls 1-33 + blue ball 1-16)
   - Latest draw's red ball average
   - Hot numbers (low omission) / cold numbers (high omission)
   - LSTM-predicted next draw numbers

2. Page layout:
   - Top: Title "Double Color Ball Statistics & Prediction System"
   - Middle: Omission count table (sortable), hot/cold number bar chart (Chart.js)
   - Bottom: Latest average display + big red "Predict Next Draw" button
     (click calls LSTM, returns 6 red balls + 1 blue ball)
   - Responsive, mobile-friendly, lottery red theme

3. Create project at ~/.openclaw/workspace/ssq-predict-web

4. After completion, run npm run dev locally and give me the localhost preview link

5. Code should be clean and manually modifiable. After completion, tell me how to continue development or debugging
```

> **Say it once clearly, better than ten rounds of additions.** AI processes information by understanding the whole before executing. The more complete the requirements, the more reliable the first result, and naturally the fewer revisions you need.

### Step 2: Verification—Check What It Delivers

When it says it's done, don't rush to say "good." Check each item:

- Can you access the URL it provided?
- Does the page have data?
- Does the core feature (prediction button) respond?
- Are the results stable, or different every click?
- Is it what you wanted? What's still missing?

My first verification result: **all five items had issues**—wrong port (300 instead of 3000), blank page, unresponsive button, different results each click, plus some features completely missing.

This is completely normal. The first iteration having problems isn't because AI is weak—it's because complex projects inherently need iteration. The key is whether you can precisely describe where the problem is.

### Step 3: Feedback—Describe Phenomena, Not Feelings

"It doesn't work" or "there's a problem" are the most useless feedback. It doesn't know what's not working or what problem you're referring to. Even if you use the most harsh language in the world to criticize it, it won't help—AI doesn't feel pain, but you'll waste your time.

List the phenomena you observe one by one:

```
The following issues need to be fixed:
1. The URL port you gave is 300, but it should be 3000, so I can't access it
2. No data displays after the page loads
3. Clicking the prediction button has no response
4. After fixing, please confirm: multiple prediction clicks should produce consistent results
```

The more specific the problem description, the more accurate its fixes, and the fewer back-and-forth rounds.

### Step 4: Re-verify Until Satisfied

After it fixes things, repeat the checklist from Step 2.

I went several rounds this time: the port problem it tried to fix multiple times but couldn't, so I finally just accessed port 3000 directly; the prediction result stability issue was fixed normally after corrections. The final page had data, stable predictions, and all features in place—project complete.

---

Throughout this process, I didn't write a single line of code. But I clearly knew what was happening at each step, what problems occurred, and how to describe them.

This ability is harder to cultivate than knowing how to write code, but more valuable. My teacher once said: "Learning is learning to ask questions." Observe the core problem, describe it correctly, verify it through analysis into knowledge—AI can't help you with this, you have to practice it yourself.

---

## Finally

The value of this system isn't in how accurate its predictions are—it's that you've personally experienced a complete project going from nothing to something.

All the prompts and data are above. Try it once and you'll find you understand more than you imagined.

If you're interested, follow my channel, I'll keep updating:

- 🎬 **YouTube**: [lingshunlab](https://www.youtube.com/@lingshunlab)
- 📺 **Bilibili**: [凌顺实验室](https://space.bilibili.com/456183128)

---

## Reference

The Skill file shared on GitHub, containing Double Color Ball historical draw data from 2003-01-01 to 2026-03-15:
[lingshunlab / ssq-lstm-predict](https://github.com/ling3ye/LingShunLAB/tree/main/videos/%23010-OpenClaw-Skills-SSQ/ssq-lstm-predict)
