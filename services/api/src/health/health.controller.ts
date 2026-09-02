import { Controller, Get } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: string;
  timestamp: string;
}

/**
 * Health-check del API. Expuesto en GET /api/health.
 */
@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'nox-lux-api',
      timestamp: new Date().toISOString(),
    };
  }
}
