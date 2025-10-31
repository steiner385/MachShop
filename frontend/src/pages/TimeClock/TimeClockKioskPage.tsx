import React from 'react';
import TimeClockKiosk from '../../components/TimeTracking/TimeClockKiosk';

/**
 * Time Clock Kiosk Page
 *
 * Full-screen kiosk interface for time tracking.
 * Designed for dedicated time clock terminals with:
 * - Badge scanning support
 * - PIN entry fallback
 * - Touch-friendly interface
 * - Auto-logout for security
 * - Visual time type indicators
 *
 * Route: /time-clock/kiosk
 * Access: Public (within authenticated system)
 * Layout: Full-screen, no navigation
 */
const TimeClockKioskPage: React.FC = () => {
  return <TimeClockKiosk />;
};

export default TimeClockKioskPage;