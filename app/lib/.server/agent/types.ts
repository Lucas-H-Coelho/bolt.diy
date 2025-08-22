export interface Task {
  id: string;
  prompt: string;
  context?: Record<string, any>;
}

export interface ExecutionResult {
  taskId: string;
  status: 'completed' | 'failed' | 'in-progress';
  output: string;
  artifacts?: Record<string, any>;
  error?: string;
}

export interface Agent {
  id: string;
  name: string;
  config: AgentConfig;
  execute(task: Task): Promise<ExecutionResult>;
}

export interface AgentConfig {
  model: string;
  provider: string;
  systemPrompt: string;
}