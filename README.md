# Vaanam (வானம்)

**Panchayat-level agro-met advisories for Indian farmers - in Tamil, by voice, on any phone.**

Build with AI: Code for Communities 2026 · Track 04: Agricultural Intelligence · Team Hornets

## The problem

Weather forecasts in India come out at block or district level - one forecast covers a huge area.
But farming decisions happen village by village. Rain hitting one panchayat can miss the next one
10 km away. So a farmer gets advice that is roughly right for the region and wrong for *their* field:
spray pesticide, rain washes it off an hour later, money gone.

## What Vaanam does

1. **Downscales** gridded weather forecasts (Open-Meteo model blend) to panchayat resolution:
   inverse-distance blend of the 5 surrounding grid cells + lapse-rate temperature correction
   against the panchayat's true 90m-DEM elevation + a confidence grade from inter-cell spread.
2. **Turns the forecast into action**: an agronomy rule pack (spray windows, irrigation triggers,
   drainage warnings, pest-favouring conditions) fires on the downscaled days, and **Google Gemini**
   writes the advisory in plain Tamil + English.
3. **Delivers it by voice**: natural Tamil speech (pre-generated Edge TTS ta-IN-PallaviNeural clips shipped with the app; on-device TTS as the live-generation fallback), because the target user is not reading
   an English dashboard. The whole app is an offline-capable PWA for a cheap Android.
4. **Crop Doctor**: the farmer photographs a sick leaf; Gemini multimodal identifies the likely
   disease and suggests treatment in Tamil.

## Google AI integration (mandatory for CFC)

| Surface | Google tech | What it does |
| --- | --- | --- |
| Advisory generation | Gemini 2.5 Flash (structured JSON output) | Forecast + fired agronomy rules -> plain-language Tamil/English advisory |
| Crop Doctor | Gemini 2.5 Flash multimodal | Leaf photo -> diagnosis + treatment, Tamil + English |
| Voice | pre-generated natural Tamil clips (Edge TTS ta-IN-PallaviNeural) + on-device TTS fallback (Cloud Text-to-Speech ta-IN as the scale path) | Reads advisories aloud |

Gemini is doing real work, not decoration: it converts structured agronomy output into language a
low-literacy farmer can act on, and it sees leaf photos. The rule engine underneath keeps it honest -
Gemini can only phrase what the rules and the forecast support.

## Built as a Digital Public Good

- Open source (MIT), zero running cost: free tiers only (Vercel + Open-Meteo + Gemini free tier).
- Panchayat coverage extends through the Local Government Directory scheme - this build ships a
  Tamil Nadu demo set (Thanjavur / Madurai / Coimbatore) plus sample panchayats in Andhra Pradesh,
  Karnataka and Punjab to demonstrate the national pattern.
- Deployable by any state agriculture department in an afternoon.

## Architecture

```
web (PWA)                Vercel serverless API              External
----------------------   --------------------------------   -------------------------
React + TS               /api/panchayats  -> data/panchayats.json
service worker           /api/forecast    -> lib/downscale -> Open-Meteo (free, keyless)
pregenerated clips + on-device TTS   /api/advisory -> api/_rules + Gemini (or committed fallback)
localStorage selection   /api/diagnose    -> Gemini multimodal
```

- `lib/downscale.ts` - the downscaling engine (pure functions, unit-tested)
- `lib/rules.ts` - agronomy rule evaluator (pure, unit-tested)
- `data/crops.json` - rule pack for paddy, banana, groundnut, cotton
- `data/panchayats.json` - geocoded demo coverage set
- `data/fallback/` - pre-generated advisories (demo can never blank; refreshed by GitHub Action)
- `scripts/pregenerate.mts` - regenerates the fallback snapshots

## Run it

```bash
npm install
npm run dev        # frontend on :5173
npm test           # engine + rules tests
```

Deploy: import the repo into Vercel (Vite preset, zero config). Set `GEMINI_API_KEY`
(AI Studio, free tier) to enable the live Gemini paths; without it the app serves the
rule-engine advisories and committed snapshots, which is also what the offline PWA caches.

## Demo script (3 minutes)

1. Open the live link on a phone -> pick Orathanadu, Thanjavur.
2. Advisory tab: paddy, tillering -> Tamil advisory plays aloud.
3. Forecast tab: 5-day downscaled outlook with confidence badges.
4. Crop Doctor: photograph a leaf -> Gemini diagnosis in Tamil.
5. Turn on airplane mode -> app still opens, last advisory still there.

## Roadmap (post-hackathon)

- Soil Health Card data layer and Bhuvan satellite overlays
- All 22 scheduled languages via Cloud Translation + Cloud TTS
- SMS/IVRS fallback for feature phones
- IMD direct feeds and ensemble-model blending at state scale
