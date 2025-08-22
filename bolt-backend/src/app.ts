import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { AppDataSource } from './config/database.config'
import { AgentRuntime } from './agents/runtime/AgentRuntime'
import { MessageBus } from './services/communication/MessageBus'
import { MetricsService } from './services/monitoring/MetricsService'
import { agentsRouter } from './api/routes/agents.routes'
import { projectsRouter } from './api/routes/projects.routes'
import { tasksRouter } from './api/routes/tasks.routes'
import { authMiddleware } from './api/middleware/auth.middleware'
import { loggingMiddleware } from './api/middleware/logging.middleware'
import { errorMiddleware } from './api/middleware/error.middleware'

export class BoltBackendApp {
  private app: express.Application
  private server: any
  private io: Server
  private runtime: AgentRuntime
  private messageBus: MessageBus
  private metricsService: MetricsService
  private logger: Logger

  constructor() {
    this.app = express()
    this.server = createServer(this.app)
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    })
    
    this.logger = new Logger('BoltBackendApp')
    this.metricsService = new MetricsService()
    this.messageBus = MessageBus.getInstance()
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Bolt Backend Application')

    // Initialize database connection
    await this.initializeDatabase()
    
    // Initialize services
    await this.initializeServices()
    
    // Setup middleware
    this.setupMiddleware()
    
    // Setup routes
    this.setupRoutes()
    
    // Setup WebSocket handlers
    this.setupWebSocketHandlers()
    
    // Setup error handling
    this.setupErrorHandling()
    
    this.logger.info('Application initialized successfully')
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await AppDataSource.initialize()
      this.logger.info('Database connection established')
      
      // Run migrations if needed
      if (process.env.NODE_ENV !== 'production') {
        await AppDataSource.runMigrations()
        this.logger.info('Database migrations completed')
      }
    } catch (error) {
      this.logger.error('Database initialization failed', { error })
      throw error
    }
  }

  private async initializeServices(): Promise<void> {
    // Initialize Message Bus
    await this.messageBus.start()
    
    // Initialize Agent Runtime
    this.runtime = new AgentRuntime({
      maxAgents: parseInt(process.env.MAX_AGENTS || '50'),
      queue: {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD
        }
      }
    }, this.logger)
    
    await this.runtime.start()
    
    // Start metrics collection
    this.metricsService.startPeriodicUpdates()
    
    this.logger.info('Core services initialized')
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet())
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }))
    
    // Compression
    this.app.use(compression())
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))
    
    // Rate limiting
    this.app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP'
    }))
    
    // Logging middleware
    this.app.use(loggingMiddleware)
    
    // Authentication middleware (for protected routes)
    this.app.use('/api/agents', authMiddleware)
    this.app.use('/api/projects', authMiddleware)
    this.app.use('/api/tasks', authMiddleware)
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      })
    })
    
    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', this.metricsService.getContentType())
      res.end(await this.metricsService.getMetrics())
    })
    
    // API routes
    this.app.use('/api/agents', agentsRouter)
    this.app.use('/api/projects', projectsRouter)
    this.app.use('/api/tasks', tasksRouter)
    
    // Default 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      })
    })
  }

  private setupWebSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      this.logger.info('Client connected', { socketId: socket.id })
      
      // Authenticate socket connection
      socket.on('authenticate', async (token) => {
        try {
          const user = await this.authenticateSocket(token)
          socket.data.user = user
          socket.emit('authenticated', { user: { id: user.id, username: user.username } })
        } catch (error) {
          socket.emit('authentication_failed', { error: error.message })
          socket.disconnect()
        }
      })
      
      // Subscribe to agent events for authenticated users
      socket.on('subscribe:agents', () => {
        if (!socket.data.user) {
          socket.emit('error', { message: 'Not authenticated' })
          return
        }
        
        socket.join(`user:${socket.data.user.id}:agents`)
      })
      
      // Handle task execution requests
      socket.on('execute:task', async (data) => {
        if (!socket.data.user) {
          socket.emit('error', { message: 'Not authenticated' })
          return
        }
        
        try {
          const { agentId, task } = data
          const result = await this.runtime.executeTask(agentId, {
            ...task,
            userId: socket.data.user.id
          })
          
          socket.emit('task:result', result)
        } catch (error) {
          socket.emit('task:error', { error: error.message })
        }
      })
      
      socket.on('disconnect', () => {
        this.logger.info('Client disconnected', { socketId: socket.id })
      })
    })
    
    // Relay system events to connected clients
    this.messageBus.subscribe('agent.created', (data) => {
      this.io.to(`user:${data.userId}:agents`).emit('agent:created', data)
    })
    
    this.messageBus.subscribe('task.completed', (data) => {
      this.io.to(`user:${data.userId}:agents`).emit('task:completed', data)
    })
    
    this.messageBus.subscribe('task.failed', (data) => {
      this.io.to(`user:${data.userId}:agents`).emit('task:failed', data)
    })
  }

  private setupErrorHandling(): void {
    this.app.use(errorMiddleware)
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Promise Rejection', { reason, promise })
      // Don't exit in production, but log for monitoring
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1)
      }
    })
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', { error })
      process.exit(1)
    })
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received, shutting down gracefully')
      this.shutdown()
    })
    
    process.on('SIGINT', () => {
      this.logger.info('SIGINT received, shutting down gracefully')
      this.shutdown()
    })
  }

  async start(port: number = 8000): Promise<void> {
    await this.initialize()
    
    this.server.listen(port, () => {
      this.logger.info(`Server running on port ${port}`)
      console.log(`🚀 Bolt Backend running on http://localhost:${port}`)
      console.log(`📊 Metrics available at http://localhost:${port}/metrics`)
      console.log(`🏥 Health check at http://localhost:${port}/health`)
    })
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down application')
    
    // Close server
    if (this.server) {
      this.server.close()
    }
    
    // Shutdown agent runtime
    if (this.runtime) {
      await this.runtime.shutdown()
    }
    
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy()
    }
    
    this.logger.info('Application shutdown complete')
    process.exit(0)
  }

  private async authenticateSocket(token: string): Promise<any> {
    // Implement JWT token verification
    const jwtService = new JWTService()
    return await jwtService.verifyToken(token)
  }
}
