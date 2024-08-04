export class ExtensionStorageManager extends BaseLoggable {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private extensionStateManager: ExtensionStateManager
    ) {
        super(logName, outputChannel);
    }
    async initializeStorageForWorkspaceAsync(workspace: vscode.WorkspaceFolder): Promise<void>;
    async cleanupStorageForWorkspaceAsync(workspace: vscode.WorkspaceFolder): Promise<void>;
    async generatePromptOutFilesAsync(workspace: vscode.WorkspaceFolder): Promise<void>;
    async generatePromptOutFileIfNotExistsAsync(workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES): Promise<vscode.Uri>;
    async generatePromptOutFileAsync(workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES): Promise<vscode.Uri>;
    async updateStorageFolderNameAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void>;
    getStorageFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri;
    getConfigFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri;
    getOutFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri;
    getConfigFileUri(workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES): vscode.Uri;
    getOutFileUri(workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES): vscode.Uri;
}


export class StorageInitializationHelper {
    static async createStorageFolder(uri: vscode.Uri): Promise<void>;
    static async initializeConfigFolder(configFolderUri: vscode.Uri): Promise<void>;
    static async initializeOutFolder(outFolderUri: vscode.Uri): Promise<void>;
    static async updateWorkspaceExcludeSetting(workspace: vscode.WorkspaceFolder, folderName: string): Promise<void>;
}

export class PromptGenerator {
    static async generatePromptOutSystemPrompt(sourceUri: vscode.Uri, outUri: vscode.Uri): Promise<void>;
    static async generateProjectDescription(sourceUri: vscode.Uri, outUri: vscode.Uri): Promise<void>;
    static async generateCurrentGoals(sourceUri: vscode.Uri, outUri: vscode.Uri): Promise<void>;
    static async generateFileStructure(workspace: vscode.WorkspaceFolder, outUri: vscode.Uri): Promise<void>;
    static async generateFileContent(workspace: vscode.WorkspaceFolder, outUri: vscode.Uri): Promise<void>;
}

export class FileFilterHelper {
    static async createStructureFilter(workspace: vscode.WorkspaceFolder): Promise<FileFilter>;
    static async createContentFilter(workspace: vscode.WorkspaceFolder): Promise<FileFilter>;
}