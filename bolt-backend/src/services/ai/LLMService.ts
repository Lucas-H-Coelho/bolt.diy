export class LLMService {
  private openai: OpenAI
  private anthropic: Anthropic
  private logger: Logger

  constructor(private config: AIConfig) {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL
    })
    
    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey
    })
    
    this.logger = new Logger('LLMService')
  }

  async generateCode(prompt: string, options: CodeGenerationOptions): Promise<string> {
    const { language, temperature = 0.1, maxTokens = 4000, provider = 'openai' } = options

    try {
      let response: string

      if (provider === 'openai') {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: `You are an expert ${language} developer. Generate clean, efficient, and well-documented code.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature,
          max_tokens: maxTokens
        })
        
        response = completion.choices[0]?.message?.content || ''
      } else {
        const completion = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
        
        response = completion.content[0]?.text || ''
      }

      this.logger.info('Code generation completed', {
        provider,
        language,
        promptLength: prompt.length,
        responseLength: response.length
      })

      return response

    } catch (error) {
      this.logger.error('Code generation failed', { error, provider, language })
      throw new CodeGenerationError(error.message)
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      })

      return response.data[0].embedding
    } catch (error) {
      this.logger.error('Embedding generation failed', { error })
      throw new EmbeddingGenerationError(error.message)
    }
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    const prompt = `Analyze the following ${language} code and provide insights on:
    1. Code quality and best practices
    2. Potential bugs or issues
    3. Performance optimizations
    4. Security vulnerabilities
    5. Refactoring suggestions

    Code:
    \`\`\`${language}
    ${code}
    \`\`\`

    Provide the analysis in JSON format.`

    try {
      const response = await this.generateCode(prompt, { language: 'json' })
      return JSON.parse(response)
    } catch (error) {
      this.logger.error('Code analysis failed', { error })
      throw new CodeAnalysisError(error.message)
    }
  }
}
