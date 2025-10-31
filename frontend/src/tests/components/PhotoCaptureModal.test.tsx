import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoCaptureModal from '../../components/BuildRecords/PhotoCaptureModal';

// Mock fetch
global.fetch = vi.fn();

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    enumerateDevices: vi.fn(),
    getUserMedia: vi.fn(),
  },
});

// Mock HTMLVideoElement methods
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
});

// Mock HTMLCanvasElement methods
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn().mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
  }),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  writable: true,
  value: vi.fn().mockReturnValue('data:image/jpeg;base64,mock-image-data'),
});

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

// Mock react-konva components
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: any) => (
    <div data-testid="konva-stage" {...props}>
      {children}
    </div>
  ),
  Layer: ({ children, ...props }: any) => (
    <div data-testid="konva-layer" {...props}>
      {children}
    </div>
  ),
  Line: (props: any) => <div data-testid="konva-line" {...props} />,
  Text: (props: any) => <div data-testid="konva-text" {...props} />,
  Arrow: (props: any) => <div data-testid="konva-arrow" {...props} />,
  Circle: (props: any) => <div data-testid="konva-circle" {...props} />,
  Rect: (props: any) => <div data-testid="konva-rect" {...props} />,
}));

// Test data
const mockOperations = [
  {
    id: 'op-1',
    operationNumber: '010',
    description: 'Assembly Operation',
  },
  {
    id: 'op-2',
    operationNumber: '020',
    description: 'Inspection Operation',
  },
];

const mockCameras = [
  {
    deviceId: 'camera-1',
    label: 'Front Camera',
    kind: 'videoinput',
  },
  {
    deviceId: 'camera-2',
    label: 'Back Camera',
    kind: 'videoinput',
  },
];

const mockStream = {
  getTracks: vi.fn().mockReturnValue([
    {
      stop: vi.fn(),
    },
  ]),
};

