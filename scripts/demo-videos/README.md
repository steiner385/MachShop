# Demo Video Generation System

## Overview

Automated system for generating professional demo videos of the MES application using:
- **Playwright** for browser automation and screen recording
- **edge-tts** for text-to-speech narration
- **FFmpeg** for video processing and audio merging
- **ImageMagick** for overlays and annotations

## Status: Phase 1-3 Complete ✅

### ✅ Completed Tasks

1. **Tools Installation**
   - FFmpeg 6.1.1 installed
   - ImageMagick 6.9.12 installed
   - edge-tts 7.2.3 installed

2. **Project Structure Created**
   ```
   scripts/demo-videos/
   ├── generators/     # Playwright automation scripts
   ├── narration/      # Extracted text from scenarios
   ├── audio/          # Generated TTS audio files (7 MP3s)
   ├── raw-videos/     # Playwright screen recordings
   ├── final-videos/   # Post-processed final videos
   └── data/           # Demo data seed script
   ```

3. **Narration Extracted**
   - All 7 scenarios parsed from DEMO_VIDEO_SCENARIOS.md
   - Text extracted and saved to individual .txt files
   - Master JSON file created: `all-narrations.json`

4. **TTS Audio Generated**
   - 7 audio files created using en-US-GuyNeural voice
   - Total: ~4 minutes of narration audio
   - Files: scenario-1-narration.mp3 through scenario-7-narration.mp3

5. **Scenario Data Seed Script**
   - `data/seed-scenario-data.ts` created
   - Includes users, equipment, products matching scenarios
   - Ready to populate database with demo data

6. **Playwright Recording Script**
   - `generators/scenario-1-executive-dashboard.ts` completed
   - Template for other scenarios
   - Includes visual highlights, pauses, error handling

## Audio Files Generated

| Scenario | Duration | Size | File |
|----------|----------|------|------|
| 1 - Executive Dashboard | 40s | 236K | scenario-1-narration.mp3 |
| 2 - Collaborative Routing | 34s | 203K | scenario-2-narration.mp3 |
| 3 - Operator Execution | 39s | 234K | scenario-3-narration.mp3 |
| 4 - Traceability | 36s | 217K | scenario-4-narration.mp3 |
| 5 - FAI Workflow | 42s | 249K | scenario-5-narration.mp3 |
| 6 - Supervisor Management | 35s | 210K | scenario-6-narration.mp3 |
| 7 - Integration Showcase | 50s | 295K | scenario-7-narration.mp3 |

## Next Steps

### Phase 4: Create Remaining Playwright Scripts (4-6 hours)

Create automation scripts for scenarios 2-7 following the pattern of scenario-1:
- `scenario-2-collaborative-routing.ts`
- `scenario-3-operator-execution.ts`
- `scenario-4-traceability.ts`
- `scenario-5-fai-workflow.ts`
- `scenario-6-supervisor-management.ts`
- `scenario-7-integration-showcase.ts`

### Phase 5: Record Videos (2-3 hours)

1. **Prepare Environment**
   ```bash
   # Seed demo data
   tsx scripts/demo-videos/data/seed-scenario-data.ts

   # Start MES application
   npm run dev
   ```

2. **Record Each Scenario**
   ```bash
   # Run Playwright recording scripts
   npx tsx scripts/demo-videos/generators/scenario-1-executive-dashboard.ts
   npx tsx scripts/demo-videos/generators/scenario-2-collaborative-routing.ts
   # ... etc for all 7 scenarios
   ```

3. **Verify Recordings**
   - Check `raw-videos/` directory for .webm files
   - Verify video quality and timing
   - Re-record if needed

### Phase 6: Post-Processing (2-3 hours)

For each video:

1. **Merge Audio with Video**
   ```bash
   ffmpeg -i raw-videos/scenario-1.webm \
          -i audio/scenario-1-narration.mp3 \
          -c:v copy -c:a aac \
          -map 0:v:0 -map 1:a:0 \
          final-videos/scenario-1-temp.mp4
   ```

2. **Add Intro Card** (using ImageMagick)
   ```bash
   convert -size 1920x1080 \
           -background "#1e40af" \
           -fill white \
           -gravity center \
           -pointsize 72 \
           label:"Scenario 1\nExecutive Dashboard Overview" \
           intro-1.png

   # Generate 3-second intro video
   ffmpeg -loop 1 -i intro-1.png -t 3 -pix_fmt yuv420p intro-1.mp4
   ```

3. **Add Outro Card**
   ```bash
   convert -size 1920x1080 \
           -background "#1e40af" \
           -fill white \
           -gravity center \
           -pointsize 60 \
           label:"Request a Demo\nwww.example.com/demo" \
           outro.png

   ffmpeg -loop 1 -i outro.png -t 3 -pix_fmt yuv420p outro.mp4
   ```

4. **Combine All Parts**
   ```bash
   # Create concat list
   echo "file 'intro-1.mp4'" > concat-list.txt
   echo "file 'scenario-1-temp.mp4'" >> concat-list.txt
   echo "file 'outro.mp4'" >> concat-list.txt

   # Concatenate
   ffmpeg -f concat -safe 0 -i concat-list.txt \
          -c copy \
          final-videos/scenario-1-executive-dashboard.mp4
   ```

5. **Generate Thumbnail**
   ```bash
   # Extract frame at 30 seconds
   ffmpeg -i final-videos/scenario-1-executive-dashboard.mp4 \
          -ss 30 -vframes 1 \
          final-videos/scenario-1-thumbnail.png
   ```

