# Hack2skill submission copy (Challenge 6: Urban Air Quality Assistant)

Fill in the three links yourself, then paste the rest.

## Public GitHub repository link
https://github.com/emhmohan/Clear-Air-Coach

## Project deployed link
<your Render / Cloud Run URL>

## Demo video (unlisted YouTube or Drive with access)
<your video link>

## Describe the changes/updates made in the deployed version (under 1024 chars)
Clear Air Coach turns live winter-smog data into a personal clean-air plan. It pulls real PM2.5/PM10/NO2/O3/SO2/CO, weather and mixing height (to detect inversions that trap smog) for any city, then builds a plan from the household profile (children, elders, asthma, heating, cooking, commute, budget): cleanest-hour planner, indoor air hacks, purifier sizing, and sustainable swaps. Every action explains its direct impact, why it works and cost. Extras: streaming AI chat, plans in 14 languages, photo risk analysis, what-if simulator, impact tracker with badges, letter writer for schools and landlords, voice, alerts, offline PWA. Hardened server (CSP, whitelisting, rate limits, gzip), WCAG-minded UI, and 40+ automated tests with CI.

## Gen AI services utilised, and where (under 1024 chars)
Groq API (OpenAI-compatible), three models: (1) openai/gpt-oss-120b writes the personalised summary, tailors each recommendation to the household and gives the 5-day outlook advice (JSON mode), with automatic fallback to the 20B model when rate-limited. (2) openai/gpt-oss-20b powers the streaming chat coach, the plan translation into 14 languages and the advocacy letter writer. (3) qwen/qwen3.8-27b (vision) powers Smog Lens, which analyses uploaded photos of windows, stoves, masks and streets and returns risks and fixes. A deterministic rules engine computes all numbers; the models only receive verified facts and are instructed not to invent figures.

## LinkedIn post (draft)
Winter smog is not just a number on an app. Families need to know what to DO, and what each choice actually changes.

I built Clear Air Coach for the PromptWars Urban Air Quality challenge: a GenAI assistant that takes live air quality, weather and inversion data for your city and turns it into a personal plan: the cleanest hours to step out, indoor air hacks, purifier sizing, and low-emission swaps, each with the direct impact explained.

Highlights: Groq-powered streaming coach, plans in 14 languages, a photo "Smog Lens", a what-if simulator, and a letter writer for schools and landlords. Open source, tested, accessible.

Try it: <deployed link>
Code: https://github.com/emhmohan/Clear-Air-Coach

#PromptWars #Hack2skill #GenAI #Groq #CleanAir #Sustainability

## 90-second demo script
1. (0:00) Open the app, search your city. Point at the live gauge, pollutants versus WHO limits and the inversion warning.
2. (0:15) Tap **PM2.5 150** to simulate a smog day. Show the traffic-light guide and the 24-hour chart with the cleanest window.
3. (0:30) **My plan:** show one action's impact, why it works and cost. Tick it off.
4. (0:40) Switch language to Hindi: the whole plan translates.
5. (0:50) **Indoor air:** run the **Smog Lens** on a window or stove photo; show the purifier calculator.
6. (1:05) **Impact:** toggle mask, windows and purifier in the simulator and show the percentage drop.
7. (1:15) **Community:** generate a letter to a school; copy the share alert.
8. (1:25) **Ask coach:** ask "Is it safe for my kids to walk to school?" and show the streamed answer.
