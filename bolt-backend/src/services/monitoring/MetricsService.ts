export class MetricsService {
  private registry: Registry
  private httpRequests: Counter
  private agentExecutions: Counter
  private taskDuration: Histogram
  private activeAgents: Gauge
  private queueSize: Gauge
  private logger: Logger

  constructor() {
    this.registry = new Registry()
    this.logger = new Logger('MetricsService')
    this.setupMetrics()
  }

  private setupMetrics(): void {
    this.httpRequests = new Counter({
      name: 'bolt_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry]
    })

    this.agentExecutions = new Counter({
      name: 'bolt_agent_executions_total',
      help: 'Total number of agent executions',
      labelNames: ['agent_type', 'task_type', 'status'],
      registers: [this.registry]
    })

    this.taskDuration = new Histogram({
      name: 'bolt_task_duration_seconds',
      help: 'Task execution duration in seconds',
      labelNames: ['agent_type', 'task_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry]
    })

    this.activeAgents = new Gauge({
      name: 'bolt_active_agents',
      help: 'Number of currently active agents',
      labelNames: ['agent_type'],
      registers: [this.registry]
    })

    this.queueSize = new Gauge({
      name: 'bolt_queue_size',
      help: 'Number of tasks in queue',
      labelNames: ['priority'],
      registers: [this.registry]
    })
  }

  recordHttpRequest(method: string, route: string, status: number): void {
    this.httpRequests.inc({ method, route, status: status.toString() })
  }

  recordAgentExecution(agentType: string, taskType: string, status: string): void {
    this.agentExecutions.inc({ agent_type: agentType, task_type: taskType, status })
  }

  recordTaskDuration(agentType: string, taskType: string, duration: number): void {
    this.taskDuration.observe({ agent_type: agentType, task_type: taskType }, duration)
  }

  setActiveAgents(agentType: string, count: number): void {
    this.activeAgents.set({ agent_type: agentType }, count)
  }

  setQueueSize(priority: string, size: number): void {
    this.queueSize.set({ priority }, size)
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics()
  }

  // Update metrics periodically
  startPeriodicUpdates(): void {
    setInterval(async () => {
      await this.updateSystemMetrics()
    }, 30000) // Every 30 seconds
  }

  private async updateSystemMetrics(): Promise<void> {
    try {
      const runtime = AgentRuntime.getInstance()
      const agents = runtime.listAgents()
      
      // Update active agents count by type
      const agentsByType = groupBy(agents, 'type')
      Object.entries(agentsByType).forEach(([type, agentList]) => {
        this.setActiveAgents(type, agentList.length)
      })

      // Update queue sizes (if queue service is available)
      // This would require integration with your queue service

    } catch (error) {
      this.logger.error('Failed to update system metrics', { error })
    }
  }
}
