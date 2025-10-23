# Demo Video System - Validation Status

**Date:** 2025-10-22
**Status:** ✅ Ready for Scenario 1 Recording Test

## ✅ Completed Tasks

### Phase 1: Infrastructure Setup
- [x] FFmpeg 6.1.1 installed
- [x] ImageMagick 6.9.12 installed
- [x] edge-tts 7.2.3 installed
- [x] Project directory structure created

### Phase 2: Content Preparation
- [x] Narration text extracted from all 7 scenarios
- [x] TTS audio files generated (7 MP3 files, ~4 minutes total)
- [x] Demo data seed script created and executed successfully

### Phase 3: Recording Infrastructure
- [x] Playwright recording script for Scenario 1 created
- [x] Database seeded with demo data:
  - 14 users (sarah.manager, tom.operator, etc.)
  - 6 equipment items (CNC-01, CNC-02, CNC-03, Assembly-01, GRD-02, TW-07)
  - 8 material definitions (Widget A, Widget B, etc.)

### Phase 4: Application Running
- [x] Backend API running on http://localhost:3001
- [x] Frontend running on http://localhost:5178
- [x] Database connected and healthy

## 📊 Current Environment

### Running Services
```
Backend:  http://localhost:3001/health
Frontend: http://localhost:5178/
```

### Demo Users Available
| Username | Role | Password |
|----------|------|----------|
| sarah.manager | Plant Manager | demo123 |
| tom.operator | Production Operator | demo123 |
| mike.chen | Manufacturing Engineer | demo123 |
| jennifer.rodriguez | Process Engineer | demo123 |
| carlos.supervisor | Production Supervisor | demo123 |
| linda.qe | Quality Engineer | demo123 |

### Demo Equipment (OEE Metrics)
| Equipment | Status | OEE |
|-----------|--------|-----|
| CNC-01 | OPERATIONAL (Running) | 94.0% |
| CNC-02 | OPERATIONAL (Running) | 88.5% |
| CNC-03 | OPERATIONAL (Running) | 75.2% |
| Assembly-01 | AVAILABLE (Idle) | 85.0% |
| GRD-02 | OPERATIONAL (Running) | 82.0% |
| TW-07 | MAINTENANCE | N/A |

### Demo Materials
- WDG-A-100 (Widget A)
- WDG-B-200 (Widget B)
- GEAR-ASM-300 (Gear Assembly)
- BLADE-TB-500 (Turbine Blade)
- AERO-BRKT-750 (Aerospace Bracket)
- BP-PLATE-001 (Base Plate)
- BRG-STD-001 (Bearing Set)
- PCB-CTRL-001 (Control PCB)

## 🎬 Next Steps: Test Scenario 1 Recording

### Step 1: Update Playwright Script Port
The frontend is running on port **5178**, but the Playwright script uses 5278. Update:

```bash
# Edit generators/scenario-1-executive-dashboard.ts
# Change: const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5278';
# To:     const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5178';
```

### Step 2: Run Scenario 1 Recording
```bash
# From project root
npx tsx scripts/demo-videos/generators/scenario-1-executive-dashboard.ts
```

**Expected Output:**
- Browser window will open (non-headless)
- Actions will be slowed down (slowMo: 500ms)
- Recording will be saved to `scripts/demo-videos/raw-videos/`
- Duration: ~4 minutes
- Format: .webm video file

### Step 3: Verify Recording
```bash
# Check if video was created
ls -lh scripts/demo-videos/raw-videos/

# Play the video to verify
ffplay scripts/demo-videos/raw-videos/*.webm

# Get video info
ffprobe scripts/demo-videos/raw-videos/*.webm
```

### Step 4: Review and Refine
After viewing the recording, identify any issues:
- [ ] UI elements found correctly?
- [ ] Timing appropriate (not too fast/slow)?
- [ ] Visual highlights working?
- [ ] All scenario steps covered?
- [ ] Screen resolution correct (1920x1080)?

## 🔧 Troubleshooting

### Issue: Playwright can't find elements
**Solution:** The MES UI might use different selectors. We'll need to inspect the actual HTML and update selectors in the script.

### Issue: Actions too fast
**Solution:** Increase `slowMo` parameter or add more `pauseForViewer()` calls.

### Issue: Video not recorded
**Solution:** Check Playwright's `recordVideo` configuration and ensure output directory exists.

### Issue: Login fails
**Solution:** Verify sarah.manager user exists in database:
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { username: 'sarah.manager' } })
  .then(console.log)
  .finally(() => prisma.\$disconnect());
"
```

## 📈 Progress Tracking

- ✅ Phase 1-3: Foundation Complete (7/10 tasks)
- 🔄 Phase 4: Validation In Progress (8/10 tasks)
- ⏳ Phase 5: Full Production Pending

**Estimated to Complete Phase 4:** 1-2 hours
**Remaining for Full Production:** 7-12 hours

## 🎯 Success Criteria for Validation

For this validation to be successful, we need:

1. ✅ MES application running and accessible
2. ✅ Demo data loaded correctly
3. ⏳ Scenario 1 Playwright script executes without errors
4. ⏳ Video file generated with correct resolution
5. ⏳ Recording captures UI interactions smoothly
6. ⏳ Timing feels natural for viewers

Once these are met, we can confidently:
- Create the remaining 6 Playwright scripts
- Record all 7 scenarios
- Move to post-production phase

## 📁 File Structure Status

```
scripts/demo-videos/
├── ✅ README.md                    # Complete documentation
├── ✅ extract-narration.js        # Extraction script
├── ✅ generate-audio.sh           # Audio generation script
├── ✅ VALIDATION_STATUS.md        # This file
├── generators/
│   └── ✅ scenario-1-executive-dashboard.ts (needs port update)
├── narration/
│   ├── ✅ all-narrations.json
│   └── ✅ scenario-{1-7}-*.txt (7 files)
├── audio/
│   └── ✅ scenario-{1-7}-narration.mp3 (7 files, ~1.6MB total)
├── raw-videos/           # ⏳ Awaiting first recording
├── final-videos/         # ⏳ For post-processed videos
└── data/
    └── ✅ seed-scenario-data.ts  # Executed successfully
```

## 🚀 Quick Commands Reference

```bash
# Check MES status
curl http://localhost:3001/health
curl http://localhost:5178/ | head -5

# Stop MES
pkill -f "npm run dev"

# Restart MES
npm run dev

# Run Scenario 1 recording
npx tsx scripts/demo-videos/generators/scenario-1-executive-dashboard.ts

# Preview audio
ffplay scripts/demo-videos/audio/scenario-1-narration.mp3

# Check video recording
ls -lh scripts/demo-videos/raw-videos/
ffplay scripts/demo-videos/raw-videos/*.webm
```

---

**Status:** Ready for hands-on validation! 🎬
**Next Action:** Update port in Playwright script and run first test recording.