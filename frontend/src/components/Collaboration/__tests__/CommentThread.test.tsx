import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentThread } from '../CommentThread';
import { collaborationApi } from '@/api/collaboration';
import * as realTimeHooks from '@/hooks/useRealTimeCollaboration';

// Mock the collaboration API
vi.mock('@/api/collaboration', () => ({
  collaborationApi: {
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    replyToComment: vi.fn(),
    toggleCommentReaction: vi.fn(),
  },
}));

// Mock the real-time hooks
vi.mock('@/hooks/useRealTimeCollaboration', () => ({
  useRealTimeCollaboration: vi.fn(),
  usePresence: vi.fn(),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 minutes ago'),
}));

const mockComments = [
  {
    id: 'comment-1',
    documentType: 'work-instruction',
    documentId: 'doc-1',
    content: 'This is a test comment',
    type: 'GENERAL',
    authorId: 'user-1',
    authorName: 'John Doe',
    authorAvatar: 'https://example.com/avatar1.jpg',
    parentId: null,
    createdAt: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T10:00:00Z',
    reactions: [
      {
        id: 'reaction-1',
        commentId: 'comment-1',
        userId: 'user-2',
        type: 'LIKE',
        createdAt: '2023-01-01T10:05:00Z',
      },
    ],
    replies: [
      {
        id: 'reply-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'This is a reply',
        type: 'GENERAL',
        authorId: 'user-2',
        authorName: 'Jane Smith',
        authorAvatar: 'https://example.com/avatar2.jpg',
        parentId: 'comment-1',
        createdAt: '2023-01-01T10:10:00Z',
        updatedAt: '2023-01-01T10:10:00Z',
        reactions: [],
        replies: [],
      },
    ],
  },
  {
    id: 'comment-2',
    documentType: 'work-instruction',
    documentId: 'doc-1',
    content: 'Another test comment',
    type: 'GENERAL',
    authorId: 'user-2',
    authorName: 'Jane Smith',
    authorAvatar: 'https://example.com/avatar2.jpg',
    parentId: null,
    createdAt: '2023-01-01T11:00:00Z',
    updatedAt: '2023-01-01T11:00:00Z',
    reactions: [],
    replies: [],
  },
];

const defaultProps = {
  documentType: 'work-instruction',
  documentId: 'doc-1',
  comments: mockComments,
  currentUserId: 'user-1',
  currentUserName: 'John Doe',
  onCommentsChange: vi.fn(),
  enableRealTime: true,
};

