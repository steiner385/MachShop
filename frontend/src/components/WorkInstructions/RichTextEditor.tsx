/**
 * Rich Text Editor Component
 *
 * A feature-rich text editor built on Lexical for creating work instruction content.
 * Supports:
 * - Rich text formatting (bold, italic, underline, strikethrough)
 * - Lists (ordered and unordered)
 * - Headings (H1-H6)
 * - Links
 * - Images with upload and preview
 * - Video embeds (YouTube, Vimeo)
 * - Tables
 * - Code blocks
 * - Undo/Redo
 * - Accessibility (WCAG 2.1 AA compliant)
 */

import React, { useCallback, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { EditorState } from 'lexical';
import './RichTextEditor.css';
import { ImageNode, ImagePlugin } from './plugins/ImagePlugin';
import { VideoNode, VideoPlugin } from './plugins/VideoPlugin';
import { ToolbarPlugin } from './plugins/ToolbarPlugin';
import './plugins/ToolbarPlugin.css';

export interface RichTextEditorProps {
  /** Initial content in JSON format */
  initialValue?: string;
  /** Callback when content changes */
  onChange: (content: string, plainText: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Whether to show character count */
  showCharCount?: boolean;
  /** Maximum character count */
  maxCharCount?: number;
  /** ARIA label for accessibility */
  ariaLabel?: string;
}

/**
 * Editor theme configuration
 */
const editorTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
  },
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
  },
  code: 'editor-code',
  table: 'editor-table',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
};

/**
 * Handle editor errors
 */
function onError(error: Error) {
  console.error('Lexical Editor Error:', error);
}

/**
 * RichTextEditor Component
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue,
  onChange,
  placeholder = 'Enter work instruction content...',
  readOnly = false,
  minHeight = 200,
  maxHeight = 600,
  showCharCount = true,
  maxCharCount,
  ariaLabel = 'Rich text editor for work instruction content',
}) => {
  const [charCount, setCharCount] = useState(0);
  const [isOverLimit, setIsOverLimit] = useState(false);

  /**
   * Initialize editor configuration
   */
  const initialConfig = {
    namespace: 'WorkInstructionEditor',
    theme: editorTheme,
    onError,
    editable: !readOnly,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      LinkNode,
      ImageNode,
      VideoNode,
    ],
    editorState: initialValue || undefined,
  };

  /**
   * Handle editor content changes
   */
  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const jsonString = JSON.stringify(editorState.toJSON());
        const plainText = editorState.read(() => {
          const root = editorState._nodeMap.get('root');
          return root ? (root as any).getTextContent() : '';
        });

        // Update character count
        const textLength = plainText.length;
        setCharCount(textLength);

        if (maxCharCount) {
          setIsOverLimit(textLength > maxCharCount);
        }

        // Call parent onChange
        onChange(jsonString, plainText);
      });
    },
    [onChange, maxCharCount]
  );

  return (
    <div className="rich-text-editor-container">
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-wrapper">
          {!readOnly && <ToolbarPlugin />}

          <div
            className="editor-inner"
            style={{
              minHeight: `${minHeight}px`,
              maxHeight: `${maxHeight}px`,
            }}
          >
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-input"
                  aria-label={ariaLabel}
                  aria-multiline="true"
                  role="textbox"
                />
              }
              placeholder={
                <div className="editor-placeholder" aria-hidden="true">
                  {placeholder}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <ListPlugin />
            <LinkPlugin />
            <TablePlugin />
            <OnChangePlugin onChange={handleChange} />
            <ImagePlugin />
            <VideoPlugin />
          </div>

          {/* Character count */}
          {showCharCount && (
            <div className="editor-footer">
              <span
                className={`char-count ${isOverLimit ? 'over-limit' : ''}`}
                aria-live="polite"
              >
                {charCount}
                {maxCharCount && ` / ${maxCharCount}`}
                {isOverLimit && ' (Over limit)'}
              </span>
            </div>
          )}
        </div>
      </LexicalComposer>
    </div>
  );
};

export default RichTextEditor;
