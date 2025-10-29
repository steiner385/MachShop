---
description: Create new GitHub issues and automatically add them to the prioritization framework
---

You will help the user create new GitHub issues and systematically add them to the prioritization framework.

## Step 1: Gather Issue Information from User

First, ask the user to describe the new capabilities or defects they want to create issues for. They can provide:
- A single issue description
- Multiple issues (as a list or in free-form text)
- High-level features that may need to be broken down

**Prompt the user**:
```
Please describe the new capabilities or defects you'd like to create GitHub issues for. You can:
- Describe a single feature or bug
- Provide a list of multiple items
- Describe a high-level capability (I can help break it down)

What would you like to add?
```

Wait for the user's response before proceeding.

## Step 2: For Each Issue, Gather Required Metadata

Read `.github/issue-prioritization.yml` to understand:
- Existing categories and their descriptions
- Current issues and their foundation levels (for reference)
- The dependency structure

For each issue the user wants to create, systematically gather the following information using the AskUserQuestion tool:

### 2a. Basic Information
Ask the user for:
1. **Title**: Clear, concise issue title (should follow pattern: "Category: Feature Name")
2. **Description**: Detailed description of what this issue involves
3. **Issue Type**: Is this a feature enhancement or a bug/defect?

### 2b. Categorization
Present the 14 existing categories and ask which one fits best:
- time_tracking: Time Tracking & Labor Costing
- quality_management: Quality Management
- security_auth: Enterprise SSO & Authentication
- security_rbac: Advanced RBAC & Security
- inventory_material: Inventory & Material Management
- production_planning: Production Planning & Scheduling
- regulatory_compliance: Regulatory Compliance
- equipment_maintenance: Equipment & Maintenance Management
- osp_operations: Outside Processing (OSP) Operations
- flexible_workflow: Flexible MES Workflow
- analytics_reporting: Analytics & Reporting
- document_management: Document Management
- sdk_extensibility: SDK & Extensibility
- data_migration: Data Migration Tools

If none fit, ask if they want to create a new category.

### 2c. Foundation Level
Help the user determine the foundation level by asking:

**"What foundation level is this issue?"**

Provide these options with descriptions:
- **L0 (Core Infrastructure)**: Provides fundamental capabilities that many other features depend on. Must be built first. Examples: authentication systems, core data models, foundational APIs.
- **L1 (Essential Capabilities)**: Primary operational capabilities of the MES that depend on L0 infrastructure. Examples: core workflows, essential business features.
- **L2 (Enhanced Features)**: Advanced capabilities that extend L1 features with sophisticated tools. Examples: advanced analytics, specialized integrations.
- **L3 (Refinements)**: Nice-to-have features, optimizations, and convenience tools. Examples: UI enhancements, migration utilities, reporting refinements.

Help guide them based on:
- Does this enable many other features? → L0
- Is this a core business capability? → L1
- Does this enhance existing features? → L2
- Is this a refinement or convenience? → L3

### 2d. Dependencies
Ask: **"Does this issue depend on any other issues being completed first?"**

If yes, help them identify the issue numbers. You can:
- Show related issues in the same category
- Search for issues by keyword
- Suggest likely dependencies based on the feature description

Create a list of dependency issue numbers (can be empty []).

### 2e. Strategic Focus
Ask: **"Does this issue align with current strategic focus areas?"**

Current strategic focus areas:
- time_tracking
- quality_management

If yes, specify which one. Otherwise, set to null.

### 2f. Business Value
Ask: **"What's the business value of this issue?"** (1-10 scale)

Provide guidance:
- **9-10**: Critical for customer adoption, competitive necessity, major revenue impact
- **7-8**: High customer demand, significant operational improvement
- **5-6**: Valuable enhancement, moderate customer interest
- **3-4**: Nice to have, limited immediate impact
- **1-2**: Minor improvement, edge case

### 2g. Effort Estimate
Ask: **"What's the estimated effort for this issue?"** (1-10 scale)

