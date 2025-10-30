"""
MachShop API Python Client
Generated from OpenAPI specification
"""

import requests
from typing import Dict, List, Optional, Any
import json


class MachShopApiClient:
    """Python client for the MachShop Manufacturing Execution System API."""

    def __init__(self, base_url: str, auth_token: str):
        """
        Initialize the API client.

        Args:
            base_url: The base URL of the API (e.g., 'https://api.machshop.com/api/v1')
            auth_token: JWT authentication token
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, path: str, data: Optional[Dict] = None) -> Any:
        """Make an API request."""
        url = f"{self.base_url}{path}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data if data else None
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {e}")

    # Work Orders
    def get_work_orders(self, page: int = 1, limit: int = 50) -> Dict:
        """Get work orders with pagination."""
        return self._request('GET', f'/workorders?page={page}&limit={limit}')

    def create_work_order(self, work_order_data: Dict) -> Dict:
        """Create a new work order."""
        return self._request('POST', '/workorders', work_order_data)

    def get_work_order(self, work_order_id: str) -> Dict:
        """Get a specific work order by ID."""
        return self._request('GET', f'/workorders/{work_order_id}')

    # Materials
    def get_materials(self, page: int = 1, limit: int = 50) -> Dict:
        """Get materials with pagination."""
        return self._request('GET', f'/materials?page={page}&limit={limit}')

    def create_material(self, material_data: Dict) -> Dict:
        """Create a new material."""
        return self._request('POST', '/materials', material_data)

    # Quality
    def get_quality_inspections(self, page: int = 1, limit: int = 50) -> Dict:
        """Get quality inspections with pagination."""
        return self._request('GET', f'/fai?page={page}&limit={limit}')

    def create_quality_inspection(self, inspection_data: Dict) -> Dict:
        """Create a new quality inspection."""
        return self._request('POST', '/fai', inspection_data)


# Usage example:
if __name__ == "__main__":
    client = MachShopApiClient(
        base_url='https://api.machshop.com/api/v1',
        auth_token='your-jwt-token-here'
    )

    # Get work orders
    work_orders = client.get_work_orders()
    print(f"Found {len(work_orders.get('data', []))} work orders")

    # Create a new work order
    new_work_order = {
        'workOrderNumber': 'WO-2024-001',
        'partNumber': 'ENGINE-BLADE-A380',
        'quantityOrdered': 10,
        'status': 'RELEASED',
        'priority': 'HIGH'
    }

    created_wo = client.create_work_order(new_work_order)
    print(f"Created work order: {created_wo['id']}")
