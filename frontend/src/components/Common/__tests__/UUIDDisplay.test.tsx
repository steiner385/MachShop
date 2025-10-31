/**
 * UUIDDisplay Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { message } from 'antd';
import UUIDDisplay from '../UUIDDisplay';

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock message API
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('UUIDDisplay', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const invalidUUID = 'invalid-uuid';

  beforeEach(() => {
    mockWriteText.mockReset();
    (message.success as jest.Mock).mockReset();
    (message.error as jest.Mock).mockReset();
  });

  describe('Display Variants', () => {
    it('should render inline variant by default', () => {
      render(<UUIDDisplay uuid={validUUID} />);
      expect(screen.getByText(/123e4567...174000/)).toBeInTheDocument();
    });

    it('should render block variant with label', () => {
      render(<UUIDDisplay uuid={validUUID} variant="block" />);
      expect(screen.getByText('Persistent UUID:')).toBeInTheDocument();
      expect(screen.getByText(/123e4567...174000/)).toBeInTheDocument();
    });

    it('should render badge variant with icon', () => {
      render(<UUIDDisplay uuid={validUUID} variant="badge" />);
      expect(screen.getByRole('img', { name: /info-circle/ })).toBeInTheDocument();
    });

    it('should display full UUID when truncate is disabled', () => {
      render(
        <UUIDDisplay
          uuid={validUUID}
          options={{ truncate: false }}
        />
      );
      expect(screen.getByText(validUUID.toLowerCase())).toBeInTheDocument();
    });

    it('should display custom display name when provided', () => {
      render(
        <UUIDDisplay
          uuid={validUUID}
          displayName="Custom Part Name"
        />
      );
      expect(screen.getByText('Custom Part Name')).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('should copy UUID to clipboard when copy button is clicked', async () => {
      mockWriteText.mockResolvedValue(undefined);

      render(<UUIDDisplay uuid={validUUID} />);

      const copyButton = screen.getByRole('button', { name: /copy/ });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(validUUID.toLowerCase());
        expect(message.success).toHaveBeenCalledWith('UUID copied to clipboard (RAW format)');
      });
    });

    it('should show error message when clipboard write fails', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard error'));

      render(<UUIDDisplay uuid={validUUID} />);

      const copyButton = screen.getByRole('button', { name: /copy/ });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Failed to copy UUID to clipboard');
      });
    });

    it('should not show copy button when showCopy is false', () => {
      render(
        <UUIDDisplay
          uuid={validUUID}
          options={{ showCopy: false }}
        />
      );

      expect(screen.queryByRole('button', { name: /copy/ })).not.toBeInTheDocument();
    });

    it('should show format dropdown when showStandardFormats is true', () => {
      render(<UUIDDisplay uuid={validUUID} showStandardFormats />);

      expect(screen.getByRole('button', { name: /down/ })).toBeInTheDocument();
    });
  });

  describe('Tooltip Functionality', () => {
    it('should show tooltip with UUID details on hover', async () => {
      render(<UUIDDisplay uuid={validUUID} entityType="Part" />);

      const uuidText = screen.getByText(/123e4567...174000/);
      fireEvent.mouseEnter(uuidText);

      await waitFor(() => {
        expect(screen.getByText('Persistent UUID')).toBeInTheDocument();
        expect(screen.getByText(validUUID.toLowerCase())).toBeInTheDocument();
        expect(screen.getByText('Entity Type:')).toBeInTheDocument();
        expect(screen.getByText('Part')).toBeInTheDocument();
      });
    });

    it('should not show tooltip when showTooltip is false', () => {
      render(
        <UUIDDisplay
          uuid={validUUID}
          options={{ showTooltip: false }}
        />
      );

      const uuidText = screen.getByText(/123e4567...174000/);
      fireEvent.mouseEnter(uuidText);

      // Tooltip should not appear
      expect(screen.queryByText('Persistent UUID')).not.toBeInTheDocument();
    });

    it('should show standard formats in tooltip when enabled', async () => {
      render(
        <UUIDDisplay
          uuid={validUUID}
          showStandardFormats
        />
      );

      const uuidText = screen.getByText(/123e4567...174000/);
      fireEvent.mouseEnter(uuidText);

      await waitFor(() => {
        expect(screen.getByText('Standard Formats:')).toBeInTheDocument();
        expect(screen.getByText(/STEP: urn:uuid:/)).toBeInTheDocument();
        expect(screen.getByText(/QIF: urn:uuid:/)).toBeInTheDocument();
        expect(screen.getByText(/ITAR: ITAR-UUID:/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message for invalid UUID', () => {
      render(<UUIDDisplay uuid={invalidUUID} />);

      expect(screen.getByText(`Invalid UUID: ${invalidUUID}`)).toBeInTheDocument();
      expect(screen.getByText(`Invalid UUID: ${invalidUUID}`)).toHaveStyle({ color: '#ff4d4f' });
    });

    it('should handle empty UUID gracefully', () => {
      render(<UUIDDisplay uuid="" />);

      expect(screen.getByText('Invalid UUID:')).toBeInTheDocument();
    });
  });

  describe('Customization Options', () => {
    it('should apply custom truncate length', () => {
      render(
        <UUIDDisplay
          uuid={validUUID}
          options={{ truncateLength: 4 }}
        />
      );

      expect(screen.getByText('123e...4000')).toBeInTheDocument();
    });

    it('should show prefix when configured', () => {
      render(
        <UUIDDisplay
          uuid={validUUID}
          options={{ showPrefix: true, prefix: 'ID' }}
        />
      );

      expect(screen.getByText(/ID: 123e4567...174000/)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<UUIDDisplay uuid={validUUID} className="custom-uuid-class" />);

      expect(screen.getByText(/123e4567...174000/).closest('.custom-uuid-class')).toBeInTheDocument();
    });

    it('should render different sizes correctly', () => {
      const { rerender } = render(<UUIDDisplay uuid={validUUID} size="small" />);
      let uuidElement = screen.getByText(/123e4567...174000/);
      expect(uuidElement).toHaveStyle({ fontSize: '12px' });

      rerender(<UUIDDisplay uuid={validUUID} size="large" />);
      uuidElement = screen.getByText(/123e4567...174000/);
      expect(uuidElement).toHaveStyle({ fontSize: '16px' });
    });
  });

  describe('Standard Formats', () => {
    it('should copy STEP format when selected from dropdown', async () => {
      mockWriteText.mockResolvedValue(undefined);

      render(<UUIDDisplay uuid={validUUID} showStandardFormats />);

      // Click dropdown
      const dropdown = screen.getByRole('button', { name: /down/ });
      fireEvent.click(dropdown);

      // Wait for menu to appear and click STEP option
      await waitFor(() => {
        const stepOption = screen.getByText('STEP Format (urn:uuid:...)');
        fireEvent.click(stepOption);
      });

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(`urn:uuid:${validUUID.toLowerCase()}`);
        expect(message.success).toHaveBeenCalledWith('UUID copied to clipboard (STEP format)');
      });
    });

    it('should copy QIF format when selected from dropdown', async () => {
      mockWriteText.mockResolvedValue(undefined);

      render(<UUIDDisplay uuid={validUUID} showStandardFormats />);

      const dropdown = screen.getByRole('button', { name: /down/ });
      fireEvent.click(dropdown);

      await waitFor(() => {
        const qifOption = screen.getByText('QIF Format (urn:uuid:...)');
        fireEvent.click(qifOption);
      });

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(`urn:uuid:${validUUID.toLowerCase()}`);
        expect(message.success).toHaveBeenCalledWith('UUID copied to clipboard (QIF format)');
      });
    });

    it('should copy ITAR format when selected from dropdown', async () => {
      mockWriteText.mockResolvedValue(undefined);

      render(<UUIDDisplay uuid={validUUID} showStandardFormats />);

      const dropdown = screen.getByRole('button', { name: /down/ });
      fireEvent.click(dropdown);

      await waitFor(() => {
        const itarOption = screen.getByText('ITAR Format (ITAR-UUID:...)');
        fireEvent.click(itarOption);
      });

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(`ITAR-UUID:${validUUID.toUpperCase()}`);
        expect(message.success).toHaveBeenCalledWith('UUID copied to clipboard (ITAR format)');
      });
    });
  });
});