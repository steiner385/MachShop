/**
 * Custom Hook: useBarcodeScan
 * Provides barcode/QR code scanning capabilities
 * Supports both camera input and manual entry
 * Phase 6: Mobile Scanning Interface
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface BarcodeScanResult {
  value: string;
  format: string;
  timestamp: Date;
  source: 'camera' | 'manual';
}

interface BarcodeScanError {
  type: 'CAMERA_NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'NO_CAMERA' | 'DECODE_ERROR' | 'UNKNOWN';
  message: string;
}

interface UseBarcodeScanOptions {
  onScan?: (result: BarcodeScanResult) => void;
  onError?: (error: BarcodeScanError) => void;
  continuousMode?: boolean; // Keep scanning after detecting a barcode
}

/**
 * Custom hook for barcode and QR code scanning
 * Provides camera and manual scanning capabilities
 */
export const useBarcodeScan = (options: UseBarcodeScanOptions = {}) => {
  const {
    onScan,
    onError,
    continuousMode = true,
  } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);
  const [scannerError, setScannerError] = useState<BarcodeScanError | null>(null);
  const [lastScan, setLastScan] = useState<BarcodeScanResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  // Check camera availability
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some((device) => device.kind === 'videoinput');
        setIsCameraAvailable(hasCamera);
      } catch (error) {
        console.warn('Camera detection failed:', error);
        setIsCameraAvailable(false);
      }
    };

    checkCameraSupport();
  }, []);

  /**
   * Start camera scanning
   */
  const startCameraScanning = useCallback(async () => {
    if (!isCameraAvailable || !videoRef.current) {
      const error: BarcodeScanError = {
        type: 'NO_CAMERA',
        message: 'Camera not available on this device',
      };
      setScannerError(error);
      onError?.(error);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setIsScanning(true);
      setScannerError(null);
      scanningRef.current = true;

      // Start processing frames
      processVideoFrames();

      return true;
    } catch (error) {
      let scanError: BarcodeScanError;

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          scanError = {
            type: 'PERMISSION_DENIED',
            message: 'Camera permission denied',
          };
        } else if (error.name === 'NotFoundError') {
          scanError = {
            type: 'NO_CAMERA',
            message: 'No camera device found',
          };
        } else {
          scanError = {
            type: 'UNKNOWN',
            message: error.message,
          };
        }
      } else {
        scanError = {
          type: 'CAMERA_NOT_SUPPORTED',
          message: 'Camera scanning not supported on this device',
        };
      }

      setScannerError(scanError);
      onError?.(scanError);
      return false;
    }
  }, [isCameraAvailable, onError]);

  /**
   * Stop camera scanning
   */
  const stopCameraScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    scanningRef.current = false;
  }, []);

  /**
   * Process video frames for barcode detection
   * Note: In production, integrate with a barcode detection library like:
   * - zxing-js/library for QR codes
   * - @react-qr-code/reader
   * - html5-qrcode
   */
  const processVideoFrames = useCallback(() => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Draw current frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // In a real implementation, you would:
    // 1. Get image data from canvas
    // 2. Pass to a barcode detection library
    // 3. Call handleScanResult if barcode detected

    // Simulate barcode detection (in production, use actual library)
    // const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    // const barcodes = detectBarcodes(imageData);

    // Continue scanning
    requestAnimationFrame(processVideoFrames);
  }, []);

  /**
   * Handle manual barcode entry
   */
  const handleManualInput = useCallback(
    (value: string) => {
      if (!value.trim()) return;

      const result: BarcodeScanResult = {
        value: value.trim(),
        format: 'MANUAL',
        timestamp: new Date(),
        source: 'manual',
      };

      setLastScan(result);
      onScan?.(result);
    },
    [onScan]
  );

  /**
   * Handle scan result (called from camera or manual entry)
   */
  const handleScanResult = useCallback(
    (value: string, format: string = 'UNKNOWN') => {
      const result: BarcodeScanResult = {
        value,
        format,
        timestamp: new Date(),
        source: 'camera',
      };

      setLastScan(result);
      setScannerError(null);
      onScan?.(result);

      // Stop scanning unless in continuous mode
      if (!continuousMode) {
        stopCameraScanning();
      }
    },
    [continuousMode, onScan, stopCameraScanning]
  );

  /**
   * Get camera element ref
   */
  const getCameraElement = useCallback(() => videoRef.current, []);

  /**
   * Get canvas element ref (for frame capture)
   */
  const getCanvasElement = useCallback(() => canvasRef.current, []);

  return {
    // State
    isScanning,
    isCameraAvailable,
    scannerError,
    lastScan,

    // Methods
    startCameraScanning,
    stopCameraScanning,
    handleManualInput,
    handleScanResult,

    // Refs
    videoRef,
    canvasRef,
    getCameraElement,
    getCanvasElement,
  };
};

export default useBarcodeScan;