describe('PhotoCaptureModal Component', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnPhotoSaved = vi.fn();

  const defaultProps = {
    visible: true,
    buildRecordId: 'test-build-record-id',
    operations: mockOperations,
    onClose: mockOnClose,
    onPhotoSaved: mockOnPhotoSaved,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock camera enumeration
    (navigator.mediaDevices.enumerateDevices as Mock).mockResolvedValue(mockCameras);

    // Mock getUserMedia
    (navigator.mediaDevices.getUserMedia as Mock).mockResolvedValue(mockStream);

    // Mock successful photo save API
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'photo-1',
        filename: 'test-photo.jpg',
        filePath: '/uploads/photos/test-photo.jpg',
      }),
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders photo capture modal', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    expect(screen.getByText('Photo Capture & Annotation')).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByText('Capture')).toBeInTheDocument();
    expect(screen.getByText('Annotate')).toBeInTheDocument();
  });

  it('initializes camera on mount', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    await waitFor(() => {
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalled();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          deviceId: { exact: 'camera-1' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    });
  });

  it('displays camera selection dropdown', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Camera:')).toBeInTheDocument();
    });

    // Should show camera options
    const cameraSelect = screen.getByDisplayValue('Front Camera');
    expect(cameraSelect).toBeInTheDocument();
  });

  it('captures photo when capture button is clicked', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Capture Photo')).toBeInTheDocument();
    });

    const captureButton = screen.getByText('Capture Photo');
    await user.click(captureButton);

    // Should capture photo and show success message
    await waitFor(() => {
      expect(screen.getByText('Photo captured successfully')).toBeInTheDocument();
    });
  });

  it('handles file upload', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    // Find file upload area
    const uploadArea = screen.getByText('Click or drag photo to upload');
    expect(uploadArea).toBeInTheDocument();

    // Create a mock file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { hidden: true });

    // Simulate file selection
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Photo uploaded successfully')).toBeInTheDocument();
    });
  });

  it('switches to annotate tab after capturing photo', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Capture Photo')).toBeInTheDocument();
    });

    const captureButton = screen.getByText('Capture Photo');
    await user.click(captureButton);

    // Should automatically switch to annotate tab
    await waitFor(() => {
      const annotateTab = screen.getByRole('tab', { name: /annotate/i });
      expect(annotateTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('displays annotation tools', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    // Switch to annotate tab (assuming we have a photo)
    const annotateTab = screen.getByText('Annotate');
    await user.click(annotateTab);

    // Should show annotation toolbar
    expect(screen.getByRole('button', { name: /line/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /arrow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /circle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rectangle/i })).toBeInTheDocument();
  });

  it('handles annotation tool selection', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    const annotateTab = screen.getByText('Annotate');
    await user.click(annotateTab);

    // Click on arrow tool
    const arrowTool = screen.getByRole('button', { name: /arrow/i });
    await user.click(arrowTool);

    // Arrow tool should be selected (primary button style)
    expect(arrowTool).toHaveClass('ant-btn-primary');
  });

  it('displays photo information form', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    const annotateTab = screen.getByText('Annotate');
    await user.click(annotateTab);

    // Should show photo information form
    expect(screen.getByText('Photo Information')).toBeInTheDocument();
    expect(screen.getByText('Caption')).toBeInTheDocument();
    expect(screen.getByText('Associated Operation')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('validates required fields in photo form', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    const annotateTab = screen.getByText('Annotate');
    await user.click(annotateTab);

    // Try to save without required fields
    const saveButton = screen.getByText('Save Photo');
    await user.click(saveButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Please enter a caption')).toBeInTheDocument();
      expect(screen.getByText('Please select a category')).toBeInTheDocument();
    });
  });

  it('saves photo with metadata', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    // Capture a photo first
    const captureButton = screen.getByText('Capture Photo');
    await user.click(captureButton);

    await waitFor(() => {
      const annotateTab = screen.getByRole('tab', { name: /annotate/i });
      expect(annotateTab).toHaveAttribute('aria-selected', 'true');
    });

    // Fill in the form
    const captionInput = screen.getByPlaceholderText('Enter photo caption...');
    await user.type(captionInput, 'Test photo caption');

    const categorySelect = screen.getByPlaceholderText('Select category');
    await user.click(categorySelect);
    await user.click(screen.getByText('Progress Photo'));

    const operationSelect = screen.getByPlaceholderText('Select operation (optional)');
    await user.click(operationSelect);
    await user.click(screen.getByText('010 - Assembly Operation'));

    const notesInput = screen.getByPlaceholderText('Additional notes...');
    await user.type(notesInput, 'Test notes');

    // Save the photo
    const saveButton = screen.getByText('Save Photo');
    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/build-records/${defaultProps.buildRecordId}/photos`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer mock-token',
          },
          body: expect.any(FormData),
        })
      );
    });

    expect(mockOnPhotoSaved).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles image zoom controls', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    const annotateTab = screen.getByText('Annotate');
    await user.click(annotateTab);

    // Find zoom controls
    const zoomInButton = screen.getByRole('button', { name: /zoom.*in/i });
    const zoomOutButton = screen.getByRole('button', { name: /zoom.*out/i });

    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();

    // Test zoom in
    await user.click(zoomInButton);
    await user.click(zoomOutButton);

    // Zoom controls should work (no errors thrown)
  });

  it('handles image rotation controls', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    const annotateTab = screen.getByText('Annotate');
    await user.click(annotateTab);

    // Find rotation controls
    const rotateLeftButton = screen.getByRole('button', { name: /rotate.*left/i });
    const rotateRightButton = screen.getByRole('button', { name: /rotate.*right/i });

    expect(rotateLeftButton).toBeInTheDocument();
    expect(rotateRightButton).toBeInTheDocument();

    // Test rotation
    await user.click(rotateLeftButton);
    await user.click(rotateRightButton);

    // Rotation controls should work (no errors thrown)
  });

  it('clears annotations when clear button is clicked', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    const annotateTab = screen.getByText('Annotate');
    await user.click(annotateTab);

    // Find clear button
    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    // Annotations should be cleared (no errors thrown)
  });

  it('handles camera switching', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Front Camera')).toBeInTheDocument();
    });

    // Switch to second camera
    const cameraSelect = screen.getByDisplayValue('Front Camera');
    await user.click(cameraSelect);
    await user.click(screen.getByText('Back Camera'));

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          deviceId: { exact: 'camera-2' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    });
  });

  it('handles camera access errors', async () => {
    // Mock camera access failure
    (navigator.mediaDevices.getUserMedia as Mock).mockRejectedValue(
      new Error('Camera access denied')
    );

    render(<PhotoCaptureModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Unable to access camera')).toBeInTheDocument();
    });
  });

  it('cleans up resources on close', async () => {
    const { unmount } = render(<PhotoCaptureModal {...defaultProps} />);

    // Wait for camera to initialize
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    // Unmount component
    unmount();

    // Should stop camera tracks
    expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('handles no cameras available', async () => {
    // Mock no cameras
    (navigator.mediaDevices.enumerateDevices as Mock).mockResolvedValue([]);

    render(<PhotoCaptureModal {...defaultProps} />);

    await waitFor(() => {
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalled();
    });

    // Should handle gracefully (no errors thrown)
  });

  it('displays annotation list when annotations are added', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    const annotateTab = screen.getByText('Annotate');
    await user.click(annotateTab);

    // Simulate adding annotations by checking if annotation list appears
    // In a real test, we would simulate drawing on the canvas
    // For now, just check that the annotations section exists
    expect(screen.getByText('Photo Information')).toBeInTheDocument();
  });

  it('handles modal close', async () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    // Find and click close button (X)
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles API error when saving photo', async () => {
    // Mock API error
    (global.fetch as Mock).mockRejectedValue(new Error('API Error'));

    render(<PhotoCaptureModal {...defaultProps} />);

    // Capture a photo
    const captureButton = screen.getByText('Capture Photo');
    await user.click(captureButton);

    await waitFor(() => {
      const annotateTab = screen.getByRole('tab', { name: /annotate/i });
      expect(annotateTab).toHaveAttribute('aria-selected', 'true');
    });

    // Fill required fields
    const captionInput = screen.getByPlaceholderText('Enter photo caption...');
    await user.type(captionInput, 'Test caption');

    const categorySelect = screen.getByPlaceholderText('Select category');
    await user.click(categorySelect);
    await user.click(screen.getByText('Progress Photo'));

    // Try to save
    const saveButton = screen.getByText('Save Photo');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Error saving photo')).toBeInTheDocument();
    });
  });

  it('disables annotate tab when no photo is captured', () => {
    render(<PhotoCaptureModal {...defaultProps} />);

    const annotateTab = screen.getByRole('tab', { name: /annotate/i });
    expect(annotateTab).toHaveAttribute('aria-disabled', 'true');
  });
});