@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'enum', enum: AgentType })
  type: AgentType

  @Column({ type: 'enum', enum: AgentStatus, default: AgentStatus.CREATED })
  status: AgentStatus

  @Column('jsonb')
  config: AgentConfig

  @Column('jsonb', { nullable: true })
  state: any

  @Column('jsonb')
  capabilities: AgentCapability[]

  @Column('jsonb', { nullable: true })
  memory: any

  @ManyToOne(() => User)
  owner: User

  @OneToMany(() => Task, task => task.agent)
  tasks: Task[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
