import * as vscode from 'vscode';
import { BaseManager } from './baseManager';
import { ConfigurationManager } from './configurationManager';
import { FileSystemManager } from './fileSystemManager';
import { STORAGE_FOLDER_STRUCTURE, SYSTEM_FILES, WORKSPACE_FILES } from '../constants/extensionStorageFolderItems';

/*
ExtensionStorageFolderManager is responsible for managing the extension storage folders and files.

*/
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
        this.logMessage(`Root workspace change handling completed`);
        // Note: We're not calling validateStorageFoldersAsync here as it will be called during initialization
    }

    async handleStorageFolderNameConfigurationChangeAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
        this.logMessage(`Handling storage folder name change for workspace ${workspace.name} from ${oldName} to ${newName}`);
        const oldUri = vscode.Uri.joinPath(workspace.uri, oldName);
        const newUri = vscode.Uri.joinPath(workspace.uri, newName);            
        try {
            if (await this.fileSystemManager.directoryExistsAsync(oldUri)) {
                this.logMessage(`Renaming directory from ${oldUri.fsPath} to ${newUri.fsPath}`);
                await this.fileSystemManager.moveDirectoryAsync(oldUri.fsPath, newUri.fsPath);
            } else {
                this.logMessage(`Old directory doesn't exist for workspace ${workspace.name}. Creating new directory.`);
                await this.fileSystemManager.createDirectoryIfNotExistsAsync(newUri);
            }

            // Update the files.exclude setting
            await this.updateWorkspaceFilesExcludeSettingAsync(workspace, oldName, newName);
        } catch (error) {
            this.logError(`Error updating directory for workspace ${workspace.name}: ${error}`);
            throw error; // Propagate the error to be handled in the calling method
        }
    }

    private async updateWorkspaceFilesExcludeSettingAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('files', workspace.uri);
        const exclude = config.get('exclude') as { [key: string]: boolean };

        // Remove the old pattern
        if (exclude[`**/${oldName}`]) {
            delete exclude[`**/${oldName}`];
        }

        // Add the new pattern
        exclude[`**/${newName}`] = true;

        // Update the configuration
        await config.update('exclude', exclude, vscode.ConfigurationTarget.Workspace);
        this.logMessage(`Updated files.exclude setting for workspace ${workspace.name}`);
    }
    
    isRootWorkspace(workspace: vscode.WorkspaceFolder): boolean {
        return vscode.workspace.workspaceFolders?.[0] === workspace;
    }

    async validateStorageFoldersAsync(): Promise<void> {
        this.logMessage('Validating storage folders for all workspaces');
        const workspaces = await this.fileSystemManager.getAllWorkspacesAsync();
    
        for (const workspace of workspaces) {
            const isRoot = this.isRootWorkspace(workspace);
            const storageFolderUri = this.getStorageFolderUri(workspace);
            
            this.logMessage(`Validating workspace: ${workspace.name}, isRoot: ${isRoot}, storageFolderUri: ${storageFolderUri.fsPath}`);

            const hasWorkspaceInfo = await this.fileSystemManager.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO));
            const hasSystemInfo = await this.fileSystemManager.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO));
            const hasOut = await this.fileSystemManager.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.OUT));
    
            this.logMessage(`Workspace ${workspace.name}: hasWorkspaceInfo: ${hasWorkspaceInfo}, hasSystemInfo: ${hasSystemInfo}, hasOut: ${hasOut}`);
    
            if (isRoot) {
                // validate extension folder in project root workspace has all required folders
                let missingExtensionFolders: string = '';
                if (!hasSystemInfo) { missingExtensionFolders += STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO; }
                if (!hasOut) { missingExtensionFolders += `${missingExtensionFolders ? ', ' : ''}` + STORAGE_FOLDER_STRUCTURE.OUT; }
                if (!hasWorkspaceInfo) { missingExtensionFolders += `${missingExtensionFolders ? ', ' : ''}` + STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO; } 

                if (missingExtensionFolders)
                {
                    const message = `Root workspace ${workspace.name} is missing required folders in extension directory '${storageFolderUri}' (${missingExtensionFolders}). Would you like to initialize them?`;
                    this.logMessage(message);
                    const action = await vscode.window.showWarningMessage(message, 'Initialize', 'Ignore');
                    if (action === 'Initialize') {
                        await this.initializeStorageFolderAsync(workspace);
                    }
                }
            } else {
                // validate extension folder not in project root workspace has all required folders
                if (!hasWorkspaceInfo) {  
                    const message = `Root workspace ${workspace.name} is missing workspace info folder in workspace's extension directory '${storageFolderUri}' (${STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO}). Would you like to initialize them?`;
                    this.logMessage(message);
                    const action = await vscode.window.showWarningMessage(message, 'Initialize', 'Ignore');
                    if (action === 'Initialize') {
                        await this.initializeStorageFolderAsync(workspace);
                    }
                }
                // and validate that it does not have the system info folders
                let unexpectedExtensionFolders: string = '';
                if (hasSystemInfo) { unexpectedExtensionFolders += STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO; }
                if (hasOut) { unexpectedExtensionFolders += `${unexpectedExtensionFolders ? ', ' : ''}` + STORAGE_FOLDER_STRUCTURE.OUT; }
                if (unexpectedExtensionFolders)
                {
                    const message = `Found unexpected extension folders in non-root workspace ${workspace.name} extension directory '${storageFolderUri}'. These folders (${unexpectedExtensionFolders}) should only exist in the root workspace.`;
                    this.logMessage(message);
                    const action = await vscode.window.showWarningMessage(message, 'Delete', 'Ignore');
                    if (action === 'Delete') {
                        await this.deleteProjectFoldersInWorkspace(workspace, hasWorkspaceInfo, hasOut);
                    }

                }
            }
        }
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
        await this.fileSystemManager.createDirectoryIfNotExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO));
        
        if (isRoot) {
            await this.fileSystemManager.createDirectoryIfNotExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO));
            await this.fileSystemManager.createDirectoryIfNotExistsAsync(vscode.Uri.joinPath(storageFolderUri, STORAGE_FOLDER_STRUCTURE.OUT));
            await this.initializeSystemFiles(storageFolderUri);
        }
        
        await this.initializeWorkspaceFiles(workspace, storageFolderUri);

        // Hide the storage folder
        const storageFolderName = this.configManager.getExtensionStorageFolderName(workspace);
        await this.updateWorkspaceFilesExcludeSettingAsync(workspace, '', storageFolderName);
    }

    async refreshStorageFoldersAsync(): Promise<void> {
        this.logMessage('Refreshing storage folders for all workspaces');
        await this.initializeStorageFoldersAsync();
    }
    
    async refreshStorageFolderAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
        const oldUri = vscode.Uri.joinPath(workspace.uri, oldName);
        const newUri = vscode.Uri.joinPath(workspace.uri, newName);

        const oldExists = await this.fileSystemManager.directoryExistsAsync(oldUri);
        const newExists = await this.fileSystemManager.directoryExistsAsync(newUri);

        if (oldExists && newExists) {
            // Replace new folder with old folder
            await this.fileSystemManager.deleteDirectoryAsync(newUri);
            await this.fileSystemManager.moveDirectoryAsync(oldUri.fsPath, newUri.fsPath);
        } else if (oldExists) {
            // Rename old folder to new name
            await this.fileSystemManager.moveDirectoryAsync(oldUri.fsPath, newUri.fsPath);
        } else if (newExists) {
            // Initialize new folder
            await this.initializeStorageFolderAsync(workspace);
        } else {
            // Neither folder exists, create and initialize new folder
            await this.fileSystemManager.createDirectoryIfNotExistsAsync(newUri);
            await this.initializeStorageFolderAsync(workspace);
        }

        await this.validateStorageFoldersAsync();
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
    
        for (const dir of [STORAGE_FOLDER_STRUCTURE.OUT, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO]) {
            const oldPath = vscode.Uri.joinPath(oldStorageFolder, dir).fsPath;
            const newPath = vscode.Uri.joinPath(newStorageFolder, dir).fsPath;
    
            if (await this.fileSystemManager.directoryExistsAsync(vscode.Uri.file(oldPath))) {
                try {
                    await this.fileSystemManager.moveDirectoryAsync(oldPath, newPath, true);
                    this.logMessage(`Moved ${dir} folder from old root to new root workspace`);
                } catch (error) {
                    this.logError(`Failed to move ${dir} folder: ${error}`);
                    // Optionally, you might want to implement a fallback strategy here,
                    // such as copying files individually if the move operation fails
                }
            }
        }
    }

    private async deleteProjectFoldersInWorkspace(workspace: vscode.WorkspaceFolder, deleteWorkspaceInfo: boolean, deleteOut: boolean): Promise<void> {
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
        const storageFolderName = this.configManager.getExtensionStorageFolderName(workspace);
        return vscode.Uri.joinPath(workspace.uri, storageFolderName);
    }
}