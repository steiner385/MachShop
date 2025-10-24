# Missing Features Implementation Plan

**Status**: Features are ~75% implemented but missing database schema  
**Effort**: 2-4 hours to complete all features  
**Quick Wins**: Multiple features can be enabled with minimal work

---

## Discovery Summary ✅

### What EXISTS
- ✅ **Visual Editor**: Full React component (`VisualRoutingEditor.tsx`)
- ✅ **Template Library**: Full React component (`RoutingTemplateLibrary.tsx`)  
- ✅ **Gantt Chart**: Full React component (`GanttChartView.tsx`)
- ✅ **Dependency Graph**: Full React component (`DependencyGraph.tsx`)
- ✅ **Drag-Drop Nodes**: `RoutingStepNode.tsx`, `RoutingPalette.tsx`
- ✅ **Backend Service**: RoutingService.ts with template methods
- ✅ **UI Integration**: All wired into RoutingForm.tsx

### What's MISSING
- ❌ **Database Schema**: `routingTemplate` table not in Prisma schema
- ❌ **Build Errors**: 37 TypeScript errors preventing backend compilation
- ❌ **FAI Test Data**: Missing seed data for FAI-20251015-001

---

## Root Cause Analysis

**The features are implemented but can't run due to missing database tables:**

1. `RoutingService.ts` tries to use `prisma.routingTemplate`
2. But `routingTemplate` model doesn't exist in schema
3. TypeScript compilation fails with 37 errors
4. Backend can't start with compilation errors
5. Frontend components can't call non-existent APIs
6. Tests skip because buttons lead to broken features

This is a **schema gap**, not a feature gap!

---

## Implementation Plan

### Phase 1: Fix Database Schema (HIGH PRIORITY) ⏱️ 1 hour

**Goal**: Add missing Prisma models so backend compiles

#### 1.1 Add RoutingTemplate Model
```prisma
model RoutingTemplate {
  id                 String   @id @default(uuid())
  templateName       String
  templateNumber     String   @unique
  category           String?
  description        String?
  tags               String[]
  
  // Template metadata
  isPublic           Boolean  @default(false)
  usageCount         Int      @default(0)
  rating             Float?
  
  // Visual routing data (ReactFlow nodes/edges)
  visualRoutingData  Json?
  
  // Source routing (optional - if created from existing)
  sourceRoutingId    String?
  sourceRouting      Routing? @relation(fields: [sourceRoutingId], references: [id])
  
  // Ownership
  createdBy          User     @relation(fields: [createdById], references: [id])
  createdById        String
  siteId             String
  site               Site     @relation(fields: [siteId], references: [id])
  
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  @@map("routing_templates")
}
```

#### 1.2 Add VisualRoutingData to Routing Model
```prisma
model Routing {
  // ... existing fields ...
  visualRoutingData  Json?    // Add this field
}
```

#### 1.3 Create Migration
```bash
npx prisma migrate dev --name add_routing_templates
```

**Expected Result**: Backend compiles with 0 errors

---

### Phase 2: Fix TypeScript Errors (MEDIUM PRIORITY) ⏱️ 30 min

**Goal**: Fix remaining TypeScript issues unrelated to templates

#### Issues to Fix:
1. `ProductionScheduleSyncService.ts` - B2MMessageStatus enum mismatch
2. `QIFService.ts` - Missing CalibrationStatus field
3. `RoutingService.ts` - Null vs undefined type handling
4. `WorkOrderService.ts` - Missing scheduledStartDate field
5. `logger.ts` - Unknown type handling
6. `tracing.ts` - HttpInstrumentation config issues

**Approach**: 
- Add missing fields to Prisma schema
- Fix type casts
- Add type guards

---

### Phase 3: Add FAI Test Data (LOW PRIORITY) ⏱️ 15 min

**Goal**: Enable FAI workflow tests to run

#### Add to seed.ts:
```typescript
// Create FAI record FAI-20251015-001
await prisma.faiRecord.create({
  data: {
    fairNumber: 'FAI-20251015-001',
    partId: testPart.id,
    revisionId: testPart.revisions[0].id,
    status: 'IN_PROGRESS',
    // ... other required fields
  }
});
```

---

### Phase 4: Verify Features Work (TESTING) ⏱️ 1 hour

**Goal**: Verify all features are accessible and functional

#### Test Checklist:
- [ ] Visual Editor button appears on routing form
- [ ] Clicking Visual Editor switches to ReactFlow canvas
- [ ] Drag-drop nodes work
- [ ] Template Library button appears
- [ ] Template save/load functionality works
- [ ] Gantt chart renders
- [ ] Dependency graph renders
- [ ] FAI workflow UI loads

#### Run Tests:
```bash
# Run routing feature tests
npx playwright test --project=routing-feature-tests

# Should now pass 54 tests that were "did not run"
```

---

## Effort Breakdown

| Task | Effort | Impact |
|------|--------|--------|
| Add routing_templates schema | 30 min | Enables 19 template tests |
| Add visualRoutingData field | 10 min | Enables 14 visual editor tests |
| Create migration | 5 min | Required |
| Fix TypeScript errors | 30 min | Enables backend to compile |
| Add FAI test data | 15 min | Enables 12 FAI tests |
| Test & verify | 1 hour | Quality assurance |
| **TOTAL** | **2-3 hours** | **45 new passing tests** |

---

## Quick Win Strategy

**If time-limited, do Phase 1 only:**

1. Add `routingTemplate` model (30 min)
2. Add `visualRoutingData` field (10 min)
3. Create migration (5 min)
4. **Result**: Backend compiles, features become accessible

This gets Visual Editor and Template Library working with minimal effort.

---

## Dependencies & Risks

### Dependencies:
- ✅ React components already exist
- ✅ Service layer code already exists
- ❌ Prisma schema needs updates
- ❌ Migration needs to run

### Risks:
- **LOW**: Schema changes are additive (no data loss)
- **LOW**: Components are already built and tested
- **LOW**: No breaking changes to existing features

### Mitigation:
- Test migration on dev database first
- Keep migration reversible
- Verify existing tests still pass

---

## Success Criteria

### Before:
- ❌ 37 TypeScript errors
- ❌ Backend won't compile
- ❌ 67 tests skipped/not running
- ❌ Visual Editor hidden
- ❌ Template Library hidden

### After:
- ✅ 0 TypeScript errors
- ✅ Backend compiles successfully
- ✅ 45+ more tests passing
- ✅ Visual Editor accessible
- ✅ Template Library accessible
- ✅ Gantt Chart renders
- ✅ All routing features functional

---

## Recommended Approach

**Option A - Quick Win (2 hours):**
1. Fix schema (Phase 1)
2. Fix TypeScript errors (Phase 2)
3. Verify features work (Phase 4 - quick check)

**Option B - Complete (3 hours):**
1. All phases including FAI test data
2. Full test suite validation
3. Documentation updates

**Recommendation**: **Start with Option A** to get immediate value, then do Phase 3 later if needed.

---

## Next Steps

1. **Review this plan** - Confirm approach
2. **Execute Phase 1** - Add schema & migrate
3. **Test features** - Verify they work
4. **Run tests** - Measure improvement
5. **Document** - Update feature documentation

Ready to proceed? 🚀
