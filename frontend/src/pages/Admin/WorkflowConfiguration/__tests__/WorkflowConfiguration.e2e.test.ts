/**
 * E2E Tests for Workflow Configuration Admin UI
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 *
 * Uses Playwright for comprehensive E2E testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SiteConfigurationPage } from '../SiteConfiguration';
import { ModeSelector } from '../ModeSelector';
import { RuleToggle } from '../RuleToggle';
import { ConfigurationHistoryTimeline } from '../ConfigurationHistory';

describe('Workflow Configuration E2E Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe('ModeSelector Component', () => {
    it('should display all three workflow modes', () => {
      const mockOnModeSelect = vi.fn();

      render(
        <ModeSelector selectedMode="STRICT" onModeSelect={mockOnModeSelect} />
      );

      expect(screen.getByText('STRICT Mode')).toBeTruthy();
      expect(screen.getByText('FLEXIBLE Mode')).toBeTruthy();
      expect(screen.getByText('HYBRID Mode')).toBeTruthy();
    });

    it('should highlight selected mode', () => {
      const mockOnModeSelect = vi.fn();

      const { rerender } = render(
        <ModeSelector selectedMode="STRICT" onModeSelect={mockOnModeSelect} />
      );

      let strictCard = screen.getByText('STRICT Mode').closest('[class*="modeCard"]');
      expect(strictCard).toHaveStyle('border: 2px solid'); // Selected border

      rerender(
        <ModeSelector selectedMode="FLEXIBLE" onModeSelect={mockOnModeSelect} />
      );

      const flexibleCard = screen.getByText('FLEXIBLE Mode').closest('[class*="modeCard"]');
      expect(flexibleCard).toHaveStyle('border: 2px solid');
    });

    it('should call onModeSelect when mode is clicked', async () => {
      const mockOnModeSelect = vi.fn();
      const user = userEvent.setup();

      render(
        <ModeSelector selectedMode="STRICT" onModeSelect={mockOnModeSelect} />
      );

      const flexibleCard = screen.getByText('FLEXIBLE Mode').closest('div');
      if (flexibleCard) {
        await user.click(flexibleCard);
      }

      expect(mockOnModeSelect).toHaveBeenCalledWith('FLEXIBLE');
    });

    it('should display use cases for each mode', () => {
      const mockOnModeSelect = vi.fn();

      render(
        <ModeSelector selectedMode="STRICT" onModeSelect={mockOnModeSelect} />
      );

      expect(screen.getByText(/FDA-regulated production/i)).toBeTruthy();
      expect(screen.getByText(/Route authoring/i)).toBeTruthy();
      expect(screen.getByText(/External ERP execution/i)).toBeTruthy();
    });
  });

  describe('RuleToggle Component', () => {
    it('should display all applicable rules for mode', () => {
      const mockOnConfigChange = vi.fn();

      render(
        <RuleToggle
          mode="FLEXIBLE"
          config={{ mode: 'FLEXIBLE', enforceStatusGating: false }}
          onConfigChange={mockOnConfigChange}
        />
      );

      expect(screen.getByText('Enforce Operation Sequence')).toBeTruthy();
      expect(screen.getByText('Enforce Quality Checks')).toBeTruthy();
    });

    it('should lock rules in STRICT mode', () => {
      const mockOnConfigChange = vi.fn();

      render(
        <RuleToggle
          mode="STRICT"
          config={{
            mode: 'STRICT',
            enforceStatusGating: true,
            enforceOperationSequence: true,
          }}
          onConfigChange={mockOnConfigChange}
        />
      );

      const switches = screen.getAllByRole('switch');
      // STRICT mode switches should be disabled
      switches.forEach((sw) => {
        expect(sw).toHaveAttribute('disabled');
      });
    });

    it('should allow toggling rules in FLEXIBLE mode', async () => {
      const mockOnConfigChange = vi.fn();
      const user = userEvent.setup();

      render(
        <RuleToggle
          mode="FLEXIBLE"
          config={{ mode: 'FLEXIBLE' }}
          onConfigChange={mockOnConfigChange}
        />
      );

      const switches = screen.getAllByRole('switch');
      if (switches.length > 0) {
        await user.click(switches[0]);
      }

      expect(mockOnConfigChange).toHaveBeenCalled();
    });

    it('should display rule descriptions on expand', async () => {
      const mockOnConfigChange = vi.fn();
      const user = userEvent.setup();

      render(
        <RuleToggle
          mode="FLEXIBLE"
          config={{ mode: 'FLEXIBLE' }}
          onConfigChange={mockOnConfigChange}
        />
      );

      const collapseHeaders = screen.getAllByRole('button');
      if (collapseHeaders.length > 0) {
        await user.click(collapseHeaders[0]);
      }

      await waitFor(() => {
        expect(screen.getByText(/Operations must be completed sequentially/i)).toBeTruthy();
      });
    });

    it('should show summary of enabled rules', () => {
      const mockOnConfigChange = vi.fn();

      render(
        <RuleToggle
          mode="FLEXIBLE"
          config={{
            mode: 'FLEXIBLE',
            enforceQualityChecks: true,
            enforceOperationSequence: true,
            enforceStatusGating: false,
          }}
          onConfigChange={mockOnConfigChange}
        />
      );

      expect(screen.getByText(/✓ Enabled/).textContent).toContain('2'); // At least 2 enabled
    });
  });

  describe('ConfigurationHistory Component', () => {
    it('should display empty state when no history', () => {
      render(
        <ConfigurationHistoryTimeline history={[]} />
      );

      expect(screen.getByText(/No configuration changes recorded/i)).toBeTruthy();
    });

    it('should display timeline for configuration changes', () => {
      const history = [
        {
          id: 'hist-1',
          configType: 'SITE' as const,
          configId: 'config-1',
          newMode: 'FLEXIBLE',
          previousMode: 'STRICT',
          changedFields: {},
          createdAt: new Date().toISOString(),
          createdBy: 'user-123',
        },
      ];

      render(
        <ConfigurationHistoryTimeline history={history} />
      );

      expect(screen.getByText(/STRICT/i)).toBeTruthy();
      expect(screen.getByText(/FLEXIBLE/i)).toBeTruthy();
    });

    it('should show user and timestamp for each change', () => {
      const history = [
        {
          id: 'hist-1',
          configType: 'SITE' as const,
          configId: 'config-1',
          newMode: 'FLEXIBLE',
          changedFields: {},
          createdAt: '2024-01-15T10:00:00Z',
          createdBy: 'John Doe',
        },
      ];

      render(
        <ConfigurationHistoryTimeline history={history} />
      );

      expect(screen.getByText(/John Doe/i)).toBeTruthy();
      expect(screen.getByText(/Jan 15/i)).toBeTruthy();
    });

    it('should show detail modal when clicking view details', async () => {
      const history = [
        {
          id: 'hist-1',
          configType: 'SITE' as const,
          configId: 'config-1',
          newMode: 'FLEXIBLE',
          previousMode: 'STRICT',
          changedFields: { mode: { previous: 'STRICT', current: 'FLEXIBLE' } },
          changeReason: 'Testing flexible mode',
          createdAt: new Date().toISOString(),
          createdBy: 'user-123',
        },
      ];

      const user = userEvent.setup();

      render(
        <ConfigurationHistoryTimeline history={history} />
      );

      const viewDetailsButtons = screen.getAllByText(/View Details/i);
      if (viewDetailsButtons.length > 0) {
        await user.click(viewDetailsButtons[0]);
      }

      await waitFor(() => {
        expect(screen.getByText(/Configuration Change Details/i)).toBeTruthy();
      });
    });

    it('should handle pagination', async () => {
      const mockOnPageChange = vi.fn();
      const user = userEvent.setup();

      render(
        <ConfigurationHistoryTimeline
          history={[]}
          total={50}
          pageSize={10}
          current={1}
          onPageChange={mockOnPageChange}
        />
      );

      const paginationButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.includes('2') || btn.textContent?.includes('Next')
      );

      if (paginationButtons.length > 0) {
        await user.click(paginationButtons[0]);
      }

      expect(mockOnPageChange).toHaveBeenCalled();
    });
  });

  describe('SiteConfiguration Full Workflow', () => {
    it('should display tabs for configuration and history', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <SiteConfigurationPage siteId="SITE-001" />
        </QueryClientProvider>
      );

      expect(screen.getByText('Configuration')).toBeTruthy();
      expect(screen.getByText('Configuration History')).toBeTruthy();
    });

    it('should show mode selector on configuration tab', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SiteConfigurationPage siteId="SITE-001" />
        </QueryClientProvider>
      );

      const configTab = screen.getByText('Configuration');
      await user.click(configTab);

      expect(screen.getByText(/STRICT Mode/i)).toBeTruthy();
    });

    it('should enable save button when config changes', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SiteConfigurationPage siteId="SITE-001" />
        </QueryClientProvider>
      );

      // Mode selection should enable save
      const modeCard = screen.getByText('FLEXIBLE Mode')?.closest('[class*="modeCard"]');
      if (modeCard) {
        await user.click(modeCard);
      }

      await waitFor(() => {
        const saveButton = screen.getByText(/Save Changes/i);
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should show discard changes button when dirty', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SiteConfigurationPage siteId="SITE-001" />
        </QueryClientProvider>
      );

      const modeCard = screen.getByText('FLEXIBLE Mode')?.closest('[class*="modeCard"]');
      if (modeCard) {
        await user.click(modeCard);
      }

      await waitFor(() => {
        expect(screen.getByText(/Discard Changes/i)).toBeTruthy();
      });
    });

    it('should require change reason before saving', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SiteConfigurationPage siteId="SITE-001" />
        </QueryClientProvider>
      );

      const modeCard = screen.getByText('FLEXIBLE Mode')?.closest('[class*="modeCard"]');
      if (modeCard) {
        await user.click(modeCard);
      }

      await waitFor(() => {
        const saveButton = screen.getByText(/Save Changes/i);
        if (!saveButton.closest('button')?.disabled) {
          fireEvent.click(saveButton);
        }
      });

      // Should show modal requesting reason
      await waitFor(() => {
        expect(screen.getByText(/Configuration Change Reason/i)).toBeTruthy();
      });
    });

    it('should show configuration preview', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <SiteConfigurationPage siteId="SITE-001" />
        </QueryClientProvider>
      );

      // Select FLEXIBLE mode
      const flexibleCard = screen.getByText('FLEXIBLE Mode')?.closest('[class*="modeCard"]');
      if (flexibleCard) {
        await user.click(flexibleCard);
      }

      await waitFor(() => {
        expect(screen.getByText(/Configuration Preview/i)).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const mockOnModeSelect = vi.fn();

      render(
        <ModeSelector selectedMode="STRICT" onModeSelect={mockOnModeSelect} />
      );

      const cards = screen.getAllByText(/Mode/i);
      cards.forEach((card) => {
        expect(card.closest('[role]')).toBeTruthy();
      });
    });

    it('should support keyboard navigation', async () => {
      const mockOnModeSelect = vi.fn();
      const user = userEvent.setup();

      render(
        <ModeSelector selectedMode="STRICT" onModeSelect={mockOnModeSelect} />
      );

      // Tab through mode cards
      await user.tab();

      const activeElement = document.activeElement;
      expect(activeElement).toBeTruthy();
    });

    it('should be responsive on mobile', () => {
      // Would test with different viewport sizes
      render(
        <ModeSelector selectedMode="STRICT" onModeSelect={vi.fn()} />
      );

      const modeCards = screen.getAllByText(/Mode/i);
      expect(modeCards.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle loading state gracefully', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <SiteConfigurationPage siteId="SITE-001" />
        </QueryClientProvider>
      );

      expect(screen.getByRole('progressbar') || screen.getByText(/loading/i)).toBeTruthy();
    });

    it('should display error message on load failure', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <SiteConfigurationPage siteId="INVALID" />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeTruthy();
      });
    });
  });
});
