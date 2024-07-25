import * as vscode from 'vscode';
import { BaseManager } from './baseManager';
import { ConfigurationManager } from './configurationManager';
import { FileSystemManager } from './fileSystemManager';
import { STORAGE_FOLDER_STRUCTURE, SYSTEM_FILES, WORKSPACE_FILES } from '../constants/extensionStorageFolderItems';

export class ExtensionStorageFolderManager extends BaseManager {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private configManager: ConfigurationManager,
        private fileSystemManager: FileSystemManager
    ) {
        super(logName, outputChannel);
    }
    

    async handleRootWorkspaceChangeAsync(oldRootWorkspace: vscode.WorkspaceFolder, newRootWorkspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Handling root workspace change from ${oldRootWorkspace.name} to ${newRootWorkspace.name}`);
        await this.migrateRootWorkspaceStorageFolderItems(oldRootWorkspace, newRootWorkspace);
        await this.cleanUpOldRoot(this.getStorageFolderUri(oldRootWorkspace));
        await this.validateStorageFoldersAsync();
    }

    async handleStorageFolderNameConfigurationChangeAsync(oldName: string, newName: string): Promise<void> {
        this.logMessage(`Handling storage folder name change from ${oldName} to ${newName}`);
        const workspaces = await this.fileSystemManager.getAllWorkspacesAsync();
        for (const workspace of workspaces) {
            const oldUri = vscode.Uri.joinPath(workspace.uri, oldName);
            const newUri = vscode.Uri.joinPath(workspace.uri, newName);
            if (await this.fileSystemManager.directoryExistsAsync(oldUri)) {
                await this.fileSystemManager.moveDirectoryAsync(oldUri.fsPath, newUri.fsPath);
            }
        }
        await this.validateStorageFoldersAsync();
    }
    
    isRootWorkspace(workspace: vscode.WorkspaceFolder): boolean {
        return vscode.workspace.workspaceFolders?.[0] === workspace;
    }

    async initializeStorageFoldersAsync(): Promise<void> {
        this.logMessage('Initializing storage folders for all workspaces');
        const workspaces = await this.fileSystemManager.getAllWorkspacesAsync();
        for (const workspace of workspaces) {
            await this.initializeStorageFolderAsync(workspace);
        }
        await this.validateStorageFoldersAsync();
    }

    async initializeStorageFolderAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        const isRoot = this.isRootWorkspace(workspace);
        this.logMessage(`Initializing ${isRoot ? 'root' : ''} workspace storage folder for ${workspace.name}`);
        
        const storageFolderUri = this.getStorageFolderUri(workspace);
        await this.fileSystemManager.createDirectoryIfNotExistsAsync(storageFolderUri);
        await this.fileSystemManager.createDirectoryIfNotExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO));
        
        if (isRoot) {
            await this.fileSystemManager.createDirectoryIfNotExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO));
            await this.fileSystemManager.createDirectoryIfNotExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.OUT));
            await this.initializeSystemFiles(storageFolderUri);
        }
        
        await this.initializeWorkspaceFiles(workspace, storageFolderUri);
    }

    async validateStorageFoldersAsync(): Promise<void> {
        this.logMessage('Validating storage folders for all workspaces');
        const workspaces = await this.fileSystemManager.getAllWorkspacesAsync();
    
        for (const workspace of workspaces) {
            const isRoot = this.isRootWorkspace(workspace);
            const storageFolderUri = this.getStorageFolderUri(workspace);
            
            const hasSystemInfo = await this.fileSystemManager.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO));
            const hasWorkspaceInfo = await this.fileSystemManager.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO));
            const hasOut = await this.fileSystemManager.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.OUT));
    
            if (!isRoot && (hasWorkspaceInfo || hasOut)) {
                const message = `Found unexpected folders in non-root workspace ${workspace.name}. These folders should only exist in the root workspace.`;
                this.logMessage(message);
                const action = await vscode.window.showWarningMessage(message, 'Delete', 'Ignore');
                if (action === 'Delete') {
                    await this.deleteProjectFolders(workspace, hasWorkspaceInfo, hasOut);
                }
            } else if (isRoot && (!hasSystemInfo || !hasWorkspaceInfo || !hasOut)) {
                const message = `Root workspace ${workspace.name} is missing required folders. Would you like to initialize them?`;
                this.logMessage(message);
                const action = await vscode.window.showWarningMessage(message, 'Initialize', 'Ignore');
                if (action === 'Initialize') {
                    await this.initializeStorageFolderAsync(workspace);
                }
            } else if (!hasSystemInfo) {
                const message = `Workspace ${workspace.name} is missing the SYSTEM_INFO folder. Would you like to initialize it?`;
                this.logMessage(message);
                const action = await vscode.window.showWarningMessage(message, 'Initialize', 'Ignore');
                if (action === 'Initialize') {
                    await this.initializeStorageFolderAsync(workspace);
                }
            }
        }
    }

    async refreshStorageFoldersAsync(): Promise<void> {
        this.logMessage('Refreshing storage folders for all workspaces');
        await this.initializeStorageFoldersAsync();
    }

    async initializeSystemFiles(storageFolderUri: vscode.Uri): Promise<void> {
        this.logMessage(`Initializing system files in ${storageFolderUri.fsPath}`);
        const systemInfoUri = vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO);
        
        for (const [fileKey, fileName] of Object.entries(SYSTEM_FILES)) {
            const fileUri = vscode.Uri.joinPath(systemInfoUri, fileName);

            const defaultContentPath = this.configManager.getExtensionStorageFileDefaultContentPath(fileKey as keyof typeof SYSTEM_FILES);
            
            await this.fileSystemManager.writeStorageFileIfNotExistsAsync(
                fileUri.fsPath,
                defaultContentPath
            );
            
            this.logMessage(`Initialized system file: ${fileName}`);
        }
    }

    async initializeWorkspaceFiles(workspace: vscode.WorkspaceFolder, storageFolderUri: vscode.Uri): Promise<void> {
        this.logMessage(`Initializing workspace files for ${workspace.name}`);
        const workspaceInfoUri = vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO);
        
        for (const [fileKey, fileName] of Object.entries(WORKSPACE_FILES)) {
            const fileUri = vscode.Uri.joinPath(workspaceInfoUri, fileName);
            const defaultContentPath = this.configManager.getExtensionStorageFileDefaultContentPath(fileKey as keyof typeof WORKSPACE_FILES);
            
            await this.fileSystemManager.writeStorageFileIfNotExistsAsync(
                fileUri.fsPath,
                defaultContentPath
            );
            
            this.logMessage(`Initialized workspace file: ${fileName}`);
        }
    }

    private async migrateRootWorkspaceStorageFolderItems(oldRoot: vscode.WorkspaceFolder, newRoot: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Migrating root workspace storage folder items from ${oldRoot.name} to ${newRoot.name}`);
        const oldStorageFolder = this.getStorageFolderUri(oldRoot);
        const newStorageFolder = this.getStorageFolderUri(newRoot);

        for (const dir of [STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO, STORAGE_FOLDER_STRUCTURE.OUT]) {
            const oldPath = vscode.Uri.joinPath(oldStorageFolder, dir);
            const newPath = vscode.Uri.joinPath(newStorageFolder, dir);

            if (await this.fileSystemManager.directoryExistsAsync(oldPath)) {
                await this.fileSystemManager.moveDirectoryAsync(oldPath.fsPath, newPath.fsPath);
            }
        }
    }

    private async cleanUpOldRoot(oldStorageFolder: vscode.Uri): Promise<void> {
        this.logMessage(`Cleaning up old root storage folder: ${oldStorageFolder.fsPath}`);
        for (const dir of [STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO, STORAGE_FOLDER_STRUCTURE.OUT]) {
            const dirPath = vscode.Uri.joinPath(oldStorageFolder, dir);
            if (await this.fileSystemManager.directoryExistsAsync(dirPath)) {
                await this.fileSystemManager.deleteDirectoryAsync(dirPath);
            }
        }

        // Optionally delete the entire storage folder if it's empty
        const storageContents = await vscode.workspace.fs.readDirectory(oldStorageFolder);
        if (storageContents.length === 0) {
            await this.fileSystemManager.deleteDirectoryAsync(oldStorageFolder);
        }
    }
    private async deleteProjectFolders(workspace: vscode.WorkspaceFolder, deleteWorkspaceInfo: boolean, deleteOut: boolean): Promise<void> {
        const storageFolderUri = this.getStorageFolderUri(workspace);
    
        if (deleteWorkspaceInfo) {
            const workspaceInfoUri = vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO);
            await this.fileSystemManager.deleteDirectoryAsync(workspaceInfoUri);
            this.logMessage(`Deleted WORKSPACE_INFO folder in workspace: ${workspace.name}`);
        }
    
        if (deleteOut) {
            const outUri = vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.OUT);
            await this.fileSystemManager.deleteDirectoryAsync(outUri);
            this.logMessage(`Deleted OUT folder in workspace: ${workspace.name}`);
        }
    }

    private getStorageFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
        const storageFolderName = this.configManager.getExtensionStorageFolderName();
        return vscode.Uri.joinPath(workspace.uri, storageFolderName);
    }
}