/**
 * Accessibility Test Data & Fixtures
 *
 * WCAG 2.1 AA compliance test data and fixtures
 */

// ============================================================================
// WCAG 2.1 Success Criteria Mapping
// ============================================================================

export const wcagSuccessCriteria = {
  // Level A
  '1.1.1': {
    level: 'A',
    title: 'Non-text Content',
    criterion: 'All non-text content has text alternative',
    tests: ['alt-text', 'aria-labels', 'aria-labelledby'],
  },
  '1.3.1': {
    level: 'A',
    title: 'Info and Relationships',
    criterion: 'Semantic markup conveys relationships',
    tests: ['heading-hierarchy', 'form-labels', 'lists'],
  },
  '1.4.1': {
    level: 'A',
    title: 'Use of Color',
    criterion: 'Color is not the only means of conveying information',
    tests: ['not-color-only', 'contrast-ratio'],
  },
  '2.1.1': {
    level: 'A',
    title: 'Keyboard',
    criterion: 'All functionality available from keyboard',
    tests: ['keyboard-navigation', 'tab-order'],
  },
  '2.4.1': {
    level: 'A',
    title: 'Bypass Blocks',
    criterion: 'Skip navigation and bypass blocks present',
    tests: ['skip-links', 'main-landmark'],
  },
  '3.1.1': {
    level: 'A',
    title: 'Language of Page',
    criterion: 'Page language is specified',
    tests: ['lang-attribute'],
  },

  // Level AA
  '1.4.3': {
    level: 'AA',
    title: 'Contrast (Minimum)',
    criterion: 'Text has contrast ratio of at least 4.5:1',
    tests: ['contrast-normal-text', 'contrast-large-text'],
  },
  '2.4.3': {
    level: 'AA',
    title: 'Focus Order',
    criterion: 'Focus order is logical and meaningful',
    tests: ['focus-order', 'focus-visible'],
  },
  '2.4.7': {
    level: 'AA',
    title: 'Focus Visible',
    criterion: 'Keyboard focus indicator is visible',
    tests: ['focus-indicator'],
  },
  '3.3.1': {
    level: 'AA',
    title: 'Error Identification',
    criterion: 'Errors are identified and described',
    tests: ['error-messages', 'aria-invalid'],
  },
  '3.3.3': {
    level: 'AA',
    title: 'Error Suggestion',
    criterion: 'Suggestions provided for error correction',
    tests: ['error-suggestions'],
  },
};

// ============================================================================
// Semantic HTML Examples
// ============================================================================

export const semanticHtmlExamples = {
  validStructure: `
<header>
  <nav>
    <a href="/home">Home</a>
    <a href="/about">About</a>
  </nav>
</header>
<main>
  <article>
    <h1>Article Title</h1>
    <p>Article content</p>
  </article>
</main>
<footer>
  <p>&copy; 2024 Company</p>
</footer>
  `,

  invalidStructure: `
<div class="header">
  <div class="nav">
    <span onclick="go('/')" class="link">Home</span>
    <span onclick="go('/about')" class="link">About</span>
  </div>
</div>
<div class="main">
  <div class="article">
    <div class="title">Article Title</div>
    <div>Article content</div>
  </div>
</div>
<div class="footer">
  <div>&copy; 2024 Company</div>
</div>
  `,

  properHeadings: `
<h1>Main Title</h1>
<h2>Section 1</h2>
<h3>Subsection 1.1</h3>
<h2>Section 2</h2>
<h3>Subsection 2.1</h3>
  `,

  improperHeadings: `
<h1>Main Title</h1>
<h3>Section 1</h3>
<h5>Subsection</h5>
  `,
};

// ============================================================================
// ARIA Attribute Examples
// ============================================================================

export const ariaExamples = {
  properLabeling: {
    usingLabel: `
<label for="email">Email Address</label>
<input id="email" type="email">
    `,
    usingAriaLabel: `
<button aria-label="Close dialog">×</button>
    `,
    usingAriaLabelledby: `
<h2 id="dialog-title">Confirm Action</h2>
<dialog aria-labelledby="dialog-title">
  Content here
</dialog>
    `,
  },

  liveRegions: {
    polite: `
<div aria-live="polite" aria-atomic="true">
  Page 1 of 10
</div>
    `,
    assertive: `
<div aria-live="assertive" role="alert">
  Error: Invalid input
</div>
    `,
  },

  expandableContent: `
<button aria-expanded="false" aria-controls="menu">
  Menu
</button>
<ul id="menu" hidden>
  <li><a href="/">Home</a></li>
  <li><a href="/about">About</a></li>
</ul>
  `,

  navigationIndicator: `
<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/products" aria-current="page">Products</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>
  `,
};

