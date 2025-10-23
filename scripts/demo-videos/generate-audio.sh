#!/bin/bash

# Generate TTS audio for all demo scenarios
# Uses Microsoft Edge TTS with professional voices

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NARRATION_DIR="$SCRIPT_DIR/narration"
AUDIO_DIR="$SCRIPT_DIR/audio"

# Create audio directory if it doesn't exist
mkdir -p "$AUDIO_DIR"

# Voice selection: Use en-US-GuyNeural for professional male narrator voice
VOICE="en-US-GuyNeural"
# Alternative voices:
# - en-US-JennyNeural (female, professional)
# - en-US-AriaNeural (female, warm)
# - en-US-DavisNeural (male, deep)

echo "🎙️  Generating TTS audio for demo scenarios..."
echo "   Voice: $VOICE"
echo ""

# Function to generate audio for a scenario
generate_audio() {
  local scenario_num=$1
  local input_file="$NARRATION_DIR/scenario-${scenario_num}-*.txt"
  local output_file="$AUDIO_DIR/scenario-${scenario_num}-narration.mp3"

  # Find the input file (handles the dynamic filename)
  local actual_input=$(ls $input_file 2>/dev/null | head -1)

  if [ -z "$actual_input" ]; then
    echo "  ⚠️  Scenario $scenario_num: Input file not found"
    return 1
  fi

  echo "  🎬 Scenario $scenario_num: Generating audio..."

  # Generate audio using edge-tts
  edge-tts \
    --voice "$VOICE" \
    --file "$actual_input" \
    --write-media "$output_file" \
    --rate="+0%" \
    --volume="+0%" \
    --pitch="+0Hz"

  if [ $? -eq 0 ]; then
    # Get duration
    local duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$output_file" 2>/dev/null | cut -d. -f1)
    echo "  ✓ Generated: scenario-${scenario_num}-narration.mp3 (${duration}s)"
  else
    echo "  ❌ Failed to generate audio for scenario $scenario_num"
    return 1
  fi
}

# Generate audio for all 7 scenarios
for i in {1..7}; do
  generate_audio $i
done

echo ""
echo "✅ Audio generation complete!"
echo "📁 Files saved to: $AUDIO_DIR"
echo ""

# List generated files
echo "📊 Generated audio files:"
ls -lh "$AUDIO_DIR"/*.mp3 2>/dev/null | awk '{printf "   %s (%s)\n", $9, $5}'

echo ""
echo "🎧 You can preview with: ffplay $AUDIO_DIR/scenario-1-narration.mp3"
