/**
 * Shapes the backend sends back. Keep these in step with `backend/src/types/`.
 */

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  isPremium: boolean;
  createdAt: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  uptimeSeconds: number;
}
