# Annotation System User Guide

## Getting Started

The Annotation System allows you to create, edit, and manage annotations on images. Annotations can include arrows, shapes, text, and more.

### Opening the Annotation Editor

```typescript
import { AnnotationEditor } from '@/components/annotations';

function AnnotationPage() {
  return (
    <AnnotationEditor
      imageUrl="/path/to/image.jpg"
      imageWidth={1024}
      imageHeight={768}
      onSave={(annotations) => saveToServer(annotations)}
    />
  );
}
```

## Interface Overview

The annotation editor is divided into several sections:

### 1. History Bar (Top)
Controls for undo/redo and zoom operations:
- **Undo** - Reverse last action (Ctrl+Z)
- **Redo** - Redo last undone action (Ctrl+Y)
- **Zoom Controls** - Zoom in/out, reset to 100%, or fit to view
- **Zoom Percentage** - Click to input custom zoom level

### 2. Toolbar (Left Side)
Tool selection organized by category:
- **Shapes** - Arrow, Rectangle, Circle, Line, Freehand
- **Text** - Text annotations and callout bubbles
- **Markup** - Highlighting tools
- **Measurement** - Distance and angle measurements

Click a category button to expand and select a tool.

### 3. Canvas (Center)
The main annotation area where you:
- Draw annotations by clicking and dragging
- Select existing annotations by clicking
- Move annotations by dragging
- Edit annotation properties

### 4. Layers Panel (Right Side)
Manage annotation layers:
- Create new layers with the + button
- Toggle layer visibility with the eye icon
- Lock/unlock layers with the lock icon
- Reorder layers with up/down arrows
- Rename layers by double-clicking
- Delete layers (except default layer)

### 5. Properties Panel (Right Side)
Edit properties of the selected annotation:
- Position and size
- Appearance (colors, stroke width)
- Text properties (font, size, weight)
- Type-specific options (arrow styles, callout shapes)
- Metadata (creation time, creator)

### 6. Status Bar (Bottom)
Shows current state:
- Number of annotations
- Selection status
- Number of layers
- Save button

## Working with Tools

### Drawing Shapes

1. Click a shape tool (Rectangle, Circle, Arrow, Line)
2. Click and drag on the canvas to define the shape
3. The shape appears with a dashed outline while drawing
4. Release to finalize the annotation

**Tip**: The dashed outline shows the final result. You can draw in any direction.

### Freehand Drawing

1. Select the **Freehand** tool
2. Click and drag to draw custom shapes
3. The path is recorded as you move the mouse
4. Release to complete the annotation

### Text Annotations

1. Select the **Text** tool
2. Click on the canvas where you want the text
3. A text editor dialog appears
4. Type your text and format as desired:
   - Choose font family and size
   - Set text color
   - Adjust font weight (normal, bold, bolder)
5. Click **Save** or press Ctrl+Enter

### Callout Bubbles

1. Select the **Callout** tool
2. Click on the canvas to place the callout
3. A text editor dialog appears with callout options
4. Choose callout shape:
   - **Rectangle** - Rectangular box with straight lines
   - **Rounded** - Rounded corners
   - **Cloud** - Cloud-like shape
5. Select leader line style:
   - **Straight** - Direct line to point
   - **Curved** - Curved bezier line
6. Choose tail marker:
   - **None** - No tail
   - **Arrow** - Arrow head
   - **Triangle** - Triangle point
   - **Circle** - Circle marker
7. Click **Save** when done

## Selecting and Editing

### Select an Annotation

- **Single click** on an annotation to select it
- The annotation highlights in red with selection handles
- Properties panel updates to show editable properties

### Edit Properties

1. Select an annotation
2. In the properties panel, modify any property:
   - Drag position handles or change X/Y values
   - Resize by dragging corners or changing width/height
   - Change colors using color pickers
   - Update text and formatting options

### Delete an Annotation

1. Select the annotation
2. Click the **Delete** button in the properties panel
3. The annotation is removed immediately

## Layer Management

### Create a New Layer

1. In the Layers panel, enter a name in the text field
2. Click the **+** button
3. The new layer is created and selected

### Organize Annotations by Layer

1. Draw or select annotations
2. Use the layers panel to group related annotations
3. Move annotations between layers using the properties panel

### Control Layer Visibility

- Click the **eye icon** to toggle layer visibility
- Hidden layers are not rendered but remain in memory
- Useful for focusing on specific annotations

