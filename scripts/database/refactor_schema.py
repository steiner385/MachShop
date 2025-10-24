#!/usr/bin/env python3
"""
Schema refactoring script: ProcessSegment → Operation
Systematically updates all model names, field names, and references
"""

import re
from pathlib import Path

def refactor_schema():
    schema_path = Path("/home/tony/GitHub/mes/prisma/schema.prisma")

    with open(schema_path, 'r') as f:
        content = f.read()

    # Track changes
    changes = []

    # 1. Update model definitions
    replacements = [
        # Model declarations
        (r'model ProcessSegment \{', 'model Operation { // ISA-95: Process Segment', 'ProcessSegment model'),
        (r'model ProcessSegmentParameter \{', 'model OperationParameter { // ISA-95: Process Segment Parameter', 'ProcessSegmentParameter model'),
        (r'model ProcessSegmentDependency \{', 'model OperationDependency { // ISA-95: Process Segment Dependency', 'ProcessSegmentDependency model'),
        (r'model PersonnelSegmentSpecification \{', 'model PersonnelOperationSpecification { // ISA-95: Personnel Segment Specification', 'PersonnelSegmentSpecification model'),
        (r'model EquipmentSegmentSpecification \{', 'model EquipmentOperationSpecification { // ISA-95: Equipment Segment Specification', 'EquipmentSegmentSpecification model'),
        (r'model MaterialSegmentSpecification \{', 'model MaterialOperationSpecification { // ISA-95: Material Segment Specification', 'MaterialSegmentSpecification model'),
        (r'model PhysicalAssetSegmentSpecification \{', 'model PhysicalAssetOperationSpecification { // ISA-95: Physical Asset Segment Specification', 'PhysicalAssetSegmentSpecification model'),

        # Enum declaration
        (r'enum ProcessSegmentType \{', 'enum OperationType { // ISA-95: Process Segment Type', 'ProcessSegmentType enum'),

        # Table mappings
        (r'@@map\("process_segments"\)', '@@map("operations")', 'process_segments table'),
        (r'@@map\("process_segment_parameters"\)', '@@map("operation_parameters")', 'process_segment_parameters table'),
        (r'@@map\("process_segment_dependencies"\)', '@@map("operation_dependencies")', 'process_segment_dependencies table'),
        (r'@@map\("personnel_segment_specifications"\)', '@@map("personnel_operation_specifications")', 'personnel_segment_specifications table'),
        (r'@@map\("equipment_segment_specifications"\)', '@@map("equipment_operation_specifications")', 'equipment_segment_specifications table'),
        (r'@@map\("material_segment_specifications"\)', '@@map("material_operation_specifications")', 'material_segment_specifications table'),
        (r'@@map\("physical_asset_segment_specifications"\)', '@@map("physical_asset_operation_specifications")', 'physical_asset_segment_specifications table'),
    ]

    for pattern, replacement, desc in replacements:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            changes.append(f"✓ Updated {desc}")

    # 2. Update relation field types (in relation declarations)
    relation_updates = [
        (r'ProcessSegment\[\]', 'Operation[]', 'ProcessSegment[] arrays'),
        (r'ProcessSegment\?', 'Operation?', 'ProcessSegment? optional refs'),
        (r'ProcessSegment @relation', 'Operation @relation', 'ProcessSegment relations'),
        (r'ProcessSegmentParameter\[\]', 'OperationParameter[]', 'ProcessSegmentParameter[] arrays'),
        (r'ProcessSegmentDependency\[\]', 'OperationDependency[]', 'ProcessSegmentDependency[] arrays'),
        (r'PersonnelSegmentSpecification\[\]', 'PersonnelOperationSpecification[]', 'PersonnelSegmentSpecification[] arrays'),
        (r'EquipmentSegmentSpecification\[\]', 'EquipmentOperationSpecification[]', 'EquipmentSegmentSpecification[] arrays'),
        (r'MaterialSegmentSpecification\[\]', 'MaterialOperationSpecification[]', 'MaterialSegmentSpecification[] arrays'),
        (r'PhysicalAssetSegmentSpecification\[\]', 'PhysicalAssetOperationSpecification[]', 'PhysicalAssetSegmentSpecification[] arrays'),
    ]

    for pattern, replacement, desc in relation_updates:
        count = len(re.findall(pattern, content))
        if count > 0:
            content = re.sub(pattern, replacement, content)
            changes.append(f"✓ Updated {count}x {desc}")

    # 3. Update field names
    field_updates = [
        (r'processSegments\s+Operation\[\]', 'operations          Operation[]', 'processSegments field'),
        (r'processSegment\s+Operation\?', 'operation       Operation?', 'processSegment field'),
        (r'processSegment\s+Operation @relation', 'operation Operation @relation', 'processSegment relation field'),
        (r'parentSegment\s+Operation\?', 'parentOperation   Operation?', 'parentSegment field'),
        (r'childSegments\s+Operation\[\]', 'childOperations   Operation[]', 'childSegments field'),
        (r'dependentSegment\s+Operation @relation', 'dependentOperation    Operation @relation', 'dependentSegment field'),
        (r'prerequisiteSegment\s+Operation @relation', 'prerequisiteOperation Operation @relation', 'prerequisiteSegment field'),
        (r'segmentType\s+OperationType', 'operationType OperationType', 'segmentType field'),
        (r'segment\s+Operation @relation', 'operation Operation @relation', 'segment relation field in specs'),
    ]

    for pattern, replacement, desc in field_updates:
        count = len(re.findall(pattern, content))
        if count > 0:
            content = re.sub(pattern, replacement, content)
            changes.append(f"✓ Updated {count}x {desc}")

    # 4. Update field IDs
    id_updates = [
        (r'processSegmentId\s+String\?', 'operationId String?', 'processSegmentId field'),
        (r'processSegmentId\s+String ', 'operationId String ', 'processSegmentId field (non-optional)'),
        (r'parentSegmentId\s+String\?', 'parentOperationId String?', 'parentSegmentId field'),
        (r'dependentSegmentId\s+String', 'dependentOperationId    String', 'dependentSegmentId field'),
        (r'prerequisiteSegmentId\s+String', 'prerequisiteOperationId String', 'prerequisiteSegmentId field'),
        (r'segmentId\s+String', 'operationId String', 'segmentId field'),
    ]

    for pattern, replacement, desc in id_updates:
        count = len(re.findall(pattern, content))
        if count > 0:
            content = re.sub(pattern, replacement, content)
            changes.append(f"✓ Updated {count}x {desc}")

    # 5. Update @relation field references
    relation_refs = [
        (r'\[processSegmentId\]', '[operationId]', '@relation processSegmentId references'),
        (r'\[parentSegmentId\]', '[parentOperationId]', '@relation parentSegmentId references'),
        (r'\[dependentSegmentId\]', '[dependentOperationId]', '@relation dependentSegmentId references'),
        (r'\[prerequisiteSegmentId\]', '[prerequisiteOperationId]', '@relation prerequisiteSegmentId references'),
        (r'\[segmentId\]', '[operationId]', '@relation segmentId references'),
    ]

    for pattern, replacement, desc in relation_refs:
        count = len(re.findall(pattern, content))
        if count > 0:
            content = re.sub(pattern, replacement, content)
            changes.append(f"✓ Updated {count}x {desc}")

    # 6. Update @relation names
    relation_names = [
        (r'"ProcessSegmentHierarchy"', '"OperationHierarchy"', '@relation name ProcessSegmentHierarchy'),
        (r'"DependentSegment"', '"DependentOperation"', '@relation name DependentSegment'),
        (r'"PrerequisiteSegment"', '"PrerequisiteOperation"', '@relation name PrerequisiteSegment'),
        (r'"ProcessSegmentStandardWI"', '"OperationStandardWI"', '@relation name ProcessSegmentStandardWI'),
    ]

    for pattern, replacement, desc in relation_names:
        count = len(re.findall(pattern, content))
        if count > 0:
            content = re.sub(pattern, replacement, content)
            changes.append(f"✓ Updated {count}x {desc}")

    # 7. Update index references
    index_updates = [
        (r'@@index\(\[parentSegmentId\]\)', '@@index([parentOperationId])', '@@index parentSegmentId'),
        (r'@@index\(\[dependentSegmentId\]\)', '@@index([dependentOperationId])', '@@index dependentSegmentId'),
        (r'@@index\(\[prerequisiteSegmentId\]\)', '@@index([prerequisiteOperationId])', '@@index prerequisiteSegmentId'),
        (r'@@index\(\[segmentId\]\)', '@@index([operationId])', '@@index segmentId'),
        (r'@@index\(\[segmentType\]\)', '@@index([operationType])', '@@index segmentType'),
        (r'@@index\(\[processSegmentId\]\)', '@@index([operationId])', '@@index processSegmentId'),
    ]

    for pattern, replacement, desc in index_updates:
        count = len(re.findall(pattern, content))
        if count > 0:
            content = re.sub(pattern, replacement, content)
            changes.append(f"✓ Updated {count}x {desc}")

    # 8. Update unique constraints
    unique_updates = [
        (r'@@unique\(\[dependentSegmentId, prerequisiteSegmentId\]\)',
         '@@unique([dependentOperationId, prerequisiteOperationId])',
         '@@unique constraint'),
        (r'@@unique\(\[segmentId, parameterName\]\)',
         '@@unique([operationId, parameterName])',
         '@@unique constraint for parameters'),
    ]

    for pattern, replacement, desc in unique_updates:
        count = len(re.findall(pattern, content))
        if count > 0:
            content = re.sub(pattern, replacement, content)
            changes.append(f"✓ Updated {count}x {desc}")

    # 9. Update comments that reference ProcessSegment
    comment_updates = [
        (r'// Link to ProcessSegment', '// Link to Operation (ISA-95: Process Segment)', 'comment references'),
        (r'// Links to standard operation', '// Links to standard operation (ISA-95: Process Segment)', 'comment references'),
        (r'overrides ProcessSegment', 'overrides Operation (ISA-95: ProcessSegment)', 'comment references in overrides'),
    ]

    for pattern, replacement, desc in comment_updates:
        count = len(re.findall(pattern, content))
        if count > 0:
            content = re.sub(pattern, replacement, content)
            changes.append(f"✓ Updated {count}x {desc}")

    # 10. Remove segmentCode and segmentName fields from Operation model
    # Find the Operation model and remove those specific fields
    operation_model_pattern = r'(model Operation \{[^}]+?)segmentCode\s+String\s+@unique[^\n]+\n\s+segmentName\s+String[^\n]+\n'
    if re.search(operation_model_pattern, content, re.DOTALL):
        content = re.sub(operation_model_pattern, r'\1', content, flags=re.DOTALL)
        changes.append(f"✓ Removed segmentCode and segmentName fields from Operation model")

    # 11. Add ISA-95 comments to operationCode and operationName fields
    operation_code_pattern = r'operationCode\s+String\?'
    if re.search(operation_code_pattern, content):
        content = re.sub(
            r'operationCode\s+String\?[^\n]*',
            'operationCode           String  @unique // ISA-95: segmentCode (Oracle/Teamcenter terminology)',
            content
        )
        changes.append(f"✓ Added ISA-95 comment to operationCode and made it unique & required")

    operation_name_pattern = r'operationName\s+String\?'
    if re.search(operation_name_pattern, content):
        content = re.sub(
            r'operationName\s+String\?[^\n]*',
            'operationName           String  // ISA-95: segmentName (Oracle/Teamcenter terminology)',
            content
        )
        changes.append(f"✓ Added ISA-95 comment to operationName and made it required")

    # Write back
    with open(schema_path, 'w') as f:
        f.write(content)

    return changes

if __name__ == "__main__":
    print("🔄 Starting ProcessSegment → Operation refactoring...")
    print()

    changes = refactor_schema()

    print("✅ Schema refactoring complete!")
    print(f"\n📊 Total changes made: {len(changes)}")
    print()
    for change in changes:
        print(f"  {change}")

    print("\n✅ Phase 1.1 complete: Prisma schema updated")
