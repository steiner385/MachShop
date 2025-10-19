/**
 * Video Plugin for Lexical Rich Text Editor
 *
 * Provides video embed capabilities:
 * - YouTube video embeds
 * - Vimeo video embeds
 * - Direct video file uploads (MP4, WebM)
 * - Video preview with thumbnail
 * - Responsive video player
 * - Accessibility support with captions
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
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { Input, Button, Space, message, Modal, Tabs } from 'antd';
import { YoutubeOutlined, VideoCameraOutlined, LinkOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

/**
 * Command to insert a video
 */
export const INSERT_VIDEO_COMMAND: LexicalCommand<VideoPayload> = createCommand(
  'INSERT_VIDEO_COMMAND'
);

/**
 * Video payload interface
 */
export interface VideoPayload {
  src: string;
  type: 'youtube' | 'vimeo' | 'file';
  width?: number;
  height?: number;
  caption?: string;
  thumbnail?: string;
}

/**
 * Serialized video node
 */
export type SerializedVideoNode = Spread<
  {
    src: string;
    type: 'youtube' | 'vimeo' | 'file';
    width?: number;
    height?: number;
    caption?: string;
    thumbnail?: string;
    version: 1;
  },
  SerializedLexicalNode
>;

/**
 * VideoNode - Custom Lexical node for videos
 */
export class VideoNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __type: 'youtube' | 'vimeo' | 'file';
  __width?: number;
  __height?: number;
  __caption?: string;
  __thumbnail?: string;

  static getType(): string {
    return 'video';
  }

  static clone(node: VideoNode): VideoNode {
    return new VideoNode(
      node.__src,
      node.__type,
      node.__width,
      node.__height,
      node.__caption,
      node.__thumbnail,
      node.__key
    );
  }

  constructor(
    src: string,
    type: 'youtube' | 'vimeo' | 'file',
    width?: number,
    height?: number,
    caption?: string,
    thumbnail?: string,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__type = type;
    this.__width = width || 640;
    this.__height = height || 360;
    this.__caption = caption;
    this.__thumbnail = thumbnail;
  }

  exportJSON(): SerializedVideoNode {
    return {
      src: this.__src,
      type: this.__type,
      width: this.__width,
      height: this.__height,
      caption: this.__caption,
      thumbnail: this.__thumbnail,
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedVideoNode): VideoNode {
    const { src, type, width, height, caption, thumbnail } = serializedNode;
    return $createVideoNode({
      src,
      type,
      width,
      height,
      caption,
      thumbnail,
    });
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.className = 'video-embed';

    if (this.__type === 'youtube' || this.__type === 'vimeo') {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', this.__src);
      iframe.setAttribute('width', (this.__width || 640).toString());
      iframe.setAttribute('height', (this.__height || 360).toString());
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      element.appendChild(iframe);
    } else {
      const video = document.createElement('video');
      video.setAttribute('src', this.__src);
      video.setAttribute('controls', 'true');
      video.setAttribute('width', (this.__width || 640).toString());
      video.setAttribute('height', (this.__height || 360).toString());
      element.appendChild(video);
    }

    return { element };
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'video-node';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <VideoComponent
        src={this.__src}
        type={this.__type}
        width={this.__width}
        height={this.__height}
        caption={this.__caption}
        thumbnail={this.__thumbnail}
        nodeKey={this.__key}
      />
    );
  }
}

/**
 * Helper function to create VideoNode
 */
export function $createVideoNode(payload: VideoPayload): VideoNode {
  return new VideoNode(
    payload.src,
    payload.type,
    payload.width,
    payload.height,
    payload.caption,
    payload.thumbnail
  );
}

/**
 * Type guard for VideoNode
 */
export function $isVideoNode(node: LexicalNode | null | undefined): node is VideoNode {
  return node instanceof VideoNode;
}

/**
 * VideoComponent - React component that renders the video
 */
interface VideoComponentProps {
  src: string;
  type: 'youtube' | 'vimeo' | 'file';
  width?: number;
  height?: number;
  caption?: string;
  thumbnail?: string;
  nodeKey: NodeKey;
}

