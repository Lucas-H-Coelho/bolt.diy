import { Queue, Job } from 'bullmq';

export class TaskQueue {
  private queue: Queue;
  private processor: QueueProcessor;
  private scheduler: JobScheduler;

  constructor(private config: QueueConfig) {
    this.queue = new Queue('bolt-tasks', {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.processor = new QueueProcessor(this.queue);
    this.scheduler = new JobScheduler(this.queue);
  }

  async start(): Promise<void> {
    await this.processor.start();
    await this.scheduler.start();

    // Register job processors
    this.queue.process('agent-task', 5, async (job) => {
      return await this.processAgentTask(job);
    });

    this.queue.process('scheduled-task', 2, async (job) => {
      return await this.processScheduledTask(job);
    });
  }

  async add(task: Task, options: TaskOptions = {}): Promise<Job> {
    const jobData = {
      taskId: task.id,
      agentId: options.agentId,
      task,
      priority: options.priority || TaskPriority.NORMAL,
      scheduledFor: options.scheduledFor,
    };

    const jobOptions = {
      priority: this.getPriorityWeight(options.priority),
      delay: options.scheduledFor
        ? options.scheduledFor.getTime() - Date.now()
        : 0,
      ...options.jobOptions,
    };

    return await this.queue.add('agent-task', jobData, jobOptions);
  }

  private async processAgentTask(job: Job): Promise<TaskResult> {
    const { taskId, agentId, task } = job.data;

    try {
      // Get runtime instance
      const runtime = AgentRuntime.getInstance();

      // Execute task
      const result = await runtime.executeTask(agentId, task);

      // Update job progress
      await job.progress(100);

      return result;
    } catch (error) {
      // Handle failure
      await this.handleTaskFailure(job, error);
      throw error;
    }
  }
}
