import { message } from 'antd';

export interface APIError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export class APIRequestError extends Error implements APIError {
  status?: number;
  code?: string;
  details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'APIRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Centralized API error handler
 */
export const handleAPIError = (error: any): void => {
  console.error('API Error:', error);

  // Handle network errors
  if (error.message === 'Failed to fetch' || error.message === 'Network request failed') {
    message.error('Network error. Please check your connection and try again.');
    return;
  }

  // Handle timeout errors
  if (error.name === 'AbortError') {
    message.error('Request timed out. Please try again.');
    return;
  }

  // Handle API errors
  if (error instanceof APIRequestError) {
    switch (error.status) {
      case 401:
        message.error('Your session has expired. Please login again.');
        // Redirect to login if needed
        break;
      case 403:
        message.error('You do not have permission to perform this action.');
        break;
      case 404:
        message.error('The requested resource was not found.');
        break;
      case 429:
        message.warning('Too many requests. Please wait a moment and try again.');
        break;
      case 500:
        message.error('Server error. Please try again later.');
        break;
      default:
        message.error(error.message || 'An unexpected error occurred');
    }
  } else {
    // Generic error
    message.error(error.message || 'An unexpected error occurred');
  }
};

/**
 * Safe API call wrapper with error handling
 */
export const safeAPICall = async <T>(
  apiCall: () => Promise<T>,
  options?: {
    showError?: boolean;
    errorMessage?: string;
    onError?: (error: any) => void;
  }
): Promise<T | null> => {
  try {
    return await apiCall();
  } catch (error) {
    const showError = options?.showError !== false;

    if (showError) {
      if (options?.errorMessage) {
        message.error(options.errorMessage);
      } else {
        handleAPIError(error);
      }
    }

    if (options?.onError) {
      options.onError(error);
    }

    return null;
  }
};

/**
 * Create an API request with timeout and error handling
 */
export const apiRequest = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 30000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIRequestError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.code,
        errorData
      );
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }

    throw error;
  }
};

/**
 * Retry logic for failed API calls
 */
export const retryAPICall = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error instanceof APIRequestError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError;
};