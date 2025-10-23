/**
 * Add TTS Narration to Scenario 2: Work Order Execution
 *
 * Creates properly timed narration segments that align with video content
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

const VIDEO_DIR = path.join(__dirname, 'raw-videos');
const AUDIO_DIR = path.join(__dirname, 'audio-temp');
const OUTPUT_DIR = path.join(__dirname, 'final-videos');

[AUDIO_DIR, OUTPUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Narration segments with precise timing
 * Based on the actual 62-second video
 */
const narrationSegments = [
  {
    start: 0,
    duration: 8,
    text: "John Doe, a production operator, logs into the Manufacturing Execution System to begin his shift."
  },
  {
    start: 8,
    duration: 12,
    text: "The system displays his work orders, prioritized by status and due date. He selects a compressor disk work order that's currently in progress."
  },
  {
    start: 20,
    duration: 12,
    text: "The work order details page shows comprehensive information including part specifications, quantities, and the complete operation sequence."
  },
  {
    start: 32,
    duration: 10,
    text: "Each operation displays its status, progress, and specific requirements with real-time tracking."
  },
  {
    start: 42,
    duration: 10,
    text: "John navigates to Operation 10, the Forging operation, to view detailed execution information."
  },
  {
    start: 52,
    duration: 10,
    text: "The system shows exactly what needs to be done: 5 units ordered with real-time tracking of completed quantities and quality metrics."
  }
];

async function generateAudio(text: string, outputFile: string): Promise<void> {
  const voice = 'en-US-JennyNeural';
  const escapedText = text.replace(/"/g, '\\"');
  const command = `edge-tts --voice "${voice}" --rate="+0%" --pitch="+0Hz" --text "${escapedText}" --write-media "${outputFile}"`;
  await execAsync(command);
  console.log(`  ✓ Generated: ${path.basename(outputFile)}`);
}

async function createSilence(duration: number, outputFile: string): Promise<void> {
  const command = `ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t ${duration} -q:a 9 -acodec libmp3lame "${outputFile}" -y`;
  await execAsync(command);
}

async function combineAudioSegments(): Promise<string> {
  console.log('\n🎙️  Generating narration segments...');

  const audioFiles: string[] = [];

  for (let i = 0; i < narrationSegments.length; i++) {
    const segment = narrationSegments[i];
    const audioFile = path.join(AUDIO_DIR, `segment-${i}.mp3`);
    const silenceFile = path.join(AUDIO_DIR, `silence-${i}.mp3`);

    // Generate audio for this segment
    await generateAudio(segment.text, audioFile);

    // Create silence for the gap before this segment
    const silenceDuration = segment.start - (i === 0 ? 0 : narrationSegments[i-1].start + narrationSegments[i-1].duration);
    if (silenceDuration > 0.1) {
      await createSilence(silenceDuration, silenceFile);
      audioFiles.push(silenceFile);
    }

    audioFiles.push(audioFile);
  }

  // Create concat file list
  const concatFile = path.join(AUDIO_DIR, 'concat-list.txt');
  const concatContent = audioFiles.map(f => `file '${f}'`).join('\n');
  fs.writeFileSync(concatFile, concatContent);

  // Combine all audio segments
  const combinedAudio = path.join(AUDIO_DIR, 'narration-complete.mp3');
  const command = `ffmpeg -f concat -safe 0 -i "${concatFile}" -c copy "${combinedAudio}" -y`;
  await execAsync(command);
  console.log('  ✓ Combined all segments');

  return combinedAudio;
}

async function addNarrationToVideo(audioFile: string): Promise<void> {
  console.log('\n🎬 Adding narration to video...');

  const inputVideo = path.join(VIDEO_DIR, 'scenario-2-work-order-execution.webm');
  const outputVideo = path.join(OUTPUT_DIR, 'scenario-2-work-order-execution.webm');

  // Add audio track to video (video has no audio, so just add the narration)
  const command = `ffmpeg -i "${inputVideo}" -i "${audioFile}" -c:v copy -c:a libopus -shortest "${outputVideo}" -y`;
  await execAsync(command);

  console.log(`  ✓ Created: ${outputVideo}`);
}

async function main() {
  try {
    console.log('🎙️  Adding narration to Scenario 2: Work Order Execution\n');

    // Generate and combine all audio segments
    const combinedAudio = await combineAudioSegments();

    // Add narration to video
    await addNarrationToVideo(combinedAudio);

    console.log('\n✅ Narration added successfully!');
    console.log(`📁 Final video: ${path.join(OUTPUT_DIR, 'scenario-2-work-order-execution.webm')}`);

    // Clean up temp files
    console.log('\n🧹 Cleaning up temp files...');
    const tempFiles = fs.readdirSync(AUDIO_DIR);
    tempFiles.forEach(file => {
      fs.unlinkSync(path.join(AUDIO_DIR, file));
    });
    console.log('  ✓ Cleanup complete');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
