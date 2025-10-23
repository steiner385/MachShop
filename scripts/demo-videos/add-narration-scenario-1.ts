/**
 * Add TTS Narration to Scenario 1: Executive Dashboard Overview
 *
 * Uses Microsoft Edge TTS to generate professional narration
 * and ffmpeg to combine it with the video.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

const VIDEO_DIR = path.join(__dirname, 'raw-videos');
const AUDIO_DIR = path.join(__dirname, 'audio-temp');
const OUTPUT_DIR = path.join(__dirname, 'final-videos');

// Ensure directories exist
[AUDIO_DIR, OUTPUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Narration script with timestamps
 * Each segment has start time, duration, and text
 */
const narrationSegments = [
  {
    start: 0,
    duration: 5,
    text: "Welcome to the Manufacturing Execution System Executive Dashboard. Let's explore how plant managers monitor their production operations in real-time."
  },
  {
    start: 5,
    duration: 3,
    text: "We're logging in as Sarah, our Plant Manager, to begin the daily production review."
  },
  {
    start: 10,
    duration: 8,
    text: "The dashboard immediately displays four critical KPIs. We can see 7 active work orders currently in progress, with a 133% increase from yesterday. This indicates a busy production day ahead."
  },
  {
    start: 18,
    duration: 5,
    text: "Quality yield is at 100%, showing excellent production quality with no defects detected today."
  },
  {
    start: 23,
    duration: 5,
    text: "Equipment utilization is at 17.1%, up 2.9% from the previous period, showing improving efficiency."
  },
  {
    start: 30,
    duration: 7,
    text: "Below the KPIs, we have quick action cards for common tasks. Serial number generation allows operators to quickly create unique identifiers for parts."
  },
  {
    start: 37,
    duration: 6,
    text: "The traceability card provides instant access to genealogy tracking, helping us understand the complete history of any manufactured part."
  },
  {
    start: 43,
    duration: 5,
    text: "FAI reports, or First Article Inspection reports, ensure new production runs meet all quality requirements."
  },
  {
    start: 50,
    duration: 8,
    text: "The recent work orders table shows all active production jobs. Each row displays the work order number, part being manufactured, current status, and progress percentage."
  },
  {
    start: 58,
    duration: 6,
    text: "We can see work orders in various states: some released and waiting to start, others actively in progress with completion percentages shown."
  },
  {
    start: 66,
    duration: 5,
    text: "Priority flags help identify urgent orders, with HIGH priority orders highlighted in red."
  },
  {
    start: 73,
    duration: 7,
    text: "The production efficiency section displays overall equipment effectiveness, first pass yield, and on-time delivery metrics."
  },
  {
    start: 80,
    duration: 6,
    text: "Quality trends show defect rates, customer complaints, and non-conformance reports over the past 30 days."
  },
  {
    start: 88,
    duration: 6,
    text: "The dashboard is fully interactive. Watch as we click on the Active Work Orders KPI to filter the entire view."
  },
  {
    start: 94,
    duration: 5,
    text: "The table now shows only active work orders, making it easy to focus on what's currently running on the shop floor."
  },
  {
    start: 99,
    duration: 4,
    text: "We can clear the filter by clicking the X on the filter tag, returning to the full view."
  },
  {
    start: 105,
    duration: 6,
    text: "The date range picker allows managers to analyze performance over custom time periods."
  },
  {
    start: 111,
    duration: 5,
    text: "Export functionality lets you download all dashboard metrics as Excel or PDF reports for offline analysis."
  },
  {
    start: 118,
    duration: 7,
    text: "This executive dashboard provides plant managers with instant visibility into production status, quality metrics, and equipment performance, all in one unified view."
  },
  {
    start: 125,
    duration: 4,
    text: "Thank you for watching this demonstration of the MES Executive Dashboard."
  }
];

/**
 * Generate audio file for a single narration segment
 */
async function generateAudioSegment(index: number, text: string, outputFile: string): Promise<void> {
  console.log(`  Generating audio ${index + 1}/${narrationSegments.length}: "${text.substring(0, 50)}..."`);

  // Use edge-tts with a professional voice
  // en-US-GuyNeural is a clear, professional male voice
  // en-US-JennyNeural is a clear, professional female voice
  const voice = 'en-US-JennyNeural';
  const rate = '+0%'; // Normal speed
  const pitch = '+0Hz'; // Normal pitch

  const command = `edge-tts --voice "${voice}" --rate="${rate}" --pitch="${pitch}" --text "${text}" --write-media "${outputFile}"`;

  try {
    await execAsync(command);
  } catch (error) {
    console.error(`  ✗ Failed to generate audio segment ${index + 1}:`, error);
    throw error;
  }
}

