#!/usr/bin/env node

/**
 * Extract narration text from demo scenario scripts
 *
 * This script parses the DEMO_VIDEO_SCENARIOS.md file and extracts
 * all narration text organized by scenario and segment.
 */

const fs = require('fs');
const path = require('path');

const SCENARIOS_FILE = path.join(__dirname, '../../docs/DEMO_VIDEO_SCENARIOS.md');
const OUTPUT_DIR = path.join(__dirname, 'narration');

function extractNarrations() {
  console.log('📖 Reading demo scenarios...');
  const content = fs.readFileSync(SCENARIOS_FILE, 'utf-8');

  const scenarios = [];
  let currentScenario = null;
  let currentSegment = null;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match scenario headers: ## Scenario X:
    const scenarioMatch = line.match(/^## Scenario (\d+): (.+)$/);
    if (scenarioMatch) {
      if (currentScenario) {
        scenarios.push(currentScenario);
      }
      currentScenario = {
        number: parseInt(scenarioMatch[1]),
        title: scenarioMatch[2],
        segments: []
      };
      currentSegment = null;
      continue;
    }

    // Match segment headers: **[0:00-0:30] Segment Name**
    const segmentMatch = line.match(/^\*\*\[(.+)\] (.+)\*\*$/);
    if (segmentMatch && currentScenario) {
      const [_, timeRange, segmentName] = segmentMatch;
      currentSegment = {
        timeRange,
        name: segmentName,
        narration: []
      };
      currentScenario.segments.push(currentSegment);
      continue;
    }

    // Extract narration lines
    const narrationMatch = line.match(/^- Narration: "(.+)"$/);
    if (narrationMatch && currentSegment) {
      currentSegment.narration.push(narrationMatch[1]);
    }

    // Stop at Production Notes section
    if (line.startsWith('## Production Notes')) {
      break;
    }
  }

  // Add the last scenario
  if (currentScenario) {
    scenarios.push(currentScenario);
  }

  return scenarios;
}

function generateNarrationFiles(scenarios) {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('\n🎬 Generating narration files...\n');

  // Generate JSON file with all narrations
  const allNarrations = {};

  scenarios.forEach(scenario => {
    const scenarioKey = `scenario-${scenario.number}`;
    allNarrations[scenarioKey] = {
      title: scenario.title,
      segments: scenario.segments.map(segment => ({
        timeRange: segment.timeRange,
        name: segment.name,
        text: segment.narration.join(' ')
      }))
    };

    // Create individual text file for each scenario
    const textContent = segment => {
      allNarrations[scenarioKey].segments.map(seg =>
        `[${seg.timeRange}] ${seg.name}\n${seg.text}\n`
      ).join('\n');
    };

    const filename = `scenario-${scenario.number}-${scenario.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    const filepath = path.join(OUTPUT_DIR, filename);

    const fullText = allNarrations[scenarioKey].segments
      .map(seg => seg.text)
      .join(' ');

    fs.writeFileSync(filepath, fullText);
    console.log(`  ✓ ${filename}`);
  });

  // Write JSON file
  const jsonPath = path.join(OUTPUT_DIR, 'all-narrations.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allNarrations, null, 2));
  console.log(`\n  ✓ all-narrations.json (master file)`);

  console.log(`\n✅ Extracted narration for ${scenarios.length} scenarios`);
  console.log(`📁 Files saved to: ${OUTPUT_DIR}\n`);

  return allNarrations;
}

function main() {
  try {
    const scenarios = extractNarrations();
    const narrations = generateNarrationFiles(scenarios);

    // Print summary
    console.log('📊 Summary:');
    Object.entries(narrations).forEach(([key, data]) => {
      const totalWords = data.segments.reduce((sum, seg) =>
        sum + seg.text.split(' ').length, 0
      );
      console.log(`  ${key}: ${data.segments.length} segments, ~${totalWords} words`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
