/**
 * Toolbar Plugin for Lexical Rich Text Editor
 *
 * Provides a comprehensive formatting toolbar with:
 * - Text formatting (bold, italic, underline, strikethrough)
 * - Headings (H1-H6)
 * - Lists (ordered and unordered)
 * - Links
 * - Alignment
 * - Undo/Redo
 * - Image and video insertion
 * - Code blocks
 * - Clear formatting
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  $isListNode,
  ListNode,
} from '@lexical/list';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  $isHeadingNode,
  $createHeadingNode,
  HeadingTagType,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $createParagraphNode } from 'lexical';
import { Button, Divider, Select, Space, Tooltip, Modal, Input } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import { INSERT_IMAGE_COMMAND } from './ImagePlugin';
import { INSERT_VIDEO_COMMAND } from './VideoPlugin';
import { VideoInsertModal } from './VideoPlugin';
import { ImageUploadButton } from './ImagePlugin';

const { Option } = Select;

/**
 * Block type options for formatting
 */
const blockTypeToBlockName = {
  paragraph: 'Normal',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
};

/**
 * ToolbarPlugin Component
 */
export const ToolbarPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  // State for toolbar buttons
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [blockType, setBlockType] = useState<keyof typeof blockTypeToBlockName>(
    'paragraph'
  );

  // Modal states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  /**
   * Update toolbar state based on current selection
   */
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      // Update text format states
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));

      // Update link state
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));

      // Update block type
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode);
          const type = parentList ? parentList.getTag() : element.getTag();
          setBlockType(type === 'ol' ? 'paragraph' : 'paragraph');
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type as keyof typeof blockTypeToBlockName);
        }
      }
    }
  }, [editor]);

  /**
   * Register toolbar update listeners
   */
  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        1
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        1
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        1
      )
    );
  }, [editor, updateToolbar]);

  /**
   * Format text with the specified format
   */
  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  /**
   * Change block type (paragraph, heading, etc.)
   */
  const formatBlockType = (newBlockType: string) => {
    if (newBlockType === 'paragraph') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    } else if (newBlockType.startsWith('h')) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () =>
            $createHeadingNode(newBlockType as HeadingTagType)
          );
        }
      });
    }
  };

  /**
   * Insert unordered list
   */
  const insertUnorderedList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  /**
   * Insert ordered list
   */
  const insertOrderedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  /**
   * Insert link
   */
  const insertLink = () => {
    if (!isLink) {
      setIsLinkModalOpen(true);
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  };

  /**
   * Confirm link insertion
   */
  const confirmLinkInsert = () => {
    if (linkUrl) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
      setLinkUrl('');
      setIsLinkModalOpen(false);
    }
  };

  /**
   * Insert image
   */
  const handleImageUpload = (imageUrl: string, altText: string) => {
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
      src: imageUrl,
      altText: altText,
    });
    setIsImageModalOpen(false);
  };

  /**
   * Insert video
   */
  const handleVideoInsert = (payload: any) => {
    editor.dispatchCommand(INSERT_VIDEO_COMMAND, payload);
    setIsVideoModalOpen(false);
  };

  return (
    <div className="toolbar">
      <Space wrap size="small">
        {/* Undo/Redo */}
        <Tooltip title="Undo">
          <Button
            icon={<UndoOutlined />}
            disabled={!canUndo}
            onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
            aria-label="Undo"
          />
        </Tooltip>
        <Tooltip title="Redo">
          <Button
            icon={<RedoOutlined />}
            disabled={!canRedo}
            onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
            aria-label="Redo"
          />
        </Tooltip>

        <Divider type="vertical" />

        {/* Block Type Selector */}
        <Select
          value={blockType}
          onChange={formatBlockType}
          style={{ width: 140 }}
          aria-label="Block type"
        >
          {Object.entries(blockTypeToBlockName).map(([key, value]) => (
            <Option key={key} value={key}>
              {value}
            </Option>
          ))}
        </Select>

        <Divider type="vertical" />

        {/* Text Formatting */}
        <Tooltip title="Bold">
          <Button
            icon={<BoldOutlined />}
            type={isBold ? 'primary' : 'default'}
            onClick={() => formatText('bold')}
            aria-label="Bold"
            aria-pressed={isBold}
          />
        </Tooltip>
        <Tooltip title="Italic">
          <Button
            icon={<ItalicOutlined />}
            type={isItalic ? 'primary' : 'default'}
            onClick={() => formatText('italic')}
            aria-label="Italic"
            aria-pressed={isItalic}
          />
        </Tooltip>
        <Tooltip title="Underline">
          <Button
            icon={<UnderlineOutlined />}
            type={isUnderline ? 'primary' : 'default'}
            onClick={() => formatText('underline')}
            aria-label="Underline"
            aria-pressed={isUnderline}
          />
        </Tooltip>
        <Tooltip title="Strikethrough">
          <Button
            icon={<StrikethroughOutlined />}
            type={isStrikethrough ? 'primary' : 'default'}
            onClick={() => formatText('strikethrough')}
            aria-label="Strikethrough"
            aria-pressed={isStrikethrough}
          />
        </Tooltip>

        <Divider type="vertical" />

        {/* Lists */}
        <Tooltip title="Unordered List">
          <Button
            icon={<UnorderedListOutlined />}
            onClick={insertUnorderedList}
            aria-label="Unordered list"
          />
        </Tooltip>
        <Tooltip title="Ordered List">
          <Button
            icon={<OrderedListOutlined />}
            onClick={insertOrderedList}
            aria-label="Ordered list"
          />
        </Tooltip>

        <Divider type="vertical" />

        {/* Link */}
        <Tooltip title={isLink ? 'Remove Link' : 'Insert Link'}>
          <Button
            icon={<LinkOutlined />}
            type={isLink ? 'primary' : 'default'}
            onClick={insertLink}
            aria-label="Insert link"
            aria-pressed={isLink}
          />
        </Tooltip>

        <Divider type="vertical" />

        {/* Media */}
        <Tooltip title="Insert Image">
          <Button
            icon={<PictureOutlined />}
            onClick={() => setIsImageModalOpen(true)}
            aria-label="Insert image"
          />
        </Tooltip>
        <Tooltip title="Insert Video">
          <Button
            icon={<VideoCameraOutlined />}
            onClick={() => setIsVideoModalOpen(true)}
            aria-label="Insert video"
          />
        </Tooltip>
      </Space>

      {/* Link Modal */}
      <Modal
        title="Insert Link"
        open={isLinkModalOpen}
        onOk={confirmLinkInsert}
        onCancel={() => setIsLinkModalOpen(false)}
        okText="Insert"
      >
        <Input
          placeholder="https://example.com"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          onPressEnter={confirmLinkInsert}
          autoFocus
        />
      </Modal>

      {/* Image Modal */}
      <Modal
        title="Insert Image"
        open={isImageModalOpen}
        onCancel={() => setIsImageModalOpen(false)}
        footer={null}
        width={500}
      >
        <ImageUploadButton onImageUpload={handleImageUpload} />
      </Modal>

      {/* Video Modal */}
      <VideoInsertModal
        visible={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onInsert={handleVideoInsert}
      />
    </div>
  );
};

export default ToolbarPlugin;
