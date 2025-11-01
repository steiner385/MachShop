# Extension Development Checklist

**Version**: 2.0.0

Use this checklist to ensure your extension meets all MachShop standards before submission.

## Pre-Development

- [ ] Created repository for extension
- [ ] Set up project structure
- [ ] Initialized npm project
- [ ] Installed required dependencies
- [ ] Configured TypeScript
- [ ] Set up build process
- [ ] Created manifest.json template
- [ ] Planned feature set

## Code Quality

### TypeScript & Code

- [ ] All code written in TypeScript
- [ ] No `any` types (except unavoidable)
- [ ] Strict mode enabled
- [ ] No unused variables
- [ ] No console.log in production code
- [ ] Proper error handling everywhere
- [ ] Comments for complex logic
- [ ] Consistent code formatting (Prettier)
- [ ] Linter passing (ESLint)

### Imports & Dependencies

- [ ] All imports are correct
- [ ] No circular dependencies
- [ ] Tree-shaking compatible
- [ ] No unused dependencies
- [ ] Dependencies in package.json
- [ ] Peer dependencies documented

### File Organization

- [ ] Components organized by feature
- [ ] Hooks in dedicated folder
- [ ] Types in types folder
- [ ] Services organized
- [ ] Utilities in utils folder
- [ ] Clean index.ts files
- [ ] Meaningful file names

## UI & UX

### Design Compliance

- [ ] Uses only Ant Design components
- [ ] No custom unstyled components
- [ ] No CSS-in-JS libraries
- [ ] No hard-coded colors
- [ ] Uses design tokens consistently
- [ ] No hard-coded spacing
- [ ] Uses design token spacing
- [ ] Border radius from tokens
- [ ] Shadow values from tokens

### Theming

- [ ] Supports light mode
- [ ] Supports dark mode
- [ ] Theme toggle works
- [ ] Colors adapt to theme
- [ ] No color flashing on mode switch
- [ ] High contrast ratios maintained

### Responsive Design

- [ ] Mobile responsive (xs)
- [ ] Tablet responsive (sm, md)
- [ ] Desktop responsive (lg, xl)
- [ ] Touch targets minimum 48px
- [ ] Flexible layouts
- [ ] Grid/flexbox used properly
- [ ] No horizontal scrolling

### Accessibility (WCAG 2.1 AA)

- [ ] Keyboard navigation works
- [ ] Tab order correct
- [ ] Focus indicators visible
- [ ] Semantic HTML used
- [ ] ARIA labels present
- [ ] ARIA roles correct
- [ ] Form labels associated
- [ ] Error messages accessible
- [ ] Screen reader compatible
- [ ] Color not only indicator
- [ ] Contrast ratio >= 4.5:1
- [ ] Tested with screen reader

### Forms & Validation

- [ ] Client-side validation
- [ ] Server-side validation
- [ ] Error messages clear
- [ ] Success feedback provided
- [ ] Form accessibility good
- [ ] Custom validator works
- [ ] Disabled state clear
- [ ] Loading state shown
- [ ] Input sanitized

### Feedback & States

- [ ] Loading states for async
- [ ] Empty states handled
- [ ] Error states handled
- [ ] Error messages helpful
- [ ] Success messages shown
- [ ] Disable buttons during load
- [ ] Loading indicators visible
- [ ] Long operations show progress

## Navigation & Routing

- [ ] Navigation items register
- [ ] Menu items appear correctly
- [ ] Navigation path correct
- [ ] Breadcrumbs work
- [ ] Back button works
- [ ] Deep linking works
- [ ] Browser history works
- [ ] URL state preserves context

## Permissions & Security

### Permission Checking

- [ ] Permission checks implemented
- [ ] Role checks implemented
- [ ] Components protected
- [ ] Admin checks work
- [ ] Permission fallbacks
- [ ] Denied message shown

### Security

- [ ] Input validation present
- [ ] Input sanitization
- [ ] XSS prevention
- [ ] CSRF tokens used
- [ ] No secrets in code
- [ ] Environment variables used
- [ ] API key not exposed
- [ ] No sensitive logs
- [ ] HTTPS only URLs

### Data Protection

- [ ] User data not logged
- [ ] Passwords never logged
- [ ] API keys in env only
- [ ] Sensitive data encrypted
- [ ] GDPR compliance

## Performance

### Runtime Performance

- [ ] Components memoized (memo)
- [ ] Callbacks stable (useCallback)
- [ ] Calculations memoized (useMemo)
- [ ] No infinite loops
- [ ] No memory leaks
- [ ] No unnecessary re-renders
- [ ] Proper dependency arrays
- [ ] Efficient algorithms

### Network Performance

- [ ] API calls optimized
- [ ] Requests cached
- [ ] Pagination used for large lists
- [ ] Images optimized
- [ ] No waterfall requests
- [ ] Batch requests used
- [ ] Lazy loading implemented
- [ ] Debouncing/throttling used

### Bundle Size

- [ ] Bundle size < 500 KB
- [ ] Gzipped size < 150 KB
- [ ] JavaScript < 200 KB gzipped
- [ ] Tree-shaking enabled
- [ ] Unused code removed
- [ ] Lazy load heavy components
- [ ] External libs minimized
- [ ] Source maps generated

### Memory

- [ ] No memory leaks
- [ ] Event listeners removed
- [ ] Timers cleared
- [ ] Subscriptions unsubscribed
- [ ] Large datasets paginated
- [ ] Virtual scrolling for large lists

