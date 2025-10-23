/**
 * Add TTS Narration to All Demo Scenarios
 *
 * Batch processes all scenario videos and adds professional narration
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
 * Narration scripts for each scenario
 */
const scenarios = [
  {
    name: 'scenario-2-work-order-execution',
    narration: [
      { start: 0, text: "In this demonstration, we'll see how production operators execute work orders and track production in real-time." },
      { start: 7, text: "John Doe, a production operator, logs into the Manufacturing Execution System to begin his shift." },
      { start: 14, text: "He navigates to the Work Orders page to view all assigned production jobs." },
      { start: 20, text: "The work order list displays job details including part numbers, quantities, current status, and progress for each order." },
      { start: 29, text: "John clicks on a work order to view its complete details, including specifications, quantities, and operation requirements." },
      { start: 38, text: "The details page shows the work order information and lists all operations that need to be performed." },
      { start: 46, text: "Navigating to the execution view, John can see the specific operation he needs to perform, along with production statistics and progress tracking." },
      { start: 57, text: "The execution interface provides all the information needed to complete the operation, including work center assignment and quantity tracking." },
      { start: 67, text: "This streamlined workflow ensures operators have instant access to critical production information, enabling efficient manufacturing execution." },
      { start: 78, text: "Thank you for watching this work order execution demonstration." }
    ]
  },
  {
    name: 'scenario-3-quality-management',
    narration: [
      { start: 0, text: "Quality management is critical in manufacturing. Let's explore how the MES handles First Article Inspection reports and quality tracking." },
      { start: 9, text: "Jane Smith, a quality engineer, accesses the system to review and approve FAI reports." },
      { start: 16, text: "First Article Inspection reports validate that new production runs meet all engineering specifications before full-scale manufacturing begins." },
      { start: 26, text: "The FAI dashboard displays all pending, approved, and rejected reports with their current status." },
      { start: 34, text: "Jane selects a report to review the detailed inspection results and measurements." },
      { start: 41, text: "Each inspection criterion is documented with actual measurements, acceptable tolerances, and pass-fail status." },
      { start: 50, text: "Inspection results are backed by supporting documentation including photos, certificates, and test data." },
      { start: 59, text: "Digital signatures provide accountability and traceability for all quality approvals." },
      { start: 66, text: "The quality trends dashboard helps identify patterns and drive continuous improvement initiatives." },
      { start: 74, text: "Non-conformance reports are tracked from identification through resolution, ensuring issues are properly addressed." },
      { start: 83, text: "This comprehensive quality management system ensures product excellence and regulatory compliance." }
    ]
  },
  {
    name: 'scenario-4-traceability',
    narration: [
      { start: 0, text: "Complete traceability is essential for quality control and recall management. Let's explore the genealogy tracking capabilities." },
      { start: 9, text: "The traceability module provides instant access to complete manufacturing history for any serial number." },
      { start: 17, text: "By searching for a serial number, we can view the entire genealogy tree showing parent assemblies and child components." },
      { start: 26, text: "The visualization displays hierarchical relationships, making it easy to understand how parts fit together." },
      { start: 34, text: "For each component, we can see which materials were consumed, when they were used, and by which work order." },
      { start: 43, text: "Traceability extends to raw materials, showing lot numbers, suppliers, and certificates of conformance." },
      { start: 52, text: "The system tracks every operation performed on each part, including who performed it and when." },
      { start: 60, text: "Quality inspection results are linked to serial numbers, providing complete quality history." },
      { start: 68, text: "In the event of a quality issue, this genealogy data allows for precise identification of affected parts." },
      { start: 77, text: "Complete bi-directional traceability supports both supplier recall notifications and customer impact analysis." },
      { start: 86, text: "This powerful traceability system ensures compliance with industry regulations and quality standards." }
    ]
  },
  {
    name: 'scenario-5-production-scheduling',
    narration: [
      { start: 0, text: "Effective production scheduling optimizes resource utilization and ensures on-time delivery. Let's explore the scheduling capabilities." },
      { start: 10, text: "The production schedule provides a comprehensive view of all planned work orders across the facility." },
      { start: 18, text: "Schedulers can view jobs by date, priority, or resource requirements to optimize shop floor efficiency." },
      { start: 26, text: "The Gantt chart visualization shows production timeline, resource allocation, and potential conflicts." },
      { start: 35, text: "Each work order displays estimated duration, required equipment, and material availability status." },
      { start: 43, text: "Resource capacity planning ensures equipment and personnel aren't overbooked." },
      { start: 50, text: "The system highlights scheduling conflicts in red, making it easy to identify and resolve bottlenecks." },
      { start: 59, text: "Drag-and-drop rescheduling allows planners to quickly adjust production sequences in response to changing priorities." },
      { start: 69, text: "Equipment utilization metrics help identify underused resources and optimization opportunities." },
      { start: 77, text: "Integration with work order execution provides real-time schedule updates based on actual progress." },
      { start: 86, text: "This intelligent scheduling system maximizes throughput while minimizing lead times and resource costs." }
    ]
  }
];

