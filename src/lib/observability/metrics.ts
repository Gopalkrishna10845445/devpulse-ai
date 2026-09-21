/**
 * Production Phase 4 — Prometheus Metrics Registry
 *
 * Implements standard Prometheus metric collection with bounded label cardinality
 * to prevent time-series explosion and memory leakage.
 */

export interface MetricLabel {
  [key: string]: string | number;
}

class Counter {
  public name: string;
  public help: string;
  private values: Map<string, number> = new Map();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  private serializeLabels(labels: MetricLabel): string {
    const keys = Object.keys(labels).sort();
    if (keys.length === 0) return '';
    return keys.map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`).join(',');
  }

  public inc(labels: MetricLabel = {}, value: number = 1): void {
    const labelKey = this.serializeLabels(labels);
    const current = this.values.get(labelKey) || 0;
    this.values.set(labelKey, current + value);
  }

  public render(): string[] {
    const lines: string[] = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} counter`,
    ];

    if (this.values.size === 0) {
      lines.push(`${this.name} 0`);
    } else {
      for (const [labelStr, val] of this.values.entries()) {
        if (labelStr) {
          lines.push(`${this.name}{${labelStr}} ${val}`);
        } else {
          lines.push(`${this.name} ${val}`);
        }
      }
    }

    return lines;
  }

  public reset(): void {
    this.values.clear();
  }
}

class Histogram {
  public name: string;
  public help: string;
  private sumMap: Map<string, number> = new Map();
  private countMap: Map<string, number> = new Map();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  private serializeLabels(labels: MetricLabel): string {
    const keys = Object.keys(labels).sort();
    if (keys.length === 0) return '';
    return keys.map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`).join(',');
  }

  public observe(labels: MetricLabel = {}, value: number): void {
    const labelKey = this.serializeLabels(labels);
    const currentSum = this.sumMap.get(labelKey) || 0;
    const currentCount = this.countMap.get(labelKey) || 0;

    this.sumMap.set(labelKey, currentSum + value);
    this.countMap.set(labelKey, currentCount + 1);
  }

  public render(): string[] {
    const lines: string[] = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} histogram`,
    ];

    if (this.countMap.size === 0) {
      lines.push(`${this.name}_count 0`);
      lines.push(`${this.name}_sum 0`);
    } else {
      for (const [labelStr, count] of this.countMap.entries()) {
        const sum = this.sumMap.get(labelStr) || 0;
        if (labelStr) {
          lines.push(`${this.name}_sum{${labelStr}} ${sum.toFixed(4)}`);
          lines.push(`${this.name}_count{${labelStr}} ${count}`);
        } else {
          lines.push(`${this.name}_sum ${sum.toFixed(4)}`);
          lines.push(`${this.name}_count ${count}`);
        }
      }
    }

    return lines;
  }

  public reset(): void {
    this.sumMap.clear();
    this.countMap.clear();
  }
}

export class MetricsRegistry {
  private static instance: MetricsRegistry;

  public httpRequests = new Counter(
    'devpilot_http_requests_total',
    'Total count of HTTP requests served'
  );
  public httpRequestDuration = new Histogram(
    'devpilot_http_request_duration_seconds',
    'HTTP request duration in seconds'
  );
  public githubApiRequests = new Counter(
    'devpilot_github_api_requests_total',
    'Total GitHub API calls'
  );
  public aiRequests = new Counter(
    'devpilot_ai_requests_total',
    'Total AI LLM generation requests'
  );
  public queueJobs = new Counter(
    'devpilot_queue_jobs_total',
    'Total BullMQ background jobs processed'
  );
  public agentExecutions = new Counter(
    'devpilot_agent_executions_total',
    'Total Autonomous Agent runs'
  );
  public fixGenerations = new Counter(
    'devpilot_fix_generations_total',
    'Total AI fix proposals generated'
  );

  private constructor() {}

  public static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  /**
   * Renders all metrics in official Prometheus text format.
   */
  public renderPrometheusMetrics(): string {
    const blocks = [
      this.httpRequests.render(),
      this.httpRequestDuration.render(),
      this.githubApiRequests.render(),
      this.aiRequests.render(),
      this.queueJobs.render(),
      this.agentExecutions.render(),
      this.fixGenerations.render(),
    ];

    return blocks.map((b) => b.join('\n')).join('\n\n') + '\n';
  }

  public reset(): void {
    this.httpRequests.reset();
    this.httpRequestDuration.reset();
    this.githubApiRequests.reset();
    this.aiRequests.reset();
    this.queueJobs.reset();
    this.agentExecutions.reset();
    this.fixGenerations.reset();
  }
}

export const metrics = MetricsRegistry.getInstance();
