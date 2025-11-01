/**
 * Custom Hook: useContainerTracking
 * Provides container tracking and management functionality
 * Phase 10: Container Management UI
 */

import { useState, useCallback, useEffect } from 'react';

export interface Container {
  id: string;
  containerNumber: string;
  containerType: string;
  size: string;
  status: 'EMPTY' | 'LOADED' | 'IN_TRANSIT' | 'AT_LOCATION' | 'DAMAGED';
  currentLocation: string;
  capacity: number;
  currentQuantity: number;
  currentContents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContainerUtilization {
  containerId: string;
  utilizationPercent: number;
  currentQuantity: number;
  capacity: number;
  efficiency: number;
  lastUpdated: Date;
}

export interface ContainerMovement {
  id: string;
  containerId: string;
  fromLocation: string;
  toLocation: string;
  timestamp: Date;
  movedBy: string;
  reason: string;
}

export interface ContainerFilters {
  status?: string;
  location?: string;
  containerType?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export const useContainerTracking = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch containers with optional filters
   */
  const fetchContainers = useCallback(
    async (filters?: ContainerFilters) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.location) params.append('location', filters.location);
        if (filters?.containerType) params.append('containerType', filters.containerType);
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.offset) params.append('offset', filters.offset.toString());

        const response = await fetch(`/api/movements/containers?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch containers: ${response.statusText}`);
        }

        const data = await response.json();
        setContainers(data.data || []);
        return data.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch containers';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get container by ID
   */
  const getContainer = useCallback(
    async (containerId: string): Promise<Container> => {
      try {
        const response = await fetch(`/api/movements/containers/${containerId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch container: ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch container';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Load materials into container
   */
  const loadContainer = useCallback(
    async (
      containerId: string,
      partNumbers: string[],
      quantity: number,
      loadedBy: string
    ): Promise<Container> => {
      try {
        setLoading(true);
        const response = await fetch(`/api/movements/containers/${containerId}/load`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            partNumbers,
            quantity,
            loadedBy
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to load container: ${response.statusText}`);
        }

        const updated = await response.json();
        // Update local state
        setContainers(containers.map(c => (c.id === containerId ? updated : c)));
        return updated;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load container';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [containers]
  );

  /**
   * Unload materials from container
   */
  const unloadContainer = useCallback(
    async (
      containerId: string,
      quantity: number,
      targetLocation: string,
      unloadedBy: string
    ): Promise<Container> => {
      try {
        setLoading(true);
        const response = await fetch(`/api/movements/containers/${containerId}/unload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            quantity,
            unloadedBy,
            targetLocation
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to unload container: ${response.statusText}`);
        }

        const updated = await response.json();
        setContainers(containers.map(c => (c.id === containerId ? updated : c)));
        return updated;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to unload container';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [containers]
  );

  /**
   * Transfer container to new location
   */
  const transferContainer = useCallback(
    async (
      containerId: string,
      toLocation: string,
      transferredBy: string
    ): Promise<Container> => {
      try {
        setLoading(true);
        const response = await fetch(`/api/movements/containers/${containerId}/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            toLocation,
            transferredBy
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to transfer container: ${response.statusText}`);
        }

        const updated = await response.json();
        setContainers(containers.map(c => (c.id === containerId ? updated : c)));
        return updated;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to transfer container';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [containers]
  );

  /**
   * Get container movement history
   */
  const getMovementHistory = useCallback(
    async (containerId: string): Promise<ContainerMovement[]> => {
      try {
        const response = await fetch(`/api/movements/containers/${containerId}/history`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch history';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Get container utilization metrics
   */
  const getUtilization = useCallback(
    async (containerId: string): Promise<ContainerUtilization> => {
      try {
        const response = await fetch(`/api/movements/containers/${containerId}/utilization`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch utilization: ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch utilization';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  /**
   * Get container by number (search)
   */
  const searchContainer = useCallback(
    (containerNumber: string): Container | undefined => {
      return containers.find(c =>
        c.containerNumber.toUpperCase() === containerNumber.toUpperCase()
      );
    },
    [containers]
  );

  /**
   * Get containers by status
   */
  const getContainersByStatus = useCallback(
    (status: string): Container[] => {
      return containers.filter(c => c.status === status);
    },
    [containers]
  );

  /**
   * Get containers by location
   */
  const getContainersByLocation = useCallback(
    (location: string): Container[] => {
      return containers.filter(c =>
        c.currentLocation.toLowerCase().includes(location.toLowerCase())
      );
    },
    [containers]
  );

  /**
   * Calculate average utilization
   */
  const getAverageUtilization = useCallback((): number => {
    if (containers.length === 0) return 0;
    const total = containers.reduce(
      (sum, c) => sum + (c.currentQuantity / c.capacity),
      0
    );
    return Math.round((total / containers.length) * 100);
  }, [containers]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    containers,
    loading,
    error,

    // Methods
    fetchContainers,
    getContainer,
    loadContainer,
    unloadContainer,
    transferContainer,
    getMovementHistory,
    getUtilization,
    searchContainer,
    getContainersByStatus,
    getContainersByLocation,
    getAverageUtilization,
    clearError
  };
};

export default useContainerTracking;
