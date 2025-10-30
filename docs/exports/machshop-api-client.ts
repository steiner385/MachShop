// MachShop API TypeScript Client
// Generated from OpenAPI specification

export interface ApiConfig {
  baseUrl: string;
  authToken: string;
}

export class MachShopApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  private async request<T>(
    method: string,
    path: string,
    data?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Example methods (expand based on your API)
  async getWorkOrders(): Promise<any[]> {
    return this.request('GET', '/workorders');
  }

  async createWorkOrder(data: any): Promise<any> {
    return this.request('POST', '/workorders', data);
  }

  async getMaterials(): Promise<any[]> {
    return this.request('GET', '/materials');
  }

  // Add more methods as needed...
}

// Usage example:
// const client = new MachShopApiClient({
//   baseUrl: 'https://api.machshop.com/api/v1',
//   authToken: 'your-jwt-token'
// });
//
// const workOrders = await client.getWorkOrders();