## Testing

### Unit Tests

- [ ] Utility functions tested
- [ ] Helper functions tested
- [ ] Custom hooks tested
- [ ] Validators tested
- [ ] Test coverage >= 80%
- [ ] Critical paths covered
- [ ] Edge cases tested
- [ ] Error cases tested

### Component Tests

- [ ] Components render
- [ ] Props work correctly
- [ ] User interactions work
- [ ] Permissions respected
- [ ] Error states show
- [ ] Loading states show
- [ ] Empty states show
- [ ] Accessibility tested

### Integration Tests

- [ ] API integration works
- [ ] Navigation works
- [ ] Forms submit
- [ ] Authentication flow works
- [ ] Data persistence works
- [ ] Multi-step flows work
- [ ] Error recovery works

### Manual Testing

- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested in Safari
- [ ] Tested on mobile
- [ ] Tested on tablet
- [ ] Tested in dark mode
- [ ] Tested offline (if applicable)
- [ ] Tested with slow network

## Documentation

### README

- [ ] Features listed
- [ ] Installation steps
- [ ] Usage examples
- [ ] Configuration documented
- [ ] Dependencies listed
- [ ] License specified
- [ ] Author/contact info

### Code Documentation

- [ ] Complex logic commented
- [ ] Public APIs documented
- [ ] Parameters documented
- [ ] Return values documented
- [ ] Exceptions documented
- [ ] Examples provided

### User Documentation

- [ ] User guide created
- [ ] Screenshots included
- [ ] FAQs addressed
- [ ] Troubleshooting section
- [ ] Configuration guide
- [ ] Best practices documented

## Manifest & Configuration

### manifest.json

- [ ] ID is unique
- [ ] Name is clear
- [ ] Version specified
- [ ] Author specified
- [ ] Description clear
- [ ] Capabilities listed
- [ ] Permissions documented
- [ ] UI components defined
- [ ] Navigation items defined
- [ ] Configurations defined
- [ ] Valid JSON structure

### package.json

- [ ] Name matches manifest
- [ ] Version matches manifest
- [ ] All dependencies listed
- [ ] Peer dependencies noted
- [ ] Scripts configured
- [ ] Build script works
- [ ] Test script works
- [ ] Entry point correct

## Error Handling

- [ ] Try-catch blocks present
- [ ] Error logging implemented
- [ ] User errors handled
- [ ] Network errors handled
- [ ] Validation errors handled
- [ ] API errors handled
- [ ] Timeout handling
- [ ] Fallback UI provided
- [ ] Error boundaries used
- [ ] Graceful degradation

## Build & Deployment

### Build Process

- [ ] Build script works
- [ ] No build errors
- [ ] All files included
- [ ] Source maps generated
- [ ] CSS bundled correctly
- [ ] Assets included
- [ ] No hardcoded paths
- [ ] Environment-specific builds

### Distribution

- [ ] Extension packaged
- [ ] Package.tar.gz created
- [ ] README in package
- [ ] manifest.json in package
- [ ] License in package
- [ ] All files included
- [ ] File permissions correct

### Deployment

- [ ] Deployment guide written
- [ ] Installation verified
- [ ] Permissions set correctly
- [ ] Navigation appears
- [ ] Features work post-deploy
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Rollback plan documented

## Dependencies

### Required

- [ ] React 18.2+
- [ ] React-DOM 18.2+
- [ ] @machshop/frontend-extension-sdk
- [ ] @machshop/ui-extension-contracts (if overriding)
- [ ] @machshop/navigation-extension-framework (if using nav)
- [ ] @machshop/component-override-framework (if overriding)
- [ ] TypeScript 5.3+

### Recommended

- [ ] Zustand for state
- [ ] @tanstack/react-query for data
- [ ] Axios for HTTP
- [ ] Zod for validation
- [ ] date-fns for dates

### Avoid

- [ ] Multiple UI libraries
- [ ] Old React patterns
- [ ] jQuery or similar
- [ ] Unvetted packages
- [ ] Package with security issues

## Version Management

- [ ] Version follows semver
- [ ] CHANGELOG.md exists
- [ ] Release notes written
- [ ] Previous versions documented
- [ ] Breaking changes noted
- [ ] Migration guide provided
- [ ] Upgrade instructions clear

## Final Review

### Code Review

- [ ] Self-reviewed code
- [ ] Peer review completed
- [ ] Comments addressed
- [ ] Refactoring done
- [ ] Final polish applied

### QA Verification

- [ ] All features work
- [ ] No known bugs
- [ ] Performance acceptable
- [ ] Accessibility verified
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Load testing done

### Submission

- [ ] All checklist items complete
- [ ] Documentation complete
- [ ] Tests passing
- [ ] Build successful
- [ ] Package ready
- [ ] README clear
- [ ] License included
- [ ] Ready for review

## Submission Criteria Met

- [ ] Passes linter
- [ ] Tests pass (>= 80% coverage)
- [ ] TypeScript strict mode
- [ ] WCAG 2.1 AA compliant
- [ ] Bundle < 500 KB
- [ ] Documentation complete
- [ ] No critical security issues
- [ ] Follows all standards

## Sign-Off

- [ ] Tested thoroughly
- [ ] Ready for production
- [ ] All requirements met
- [ ] Owner approval obtained
- [ ] Ready to submit

**Submission Date**: _____________

**Reviewed By**: _____________

**Approval**: _____________