/**
 * Create silence audio file for padding between segments
 */
async function createSilence(duration: number, outputFile: string): Promise<void> {
  const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${duration} -q:a 9 -acodec libmp3lame "${outputFile}" -y`;
  await execAsync(command);
}

/**
 * Main function to add narration to video
 */
async function addNarration() {
  console.log('🎙️  Starting narration generation for Scenario 1\n');

  const inputVideo = path.join(VIDEO_DIR, 'scenario-1-executive-dashboard.webm');
  const outputVideo = path.join(OUTPUT_DIR, 'scenario-1-executive-dashboard-narrated.mp4');

  if (!fs.existsSync(inputVideo)) {
    throw new Error(`Input video not found: ${inputVideo}`);
  }

  try {
    // Step 1: Generate all audio segments
    console.log('📝 Generating TTS audio segments...');
    const audioFiles: string[] = [];

    for (let i = 0; i < narrationSegments.length; i++) {
      const segment = narrationSegments[i];
      const audioFile = path.join(AUDIO_DIR, `segment-${i.toString().padStart(3, '0')}.mp3`);

      await generateAudioSegment(i, segment.text, audioFile);
      audioFiles.push(audioFile);

      // Add silence padding if there's a gap before the next segment
      if (i < narrationSegments.length - 1) {
        const nextSegment = narrationSegments[i + 1];
        const currentEnd = segment.start + segment.duration;
        const gap = nextSegment.start - currentEnd;

        if (gap > 0.1) {
          const silenceFile = path.join(AUDIO_DIR, `silence-${i.toString().padStart(3, '0')}.mp3`);
          await createSilence(gap, silenceFile);
          audioFiles.push(silenceFile);
        }
      }
    }

    console.log(`✓ Generated ${audioFiles.length} audio segments\n`);

    // Step 2: Create concat file for ffmpeg
    console.log('🔗 Combining audio segments...');
    const concatFile = path.join(AUDIO_DIR, 'concat-list.txt');
    const concatContent = audioFiles.map(file => `file '${file}'`).join('\n');
    fs.writeFileSync(concatFile, concatContent);

    // Combine all audio segments into one track
    const combinedAudio = path.join(AUDIO_DIR, 'narration-complete.mp3');
    await execAsync(`ffmpeg -f concat -safe 0 -i "${concatFile}" -c copy "${combinedAudio}" -y`);
    console.log('✓ Audio track combined\n');

    // Step 3: Merge video with audio narration
    console.log('🎬 Merging video with narration...');

    // Convert video to mp4 and add audio track
    // Using -shortest to match video duration
    const ffmpegCommand = `ffmpeg -i "${inputVideo}" -i "${combinedAudio}" \
      -c:v libx264 -preset medium -crf 23 \
      -c:a aac -b:a 128k \
      -map 0:v:0 -map 1:a:0 \
      -shortest \
      "${outputVideo}" -y`;

    await execAsync(ffmpegCommand);

    console.log('✓ Video and audio merged\n');

    // Get file sizes
    const inputSize = (fs.statSync(inputVideo).size / 1024 / 1024).toFixed(1);
    const outputSize = (fs.statSync(outputVideo).size / 1024 / 1024).toFixed(1);

    console.log('✅ Narration complete!');
    console.log(`📊 Original video: ${inputSize} MB`);
    console.log(`📊 Narrated video: ${outputSize} MB`);
    console.log(`📁 Output: ${outputVideo}\n`);

    // Cleanup temp files
    console.log('🧹 Cleaning up temporary files...');
    fs.rmSync(AUDIO_DIR, { recursive: true, force: true });
    console.log('✓ Cleanup complete\n');

  } catch (error) {
    console.error('❌ Error adding narration:', error);
    throw error;
  }
}

// Run the script
addNarration()
  .then(() => {
    console.log('🎉 Success! Your narrated video is ready.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to add narration:', error);
    process.exit(1);
  });
