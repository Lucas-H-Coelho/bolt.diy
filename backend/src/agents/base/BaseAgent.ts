export abstract class BaseAgent implements IAgent {
  protected runtime: AgentRuntime;
  protected memory: AgentMemory;
  protected logger: Logger;
  protected eventBus: EventBus;

  constructor(
    public readonly id: string,
    public readonly type: AgentType,
    protected config: AgentConfig
  ) {
    this.memory = new AgentMemory(id);
    this.logger = new Logger(`Agent:${type}:${id}`);
    this.eventBus = EventBus.getInstance();
  }

  abstract execute(task: Task): Promise<TaskResult>;

  async initialize(config: AgentConfig): Promise<void> {
    this.logger.info("Initializing agent", { agentId: this.id, type: this.type });

    // Load persistent state
    await this.loadState();

    // Initialize memory system
    await this.memory.initialize();

    // Register event handlers
    this.registerEventHandlers();

    this.status = AgentStatus.READY;
    this.logger.info("Agent initialized successfully");
  }

  protected async saveState(): Promise<void> {
    const state: AgentState = {
      id: this.id,
      type: this.type,
      status: this.status,
      memory: this.memory.serialize(),
      config: this.config,
      lastActive: new Date(),
    };

    await StateStorage.save(`agent:${this.id}`, state);
  }

  protected async loadState(): Promise<void> {
    const savedState = await StateStorage.load<AgentState>(`agent:${this.id}`);
    if (savedState) {
      this.status = savedState.status;
      this.memory.deserialize(savedState.memory);
      this.config = { ...this.config, ...savedState.config };
    }
  }
}
