/**
 * Dedicated Liveness Probe Endpoint
 * GET /api/health/live
 *
 * Checks if the Node.js process is alive and responsive.
 * Used by container orchestrators (Kubernetes / ECS / Docker) to determine if process restart is required.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const startTime = Date.now();

export async function GET() {
  return NextResponse.json(
    {
      status: 'alive',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
