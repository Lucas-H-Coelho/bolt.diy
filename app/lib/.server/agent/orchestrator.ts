import { streamText } from '../llm/stream-text';
import type { Task, ExecutionResult } from './types';
import { PROVIDER_LIST, DEFAULT_PROVIDER } from '../../../utils/constants';
import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';

// llmCall agora recebe o contexto
async function llmCall(prompt: string, systemPrompt: string, context: ActionFunctionArgs): Promise<string> {
  const provider = PROVIDER_LIST.find(p => p.name === 'OpenAI') || DEFAULT_PROVIDER;
  
  const cookieHeader = context.request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  const result = await streamText({
    messages: [{ role: 'user', content: prompt }],
    options: { system: systemPrompt },
    apiKeys,
    providerSettings,
    env: context.context.cloudflare?.env,
  });

  let fullResponse = '';
  for await (const delta of result.textStream) {
    fullResponse += delta;
  }
  return fullResponse;
}

export class AgentOrchestrator {
  private context: ActionFunctionArgs;

  constructor(context: ActionFunctionArgs) {
    this.context = context;
  }

  async execute(task: Task): Promise<ExecutionResult> {
    try {
      // Etapa 1: Agente de Análise - Planeja os passos
      const planningPrompt = `Analyze the following user request and create a step-by-step plan to accomplish it. The request is: "${task.prompt}"`;
      const planningSystemPrompt = "You are a planning agent. Your goal is to break down complex tasks into a sequence of simple, actionable steps. Respond only with the numbered plan.";
      
      const plan = await llmCall(planningPrompt, planningSystemPrompt, this.context);

      // Etapa 2: Agente de Geração de Código - Executa o plano
      const executionPrompt = `Based on the following plan, generate the necessary code or response. Plan:\n${plan}\n\nOriginal request: "${task.prompt}"`;
      const executionSystemPrompt = "You are a code generation agent. Execute the provided plan and generate the final output. Respond only with the code or final text, without explanations.";

      const finalOutput = await llmCall(executionPrompt, executionSystemPrompt, this.context);

      return {
        taskId: task.id,
        status: 'completed',
        output: finalOutput,
        artifacts: {
          plan: plan,
        },
      };
    } catch (error) {
      return {
        taskId: task.id,
        status: 'failed',
        output: '',
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }
}