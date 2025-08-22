export class AgentRuntime {
  private agents: Map<string, IAgent> = new Map()
  private taskQueue: TaskQueue
  private scheduler: AgentScheduler
  private orchestrator: AgentOrchestrator
  private messagebus: MessageBus
  
  constructor(
    private config: RuntimeConfig,
    private logger: Logger
  ) {
    this.taskQueue = new TaskQueue(config.queue)
    this.scheduler = new AgentScheduler(this)
    this.orchestrator = new AgentOrchestrator(this)
    this.messagebus = MessageBus.getInstance()
  }

  async start(): Promise<void> {
    this.logger.info('Starting Agent Runtime')
    
    // Initialize core services
    await this.taskQueue.start()
    await this.scheduler.start()
    await this.messagebus.start()
    
    // Load persisted agents
    await this.loadPersistedAgents()
    
    // Start health monitoring
    this.startHealthMonitoring()
    
    this.logger.info('Agent Runtime started successfully')
  }

  async createAgent(type: AgentType, config: AgentConfig): Promise<IAgent> {
    const agentId = generateId()
    const agent = AgentFactory.create(type, agentId, config)
    
    await agent.initialize(config)
    this.agents.set(agentId, agent)
    
    // Persist agent creation
    await this.persistAgentCreation(agent)
    
    this.logger.info('Agent created', { agentId, type })
    this.messagebus.publish('agent.created', { agentId, type })
    
    return agent
  }

  async executeTask(agentId: string, task: Task): Promise<TaskResult> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new AgentNotFoundError(agentId)
    }

    if (agent.status !== AgentStatus.READY) {
      // Queue task for later execution
      await this.taskQueue.add(task, { agentId })
      return { status: 'queued', taskId: task.id }
    }

    try {
      agent.status = AgentStatus.EXECUTING
      const result = await agent.execute(task)
      agent.status = AgentStatus.READY
      
      this.messagebus.publish('task.completed', { agentId, taskId: task.id, result })
      return result
      
    } catch (error) {
      agent.status = AgentStatus.ERROR
      this.logger.error('Task execution failed', { agentId, taskId: task.id, error })
      this.messagebus.publish('task.failed', { agentId, taskId: task.id, error })
      throw error
    }
  }

  async terminateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) return

    await agent.terminate()
    this.agents.delete(agentId)
    
    // Clean up persisted state
    await StateStorage.delete(`agent:${agentId}`)
    
    this.logger.info('Agent terminated', { agentId })
    this.messagebus.publish('agent.terminated', { agentId })
  }

  getAgentStatus(agentId: string): AgentStatus | null {
    return this.agents.get(agentId)?.status || null
  }

  listAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      type: agent.type,
      status: agent.status,
      capabilities: agent.capabilities,
      lastActive: agent.memory.lastActive
    }))
  }
}
