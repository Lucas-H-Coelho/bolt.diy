import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Task } from '../models/Task.model';

@Injectable()
export class TaskRepository extends Repository<Task> {
  constructor(
    @InjectRepository(Task)
    private repository: Repository<Task>
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  async createTask(taskData: CreateTaskDto): Promise<Task> {
    const task = this.repository.create({
      ...taskData,
      status: TaskStatus.PENDING,
      progress: 0,
      createdAt: new Date(),
    });

    return await this.repository.save(task);
  }

  async findPendingTasks(limit = 50): Promise<Task[]> {
    return this.repository.find({
      where: {
        status: TaskStatus.PENDING,
        scheduledFor: LessThanOrEqual(new Date()),
      },
      order: { priority: 'DESC', createdAt: 'ASC' },
      take: limit,
    });
  }

  async updateTaskProgress(taskId: string, progress: number): Promise<void> {
    await this.repository.update(taskId, {
      progress,
      updatedAt: new Date(),
    });
  }

  async completeTask(taskId: string, result: any): Promise<void> {
    await this.repository.update(taskId, {
      status: TaskStatus.COMPLETED,
      result,
      progress: 100,
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async failTask(taskId: string, error: any): Promise<void> {
    await this.repository.update(taskId, {
      status: TaskStatus.FAILED,
      error,
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