const VideoComponent: React.FC<VideoComponentProps> = ({
  src,
  type,
  width = 640,
  height = 360,
  caption,
}) => {
  const renderVideo = () => {
    if (type === 'youtube') {
      return (
        <iframe
          width={width}
          height={height}
          src={src}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
          className="editor-video-iframe"
        />
      );
    } else if (type === 'vimeo') {
      return (
        <iframe
          width={width}
          height={height}
          src={src}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Vimeo video"
          className="editor-video-iframe"
        />
      );
    } else {
      return (
        <video
          width={width}
          height={height}
          controls
          className="editor-video-player"
        >
          <source src={src} type="video/mp4" />
          <source src={src} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      );
    }
  };

  return (
    <div className="editor-video-container">
      <div className="editor-video-wrapper">{renderVideo()}</div>
      {caption && <div className="editor-video-caption">{caption}</div>}
    </div>
  );
};

/**
 * VideoPlugin - Plugin to handle video insertion
 */
export const VideoPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([VideoNode])) {
      throw new Error('VideoPlugin: VideoNode not registered on editor');
    }

    return editor.registerCommand<VideoPayload>(
      INSERT_VIDEO_COMMAND,
      (payload) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const videoNode = $createVideoNode(payload);
          selection.insertNodes([videoNode]);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
};

/**
 * VideoInsertModal - UI component for inserting videos
 */
interface VideoInsertModalProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (payload: VideoPayload) => void;
}

export const VideoInsertModal: React.FC<VideoInsertModalProps> = ({
  visible,
  onClose,
  onInsert,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [videoCaption, setVideoCaption] = useState('');

  /**
   * Extract YouTube video ID from URL
   */
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  /**
   * Extract Vimeo video ID from URL
   */
  const extractVimeoId = (url: string): string | null => {
    const pattern = /vimeo\.com\/(?:video\/)?(\d+)/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  };

  /**
   * Handle YouTube video insertion
   */
  const handleYouTubeInsert = () => {
    const videoId = extractYouTubeId(youtubeUrl);

    if (!videoId) {
      message.error('Invalid YouTube URL');
      return;
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    onInsert({
      src: embedUrl,
      type: 'youtube',
      caption: videoCaption || undefined,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    });

    message.success('YouTube video inserted');
    resetAndClose();
  };

  /**
   * Handle Vimeo video insertion
   */
  const handleVimeoInsert = () => {
    const videoId = extractVimeoId(vimeoUrl);

    if (!videoId) {
      message.error('Invalid Vimeo URL');
      return;
    }

    const embedUrl = `https://player.vimeo.com/video/${videoId}`;

    onInsert({
      src: embedUrl,
      type: 'vimeo',
      caption: videoCaption || undefined,
    });

    message.success('Vimeo video inserted');
    resetAndClose();
  };

  /**
   * Reset form and close modal
   */
  const resetAndClose = () => {
    setYoutubeUrl('');
    setVimeoUrl('');
    setVideoCaption('');
    onClose();
  };

  return (
    <Modal
      title="Insert Video"
      open={visible}
      onCancel={resetAndClose}
      footer={null}
      width={600}
    >
      <Tabs defaultActiveKey="youtube">
        <TabPane
          tab={
            <span>
              <YoutubeOutlined /> YouTube
            </span>
          }
          key="youtube"
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Input
              placeholder="Paste YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              prefix={<LinkOutlined />}
              size="large"
            />
            <Input
              placeholder="Caption (optional)"
              value={videoCaption}
              onChange={(e) => setVideoCaption(e.target.value)}
            />
            <Button
              type="primary"
              onClick={handleYouTubeInsert}
              disabled={!youtubeUrl}
              block
              size="large"
            >
              Insert YouTube Video
            </Button>
          </Space>
        </TabPane>

        <TabPane
          tab={
            <span>
              <VideoCameraOutlined /> Vimeo
            </span>
          }
          key="vimeo"
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Input
              placeholder="Paste Vimeo URL (e.g., https://vimeo.com/...)"
              value={vimeoUrl}
              onChange={(e) => setVimeoUrl(e.target.value)}
              prefix={<LinkOutlined />}
              size="large"
            />
            <Input
              placeholder="Caption (optional)"
              value={videoCaption}
              onChange={(e) => setVideoCaption(e.target.value)}
            />
            <Button
              type="primary"
              onClick={handleVimeoInsert}
              disabled={!vimeoUrl}
              block
              size="large"
            >
              Insert Vimeo Video
            </Button>
          </Space>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default VideoPlugin;
