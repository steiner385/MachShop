# Torque Management Seed Data

This document describes the comprehensive seed data created for the torque management system, designed to support development, testing, and demonstration of digital torque control capabilities for engine assembly operations.

## Overview

The torque seed data provides a complete set of realistic scenarios for testing the torque management system, including:

- **5 Torque Specifications** covering different engine assembly operations
- **62 Torque Sequences** demonstrating various bolt patterns (star, linear, cross, spiral)
- **10+ Sample Torque Events** showing pass/fail scenarios
- **5 Digital Wrench Configurations** for different brands and connection types
- **10 Validation Rules** covering various torque validation scenarios

## Torque Specifications

### 1. Cylinder Head Bolts - V8 Engine (`torque-spec-001`)
- **Torque**: 95.0 Nm (90.0-100.0 Nm tolerance)
- **Method**: Torque + Angle (180° ± 5°)
- **Pattern**: Star (16-bolt pattern)
- **Passes**: 3
- **Safety Level**: CRITICAL
- **Fastener**: M12x1.75, Grade 10.9
- **Notes**: Critical engine assembly with strict sequence requirements

### 2. Main Bearing Cap Bolts - V8 Engine (`torque-spec-002`)
- **Torque**: 120.0 Nm (115.0-125.0 Nm tolerance)
- **Method**: Torque Only
- **Pattern**: Linear (10-bolt sequence)
- **Passes**: 2
- **Safety Level**: CRITICAL
- **Fastener**: M14x2.0, Grade 12.9
- **Notes**: Lubricated with engine oil

### 3. Connecting Rod Bolts - V8 Engine (`torque-spec-003`)
- **Torque**: 45.0 Nm (42.0-48.0 Nm tolerance)
- **Method**: Torque to Yield (75.0 Nm yield point)
- **Pattern**: Cross (16-bolt pattern for 8 rods)
- **Passes**: 2
- **Safety Level**: CRITICAL
- **Fastener**: M10x1.5, Grade 10.9
- **Notes**: Single-use bolts, replace after each torque operation

### 4. Intake Manifold Bolts - V8 Engine (`torque-spec-004`)
- **Torque**: 25.0 Nm (23.0-27.0 Nm tolerance)
- **Method**: Torque Only
- **Pattern**: Spiral (12-bolt pattern)
- **Passes**: 2
- **Safety Level**: NORMAL
- **Fastener**: M8x1.25, Grade 8.8
- **Notes**: Standard intake manifold installation

### 5. Transmission Bell Housing Bolts (`torque-spec-005`)
- **Torque**: 65.0 Nm (62.0-68.0 Nm tolerance)
- **Method**: Torque Only
- **Pattern**: Star (8-bolt pattern)
- **Passes**: 2
- **Safety Level**: NORMAL
- **Fastener**: M12x1.75, Grade 10.9
- **Notes**: Transmission mounting to engine block

## Torque Sequences

The seed data includes detailed bolt sequences for each specification:

### Star Pattern Example (Cylinder Head)
```
Sequence: 1→9→5→13→3→11→7→15→2→10→6→14→4→12→8→16
Visual Layout:
  1   9   5  13
  3  11   7  15
  2  10   6  14
  4  12   8  16
```

### Linear Pattern Example (Main Bearing Caps)
```
Sequence: 1→2→3→4→5→6→7→8→9→10
Layout: Five bearing caps, two bolts each
```

### Cross Pattern Example (Connecting Rods)
```
Sequence: 1→2→3→4→5→6→7→8→9→10→11→12→13→14→15→16
Layout: Eight connecting rods, two bolts each
```

### Spiral Pattern Example (Intake Manifold)
```
Sequence: Center→OutwardSpiral
Starting from center, spiraling outward to distribute stress evenly
```

## Sample Torque Events

The seed data includes realistic torque events demonstrating:

### Successful Operations
- **Perfect cylinder head sequence**: All readings within ±0.3 Nm tolerance
- **Main bearing cap sequence**: Consistent torque application across all caps
- **Yield control example**: Proper torque-to-yield operation reaching 74.2 Nm yield point

### Failure Scenarios
- **Under-torque scenario**: 88.5 Nm vs 95.0 Nm target (-6.84% deviation)
- **Over-torque scenario**: 102.3 Nm vs 95.0 Nm target (+7.68% deviation)
- **Angle deviation**: 185.5° vs 180.0° target (+3.1% deviation)