### Lock Layers

- Click the **lock icon** to prevent accidental edits
- Locked layers cannot be modified or selected
- Useful for finalizing a layer's content

## Zoom and Pan

### Zoom Controls

- **Zoom In** - Increases scale by 10%
- **Zoom Out** - Decreases scale by 10%
- **Reset** - Returns to 100% zoom
- **Fit** - Automatically scales to fit the entire image
- **Custom** - Click zoom percentage to enter a custom value (10-500%)

### Scroll Wheel Zoom

- Hold **Ctrl** (or Cmd on Mac) and scroll to zoom
- Zooms around your cursor position

### Pan (Move View)

- Click and drag with the middle mouse button
- Or use arrow keys after clicking on the canvas

## Undo and Redo

### Undo Last Action

- Click **Undo** button or press **Ctrl+Z**
- Undoes the last annotation change or property edit
- Limited to last 100 actions

### Redo Last Undone Action

- Click **Redo** button or press **Ctrl+Y**
- Re-applies the last undone action
- Only available after using undo

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+Scroll | Zoom |
| Escape | Deselect all |
| Delete | Delete selected annotation |
| Ctrl+Enter | Save text annotation (in editor) |

## Advanced Features

### Multi-Selection

- **Shift+Click** to add/remove annotations from selection
- Select multiple annotations to manage them together
- The properties panel shows the primary (first selected) annotation

### Rectangle Selection

- Click and drag to create a selection rectangle
- All annotations within the rectangle are selected
- Useful for selecting multiple nearby annotations

### Copy/Paste

- **Ctrl+C** - Copy selected annotations
- **Ctrl+V** - Paste annotations (offset by 10 pixels)
- **Ctrl+X** - Cut annotations

### Transform Handles

- When an annotation is selected, resize handles appear at corners and edges
- Drag handles to resize
- Drag the center to move

## Exporting Annotations

### Save Annotations

Click the **Save** button in the status bar to:
- Trigger the `onSave` callback with all annotations
- Send data to your backend
- Store annotations in your database

### Export Formats

The system supports exporting in:
- **JSON** - Complete data including all properties
- **SVG** - Vector graphics with annotations rendered

## Tips and Best Practices

1. **Organize with Layers** - Use layers to group related annotations
2. **Use Consistent Colors** - Establish a color scheme for different annotation types
3. **Lock Completed Layers** - Prevent accidental changes to finished work
4. **Regular Saves** - Click Save frequently to avoid losing work
5. **Zoom In for Precision** - Zoom in for accurate placement of small annotations
6. **Name Layers Descriptively** - Use meaningful layer names like "Issues" or "Feedback"
7. **Group Similar Items** - Keep related annotations on the same layer

## Troubleshooting

### Annotation Won't Draw

- Make sure a tool is selected (should be highlighted in toolbar)
- Ensure the layer isn't locked
- Try zooming in for more precision

### Can't Select an Annotation

- The annotation might be hidden or on a hidden layer
- Check the layers panel visibility
- Try adjusting the zoom level

### Properties Won't Update

- Make sure an annotation is selected
- Check that the layer isn't locked
- Try clicking directly on the annotation again

### Performance Issues with Many Annotations

- Consider using multiple layers to organize content
- Hide layers you're not actively working on
- Zoom out to render fewer details

## Keyboard Navigation

- **Arrow Keys** - Pan the view (up, down, left, right)
- **Tab** - Move focus between UI elements
- **Space + Drag** - Pan alternative method
- **+/-** - Alternative zoom controls

## Accessibility

The annotation system includes:
- Keyboard navigation support
- Screen reader friendly component labels
- High contrast mode compatibility
- Focus indicators for all interactive elements

## Getting Help

For issues or questions:
1. Check this guide for common scenarios
2. Review the API documentation for technical details
3. Contact support with screenshots of the issue
4. Check your browser console for error messages (F12)

## Performance Tips

- Save annotations regularly to avoid data loss
- Close unnecessary layers when working with many annotations
- Use lower zoom levels to see the whole image
- Clear very old undo history if experiencing slowdowns

## Known Limitations

- Maximum 1000 annotations per layer recommended
- Text doesn't support all advanced formatting
- Freehand paths have a minimum segment length
- Annotations don't persist automatically (use Save button)

## Updates and Changes

The annotation system is actively maintained. Check the documentation for:
- New tool types
- Performance improvements
- Bug fixes and enhancements
- New export formats
