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
  - Clear title: "feat: implement [brief description] (closes #[ISSUE_NUMBER])"
  - Comprehensive description of changes made
  - **REQUIRED**: Include "Fixes #[ISSUE_NUMBER]" in the description for automatic issue closure
  - Include testing instructions if applicable
  - Add any breaking changes or migration notes

### Step 7: Final Verification
- Ensure the PR passes any automated checks (CI/CD, tests, linting)
- Review the diff one final time for code quality
- Confirm all acceptance criteria from the original issue are met
- Verify no breaking changes are introduced
- Test the implementation end-to-end

### Step 8: Mandatory PR Merge
- **Always merge the PR using**: `gh pr merge --squash` (or `--merge` if preserving commit history)
- **Verify the issue was automatically closed** by the "Fixes #[ISSUE_NUMBER]" keyword
- **If issue not auto-closed**: Manually close with `gh issue close [ISSUE_NUMBER] --comment "Implemented and merged via PR #[PR_NUMBER]"`
- Confirm merge was successful: `git log --oneline -5` should show your changes in main

### Step 9: Cleanup & Return to Main
- Switch to main branch: `git checkout main`
- Pull latest changes: `git pull origin main`
- Delete the feature branch: `git branch -d issue-[ISSUE_NUMBER]-brief-description`
- Clean up remote branch: `git push origin --delete issue-[ISSUE_NUMBER]-brief-description`
- Verify clean state: `git status` should show "working tree clean"

## Important Notes

- **Always link commits and PRs to the issue number** for traceability
- **Never skip the PR merge step** - every implementation must be merged via PR
- **The "Fixes #[ISSUE_NUMBER]" keyword is mandatory** - this ensures automatic issue closure
- **Always verify the issue was closed** after PR merge - manually close if needed
- If the issue is complex, consider breaking it into smaller sub-issues
- Communicate progress in issue comments if implementation takes multiple sessions
- Ask for clarification if requirements are unclear before implementing

## Failure Recovery

If any step fails:
- **PR merge fails**: Check for conflicts, resolve, and retry merge
- **Issue not auto-closed**: Use the manual close command in Step 8
- **Branch conflicts**: Rebase or merge main into your feature branch
- **CI/CD failures**: Fix issues before merging - never bypass checks

Now proceed with implementing the GitHub issue following this systematic approach. Remember to substitute [ISSUE_NUMBER] with the actual issue number provided as an argument.