## Digital Wrench Configurations

### Production Wrenches

#### 1. Snap-On ATECH3F150 (Bluetooth)
- **ID**: `wrench-prod-001`
- **Range**: 5.0-200.0 Nm
- **Features**: Angle capable, torque-to-yield, real-time monitoring
- **Calibration**: Valid through 2025-01-15

#### 2. Norbar EvoTorque (WiFi)
- **ID**: `wrench-prod-002`
- **Range**: 10.0-300.0 Nm
- **Features**: High precision (±0.05 Nm), extended battery life
- **Calibration**: Valid through 2025-02-01

#### 3. CDI 2503MRMH (Serial)
- **ID**: `wrench-prod-003`
- **Range**: 20.0-500.0 Nm
- **Features**: Heavy-duty, manual mode operation
- **Calibration**: Valid through 2025-01-20

### Specialized Wrenches

#### 4. Atlas Copco QST25 (Ethernet)
- **ID**: `wrench-yield-001`
- **Range**: 5.0-100.0 Nm
- **Features**: Specialized for torque-to-yield operations
- **Calibration**: Valid through 2025-02-10

#### 5. Snap-On ATECH1F100 (Backup)
- **ID**: `wrench-backup-001`
- **Range**: 5.0-150.0 Nm
- **Status**: Inactive (backup unit)
- **Features**: Basic torque and angle measurement

## Validation Rules

### Core Validation Rules

#### 1. Standard Tolerance Check (`rule-standard-tolerance`)
- **Tolerance**: ±3% for normal operations
- **Retries**: Up to 3 attempts
- **Severity**: ERROR

#### 2. Critical Component Tolerance (`rule-critical-tolerance`)
- **Tolerance**: ±1.5% for critical safety components
- **Retries**: Up to 2 attempts
- **Approval**: Requires supervisor signoff for failures
- **Severity**: CRITICAL

#### 3. Warning Zone Detection (`rule-warning-zone`)
- **Threshold**: Warning at 90% of tolerance limit
- **Alerts**: Audio and visual warnings
- **Severity**: WARNING

### Advanced Validation Rules

#### 4. Progressive Torque Validation (`rule-progressive-torque`)
- **Function**: Validates torque increases between passes
- **Parameters**: 5-20 Nm increase per pass
- **Application**: Multi-pass operations

#### 5. Angle Validation (`rule-angle-validation`)
- **Tolerance**: ±5° for torque-angle operations
- **Range**: 30-720° valid range
- **Application**: Torque + angle specifications

#### 6. Yield Point Detection (`rule-yield-detection`)
- **Sensitivity**: 0.1 Nm detection threshold
- **Range**: 45-360° yield angle range
- **Application**: Torque-to-yield operations

### Quality Assurance Rules

#### 7. Sequence Order Validation (`rule-sequence-validation`)
- **Enforcement**: Strict sequence order
- **Deviation**: Maximum 1 position skip with approval
- **Application**: All patterned operations

#### 8. Tool Calibration Check (`rule-tool-calibration`)
- **Validation**: Checks calibration expiry before operation
- **Warning**: 30 days before expiration
- **Blocking**: Prevents use of expired tools

#### 9. Operator Certification Check (`rule-operator-certification`)
- **Requirements**: Valid torque operator certification
- **Types**: TORQUE_OPERATOR, CRITICAL_ASSEMBLY
- **Warning**: 60 days before certification expiry

#### 10. Environmental Conditions (`rule-environmental-conditions`)
- **Temperature**: 18-25°C range
- **Humidity**: 40-70% range
- **Status**: Disabled by default (precision operations only)

## Usage Instructions

### Running the Seed Script

```bash
# Ensure main seed data exists first
npm run db:seed

# Run torque-specific seed data
npm run db:seed:torque
```

### Verification

After running the seed script, verify the data was created:

```sql
-- Check torque specifications
SELECT COUNT(*) as spec_count FROM TorqueSpecification;

-- Check torque sequences
SELECT COUNT(*) as sequence_count FROM TorqueSequence;

-- Check sample events
SELECT COUNT(*) as event_count FROM TorqueEvent;

-- View specification summary
SELECT
  ts.id,
  ts.torqueValue,
  ts.method,
  ts.pattern,
  ts.safetyLevel,
  COUNT(tseq.id) as sequence_count
FROM TorqueSpecification ts
LEFT JOIN TorqueSequence tseq ON tseq.specificationId = ts.id
GROUP BY ts.id;
```

