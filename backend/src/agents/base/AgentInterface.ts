export interface IAgent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  memory: AgentMemory;
  capabilities: AgentCapability[];

  initialize(config: AgentConfig): Promise<void>;
  execute(task: Task): Promise<TaskResult>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  terminate(): Promise<void>;
  getState(): AgentState;
  setState(state: AgentState): Promise<void>;
}
