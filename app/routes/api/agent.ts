import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { AgentOrchestrator } from '../../lib/.server/agent/orchestrator';
import type { Task } from '../../lib/.server/agent/types';

export async function action(args: ActionFunctionArgs) {
  const { request } = args;
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const task = (await request.json()) as Task;

    if (!task || !task.id || !task.prompt) {
      return json({ error: 'Invalid task payload' }, { status: 400 });
    }

    const orchestrator = new AgentOrchestrator(args);
    const result = await orchestrator.execute(task);

    return json(result);
  } catch (error) {
    console.error('Error in agent API:', error);
    return json(
      { error: 'Failed to process agent task', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}