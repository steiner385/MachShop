# GitHub Issue Implementation Workflow

You are tasked with systematically implementing a solution for a GitHub issue. The issue number will be provided as the first argument to this command.

## Phase 1: Issue Analysis & Branch Setup

### Step 1: Fetch and Analyze Issue
- First, capture the issue number from the command arguments
- Use `gh issue view [ISSUE_NUMBER]` to get complete issue details
- Analyze the issue description, acceptance criteria, and any linked discussions
- Identify the scope, complexity, and affected components

### Step 2: Create Dedicated Branch
- Create a descriptive branch name: `git checkout -b issue-[ISSUE_NUMBER]-brief-description`
- Ensure you're working from the latest main: `git pull origin main`

### Step 3: Plan Implementation
- Break down the issue into specific, actionable tasks
- Identify files and components that need modification
- Consider potential edge cases and testing requirements
- Use the TodoWrite tool to create a comprehensive task list

## Phase 2: Implementation

### Step 4: Systematic Development
- Implement changes incrementally, following the task list
- Test each change as you implement it
- Commit frequently with descriptive messages
- Follow the project's coding standards and patterns

### Step 5: Quality Assurance
- Run relevant tests to ensure your changes work correctly
- Check for any breaking changes or regressions
- Verify the solution meets all acceptance criteria from the issue
- Consider adding new tests if needed

## Phase 3: Pull Request & Closure

### Step 6: Create Pull Request
- Push your branch: `git push -u origin issue-[ISSUE_NUMBER]-brief-description`
- Create PR using `gh pr create` with:
  - Clear title referencing the issue
  - Comprehensive description of changes made
  - Link to the original issue: "Fixes #[ISSUE_NUMBER]"
  - Include testing instructions if applicable

### Step 7: Final Verification
- Ensure the PR passes any automated checks
- Review the diff one final time
- Confirm all acceptance criteria are met

### Step 8: Merge & Cleanup
- Merge the PR (or mark ready for review if approval needed)
- Use `gh issue close [ISSUE_NUMBER]` to close the issue
- Delete the feature branch: `git branch -d issue-[ISSUE_NUMBER]-brief-description`
- Return to main branch: `git checkout main && git pull origin main`

## Important Notes

- Always link commits and PRs to the issue number for traceability
- If the issue is complex, consider breaking it into smaller sub-issues
- Communicate progress in issue comments if implementation takes multiple sessions
- Ask for clarification if requirements are unclear before implementing

Now proceed with implementing the GitHub issue following this systematic approach. Remember to substitute [ISSUE_NUMBER] with the actual issue number provided as an argument.