async function generateAudio(text: string, outputFile: string): Promise<void> {
  const voice = 'en-US-JennyNeural';
  const command = `edge-tts --voice "${voice}" --rate="+0%" --pitch="+0Hz" --text "${text}" --write-media "${outputFile}"`;
  await execAsync(command);
}

async function createSilence(duration: number, outputFile: string): Promise<void> {
  const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${duration} -q:a 9 -acodec libmp3lame "${outputFile}" -y`;
  await execAsync(command);
}

async function addNarrationToScenario(scenario: any): Promise<void> {
  console.log(`\n🎙️  Processing ${scenario.name}...\n`);

  const inputVideo = path.join(VIDEO_DIR, `${scenario.name}.webm`);
  const outputVideo = path.join(OUTPUT_DIR, `${scenario.name}-narrated.mp4`);

  if (!fs.existsSync(inputVideo)) {
    console.log(`  ⚠️  Video not found: ${inputVideo}, skipping...`);
    return;
  }

  const scenarioAudioDir = path.join(AUDIO_DIR, scenario.name);
  if (!fs.existsSync(scenarioAudioDir)) {
    fs.mkdirSync(scenarioAudioDir, { recursive: true });
  }

  // Generate audio segments
  console.log('  📝 Generating narration...');
  const audioFiles: string[] = [];

  for (let i = 0; i < scenario.narration.length; i++) {
    const segment = scenario.narration[i];
    const audioFile = path.join(scenarioAudioDir, `segment-${i.toString().padStart(3, '0')}.mp3`);

    await generateAudio(segment.text, audioFile);
    audioFiles.push(audioFile);

    // Add silence between segments
    if (i < scenario.narration.length - 1) {
      const nextSegment = scenario.narration[i + 1];
      const gap = nextSegment.start - segment.start - 5; // Assume 5 sec per segment
      if (gap > 0.1) {
        const silenceFile = path.join(scenarioAudioDir, `silence-${i.toString().padStart(3, '0')}.mp3`);
        await createSilence(gap, silenceFile);
        audioFiles.push(silenceFile);
      }
    }
  }

  // Combine audio
  console.log('  🔗 Combining audio...');
  const concatFile = path.join(scenarioAudioDir, 'concat-list.txt');
  fs.writeFileSync(concatFile, audioFiles.map(f => `file '${f}'`).join('\n'));

  const combinedAudio = path.join(scenarioAudioDir, 'narration.mp3');
  await execAsync(`ffmpeg -f concat -safe 0 -i "${concatFile}" -c copy "${combinedAudio}" -y`);

  // Merge with video
  console.log('  🎬 Merging with video...');
  const ffmpegCommand = `ffmpeg -i "${inputVideo}" -i "${combinedAudio}" \
    -c:v libx264 -preset medium -crf 23 \
    -c:a aac -b:a 128k \
    -map 0:v:0 -map 1:a:0 \
    -shortest \
    "${outputVideo}" -y`;

  await execAsync(ffmpegCommand);

  const outputSize = (fs.statSync(outputVideo).size / 1024 / 1024).toFixed(1);
  console.log(`  ✅ Complete! Output: ${outputSize} MB`);
}

async function processAll() {
  console.log('🎬 Adding narration to all scenarios...\n');

  for (const scenario of scenarios) {
    try {
      await addNarrationToScenario(scenario);
    } catch (error) {
      console.error(`  ❌ Error processing ${scenario.name}:`, error);
    }
  }

  // Cleanup
  console.log('\n🧹 Cleaning up temporary files...');
  fs.rmSync(AUDIO_DIR, { recursive: true, force: true });

  console.log('\n✅ All narrations complete!');
  console.log(`📁 Narrated videos saved to: ${OUTPUT_DIR}\n`);
}

processAll()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