// ============================================================================
// Keyboard Navigation Examples
// ============================================================================

export const keyboardNavigationExamples = {
  properTabOrder: {
    good: `
<form>
  <label for="first">First Name</label>
  <input id="first" type="text">

  <label for="last">Last Name</label>
  <input id="last" type="text">

  <label for="email">Email</label>
  <input id="email" type="email">

  <button type="submit">Submit</button>
</form>
    `,
    bad: `
<form>
  <input type="text" tabindex="3">
  <input type="text" tabindex="1">
  <button type="submit" tabindex="2">Submit</button>
</form>
    `,
  },

  focusManagement: {
    skipLink: `
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
<main id="main-content">
  Content here
</main>
    `,
    modal: `
<dialog open>
  <h2>Dialog Title</h2>
  <form>
    <button autofocus>OK</button>
    <button>Cancel</button>
  </form>
</dialog>
    `,
  },
};

// ============================================================================
// Color Contrast Examples
// ============================================================================

export const contrastExamples = {
  sufficientContrast: {
    normalText: {
      foreground: '#000000', // Black
      background: '#FFFFFF', // White
      ratio: 21,
      minimum: 4.5,
      passes: true,
    },
    largeText: {
      foreground: '#666666',
      background: '#FFFFFF',
      ratio: 7.5,
      minimum: 3,
      passes: true,
    },
  },

  insufficientContrast: {
    normalText: {
      foreground: '#AAAAAA', // Gray
      background: '#CCCCCC', // Light gray
      ratio: 1.5,
      minimum: 4.5,
      passes: false,
    },
    largeText: {
      foreground: '#BBBBBB',
      background: '#CCCCCC',
      ratio: 1.1,
      minimum: 3,
      passes: false,
    },
  },

  notColorOnly: {
    good: `
<div style="color: red;">
  <span aria-hidden="true">✗</span>
  Error: Invalid input
</div>
    `,
    bad: `
<div style="color: red;">
  Invalid input
</div>
    `,
  },
};

// ============================================================================
// Form Accessibility Examples
// ============================================================================

export const formAccessibilityExamples = {
  properForm: `
<form>
  <fieldset>
    <legend>Personal Information</legend>

    <label for="name">Full Name *</label>
    <input id="name" type="text" required aria-required="true">

    <label for="email">Email Address *</label>
    <input id="email" type="email" required aria-required="true">
    <span id="email-hint">We'll never share your email</span>

    <label for="password">Password</label>
    <input id="password" type="password" aria-describedby="pwd-hint">
    <span id="pwd-hint">At least 8 characters, including uppercase and numbers</span>
  </fieldset>

  <button type="submit">Submit</button>
</form>
  `,

  errorHandling: `
<form>
  <label for="email">Email</label>
  <input id="email" type="email" aria-invalid="true" aria-describedby="email-error">
  <span id="email-error" role="alert">Invalid email format. Use example@domain.com</span>

  <button type="submit">Submit</button>
</form>
  `,
};

// ============================================================================
// Text Alternatives Examples
// ============================================================================

export const textAlternativesExamples = {
  images: {
    functional: `
<a href="/delete">
  <img src="delete-icon.svg" alt="Delete item">
</a>
    `,
    decorative: `
<img src="decorative-line.svg" alt="" aria-hidden="true">
    `,
    complex: `
<img src="chart.svg" alt="Sales growth chart 2020-2024">
<p id="chart-description">
  Chart shows sales increasing from $1M in 2020 to $5M in 2024
</p>
<p><a href="chart-data.csv">Download data as CSV</a></p>
    `,
  },

  media: {
    video: `
<video>
  <source src="demo.mp4" type="video/mp4">
  <track kind="captions" src="demo-captions.vtt" srclang="en">
  <p>Video player not supported. <a href="demo.mp4">Download video</a></p>
</video>
    `,
    audio: `
<audio controls>
  <source src="podcast.mp3" type="audio/mpeg">
  <p>Audio player not supported</p>
</audio>
<h3>Transcript</h3>
<p>Podcast content transcription here...</p>
    `,
  },
};

// ============================================================================
// Navigation Examples
// ============================================================================

export const navigationExamples = {
  breadcrumbs: `
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/electronics">Electronics</a></li>
    <li aria-current="page">Smartphones</li>
  </ol>
</nav>
  `,

  mainNavigation: `
<nav aria-label="Main">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>
  `,

  landmarks: `
<header role="banner">
  <h1>Site Title</h1>
</header>
<nav role="navigation" aria-label="Main">
  Navigation links
</nav>
<main role="main">
  Main content
</main>
<aside role="complementary">
  Sidebar content
</aside>
<footer role="contentinfo">
  Footer information
</footer>
  `,
};

