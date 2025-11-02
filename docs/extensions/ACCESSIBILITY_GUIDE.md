# Accessibility Guide

## Table of Contents

- [Introduction](#introduction)
- [WCAG 2.1 AA Compliance](#wcag-21-aa-compliance)
- [Keyboard Navigation](#keyboard-navigation)
- [Screen Reader Support](#screen-reader-support)
- [Color and Contrast](#color-and-contrast)
- [ARIA Labels and Roles](#aria-labels-and-roles)
- [Accessibility Testing](#accessibility-testing)
- [Common Patterns](#common-patterns)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Tools and Resources](#tools-and-resources)

## Introduction

Building accessible extensions ensures that all users, regardless of their abilities, can effectively use your extension. This guide provides comprehensive requirements, best practices, and examples for creating WCAG 2.1 AA compliant extensions.

### Why Accessibility Matters

- **Inclusivity**: Ensures all users can access your features
- **Legal Compliance**: Meets ADA and other accessibility regulations
- **Better UX**: Improves usability for everyone
- **SEO Benefits**: Better structure and semantics
- **Professional Quality**: Demonstrates attention to detail

### Accessibility Principles

The four principles of WCAG (POUR):

1. **Perceivable**: Information must be presentable to users in ways they can perceive
2. **Operable**: User interface components must be operable
3. **Understandable**: Information and operation must be understandable
4. **Robust**: Content must be robust enough to work with current and future technologies

## WCAG 2.1 AA Compliance

### Level A Requirements

#### Text Alternatives (1.1.1)

All non-text content must have text alternatives.

```tsx
// Good: Image with alt text
<img
  src="/icons/settings.png"
  alt="Settings icon - opens settings panel"
/>

// Good: Decorative image
<img
  src="/decorative-pattern.png"
  alt=""
  role="presentation"
/>

// Good: Complex image with description
<figure>
  <img
    src="/chart.png"
    alt="Sales growth chart"
    aria-describedby="chart-desc"
  />
  <figcaption id="chart-desc">
    Line chart showing 25% sales growth from Q1 to Q4 2024
  </figcaption>
</figure>

// Bad: Missing alt text
<img src="/icon.png" />
```

#### Audio and Video Content (1.2.1, 1.2.2, 1.2.3)

```tsx
// Provide captions and transcripts
<video controls>
  <source src="/tutorial.mp4" type="video/mp4" />
  <track
    kind="captions"
    src="/tutorial-captions.vtt"
    srclang="en"
    label="English"
  />
  <track
    kind="descriptions"
    src="/tutorial-desc.vtt"
    srclang="en"
    label="Audio descriptions"
  />
</video>
```

#### Info and Relationships (1.3.1)

Structure content using proper semantic HTML.

```tsx
// Good: Semantic structure
<article>
  <header>
    <h1>Extension Settings</h1>
  </header>
  <section>
    <h2>General Options</h2>
    <form>
      <fieldset>
        <legend>Notification Preferences</legend>
        <label>
          <input type="checkbox" name="email" />
          Email notifications
        </label>
      </fieldset>
    </form>
  </section>
</article>

// Bad: Divs everywhere
<div>
  <div style={{fontSize: '24px', fontWeight: 'bold'}}>Extension Settings</div>
  <div>
    <div style={{fontSize: '18px'}}>General Options</div>
    <div>
      <div>Notification Preferences</div>
      <div>
        <input type="checkbox" />
        <span>Email notifications</span>
      </div>
    </div>
  </div>
</div>
```

#### Meaningful Sequence (1.3.2)

Ensure reading order matches visual order.

```tsx
// Good: Logical DOM order
<div className="card">
  <h2>Product Name</h2>
  <img src="/product.jpg" alt="Product photo" />
  <p>Product description</p>
  <button>Add to Cart</button>
</div>

// Bad: CSS reordering changes meaning
<div className="card">
  <button style={{order: 3}}>Add to Cart</button>
  <h2 style={{order: 1}}>Product Name</h2>
  <p style={{order: 2}}>Description</p>
</div>
```

#### Sensory Characteristics (1.3.3)

Don't rely solely on sensory characteristics.

```tsx
// Good: Multiple cues
<button className="primary-button">
  <SaveIcon aria-hidden="true" />
  Save Changes
</button>
<p>Click the "Save Changes" button to continue.</p>

// Bad: Shape/color only
<button className="green-circle-button">
  <SaveIcon />
</button>
<p>Click the green circular button.</p>
```

#### Use of Color (1.4.1)

Color alone should not convey information.

```tsx
// Good: Multiple indicators
function FormField({ error, ...props }) {
  return (
    <div className={error ? 'field-error' : 'field'}>
      <label>
        {props.label}
        {props.required && <span aria-label="required"> *</span>}
      </label>
      <input {...props} aria-invalid={error ? 'true' : 'false'} />
      {error && (
        <div role="alert" className="error-message">
          <ErrorIcon aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}

// Bad: Color only
function FormField({ error, ...props }) {
  return (
    <div style={{borderColor: error ? 'red' : 'black'}}>
      <input {...props} />
    </div>
  );
}
```

#### Audio Control (1.4.2)

Provide controls for auto-playing audio.

```tsx
function AudioPlayer({ autoplay = false }) {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  return (
    <div>
      <audio ref={audioRef} src="/notification.mp3" />
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  );
}
```

### Level AA Requirements

#### Contrast (Minimum) (1.4.3)

Text must have a contrast ratio of at least:
- 4.5:1 for normal text (under 18pt or 14pt bold)
- 3:1 for large text (18pt+ or 14pt+ bold)

```css
/* Good: High contrast */
.primary-text {
  color: #212121; /* Dark gray */
  background-color: #FFFFFF; /* White */
  /* Contrast ratio: 16.1:1 */
}

.secondary-text {
  color: #595959; /* Medium gray */
  background-color: #FFFFFF; /* White */
  /* Contrast ratio: 7.5:1 */
}

.large-heading {
  font-size: 24px;
  font-weight: bold;
  color: #767676; /* Light gray */
  background-color: #FFFFFF; /* White */
  /* Contrast ratio: 4.6:1 - acceptable for large text */
}

/* Bad: Low contrast */
.low-contrast {
  color: #CCCCCC; /* Light gray */
  background-color: #FFFFFF; /* White */
  /* Contrast ratio: 1.6:1 - FAILS */
}
```

#### Resize Text (1.4.4)

Text must be resizable up to 200% without loss of content or functionality.

```css
/* Good: Relative units */
.container {
  font-size: 1rem; /* 16px default */
  line-height: 1.5;
  padding: 1em;
  max-width: 60ch; /* Character-based width */
}

.heading {
  font-size: 1.5rem; /* 24px default */
  margin-bottom: 0.5em;
}

/* Bad: Fixed pixel sizes */
.bad-container {
  font-size: 16px;
  line-height: 24px;
  width: 960px;
  height: 600px;
}
```

#### Images of Text (1.4.5)

Avoid images of text except for logos and essential images.

```tsx
// Good: Actual text with styling
<h1 className="fancy-heading">
  Welcome to Our Extension
</h1>

// CSS
.fancy-heading {
  font-family: 'Custom Font', sans-serif;
  font-size: 2.5rem;
  color: #1a73e8;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
}

// Acceptable: Logo
<img
  src="/logo.png"
  alt="Company Name - MachShop"
/>

// Bad: Text as image
<img src="/heading.png" alt="Welcome to Our Extension" />
```

#### Reflow (1.4.10)

Content must reflow to a single column at 320px width.

```css
/* Good: Responsive layout */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

@media (max-width: 320px) {
  .responsive-grid {
    grid-template-columns: 1fr;
  }
}

/* Good: Flexible containers */
.flexible-container {
  max-width: 100%;
  padding: 1rem;
  box-sizing: border-box;
}
```

#### Non-text Contrast (1.4.11)

UI components and graphics must have 3:1 contrast.

```css
/* Good: High contrast interactive elements */
.button {
  background-color: #1a73e8; /* Blue */
  color: #FFFFFF; /* White */
  border: 2px solid #1557b0; /* Darker blue - 3.2:1 with bg */
}

.button:focus {
  outline: 3px solid #000000; /* Black outline - 21:1 with white bg */
  outline-offset: 2px;
}

.input-field {
  border: 2px solid #5f6368; /* Gray - 4.7:1 with white */
  background-color: #FFFFFF;
}

/* Bad: Low contrast borders */
.bad-input {
  border: 1px solid #E0E0E0; /* Too light - 1.3:1 */
  background-color: #FFFFFF;
}
```

#### Text Spacing (1.4.12)

Allow users to adjust text spacing without loss of content.

```css
/* Good: Accommodate text spacing */
.text-content {
  line-height: 1.5; /* At least 1.5x font size */
  letter-spacing: normal;
  word-spacing: normal;
}

.text-content p {
  margin-bottom: 1em; /* At least 2x font size */
}

/* Avoid fixed heights */
.avoid {
  /* Don't do this */
  /* height: 200px; */
  /* overflow: hidden; */
}

/* Instead use min-height */
.better {
  min-height: 200px;
  overflow: auto;
}
```

#### Content on Hover or Focus (1.4.13)

Additional content triggered by hover/focus must be:
- Dismissible
- Hoverable
- Persistent

```tsx
function Tooltip({ children, content }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  return (
    <div className="tooltip-container">
      <button
        aria-describedby="tooltip-content"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => !isPinned && setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => !isPinned && setIsVisible(false)}
      >
        {children}
      </button>
      {isVisible && (
        <div
          id="tooltip-content"
          role="tooltip"
          className="tooltip"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => !isPinned && setIsVisible(false)}
        >
          {content}
          <button
            onClick={() => {
              setIsPinned(false);
              setIsVisible(false);
            }}
            aria-label="Close tooltip"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}
```

## Keyboard Navigation

### Focus Management

#### Visible Focus Indicators

Always provide visible focus indicators.

```css
/* Good: Clear focus styles */
button:focus,
a:focus,
input:focus {
  outline: 3px solid #1a73e8;
  outline-offset: 2px;
}

/* Custom focus styles */
.custom-button:focus {
  outline: none; /* Only if providing alternative */
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.5);
}

/* Bad: Removing focus without alternative */
.bad-button:focus {
  outline: none; /* Don't do this alone */
}
```

#### Focus Order

Ensure logical tab order.

```tsx
// Good: Natural DOM order
function Dialog({ onClose }) {
  return (
    <div role="dialog" aria-labelledby="dialog-title">
      <h2 id="dialog-title">Confirmation</h2>
      <p>Are you sure you want to proceed?</p>
      <button onClick={onClose}>Cancel</button>
      <button>Confirm</button>
    </div>
  );
}

// Bad: Using tabindex to reorder
function BadDialog({ onClose }) {
  return (
    <div role="dialog">
      <button tabIndex={3} onClick={onClose}>Cancel</button>
      <h2 tabIndex={1}>Confirmation</h2>
      <p tabIndex={2}>Are you sure?</p>
      <button tabIndex={4}>Confirm</button>
    </div>
  );
}
```

#### Focus Trapping

Trap focus within modals and dialogs.

```tsx
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    firstElement.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}
```

### Keyboard Shortcuts

#### Common Keyboard Patterns

```tsx
// Arrow key navigation for lists
function NavigableList({ items }) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = Math.min(index + 1, items.length - 1);
        setFocusedIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = Math.max(index - 1, 0);
        setFocusedIndex(prevIndex);
        itemRefs.current[prevIndex]?.focus();
        break;

      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        itemRefs.current[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        const lastIndex = items.length - 1;
        setFocusedIndex(lastIndex);
        itemRefs.current[lastIndex]?.focus();
        break;
    }
  };

  return (
    <ul role="listbox" aria-label="Items">
      {items.map((item, index) => (
        <li
          key={item.id}
          ref={(el) => (itemRefs.current[index] = el)}
          role="option"
          tabIndex={focusedIndex === index ? 0 : -1}
          aria-selected={focusedIndex === index}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onClick={() => setFocusedIndex(index)}
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
}
```

#### Custom Keyboard Shortcuts

```tsx
function useKeyboardShortcut(key: string, callback: () => void, options = {}) {
  const { ctrl = false, shift = false, alt = false } = options;

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === key &&
        e.ctrlKey === ctrl &&
        e.shiftKey === shift &&
        e.altKey === alt
      ) {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [key, callback, ctrl, shift, alt]);
}

// Usage
function Editor() {
  const [content, setContent] = useState('');

  useKeyboardShortcut('s', () => {
    console.log('Saving...');
  }, { ctrl: true });

  useKeyboardShortcut('z', () => {
    console.log('Undoing...');
  }, { ctrl: true });

  return (
    <div>
      <p>
        Keyboard shortcuts:
        <kbd>Ctrl+S</kbd> to save,
        <kbd>Ctrl+Z</kbd> to undo
      </p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        aria-label="Content editor"
      />
    </div>
  );
}
```

### Skip Links

Provide skip navigation links.

```tsx
function PageLayout({ children }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#navigation" className="skip-link">
        Skip to navigation
      </a>

      <header>
        <nav id="navigation">
          {/* Navigation items */}
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}

// CSS
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

## Screen Reader Support

### Semantic HTML

Use appropriate semantic elements.

```tsx
// Good: Semantic structure
function Article() {
  return (
    <article>
      <header>
        <h1>Article Title</h1>
        <p>By <span>Author Name</span></p>
        <time dateTime="2024-01-15">January 15, 2024</time>
      </header>

      <section>
        <h2>Introduction</h2>
        <p>Content...</p>
      </section>

      <aside>
        <h2>Related Articles</h2>
        <nav aria-label="Related content">
          <ul>
            <li><a href="/article-1">Related Article 1</a></li>
          </ul>
        </nav>
      </aside>

      <footer>
        <p>Published on <time dateTime="2024-01-15">January 15, 2024</time></p>
      </footer>
    </article>
  );
}
```

### Live Regions

Announce dynamic content changes.

```tsx
function StatusMessage({ message, type = 'polite' }) {
  return (
    <div
      role="status"
      aria-live={type}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Usage
function Form() {
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Saving...');

    try {
      await saveData();
      setStatus('Saved successfully!');
    } catch (error) {
      setStatus('Error saving. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit">Save</button>
      <StatusMessage message={status} />
    </form>
  );
}

// For urgent messages
function ErrorAlert({ message }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="error-alert"
    >
      <AlertIcon aria-hidden="true" />
      {message}
    </div>
  );
}
```

### Screen Reader Only Content

Provide additional context for screen readers.

```tsx
// CSS for screen reader only content
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

// Usage
function IconButton({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} aria-label={label}>
      <Icon aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

// Data tables
function DataTable({ data }) {
  return (
    <table>
      <caption className="sr-only">
        Sales data for Q4 2024
      </caption>
      <thead>
        <tr>
          <th scope="col">Month</th>
          <th scope="col">Revenue</th>
          <th scope="col">Growth</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.month}>
            <th scope="row">{row.month}</th>
            <td>{row.revenue}</td>
            <td>
              {row.growth}
              <span className="sr-only">
                {row.growth > 0 ? 'increased' : 'decreased'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Form Labels and Instructions

Properly label all form controls.

```tsx
function AccessibleForm() {
  return (
    <form>
      {/* Basic label */}
      <div className="form-field">
        <label htmlFor="email">
          Email Address
          <span aria-label="required">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          aria-required="true"
        />
      </div>

      {/* With help text */}
      <div className="form-field">
        <label htmlFor="password">
          Password
          <span aria-label="required">*</span>
        </label>
        <input
          id="password"
          type="password"
          required
          aria-required="true"
          aria-describedby="password-help"
        />
        <div id="password-help" className="help-text">
          Must be at least 8 characters with 1 number
        </div>
      </div>

      {/* With error */}
      <div className="form-field">
        <label htmlFor="username">
          Username
        </label>
        <input
          id="username"
          type="text"
          aria-invalid="true"
          aria-describedby="username-error"
        />
        <div id="username-error" role="alert" className="error">
          Username is already taken
        </div>
      </div>

      {/* Radio group */}
      <fieldset>
        <legend>Notification Preferences</legend>
        <label>
          <input type="radio" name="notify" value="email" />
          Email
        </label>
        <label>
          <input type="radio" name="notify" value="sms" />
          SMS
        </label>
        <label>
          <input type="radio" name="notify" value="none" />
          None
        </label>
      </fieldset>

      <button type="submit">Submit</button>
    </form>
  );
}
```

## Color and Contrast

### Color Contrast Ratios

Meeting WCAG AA requirements:

```css
/* Text Contrast Examples */

/* Level AAA - Normal text (7:1) */
.aaa-normal {
  color: #000000; /* Black */
  background-color: #FFFFFF; /* White */
  /* Ratio: 21:1 */
}

/* Level AA - Normal text (4.5:1) */
.aa-normal-dark {
  color: #595959; /* Dark gray */
  background-color: #FFFFFF; /* White */
  /* Ratio: 7.5:1 */
}

.aa-normal-light {
  color: #FFFFFF; /* White */
  background-color: #1a73e8; /* Blue */
  /* Ratio: 5.3:1 */
}

/* Level AA - Large text (3:1) */
.aa-large {
  font-size: 24px;
  font-weight: bold;
  color: #767676; /* Medium gray */
  background-color: #FFFFFF; /* White */
  /* Ratio: 4.6:1 */
}

/* Interactive Elements */
.button-primary {
  background-color: #1a73e8; /* Blue */
  color: #FFFFFF; /* White */
  border: 2px solid #1557b0; /* Dark blue */
  /* Text ratio: 5.3:1 */
  /* Border ratio: 3.2:1 */
}

.button-primary:hover {
  background-color: #1557b0; /* Darker blue */
  /* Text ratio: 6.8:1 */
}

.button-primary:focus {
  outline: 3px solid #000000;
  outline-offset: 2px;
  /* Outline ratio: 21:1 */
}

/* Link Colors */
.link-default {
  color: #1a73e8; /* Blue */
  text-decoration: underline;
  /* Ratio with white: 5.3:1 */
}

.link-visited {
  color: #7c3aed; /* Purple */
  /* Ratio with white: 5.9:1 */
}

.link-hover {
  color: #1557b0; /* Darker blue */
  /* Ratio with white: 6.8:1 */
}
```

### Testing Contrast

Use these tools and techniques:

```tsx
// Runtime contrast checker (dev only)
function ContrastChecker({ foreground, background, fontSize = 16 }) {
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const [rs, gs, bs] = [r, g, b].map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const getContrastRatio = (fg: string, bg: string) => {
    const l1 = getLuminance(fg);
    const l2 = getLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const ratio = getContrastRatio(foreground, background);
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
  const requiredRatio = isLargeText ? 3 : 4.5;
  const passes = ratio >= requiredRatio;

  if (process.env.NODE_ENV === 'development' && !passes) {
    console.warn(
      `Contrast ratio ${ratio.toFixed(2)}:1 fails WCAG AA (${requiredRatio}:1 required)`
    );
  }

  return null;
}
```

### Color Blindness Considerations

Ensure color is not the only differentiator.

```tsx
// Good: Multiple indicators
function StatusBadge({ status }: { status: 'success' | 'warning' | 'error' }) {
  const config = {
    success: {
      icon: CheckCircleIcon,
      label: 'Success',
      className: 'badge-success',
    },
    warning: {
      icon: WarningIcon,
      label: 'Warning',
      className: 'badge-warning',
    },
    error: {
      icon: ErrorIcon,
      label: 'Error',
      className: 'badge-error',
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <span className={`badge ${className}`} role="status">
      <Icon aria-hidden="true" />
      {label}
    </span>
  );
}

// Chart with patterns
function AccessibleChart({ data }) {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Sales data chart">
      <title>Monthly sales data</title>
      <defs>
        <pattern id="pattern1" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0,0 L4,4" stroke="#000" strokeWidth="1"/>
        </pattern>
        <pattern id="pattern2" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#000"/>
        </pattern>
      </defs>

      <rect
        x="0"
        y="0"
        width="100"
        height="200"
        fill="#1a73e8"
        style={{pattern: 'url(#pattern1)'}}
      />
      <text x="50" y="220">Q1</text>

      <rect
        x="120"
        y="50"
        width="100"
        height="150"
        fill="#34a853"
        style={{pattern: 'url(#pattern2)'}}
      />
      <text x="170" y="220">Q2</text>
    </svg>
  );
}
```

## ARIA Labels and Roles

### Common ARIA Roles

```tsx
// Navigation
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

// Search
<div role="search">
  <label htmlFor="search-input">Search</label>
  <input
    id="search-input"
    type="search"
    aria-label="Search products"
  />
  <button type="submit">Search</button>
</div>

// Alert
<div role="alert" aria-live="assertive">
  Your session will expire in 5 minutes
</div>

// Dialog
<div
  role="dialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
  aria-modal="true"
>
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-description">Are you sure you want to proceed?</p>
  <button>Cancel</button>
  <button>Confirm</button>
</div>

// Tabs
<div className="tabs">
  <div role="tablist" aria-label="Settings tabs">
    <button
      role="tab"
      aria-selected="true"
      aria-controls="panel-general"
      id="tab-general"
    >
      General
    </button>
    <button
      role="tab"
      aria-selected="false"
      aria-controls="panel-advanced"
      id="tab-advanced"
    >
      Advanced
    </button>
  </div>

  <div
    role="tabpanel"
    id="panel-general"
    aria-labelledby="tab-general"
    tabIndex={0}
  >
    General settings content
  </div>
</div>
```

### ARIA Labels

```tsx
// aria-label for elements without visible text
<button aria-label="Close dialog">
  <XIcon />
</button>

// aria-labelledby for using existing text
<section aria-labelledby="section-title">
  <h2 id="section-title">Account Settings</h2>
  {/* Content */}
</section>

// aria-describedby for additional context
<input
  id="email"
  type="email"
  aria-describedby="email-help email-error"
/>
<div id="email-help">We'll never share your email</div>
<div id="email-error" role="alert">Invalid email format</div>

// Complex labels
<button
  aria-label={`Add ${productName} to cart for $${price}`}
>
  <ShoppingCartIcon aria-hidden="true" />
  Add to Cart
</button>
```

### ARIA States and Properties

```tsx
function ExpandableSection({ title, children }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();

  return (
    <div className="expandable">
      <button
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {title}
        <ChevronIcon
          aria-hidden="true"
          className={isExpanded ? 'rotate-180' : ''}
        />
      </button>

      <div
        id={contentId}
        hidden={!isExpanded}
        aria-hidden={!isExpanded}
      >
        {children}
      </div>
    </div>
  );
}

// Busy state
function LoadingButton({ isLoading, children, ...props }) {
  return (
    <button
      {...props}
      aria-busy={isLoading}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <SpinnerIcon aria-hidden="true" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Invalid state
function FormField({ error, value, onChange, label }) {
  const inputId = useId();
  const errorId = useId();

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <div id={errorId} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
```

### ARIA Best Practices

```tsx
// ✅ Good: Use semantic HTML first
<button onClick={handleClick}>Click me</button>

// ❌ Bad: Don't recreate native functionality
<div role="button" tabIndex={0} onClick={handleClick}>
  Click me
</div>

// ✅ Good: Hide decorative icons
<button>
  <TrashIcon aria-hidden="true" />
  Delete
</button>

// ❌ Bad: Screen reader reads icon
<button>
  <TrashIcon />
  Delete
</button>

// ✅ Good: Proper live region
<div role="status" aria-live="polite" aria-atomic="true">
  {message}
</div>

// ❌ Bad: Overusing aria-live
<div aria-live="polite">
  <div aria-live="polite">
    <span aria-live="polite">{message}</span>
  </div>
</div>

// ✅ Good: Descriptive labels
<button aria-label="Delete comment by John Doe">
  <TrashIcon />
</button>

// ❌ Bad: Generic labels
<button aria-label="Delete">
  <TrashIcon />
</button>
```

## Accessibility Testing

### Manual Testing Checklist

#### Keyboard Testing

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are clearly visible
- [ ] Tab order is logical
- [ ] No keyboard traps
- [ ] Skip links work correctly
- [ ] Custom keyboard shortcuts don't conflict
- [ ] Escape key closes modals/dialogs
- [ ] Arrow keys work in lists/menus
- [ ] Enter/Space activate buttons

#### Screen Reader Testing

Test with multiple screen readers:
- NVDA (Windows, free)
- JAWS (Windows, commercial)
- VoiceOver (macOS/iOS, built-in)
- TalkBack (Android, built-in)

Checklist:
- [ ] All images have appropriate alt text
- [ ] Forms are properly labeled
- [ ] Headings create logical structure
- [ ] Live regions announce updates
- [ ] Error messages are announced
- [ ] Dynamic content changes are announced
- [ ] Tables have proper headers
- [ ] Lists are properly marked up

#### Visual Testing

- [ ] Text is readable at 200% zoom
- [ ] Content reflows at 320px width
- [ ] Color contrast meets AA standards
- [ ] Content works without color
- [ ] Focus indicators have 3:1 contrast
- [ ] UI controls have 3:1 contrast
- [ ] Text spacing can be adjusted
- [ ] No horizontal scrolling at 320px

### Automated Testing Tools

#### axe-core Integration

```typescript
// vitest setup
import { configureAxe } from 'jest-axe';

const axe = configureAxe({
  rules: {
    // Customize rules as needed
    'color-contrast': { enabled: true },
    'label': { enabled: true },
  },
});

// Test example
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button Component', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper focus styles', async () => {
    const { container, getByRole } = render(<Button>Click me</Button>);
    const button = getByRole('button');
    button.focus();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

#### React Testing Library

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Form Accessibility', () => {
  it('should have accessible labels', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('should announce errors to screen readers', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/error/i);
  });

  it('should be keyboard navigable', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();

    await user.tab();
    expect(screen.getByLabelText(/email/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/password/i)).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /submit/i })).toHaveFocus();
  });
});
```

#### Cypress Accessibility Testing

```typescript
// cypress/support/commands.ts
import 'cypress-axe';

Cypress.Commands.add('checkA11y', (context?, options?) => {
  cy.injectAxe();
  cy.checkA11y(context, {
    ...options,
    rules: {
      'color-contrast': { enabled: true },
      'duplicate-id': { enabled: true },
    },
  });
});

// cypress/e2e/accessibility.cy.ts
describe('Extension Accessibility', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('should have no accessibility violations on load', () => {
    cy.checkA11y();
  });

  it('should be keyboard navigable', () => {
    cy.get('body').tab();
    cy.focused().should('have.attr', 'href', '/dashboard');

    cy.get('body').tab();
    cy.focused().should('have.attr', 'href', '/settings');
  });

  it('should maintain accessibility in modal', () => {
    cy.get('[aria-label="Open settings"]').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.checkA11y('[role="dialog"]');
  });

  it('should trap focus in modal', () => {
    cy.get('[aria-label="Open settings"]').click();

    const focusableElements = cy.get('[role="dialog"] button, [role="dialog"] [href], [role="dialog"] input');
    const firstElement = focusableElements.first();
    const lastElement = focusableElements.last();

    firstElement.focus();
    cy.focused().should('equal', firstElement);

    lastElement.focus().tab();
    cy.focused().should('equal', firstElement);
  });
});
```

### Accessibility Audit Process

1. **Automated Scan**: Run axe-core on all pages
2. **Keyboard Testing**: Navigate entire flow with keyboard only
3. **Screen Reader Testing**: Test critical paths with screen reader
4. **Color/Contrast**: Verify all text and UI elements
5. **Zoom Testing**: Test at 200% zoom
6. **Responsive Testing**: Test at 320px width
7. **Documentation**: Record issues and fixes

## Common Patterns

### Accessible Modal Dialog

```tsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Find all focusable elements
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element
    setTimeout(() => firstElement.focus(), 0);

    // Trap focus
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleTab);
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal-content"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="modal-close"
          >
            <XIcon aria-hidden="true" />
          </button>
        </header>

        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
```

### Accessible Dropdown Menu

```tsx
function DropdownMenu({ trigger, items }) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          const nextIndex = (focusedIndex + 1) % items.length;
          setFocusedIndex(nextIndex);
          itemRefs.current[nextIndex]?.focus();
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          const prevIndex = focusedIndex === 0 ? items.length - 1 : focusedIndex - 1;
          setFocusedIndex(prevIndex);
          itemRefs.current[prevIndex]?.focus();
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;

      case 'Home':
        if (isOpen) {
          e.preventDefault();
          setFocusedIndex(0);
          itemRefs.current[0]?.focus();
        }
        break;

      case 'End':
        if (isOpen) {
          e.preventDefault();
          const lastIndex = items.length - 1;
          setFocusedIndex(lastIndex);
          itemRefs.current[lastIndex]?.focus();
        }
        break;
    }
  };

  return (
    <div className="dropdown" ref={menuRef}>
      <button
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
      >
        {trigger}
      </button>

      {isOpen && (
        <div role="menu" className="dropdown-menu">
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => (itemRefs.current[index] = el)}
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              onKeyDown={handleKeyDown}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Accessible Data Table

```tsx
function DataTable({ columns, data, caption }) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.id}
              scope="col"
              aria-sort={
                sortColumn === column.id
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              {column.sortable ? (
                <button
                  onClick={() => handleSort(column.id)}
                  aria-label={`Sort by ${column.label} ${
                    sortColumn === column.id
                      ? sortDirection === 'asc'
                        ? 'descending'
                        : 'ascending'
                      : 'ascending'
                  }`}
                >
                  {column.label}
                  {sortColumn === column.id && (
                    <SortIcon
                      direction={sortDirection}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ) : (
                column.label
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            {columns.map((column, index) => (
              index === 0 ? (
                <th key={column.id} scope="row">
                  {row[column.id]}
                </th>
              ) : (
                <td key={column.id}>
                  {row[column.id]}
                </td>
              )
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Anti-Patterns to Avoid

### Common Mistakes

```tsx
// ❌ BAD: Missing alt text
<img src="/icon.png" />

// ✅ GOOD: Proper alt text
<img src="/icon.png" alt="Settings icon" />

// ❌ BAD: Placeholder as label
<input placeholder="Enter email" />

// ✅ GOOD: Proper label
<label htmlFor="email">Email</label>
<input id="email" placeholder="user@example.com" />

// ❌ BAD: Removing focus outline without alternative
button:focus {
  outline: none;
}

// ✅ GOOD: Custom focus style
button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.5);
}

// ❌ BAD: Click handler on non-interactive element
<div onClick={handleClick}>Click me</div>

// ✅ GOOD: Use button
<button onClick={handleClick}>Click me</button>

// ❌ BAD: Positive tabindex
<div tabIndex={1}>Content</div>

// ✅ GOOD: Natural tab order or -1 for programmatic focus
<div tabIndex={-1}>Content</div>

// ❌ BAD: Empty links/buttons
<button><Icon /></button>

// ✅ GOOD: Accessible label
<button aria-label="Save document">
  <SaveIcon aria-hidden="true" />
</button>

// ❌ BAD: Auto-playing content without controls
<video autoplay src="/video.mp4" />

// ✅ GOOD: Provide controls
<video controls src="/video.mp4" />

// ❌ BAD: Time-sensitive actions without warning
setTimeout(() => {
  closeDialog();
}, 5000);

// ✅ GOOD: Warn user and allow extension
<div role="alert">
  Session expires in <span aria-live="polite">{timeLeft}</span> seconds.
  <button onClick={extendSession}>Extend Session</button>
</div>
```

### Accessibility Errors to Avoid

1. **Missing Form Labels**: Always label form controls
2. **Low Contrast**: Ensure 4.5:1 for text, 3:1 for UI
3. **Keyboard Traps**: Always provide escape mechanism
4. **Missing Alt Text**: Provide meaningful alternatives
5. **Poor Focus Management**: Maintain logical focus order
6. **Inaccessible Custom Controls**: Use ARIA appropriately
7. **Auto-refresh Without Warning**: Alert users before refresh
8. **Cryptic Error Messages**: Provide clear, actionable errors

## Tools and Resources

### Testing Tools

#### Browser Extensions
- **axe DevTools**: Automated accessibility testing
- **WAVE**: Visual feedback about accessibility
- **Lighthouse**: Comprehensive audits including accessibility
- **Color Contrast Analyzer**: Check contrast ratios

#### Screen Readers
- **NVDA** (Windows): Free and open source
- **JAWS** (Windows): Industry standard commercial option
- **VoiceOver** (macOS/iOS): Built into Apple devices
- **TalkBack** (Android): Built into Android devices

#### Command Line Tools
```bash
# Install axe-core CLI
npm install -g @axe-core/cli

# Run accessibility audit
axe https://yoursite.com --save results.json

# Install pa11y
npm install -g pa11y

# Run pa11y audit
pa11y https://yoursite.com
```

### Development Tools

```typescript
// ESLint plugin for accessibility
// .eslintrc.js
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["jsx-a11y"]
}

// TypeScript types for accessibility
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
}
```

### Learning Resources

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **MDN Accessibility**: https://developer.mozilla.org/en-US/docs/Web/Accessibility
- **A11y Project**: https://www.a11yproject.com/
- **WebAIM**: https://webaim.org/
- **Deque University**: https://dequeuniversity.com/

### Checklists

Use these for comprehensive accessibility reviews:

- WebAIM WCAG 2.1 Checklist
- A11y Project Checklist
- Gov.uk Accessibility Checklist
- Vox Media Accessibility Guidelines

### Getting Help

- **Stack Overflow**: Tag questions with `accessibility` and `wcag`
- **A11y Slack**: https://web-a11y.slack.com/
- **WebAIM Discussion List**: https://webaim.org/discussion/
- **Twitter**: Follow @A11yProject, @webaim, @marcysutton

### Continuous Monitoring

```typescript
// Add to CI/CD pipeline
{
  "scripts": {
    "test:a11y": "axe --dir ./build --save results.json",
    "test:a11y:ci": "npm run test:a11y && node scripts/check-a11y-results.js"
  }
}

// check-a11y-results.js
const results = require('../results.json');

if (results.violations.length > 0) {
  console.error('Accessibility violations found:');
  results.violations.forEach(violation => {
    console.error(`\n${violation.help}`);
    console.error(`Impact: ${violation.impact}`);
    console.error(`Nodes: ${violation.nodes.length}`);
  });
  process.exit(1);
}
```

---

## Summary

Building accessible extensions requires:

1. **WCAG 2.1 AA Compliance**: Meet all Level A and AA success criteria
2. **Keyboard Navigation**: Full keyboard access with visible focus
3. **Screen Reader Support**: Semantic HTML and proper ARIA usage
4. **Color and Contrast**: Minimum 4.5:1 for text, 3:1 for UI
5. **Thorough Testing**: Automated tools plus manual keyboard and screen reader testing
6. **Common Patterns**: Use established accessible components
7. **Avoid Anti-Patterns**: Don't recreate native functionality poorly
8. **Continuous Monitoring**: Test accessibility in CI/CD pipeline

Remember: Accessibility is not a feature, it's a requirement. Build it in from the start, not as an afterthought.
