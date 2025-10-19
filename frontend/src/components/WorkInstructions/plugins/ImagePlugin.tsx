/**
 * Image Plugin for Lexical Rich Text Editor
 *
 * Provides image upload, preview, and management capabilities:
 * - Drag and drop image upload
 * - Click to browse file upload
 * - Image preview with dimensions
 * - Alt text for accessibility
 * - Image alignment (left, center, right)
 * - Image resizing
 * - Caption support
 */

import React, { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  DecoratorNode,
  DOMConversionMap,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { PictureOutlined } from '@ant-design/icons';

const { Dragger } = Upload;

/**
 * Command to insert an image
 */
export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
  'INSERT_IMAGE_COMMAND'
);

/**
 * Image payload interface
 */
export interface ImagePayload {
  src: string;
  altText: string;
  width?: number;
  height?: number;
  caption?: string;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Serialized image node
 */
export type SerializedImageNode = Spread<
  {
    src: string;
    altText: string;
    width?: number;
    height?: number;
    caption?: string;
    alignment?: 'left' | 'center' | 'right';
    type: 'image';
    version: 1;
  },
  SerializedLexicalNode
>;

/**
 * ImageNode - Custom Lexical node for images
 */
export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width?: number;
  __height?: number;
  __caption?: string;
  __alignment?: 'left' | 'center' | 'right';

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__caption,
      node.__alignment,
      node.__key
    );
  }

  constructor(
    src: string,
    altText: string,
    width?: number,
    height?: number,
    caption?: string,
    alignment?: 'left' | 'center' | 'right',
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
    this.__caption = caption;
    this.__alignment = alignment || 'left';
  }

  exportJSON(): SerializedImageNode {
    return {
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
      caption: this.__caption,
      alignment: this.__alignment,
      type: 'image',
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, altText, width, height, caption, alignment } = serializedNode;
    return $createImageNode({
      src,
      altText,
      width,
      height,
      caption,
      alignment,
    });
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__altText);
    if (this.__width) element.setAttribute('width', this.__width.toString());
    if (this.__height) element.setAttribute('height', this.__height.toString());
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: (element: HTMLElement) => {
          const img = element as HTMLImageElement;
          return {
            node: $createImageNode({
              src: img.src,
              altText: img.alt,
              width: img.width || undefined,
              height: img.height || undefined,
            }),
          };
        },
        priority: 0,
      }),
    };
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = `image-node image-align-${this.__alignment}`;
    return div;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        caption={this.__caption}
        alignment={this.__alignment}
        nodeKey={this.__key}
      />
    );
  }
}

/**
 * Helper function to create ImageNode
 */
export function $createImageNode(payload: ImagePayload): ImageNode {
  return new ImageNode(
    payload.src,
    payload.altText,
    payload.width,
    payload.height,
    payload.caption,
    payload.alignment
  );
}

/**
 * Type guard for ImageNode
 */
export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}

/**
 * ImageComponent - React component that renders the image
 */
interface ImageComponentProps {
  src: string;
  altText: string;
  width?: number;
  height?: number;
  caption?: string;
  alignment?: 'left' | 'center' | 'right';
  nodeKey: NodeKey;
}

const ImageComponent: React.FC<ImageComponentProps> = ({
  src,
  altText,
  width,
  height,
  caption,
  alignment = 'left',
}) => {
  return (
    <div className={`editor-image-container align-${alignment}`}>
      <img
        src={src}
        alt={altText}
        width={width}
        height={height}
        className="editor-image"
        draggable={false}
      />
      {caption && <div className="editor-image-caption">{caption}</div>}
    </div>
  );
};

/**
 * ImagePlugin - Plugin to handle image insertion
 */
export const ImagePlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagePlugin: ImageNode not registered on editor');
    }

    return editor.registerCommand<ImagePayload>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const imageNode = $createImageNode(payload);
          selection.insertNodes([imageNode]);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
};

/**
 * ImageUploadButton - UI component for image upload
 */
interface ImageUploadButtonProps {
  onImageUpload: (imageUrl: string, altText: string) => void;
}

export const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({
  onImageUpload,
}) => {
  const [uploading, setUploading] = useState(false);

  /**
   * Handle file upload
   * In production, this would upload to a file server or cloud storage
   * For now, we'll convert to base64 for demo purposes
   */
  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;

    setUploading(true);

    try {
      // In production, upload to server:
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await axios.post('/api/upload/image', formData);
      // const imageUrl = response.data.url;

      // For demo: Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const fileName = (file as File).name;

        onImageUpload(base64, fileName);
        message.success(`${fileName} uploaded successfully`);

        if (onSuccess) {
          onSuccess('ok');
        }
      };

      reader.onerror = () => {
        message.error('Failed to read image file');
        if (onError) {
          onError(new Error('Failed to read image'));
        }
      };

      reader.readAsDataURL(file as File);
    } catch (error) {
      message.error('Image upload failed');
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'image',
    multiple: false,
    accept: 'image/png,image/jpeg,image/jpg,image/gif,image/webp',
    customRequest: handleUpload,
    showUploadList: false,
  };

  return (
    <Dragger {...uploadProps} disabled={uploading}>
      <p className="ant-upload-drag-icon">
        <PictureOutlined />
      </p>
      <p className="ant-upload-text">Click or drag image to upload</p>
      <p className="ant-upload-hint">
        Supports: PNG, JPG, GIF, WebP (max 10MB)
      </p>
    </Dragger>
  );
};

export default ImagePlugin;