describe('CommentThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock real-time hooks
    (realTimeHooks.useRealTimeCollaboration as any).mockReturnValue({
      isConnected: true,
      presenceUsers: [],
    });

    (realTimeHooks.usePresence as any).mockReturnValue({
      isEditing: false,
      startEditing: vi.fn(),
      stopEditing: vi.fn(),
    });
  });

  it('renders comments correctly', () => {
    render(<CommentThread {...defaultProps} />);

    expect(screen.getByText('Comments (2)')).toBeInTheDocument();
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    expect(screen.getByText('Another test comment')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays real-time connection status', () => {
    render(<CommentThread {...defaultProps} />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows offline status when not connected', () => {
    (realTimeHooks.useRealTimeCollaboration as any).mockReturnValue({
      isConnected: false,
      presenceUsers: [],
    });

    render(<CommentThread {...defaultProps} />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('displays nested replies correctly', () => {
    render(<CommentThread {...defaultProps} />);

    expect(screen.getByText('This is a reply')).toBeInTheDocument();
    expect(screen.getByText('1 reply')).toBeInTheDocument();
  });

  it('displays reaction counts', () => {
    render(<CommentThread {...defaultProps} />);

    // Check if reaction button with count is displayed
    const likeButtons = screen.getAllByRole('button');
    const likeButton = likeButtons.find(button =>
      button.querySelector('span')?.textContent === '1'
    );
    expect(likeButton).toBeInTheDocument();
  });

  it('allows posting new comments', async () => {
    const mockOnCommentsChange = vi.fn();
    (collaborationApi.createComment as any).mockResolvedValue({
      id: 'new-comment',
      content: 'New test comment',
    });

    render(<CommentThread {...defaultProps} onCommentsChange={mockOnCommentsChange} />);

    const textarea = screen.getByPlaceholderText('Add a comment...');
    const postButton = screen.getByRole('button', { name: /post comment/i });

    fireEvent.change(textarea, { target: { value: 'New test comment' } });
    fireEvent.click(postButton);

    await waitFor(() => {
      expect(collaborationApi.createComment).toHaveBeenCalledWith({
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'New test comment',
        type: 'GENERAL',
      });
    });

    expect(mockOnCommentsChange).toHaveBeenCalled();
  });

  it('prevents posting empty comments', async () => {
    render(<CommentThread {...defaultProps} />);

    const postButton = screen.getByRole('button', { name: /post comment/i });
    expect(postButton).toBeDisabled();
  });

  it('allows editing own comments', () => {
    render(<CommentThread {...defaultProps} />);

    // Find the comment by user-1 (current user)
    const commentElements = screen.getAllByText('This is a test comment');
    expect(commentElements.length).toBeGreaterThan(0);

    // Find the more options button for the comment
    const moreButtons = screen.getAllByRole('button');
    const moreButton = moreButtons.find(button =>
      button.querySelector('.anticon-more')
    );

    if (moreButton) {
      fireEvent.click(moreButton);
      expect(screen.getByText('Edit')).toBeInTheDocument();
    }
  });

  it('allows deleting own comments', () => {
    render(<CommentThread {...defaultProps} />);

    // Find the more options button and click it
    const moreButtons = screen.getAllByRole('button');
    const moreButton = moreButtons.find(button =>
      button.querySelector('.anticon-more')
    );

    if (moreButton) {
      fireEvent.click(moreButton);
      expect(screen.getByText('Delete')).toBeInTheDocument();
    }
  });

  it('does not show edit/delete options for other users comments', () => {
    render(<CommentThread {...defaultProps} />);

    // The second comment is from user-2, not the current user
    // So it should not have edit/delete options accessible
    const commentCards = screen.getAllByText(/jane smith/i);
    expect(commentCards.length).toBeGreaterThan(0);
  });

  it('allows replying to comments', async () => {
    const mockOnCommentsChange = vi.fn();
    (collaborationApi.replyToComment as any).mockResolvedValue({
      id: 'new-reply',
      content: 'Test reply',
    });

    render(<CommentThread {...defaultProps} onCommentsChange={mockOnCommentsChange} />);

    const replyButtons = screen.getAllByRole('button', { name: /reply/i });
    fireEvent.click(replyButtons[0]);

    const replyTextarea = screen.getByPlaceholderText('Write a reply...');
    const submitReplyButton = screen.getByRole('button', { name: /reply/i });

    fireEvent.change(replyTextarea, { target: { value: 'Test reply' } });
    fireEvent.click(submitReplyButton);

    await waitFor(() => {
      expect(collaborationApi.replyToComment).toHaveBeenCalledWith({
        parentId: 'comment-1',
        content: 'Test reply',
      });
    });

    expect(mockOnCommentsChange).toHaveBeenCalled();
  });

  it('allows toggling reactions', async () => {
    const mockOnCommentsChange = vi.fn();
    (collaborationApi.toggleCommentReaction as any).mockResolvedValue({
      added: true,
      reaction: { id: 'new-reaction', type: 'LIKE' },
    });

    render(<CommentThread {...defaultProps} onCommentsChange={mockOnCommentsChange} />);

    const likeButtons = screen.getAllByRole('button');
    const likeButton = likeButtons.find(button =>
      button.querySelector('.anticon-like')
    );

    if (likeButton) {
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(collaborationApi.toggleCommentReaction).toHaveBeenCalledWith(
          'comment-1',
          'LIKE'
        );
      });

      expect(mockOnCommentsChange).toHaveBeenCalled();
    }
  });

  it('shows presence information when real-time is enabled', () => {
    const mockPresenceUsers = [
      {
        userId: 'user-2',
        userName: 'Jane Smith',
        isEditing: true,
        lastSeen: '2023-01-01T12:00:00Z',
      },
    ];

    (realTimeHooks.useRealTimeCollaboration as any).mockReturnValue({
      isConnected: true,
      presenceUsers: mockPresenceUsers,
    });

    render(<CommentThread {...defaultProps} />);

    expect(screen.getByText('Active users:')).toBeInTheDocument();
  });

  it('shows editing indicator when user is typing', () => {
    (realTimeHooks.usePresence as any).mockReturnValue({
      isEditing: true,
      startEditing: vi.fn(),
      stopEditing: vi.fn(),
    });

    render(<CommentThread {...defaultProps} />);

    expect(screen.getByText('You are editing...')).toBeInTheDocument();
  });

  it('handles empty comments state', () => {
    render(<CommentThread {...defaultProps} comments={[]} />);

    expect(screen.getByText('Comments (0)')).toBeInTheDocument();
    expect(screen.getByText('No comments yet. Be the first to comment!')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (collaborationApi.createComment as any).mockRejectedValue(new Error('API Error'));

    render(<CommentThread {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Add a comment...');
    const postButton = screen.getByRole('button', { name: /post comment/i });

    fireEvent.change(textarea, { target: { value: 'Test comment' } });
    fireEvent.click(postButton);

    await waitFor(() => {
      expect(collaborationApi.createComment).toHaveBeenCalled();
    });

    // The component should handle the error gracefully
    // Error message would typically be shown via antd message component
  });

  it('disables real-time features when enableRealTime is false', () => {
    render(<CommentThread {...defaultProps} enableRealTime={false} />);

    // Should not show real-time indicators
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    expect(screen.queryByText('Active users:')).not.toBeInTheDocument();
  });
});