### Phase 7: Quality Review (1-2 hours)

1. **Watch Each Video**
   - Verify audio/video sync
   - Check timing and pacing
   - Ensure UI is clearly visible
   - Confirm narration matches actions

2. **Create YouTube Metadata**

   **Scenario 1: Executive Dashboard Overview**
   - Title: "MES Demo: Executive Dashboard - Real-Time Manufacturing Intelligence"
   - Description:
     ```
     Watch a plant manager use our Manufacturing Execution System to gain
     complete visibility into production in under 5 minutes.

     Features demonstrated:
     • Real-time OEE metrics
     • Equipment status monitoring
     • Active work order tracking
     • Global search functionality

     ROI: 90% reduction in daily status gathering time

     Request a demo: [URL]
     ```
   - Tags: `MES, Manufacturing, Dashboard, OEE, Production Monitoring`
   - Timestamps:
     ```
     0:00 - Introduction
     0:30 - OEE Metrics
     1:30 - Equipment Status
     2:15 - Work Orders
     3:00 - Global Search
     3:45 - Summary
     ```

## Utilities

### Preview Audio
```bash
ffplay scripts/demo-videos/audio/scenario-1-narration.mp3
```

### List Available TTS Voices
```bash
edge-tts --list-voices | grep en-US
```

### Extract Audio from Video
```bash
ffmpeg -i video.mp4 -vn -acodec copy audio.aac
```

### Check Video Info
```bash
ffprobe -v error -show_format -show_streams final-videos/scenario-1.mp4
```

## Troubleshooting

### Playwright Recording Issues

**Problem:** Video not recording
- **Solution:** Ensure browser is launched with `headless: false`
- Check that `recordVideo` option is set in context

**Problem:** Actions too fast to see
- **Solution:** Increase `slowMo` parameter or add more `pauseForViewer()` calls

**Problem:** Elements not found
- **Solution:** Add better wait conditions or try multiple selectors

### Audio/Video Sync Issues

**Problem:** Audio and video out of sync
- **Solution:** Use `-map 0:v:0 -map 1:a:0` to explicitly map streams
- Try re-encoding: `-c:v libx264 -c:a aac`

**Problem:** Audio cuts off early
- **Solution:** Ensure video is long enough for full narration
- Add padding to end of video if needed

### Edge-TTS Issues

**Problem:** TTS generation fails
- **Solution:** Check internet connection (edge-tts requires online access)
- Try different voice if one isn't working

**Problem:** Voice sounds robotic
- **Solution:** Use Neural voices (en-US-GuyNeural, not en-US-Guy)
- Adjust rate: `--rate="+5%"` for slightly faster

## File Structure

```
scripts/demo-videos/
├── README.md                       # This file
├── extract-narration.js            # Extracts text from scenarios
├── generate-audio.sh               # Generates TTS audio
├── generators/
│   ├── scenario-1-executive-dashboard.ts
│   ├── scenario-2-collaborative-routing.ts (TODO)
│   ├── scenario-3-operator-execution.ts (TODO)
│   ├── scenario-4-traceability.ts (TODO)
│   ├── scenario-5-fai-workflow.ts (TODO)
│   ├── scenario-6-supervisor-management.ts (TODO)
│   └── scenario-7-integration-showcase.ts (TODO)
├── narration/
│   ├── all-narrations.json
│   ├── scenario-1-executive-dashboard-overview.txt
│   ├── scenario-2-collaborative-routing-management.txt
│   ├── scenario-3-operator-work-execution.txt
│   ├── scenario-4-material-traceability-investigation.txt
│   ├── scenario-5-first-article-inspection-fai-workflow.txt
│   ├── scenario-6-production-supervisor-daily-management.txt
│   └── scenario-7-smart-factory-integration-showcase.txt
├── audio/
│   ├── scenario-1-narration.mp3
│   ├── scenario-2-narration.mp3
│   ├── scenario-3-narration.mp3
│   ├── scenario-4-narration.mp3
│   ├── scenario-5-narration.mp3
│   ├── scenario-6-narration.mp3
│   └── scenario-7-narration.mp3
├── raw-videos/          # Playwright recordings (.webm)
├── final-videos/        # Processed final videos (.mp4)
└── data/
    └── seed-scenario-data.ts       # Demo data seed script
```

## Estimated Completion

- ✅ Phase 1: Tools Installation (30 mins) - **COMPLETE**
- ✅ Phase 2: Demo Data (2-3 hours) - **COMPLETE**
- ✅ Phase 3: Audio Generation (1 hour) - **COMPLETE**
- 🔄 Phase 4: Playwright Scripts (4-6 hours) - **IN PROGRESS (1/7)**
- ⏳ Phase 5: Video Recording (2-3 hours)
- ⏳ Phase 6: Post-Processing (2-3 hours)
- ⏳ Phase 7: Review & Metadata (1-2 hours)

**Total Remaining:** 9-14 hours

## Quick Start

To continue the project:

1. **Create remaining Playwright scripts** (scenarios 2-7)
2. **Seed the database:**
   ```bash
   tsx scripts/demo-videos/data/seed-scenario-data.ts
   ```
3. **Start MES application:**
   ```bash
   npm run dev
   ```
4. **Record videos:**
   ```bash
   npx tsx scripts/demo-videos/generators/scenario-1-executive-dashboard.ts
   ```
5. **Post-process** using FFmpeg commands above
6. **Review and publish!**

---

**Generated:** 2025-10-22
**Status:** Foundation Complete, Ready for Video Recording