Provide guidance:
- **9-10**: Major feature, multiple weeks, complex architecture
- **7-8**: Substantial feature, 1-2 weeks
- **5-6**: Moderate feature, several days
- **3-4**: Small feature, 1-2 days
- **1-2**: Trivial change, hours

### 2h. Additional Context
Ask if there's any additional context or notes to include.

## Step 3: Summarize and Confirm

After gathering all information for all issues, present a summary:

```
## Issues to Create

### Issue 1: [Title]
- **Category**: [category]
- **Foundation Level**: L[0-3]
- **Dependencies**: [list or none]
- **Strategic Focus**: [focus or none]
- **Business Value**: [value]/10
- **Effort Estimate**: [effort]/10
- **Type**: [enhancement/bug]

[Repeat for each issue]

---

**This will**:
1. Create [N] GitHub issue(s)
2. Add them to .github/issue-prioritization.yml
3. Set appropriate labels and metadata

**Proceed with creating these issues?**
```

Wait for user confirmation before proceeding.

## Step 4: Create GitHub Issues

For each issue:

1. **Create the GitHub issue** using `gh issue create`:
   ```bash
   gh issue create --title "[Title]" --body "[Description]" --label "enhancement"
   ```

   Capture the issue number from the output.

2. **Report the created issue**:
   ```
   ✓ Created Issue #[number]: [Title]
   ```

## Step 5: Update Prioritization Framework

1. **Read the current prioritization config**:
   ```
   .github/issue-prioritization.yml
   ```

2. **For each new issue**, add an entry in the appropriate location based on foundation level:
   - L0 issues go in the "L0: CORE INFRASTRUCTURE" section
   - L1 issues go in the "L1: ESSENTIAL CAPABILITIES" section
   - L2 issues go in the "L2: ENHANCED FEATURES" section
   - L3 issues go in the "L3: REFINEMENTS & ADVANCED TOOLS" section

3. **Format the entry properly**:
   ```yaml
   - number: [issue_number]
     title: "[Title]"
     category: [category]
     foundation_level: [0-3]
     dependencies: [list of dependency issue numbers]
     strategic_focus: [focus_area or null]
     business_value: [value]
     effort_estimate: [effort]
     blocks: []  # Initially empty, will be updated as dependencies are discovered
     notes: "[Additional context]"
   ```

4. **Update the `blocks` field** for any issues that this new issue depends on:
   - If issue #999 depends on #54, add 999 to the `blocks` array of issue #54

5. **Write the updated configuration** back to the file, maintaining proper YAML formatting and indentation.

## Step 6: Verify and Report

1. **Validate the YAML** is still properly formatted (you can use a quick read to check)

2. **Report success**:
   ```
   ✅ Successfully created [N] issue(s) and updated prioritization framework:

   - Issue #[number1]: [Title1] (L[level], [category])
   - Issue #[number2]: [Title2] (L[level], [category])
   ...

   📊 Updated .github/issue-prioritization.yml with:
   - Added [N] new issue(s)
   - Updated [M] dependency relationship(s)

   💡 Run `/implement-next-gh-issue` to see how these affect prioritization!
   ```

## Important Notes

- **Maintain YAML formatting**: Ensure proper indentation (2 spaces) and structure
- **Preserve existing content**: Don't modify other parts of the config file
- **Handle edge cases**:
  - If a dependency issue doesn't exist yet, warn the user
  - If a category doesn't exist, ask if they want to create it
  - If unsure about foundation level, err on the side of higher level (L2/L3)
- **Use AskUserQuestion strategically**: Group related questions together when possible
- **Be conversational**: Make this feel like a guided wizard, not an interrogation
- **Provide examples**: When asking questions, show examples from existing issues

## Error Handling

If anything goes wrong:
- **GitHub issue creation fails**: Report the error and ask if they want to retry
- **YAML parsing fails**: Don't write the file, report what went wrong
- **Missing dependencies**: Warn the user but allow them to proceed
- **Invalid values**: Validate inputs and ask for correction

Remember: This tool should make it EASY to add issues while ensuring they're properly integrated into the prioritization framework!