### Configuration Files

The seed script creates configuration files in `config/torque/`:

- `wrenches-{suffix}.json`: Digital wrench configurations
- `validation-rules-{suffix}.json`: Validation rule definitions

These files can be loaded by the torque services for runtime configuration.

## Development Scenarios

### Testing Perfect Operations
Use the cylinder head specification with the demo events to test:
- Perfect torque sequence execution
- Real-time validation and feedback
- Automatic progression through bolt patterns
- Electronic signature workflow completion

### Testing Failure Scenarios
Use the provided out-of-spec events to test:
- Under-torque detection and alerts
- Over-torque handling and supervisor approval
- Rework workflow initiation
- Quality documentation and reporting

### Testing Different Wrench Types
The various wrench configurations allow testing:
- Bluetooth connectivity and data streaming
- WiFi/Ethernet integration protocols
- Serial communication with legacy tools
- Calibration status monitoring
- Battery level and signal strength tracking

### Testing Validation Rules
The comprehensive rule set enables testing:
- Real-time tolerance checking
- Progressive torque validation
- Angle measurement verification
- Yield point detection
- Sequence order enforcement
- Tool and operator qualification

## Integration Points

The seed data integrates with:

- **Main seed data**: Uses existing users, work centers, parts, and operations
- **Quality management**: Links to inspection and quality control workflows
- **Electronic signatures**: Provides data for signature workflow testing
- **Reporting system**: Generates realistic reports and analytics
- **Real-time monitoring**: Supports WebSocket event streaming
- **Digital twin**: Provides data for virtual torque simulations

## Maintenance

### Adding New Specifications
To add new torque specifications:

1. Add specification data to `torqueSpecifications` array
2. Create corresponding sequences in `torqueSequences` array
3. Add sample events to `sampleTorqueEvents` array
4. Update documentation

### Adding New Wrenches
To add new digital wrench configurations:

1. Add wrench data to `digitalWrenchConfigs` array
2. Ensure all required capabilities are defined
3. Add corresponding tool inventory entry
4. Test connectivity protocols

### Adding New Validation Rules
To add new validation rules:

1. Add rule data to `validationRules` array
2. Define appropriate parameters and severity
3. Specify applicable operations and safety levels
4. Test rule execution logic

## Troubleshooting

### Common Issues

#### "Foreign key constraint failed"
- Ensure main seed data has been run first
- Check that referenced users, parts, and operations exist

#### "Unique constraint failed"
- The seed uses unique suffixes to prevent conflicts
- Multiple runs in the same database will create separate datasets

#### "Configuration files not created"
- Check write permissions in the project directory
- Ensure the `config/torque` directory can be created

#### Missing tool inventory entries
- The Tool table may not exist in all database configurations
- Tool creation failures are logged but don't stop the seed process

### Verification Queries

```sql
-- Check data integrity
SELECT
  (SELECT COUNT(*) FROM TorqueSpecification) as specs,
  (SELECT COUNT(*) FROM TorqueSequence) as sequences,
  (SELECT COUNT(*) FROM TorqueEvent) as events;

-- Check relationships
SELECT
  ts.id,
  ts.torqueValue,
  COUNT(tseq.id) as sequences,
  COUNT(te.id) as events
FROM TorqueSpecification ts
LEFT JOIN TorqueSequence tseq ON tseq.specificationId = ts.id
LEFT JOIN TorqueEvent te ON te.sequenceId = tseq.id
GROUP BY ts.id;

-- Check for orphaned records
SELECT COUNT(*) as orphaned_sequences
FROM TorqueSequence tseq
LEFT JOIN TorqueSpecification ts ON ts.id = tseq.specificationId
WHERE ts.id IS NULL;
```

## Future Enhancements

Planned improvements to the seed data:

1. **Extended Scenarios**: More complex multi-part assemblies
2. **Failure Modes**: Additional failure scenarios and recovery procedures
3. **Performance Data**: Large-scale datasets for performance testing
4. **Industry Standards**: Compliance with AS9100 and other aerospace standards
5. **Internationalization**: Multi-language descriptions and units
6. **Historical Data**: Time-series data for trend analysis