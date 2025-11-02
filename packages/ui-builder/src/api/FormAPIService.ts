/**
 * Form Management REST API Service Implementation (#488)
 * 15+ API endpoints for form management
 */

import { APIRequest, APIResponse, FormTemplate } from '../types';

export class FormAPIService {
  private baseUrl: string;
  private authToken?: string;
  private listeners: Map<string, Set<(response: APIResponse) => void>> = new Map();

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  // ========== Authentication ==========

  public setAuthToken(token: string): void {
    this.authToken = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // ========== Form CRUD Operations ==========

  public async createForm(formData: FormTemplate): Promise<APIResponse<FormTemplate>> {
    return this.request({
      method: 'POST',
      endpoint: '/api/forms',
      body: formData,
    });
  }

  public async getForm(formId: string): Promise<APIResponse<FormTemplate>> {
    return this.request({
      method: 'GET',
      endpoint: `/api/forms/${formId}`,
    });
  }

  public async updateForm(formId: string, updates: Partial<FormTemplate>): Promise<APIResponse<FormTemplate>> {
    return this.request({
      method: 'PUT',
      endpoint: `/api/forms/${formId}`,
      body: updates,
    });
  }

  public async deleteForm(formId: string): Promise<APIResponse<{ success: boolean }>> {
    return this.request({
      method: 'DELETE',
      endpoint: `/api/forms/${formId}`,
    });
  }

  public async listForms(
    query?: Record<string, unknown>
  ): Promise<APIResponse<{ forms: FormTemplate[]; total: number }>> {
    return this.request({
      method: 'GET',
      endpoint: '/api/forms',
      query,
    });
  }

  // ========== Field Management ==========

  public async addField(
    formId: string,
    fieldData: Record<string, unknown>
  ): Promise<APIResponse<{ fieldId: string }>> {
    return this.request({
      method: 'POST',
      endpoint: `/api/forms/${formId}/fields`,
      body: fieldData,
    });
  }

  public async updateField(
    formId: string,
    fieldId: string,
    fieldData: Record<string, unknown>
  ): Promise<APIResponse<{ success: boolean }>> {
    return this.request({
      method: 'PUT',
      endpoint: `/api/forms/${formId}/fields/${fieldId}`,
      body: fieldData,
    });
  }

  public async removeField(formId: string, fieldId: string): Promise<APIResponse<{ success: boolean }>> {
    return this.request({
      method: 'DELETE',
      endpoint: `/api/forms/${formId}/fields/${fieldId}`,
    });
  }

  public async listFields(formId: string): Promise<APIResponse<{ fields: Record<string, unknown>[] }>> {
    return this.request({
      method: 'GET',
      endpoint: `/api/forms/${formId}/fields`,
    });
  }

  // ========== Form Data Operations ==========

  public async submitFormData(
    formId: string,
    data: Record<string, unknown>
  ): Promise<APIResponse<{ dataId: string; timestamp: number }>> {
    return this.request({
      method: 'POST',
      endpoint: `/api/forms/${formId}/submit`,
      body: data,
    });
  }

  public async getFormData(formId: string, dataId: string): Promise<APIResponse<Record<string, unknown>>> {
    return this.request({
      method: 'GET',
      endpoint: `/api/forms/${formId}/data/${dataId}`,
    });
  }

  public async listFormData(
    formId: string,
    query?: Record<string, unknown>
  ): Promise<APIResponse<{ data: Record<string, unknown>[]; total: number }>> {
    return this.request({
      method: 'GET',
      endpoint: `/api/forms/${formId}/data`,
      query,
    });
  }

  public async updateFormData(
    formId: string,
    dataId: string,
    updates: Record<string, unknown>
  ): Promise<APIResponse<{ success: boolean }>> {
    return this.request({
      method: 'PUT',
      endpoint: `/api/forms/${formId}/data/${dataId}`,
      body: updates,
    });
  }

  // ========== Version Management ==========

  public async getFormVersion(
    formId: string,
    version: string
  ): Promise<APIResponse<FormTemplate>> {
    return this.request({
      method: 'GET',
      endpoint: `/api/forms/${formId}/versions/${version}`,
    });
  }

  public async listFormVersions(
    formId: string
  ): Promise<APIResponse<{ versions: { version: string; createdAt: string; createdBy: string }[] }>> {
    return this.request({
      method: 'GET',
      endpoint: `/api/forms/${formId}/versions`,
    });
  }

  public async rollbackVersion(
    formId: string,
    version: string
  ): Promise<APIResponse<{ success: boolean; newVersion: string }>> {
    return this.request({
      method: 'POST',
      endpoint: `/api/forms/${formId}/versions/${version}/rollback`,
    });
  }

  // ========== Template Operations ==========

  public async createTemplate(templateData: FormTemplate): Promise<APIResponse<FormTemplate>> {
    return this.request({
      method: 'POST',
      endpoint: '/api/templates',
      body: templateData,
    });
  }

  public async getTemplate(templateId: string): Promise<APIResponse<FormTemplate>> {
    return this.request({
      method: 'GET',
      endpoint: `/api/templates/${templateId}`,
    });
  }

  public async listTemplates(query?: Record<string, unknown>): Promise<APIResponse<{ templates: FormTemplate[] }>> {
    return this.request({
      method: 'GET',
      endpoint: '/api/templates',
      query,
    });
  }

  public async publishTemplate(templateId: string): Promise<APIResponse<{ success: boolean }>> {
    return this.request({
      method: 'POST',
      endpoint: `/api/templates/${templateId}/publish`,
    });
  }

  // ========== Multi-Site Operations ==========

  public async getSiteConfig(
    siteId: string,
    formId: string
  ): Promise<APIResponse<Record<string, unknown>>> {
    return this.request({
      method: 'GET',
      endpoint: `/api/sites/${siteId}/forms/${formId}`,
    });
  }

  public async updateSiteConfig(
    siteId: string,
    formId: string,
    config: Record<string, unknown>
  ): Promise<APIResponse<{ success: boolean }>> {
    return this.request({
      method: 'PUT',
      endpoint: `/api/sites/${siteId}/forms/${formId}`,
      body: config,
    });
  }

  public async syncForm(formId: string, options?: { siteIds?: string[] }): Promise<APIResponse<{ syncId: string }>> {
    return this.request({
      method: 'POST',
      endpoint: `/api/forms/${formId}/sync`,
      body: options,
    });
  }

  // ========== Validation & Integration ==========

  public async validateFormSchema(
    formId: string,
    schema: Record<string, unknown>
  ): Promise<APIResponse<{ valid: boolean; errors?: string[] }>> {
    return this.request({
      method: 'POST',
      endpoint: `/api/forms/${formId}/validate`,
      body: schema,
    });
  }

  public async exportForm(formId: string, format: 'json' | 'csv' = 'json'): Promise<APIResponse<string>> {
    return this.request({
      method: 'GET',
      endpoint: `/api/forms/${formId}/export?format=${format}`,
    });
  }

  public async importForm(formData: Record<string, unknown>): Promise<APIResponse<{ formId: string }>> {
    return this.request({
      method: 'POST',
      endpoint: '/api/forms/import',
      body: formData,
    });
  }

  // ========== Request Handling ==========

  private async request<T = any>(req: APIRequest): Promise<APIResponse<T>> {
    const requestId = this.generateRequestId();

    try {
      // Simulate HTTP request
      const response = await this.simulateRequest<T>(req, requestId);
      this.notifyListeners(req.endpoint, response);
      return response;
    } catch (error) {
      const errorResponse: APIResponse<T> = {
        success: false,
        status: 500,
        error: {
          code: 'REQUEST_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now(),
        requestId,
      };

      this.notifyListeners(req.endpoint, errorResponse);
      return errorResponse;
    }
  }

  private async simulateRequest<T = any>(req: APIRequest, requestId: string): Promise<APIResponse<T>> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      status: 200,
      data: ({} as unknown) as T,
      timestamp: Date.now(),
      requestId,
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ========== Event Handling ==========

  public subscribe(endpoint: string, listener: (response: APIResponse) => void): () => void {
    if (!this.listeners.has(endpoint)) {
      this.listeners.set(endpoint, new Set());
    }

    const listeners = this.listeners.get(endpoint)!;
    listeners.add(listener);

    return () => listeners.delete(listener);
  }

  private notifyListeners(endpoint: string, response: APIResponse): void {
    const listeners = this.listeners.get(endpoint);
    if (listeners) {
      listeners.forEach((listener) => listener(response));
    }
  }
}
