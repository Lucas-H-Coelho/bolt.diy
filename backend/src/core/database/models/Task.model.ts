import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { Agent } from './Agent.model';
import { Project } from './Project.model';
import { User } from './User.model';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TaskType })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.NORMAL })
  priority: TaskPriority;

  @Column('jsonb')
  payload: any;

  @Column('jsonb', { nullable: true })
  result: any;

  @Column('jsonb', { nullable: true })
  error: any;

  @ManyToOne(() => Agent)
  agent: Agent;

  @ManyToOne(() => Project, { nullable: true })
  project: Project;

  @ManyToOne(() => User)
  owner: User;

  @Column({ type: 'integer', default: 0 })
  progress: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduledFor: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
