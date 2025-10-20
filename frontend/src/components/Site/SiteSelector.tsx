/**
 * Site Selector Component
 * Sprint 3: Frontend Site Context
 *
 * Dropdown component for selecting the current site
 * Displays in the application header for easy site switching
 */

import React from 'react';
import { Select, Spin, Alert, Tooltip } from 'antd';
import { EnvironmentOutlined, GlobalOutlined, LoadingOutlined } from '@ant-design/icons';
import { useSite, Site } from '@/contexts/SiteContext';
import './SiteSelector.css';

const { Option } = Select;

interface SiteSelectorProps {
  className?: string;
  style?: React.CSSProperties;
  showIcon?: boolean;
  size?: 'small' | 'middle' | 'large';
  placeholder?: string;
  allowClear?: boolean;
}

/**
 * SiteSelector Component
 * Allows users to select the current manufacturing site
 */
export const SiteSelector: React.FC<SiteSelectorProps> = ({
  className = '',
  style = {},
  showIcon = true,
  size = 'middle',
  placeholder = 'Select site...',
  allowClear = false,
}) => {
  const {
    currentSite,
    allSites,
    isLoading,
    error,
    setCurrentSite,
    clearError,
  } = useSite();

  /**
   * Handle site selection change
   */
  const handleChange = (siteId: string | null) => {
    clearError();

    if (siteId === null) {
      setCurrentSite(null);
      return;
    }

    const selectedSite = allSites.find(site => site.id === siteId);
    if (selectedSite) {
      setCurrentSite(selectedSite);
    }
  };

  /**
   * Render site option
   */
  const renderSiteOption = (site: Site) => {
    const isActive = site.isActive;

    return (
      <Option
        key={site.id}
        value={site.id}
        disabled={!isActive}
        className={!isActive ? 'site-option-inactive' : ''}
      >
        <div className="site-option">
          <div className="site-option-main">
            <EnvironmentOutlined className="site-option-icon" />
            <span className="site-option-name">{site.siteName}</span>
            <span className="site-option-code">({site.siteCode})</span>
          </div>
          {site.location && (
            <span className="site-option-location">{site.location}</span>
          )}
          {!isActive && (
            <span className="site-option-inactive-badge">Inactive</span>
          )}
        </div>
      </Option>
    );
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className={`site-selector-container ${className}`} style={style}>
        <Select
          size={size}
          placeholder="Loading sites..."
          disabled
          suffixIcon={<LoadingOutlined spin />}
          style={{ minWidth: 200 }}
        />
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className={`site-selector-container ${className}`} style={style}>
        <Tooltip title={error}>
          <Select
            size={size}
            placeholder="Error loading sites"
            status="error"
            disabled
            style={{ minWidth: 200 }}
          />
        </Tooltip>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (allSites.length === 0) {
    return (
      <div className={`site-selector-container ${className}`} style={style}>
        <Select
          size={size}
          placeholder="No sites available"
          disabled
          style={{ minWidth: 200 }}
        />
      </div>
    );
  }

  /**
   * Render site selector
   */
  return (
    <div className={`site-selector-container ${className}`} style={style}>
      <Select
        size={size}
        value={currentSite?.id || undefined}
        onChange={handleChange}
        placeholder={placeholder}
        allowClear={allowClear}
        showSearch
        optionFilterProp="children"
        filterOption={(input, option) => {
          const children = option?.children;
          if (React.isValidElement(children)) {
            const props = children.props as any;
            const siteName = props?.children?.[0]?.props?.children?.[1]?.props?.children || '';
            const siteCode = props?.children?.[0]?.props?.children?.[2]?.props?.children || '';
            return (
              siteName.toLowerCase().includes(input.toLowerCase()) ||
              siteCode.toLowerCase().includes(input.toLowerCase())
            );
          }
          return false;
        }}
        suffixIcon={showIcon ? <GlobalOutlined /> : undefined}
        className="site-selector"
        classNames={{ popup: { root: "site-selector-dropdown" } }}
        style={{ minWidth: 200, ...style }}
        popupMatchSelectWidth={false}
      >
        {allSites.map(renderSiteOption)}
      </Select>
    </div>
  );
};

export default SiteSelector;