// ============================================================================
// Responsive & Mobile Accessibility
// ============================================================================

export const responsiveAccessibilityExamples = {
  touchTargets: {
    good: `
<button style="width: 44px; height: 44px; margin: 8px;">
  Action
</button>
    `,
    bad: `
<button style="width: 24px; height: 24px;">
  Small button
</button>
    `,
  },

  textScaling: `
<html style="font-size: 16px;">
  <body style="font-size: 1em;">
    Text scales with browser zoom and text-only zoom
  </body>
</html>
  `,

  orientation: `
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @media (orientation: portrait) {
    body { flex-direction: column; }
  }
  @media (orientation: landscape) {
    body { flex-direction: row; }
  }
</style>
  `,
};

// ============================================================================
// Animation & Motion
// ============================================================================

export const animationExamples = {
  preferencesRespected: `
<style>
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
  `,

  controlledMotion: `
<div role="region" aria-label="Carousel" aria-live="polite">
  <button aria-label="Previous slide">❮</button>
  <img src="slide-1.jpg" alt="Slide 1 of 5">
  <button aria-label="Next slide">❯</button>
  <button aria-label="Pause carousel">⏸</button>
</div>
  `,
};

// ============================================================================
// Helper Functions for Accessibility Validation
// ============================================================================

export const accessibilityHelpers = {
  /**
   * Calculate WCAG contrast ratio between two colors
   * Returns number (1-21)
   */
  calculateContrastRatio(rgb1: string, rgb2: string): number {
    // Simplified - real implementation uses proper color math
    const colors = [rgb1, rgb2]
      .map((color) => {
        const match = color.match(/\d+/g);
        return match ? match.map(Number) : [0, 0, 0];
      })
      .map((rgb) => {
        const [r, g, b] = rgb;
        const luminance =
          0.299 * r + 0.587 * g + 0.114 * b;
        return luminance / 255;
      });

    const lighter = Math.max(...colors);
    const darker = Math.min(...colors);

    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Check if element has accessible label
   */
  hasAccessibleLabel(element: HTMLElement): boolean {
    const label =
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.getAttribute('title') ||
      element.textContent;

    return !!(label && label.trim().length > 0);
  },

  /**
   * Check if element is keyboard accessible
   */
  isKeyboardAccessible(element: HTMLElement): boolean {
    const tabindex = element.getAttribute('tabindex');
    const isNativelyFocusable = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(
      element.tagName
    );

    return (
      isNativelyFocusable ||
      (tabindex !== null && parseInt(tabindex, 10) >= -1)
    );
  },

  /**
   * Check if form field has associated label
   */
  hasFormLabel(input: HTMLInputElement): boolean {
    const id = input.id;
    const label = document.querySelector(`label[for="${id}"]`);
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledby = input.getAttribute('aria-labelledby');

    return !!(label || ariaLabel || ariaLabelledby);
  },

  /**
   * Check if heading hierarchy is proper
   */
  hasProperHeadingHierarchy(container: HTMLElement): boolean {
    const headings = Array.from(
      container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    );

    if (headings.length === 0) return true;

    let previousLevel = 0;
    for (const heading of headings) {
      const level = parseInt(heading.tagName[1], 10);
      if (level - previousLevel > 1) {
        return false; // Skipped heading level
      }
      previousLevel = level;
    }

    return true;
  },

  /**
   * Validate color contrast meets WCAG AA standards
   */
  meetsContrastRequirements(ratio: number, isLargeText: boolean): boolean {
    const minimum = isLargeText ? 3 : 4.5;
    return ratio >= minimum;
  },
};

// ============================================================================
// Test Checklist
// ============================================================================

export const wcagComplianceChecklist = {
  perceivable: [
    '1.1.1 - Non-text Content: Provide text alternatives',
    '1.3.1 - Info and Relationships: Use semantic markup',
    '1.4.1 - Use of Color: Not color-only info conveyance',
    '1.4.3 - Contrast (Minimum): 4.5:1 for text',
  ],

  operable: [
    '2.1.1 - Keyboard: All functionality available',
    '2.4.1 - Bypass Blocks: Skip navigation present',
    '2.4.3 - Focus Order: Logical tab order',
    '2.4.7 - Focus Visible: Visible focus indicator',
  ],

  understandable: [
    '3.1.1 - Language of Page: Page language specified',
    '3.3.1 - Error Identification: Errors identified',
    '3.3.3 - Error Suggestion: Correction suggestions',
  ],

  robust: [
    '4.1.2 - Name, Role, Value: Proper semantics',
    '4.1.3 - Status Messages: Announced to screen readers',
  ],
};
