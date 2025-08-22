@Injectable()
export class AgentRepository extends Repository<Agent> {
  constructor(
    @InjectRepository(Agent)
    private repository: Repository<Agent>,
    private logger: Logger
  ) {
    super(repository.target, repository.manager, repository.queryRunner)
  }

  async createAgent(agentData: CreateAgentDto, userId: string): Promise<Agent> {
    const agent = this.repository.create({
      ...agentData,
      owner: { id: userId },
      status: AgentStatus.CREATED,
      createdAt: new Date()
    })

    await this.repository.save(agent)
    this.logger.info('Agent created in database', { agentId: agent.id })
    
    return agent
  }

  async findActiveAgents(userId?: string): Promise<Agent[]> {
    const query = this.repository.createQueryBuilder('agent')
      .where('agent.status IN (:...statuses)', {
        statuses: [AgentStatus.READY, AgentStatus.EXECUTING]
      })

    if (userId) {
      query.andWhere('agent.owner.id = :userId', { userId })
    }

    return query.getMany()
  }

  async updateAgentState(agentId: string, state: any): Promise<void> {
    await this.repository.update(agentId, {
      state,
      lastActive: new Date(),
      updatedAt: new Date()
    })
  }

  async getAgentWithTasks(agentId: string): Promise<Agent | null> {
    return this.repository.findOne({
      where: { id: agentId },
      relations: ['tasks', 'owner']
    })
  }
}
