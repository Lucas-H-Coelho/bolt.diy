import express, { Request, Response } from 'express';
import { AgentRuntime } from '../../agents/runtime/AgentRuntime';

export const agentsRouter = express.Router();

agentsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { type, config } = req.body;
    const runtime = AgentRuntime.getInstance();

    const agent = await runtime.createAgent(type, config);

    res.status(201).json({
      success: true,
      data: {
        id: agent.id,
        type: agent.type,
        status: agent.status,
        capabilities: agent.capabilities,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

agentsRouter.get('/', async (req: Request, res: Response) => {
  const runtime = AgentRuntime.getInstance();
  const agents = runtime.listAgents();

  res.json({
    success: true,
    data: agents,
    count: agents.length,
  });
});

agentsRouter.post('/:agentId/tasks', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const task = req.body;

    const runtime = AgentRuntime.getInstance();
    const result = await runtime.executeTask(agentId, task);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

agentsRouter.get('/:agentId/status', async (req: Request, res: Response) => {
  const { agentId } = req.params;
  const runtime = AgentRuntime.getInstance();

  const status = runtime.getAgentStatus(agentId);

  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
  }

  res.json({
    success: true,
    data: { status },
  });
});

agentsRouter.delete('/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const runtime = AgentRuntime.getInstance();

    await runtime.terminateAgent(agentId);

    res.json({
      success: true,
      message: 'Agent terminated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// WebSocket routes for real-time updates
agentsRouter.ws('/events', (ws: WebSocket, req: Request) => {
  const eventBus = EventBus.getInstance();

  const handleEvent = (event: string, data: any) => {
    ws.send(JSON.stringify({ event, data }));
  };

  // Subscribe to agent events
  eventBus.on('agent.created', handleEvent);
  eventBus.on('agent.terminated', handleEvent);
  eventBus.on('task.started', handleEvent);
  eventBus.on('task.completed', handleEvent);
  eventBus.on('task.failed', handleEvent);

  ws.on('close', () => {
    eventBus.off('agent.created', handleEvent);
    eventBus.off('agent.terminated', handleEvent);
    eventBus.off('task.started', handleEvent);
    eventBus.off('task.completed', handleEvent);
    eventBus.off('task.failed', handleEvent);
  });
});
