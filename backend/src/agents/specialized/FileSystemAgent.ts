export class FileSystemAgent extends BaseAgent {
  private fileWatcher: FileWatcher;
  private fileValidator: FileValidator;
  private backupService: BackupService;

  async execute(task: Task): Promise<TaskResult> {
    switch (task.type) {
      case TaskType.CREATE_FILE:
        return await this.createFile(task);
      case TaskType.UPDATE_FILE:
        return await this.updateFile(task);
      case TaskType.DELETE_FILE:
        return await this.deleteFile(task);
      case TaskType.WATCH_DIRECTORY:
        return await this.watchDirectory(task);
      case TaskType.BACKUP_PROJECT:
        return await this.backupProject(task);
      default:
        throw new UnsupportedTaskError(task.type);
    }
  }

  private async createFile(task: CreateFileTask): Promise<FileOperationResult> {
    const { path, content, overwrite = false } = task.payload;

    // Validate file path
    await this.fileValidator.validatePath(path);

    // Check if file exists
    if ((await FileUtils.exists(path)) && !overwrite) {
      throw new FileExistsError(path);
    }

    // Create backup if file exists
    if (overwrite && (await FileUtils.exists(path))) {
      await this.backupService.backup(path);
    }

    // Create directory if it doesn't exist
    await FileUtils.ensureDir(dirname(path));

    // Write file with proper encoding
    await FileUtils.writeFile(path, content, { encoding: "utf8" });

    // Update file index
    await this.updateFileIndex(path, "created");

    // Log operation
    this.logger.info("File created", { path, size: content.length });

    return {
      status: "success",
      path,
      operation: "create",
      size: content.length,
      checksum: await FileUtils.checksum(path),
    };
  }

  private async watchDirectory(task: WatchDirectoryTask): Promise<FileWatchResult> {
    const { path, patterns, recursive = true } = task.payload;

    const watcher = this.fileWatcher.watch(path, {
      recursive,
      patterns,
      ignoreInitial: true,
    });

    watcher.on("add", async (filePath) => {
      await this.handleFileEvent("add", filePath);
    });

    watcher.on("change", async (filePath) => {
      await this.handleFileEvent("change", filePath);
    });

    watcher.on("unlink", async (filePath) => {
      await this.handleFileEvent("unlink", filePath);
    });

    // Store watcher reference for cleanup
    await this.memory.store("watchers", watcher);

    return {
      status: "success",
      watcherId: watcher.id,
      path,
      patterns,
      started: new Date(),
    };
  }
}
