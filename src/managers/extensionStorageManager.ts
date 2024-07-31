import * as vscode from 'vscode';
import { BaseManager } from './baseManager';
import { FileSystemUtils } from '../utils/fileSystemUtils';
import { VscodeWorkspaceUtils } from '../utils/vscodeWorkspaceUtils';
import { EXTENSION_STORAGE, ExtensionUtils } from '../utils/extensionUtils';

export class ExtensionStorageManager extends BaseManager {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel
    ) {
        super(logName, outputChannel);
    }

    async initializeStorageFolderAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        const isRoot = VscodeWorkspaceUtils.isRootWorkspaceFolder(workspace);
        this.logMessage(`Initializing ${isRoot ? 'root' : ''} workspace storage folder for ${workspace.name}`);
        
        const storageFolderUri = ExtensionUtils.getExtensionStorageFolderUri(workspace);
        await FileSystemUtils.createDirectoryIfNotExistsAsync(storageFolderUri);
        
        if (isRoot) {
            await FileSystemUtils.createDirectoryIfNotExistsAsync(vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME));
            await FileSystemUtils.createDirectoryIfNotExistsAsync(vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME));
            await this.initializeProjectInfoFiles(storageFolderUri);
        }
        
        await FileSystemUtils.createDirectoryIfNotExistsAsync(vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME));
        await this.initializeWorkspaceFiles(workspace, storageFolderUri);

        // Hide the storage folder
        const storageFolderName = ExtensionUtils.getExtensionStorageFolderName(workspace);
        await this.updateWorkspaceFolderVscodeExcludeSettingAsync(workspace, '', storageFolderName);
    }
    
    async initializeStorageFoldersAsync(): Promise<void> {
        this.logMessage('Initializing storage folders for all workspace folders');
        try
        {
            // get unique workspace id from workspace code folder
            const workspaceId = vscode.workspace.workspaceFile?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
            if (!workspaceId) {
                this.outputChannel.appendLine('No valid workspace found. Unable to initialize workspace storage files. Exiting initialization.');
                return;
            }

            const workspaces = await VscodeWorkspaceUtils.getAllWorkspaceFoldersAsync();
            for (const workspace of workspaces) {
                await this.initializeStorageFolderAsync(workspace);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(errorMessage);
            vscode.window.showErrorMessage(`Failed to initialize extension storage folders: ${errorMessage}`);
            //throw error;
        }
        finally {
            await this.validateStorageFoldersAsync();
            return;
        }
    }

    async refreshStorageFoldersAsync(): Promise<void> {
        this.logMessage('Refreshing storage folders for workspace');        
        await this.clearExtensionStorageFilesAsync();
        await this.initializeStorageFoldersAsync();
        this.logMessage('Workspace storage folders refreshed');  
    }
    
    async validateStorageFoldersAsync(): Promise<void> {
        this.logMessage('Validating storage folders for all workspaces');
        const workspaces = await VscodeWorkspaceUtils.getAllWorkspaceFoldersAsync();
    
        for (const workspace of workspaces) {
            const isRoot = VscodeWorkspaceUtils.isRootWorkspaceFolder(workspace);
            const storageFolderUri = ExtensionUtils.getExtensionStorageFolderUri(workspace);
            
            this.logMessage(`Validating workspace: ${workspace.name}, isRoot: ${isRoot}, storageFolderUri: ${storageFolderUri.fsPath}`);

            const hasWorkspaceInfo = await FileSystemUtils.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME));
            const hasSystemInfo = await FileSystemUtils.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME));
            const hasOut = await FileSystemUtils.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME));
    
            this.logMessage(`Workspace ${workspace.name}: hasWorkspaceInfo: ${hasWorkspaceInfo}, hasSystemInfo: ${hasSystemInfo}, hasOut: ${hasOut}`);
    
            if (isRoot) {
                // validate extension folder in project root workspace has all required folders
                let missingExtensionFolders: string = '';
                if (!hasSystemInfo) { missingExtensionFolders += EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME; }
                if (!hasOut) { missingExtensionFolders += `${missingExtensionFolders ? ', ' : ''}` + EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME; }
                if (!hasWorkspaceInfo) { missingExtensionFolders += `${missingExtensionFolders ? ', ' : ''}` + EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME; } 

                if (missingExtensionFolders) {
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
                    const message = `Workspace ${workspace.name} is missing workspace info folder in workspace's extension directory '${storageFolderUri}' (${EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME}). Would you like to initialize it?`;
                    this.logMessage(message);
                    const action = await vscode.window.showWarningMessage(message, 'Initialize', 'Ignore');
                    if (action === 'Initialize') {
                        await this.initializeStorageFolderAsync(workspace);
                    }
                }
                // and validate that it does not have the system info folders
                let unexpectedExtensionFolders: string = '';
                if (hasSystemInfo) { unexpectedExtensionFolders += EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME; }
                if (hasOut) { unexpectedExtensionFolders += `${unexpectedExtensionFolders ? ', ' : ''}` + EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME; }
                if (unexpectedExtensionFolders) {
                    const message = `Found unexpected extension folders in non-root workspace ${workspace.name} extension directory '${storageFolderUri}'. These folders (${unexpectedExtensionFolders}) should only exist in the root workspace.`;
                    this.logMessage(message);
                    const action = await vscode.window.showWarningMessage(message, 'Delete', 'Ignore');
                    if (action === 'Delete') {
                        await this.removeRootSpecificFoldersAsync(workspace, hasWorkspaceInfo, hasOut);
                    }
                }
            }
        }
    }

    async handleStorageFolderNameConfigurationChangeAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
        this.logMessage(`Handling storage folder name change for workspace ${workspace.name} from ${oldName} to ${newName}`);
        const oldUri = vscode.Uri.joinPath(workspace.uri, oldName);
        const newUri = vscode.Uri.joinPath(workspace.uri, newName);            
        try {
            if (await FileSystemUtils.directoryExistsAsync(oldUri)) {
                this.logMessage(`Renaming directory from ${oldUri.fsPath} to ${newUri.fsPath}`);
                await FileSystemUtils.moveDirectoryAsync(oldUri, newUri, { overwrite: false }); // error if renamed directory already exists
            } else {
                this.logMessage(`Old directory doesn't exist for workspace ${workspace.name}. Creating new directory.`);
                await FileSystemUtils.createDirectoryIfNotExistsAsync(newUri);
            }
            await this.updateWorkspaceFolderVscodeExcludeSettingAsync(workspace, oldName, newName);
        } catch (error) {
            this.logError(`Error updating directory for workspace ${workspace.name}: ${error}`);
            throw error;
        }
    }

    async cleanupStorageFolderAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Cleaning up storage folder for workspace: ${workspace.name}`);
        
        const storageFolderUri = ExtensionUtils.getExtensionStorageFolderUri(workspace);
        
        try {
            if (await FileSystemUtils.directoryExistsAsync(storageFolderUri)) {
                await FileSystemUtils.deleteDirectoryAsync(storageFolderUri);
                this.logMessage(`Successfully deleted storage folder for workspace: ${workspace.name}`);
            } else {
                this.logMessage(`Storage folder for workspace ${workspace.name} doesn't exist. No cleanup needed.`);
            }
            await this.removeWorkspaceFolderVscodeExcludeSettingAsync(workspace);
        } catch (error) {
            this.logError(`Error cleaning up storage folder for workspace ${workspace.name}: ${error}`);
            throw error;
        }
    }

    async migrateRootWorkspaceStorageFolderItems(oldRoot: vscode.WorkspaceFolder, newRoot: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Migrating root workspace storage folder items from ${oldRoot.name} to ${newRoot.name}`);
        const oldStorageFolder = ExtensionUtils.getExtensionStorageFolderUri(oldRoot);
        const newStorageFolder = ExtensionUtils.getExtensionStorageFolderUri(newRoot);
    
        for (const dir of [EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME, EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME]) {
            const oldPath = vscode.Uri.joinPath(oldStorageFolder, dir);
            const newPath = vscode.Uri.joinPath(newStorageFolder, dir);
    
            if (await FileSystemUtils.directoryExistsAsync(oldPath)) {
                try {
                    await FileSystemUtils.moveDirectoryAsync(oldPath, newPath, { overwrite: true });
                    this.logMessage(`Moved ${dir} folder from old root to new root workspace`);
                } catch (error) {
                    this.logError(`Failed to move ${dir} folder: ${error}`);
                }
            }
        }
    }

    private async writeStorageFileIfNotExistsAsync(fileUri: vscode.Uri, defaultContent: string): Promise<void> {
        if (!(await FileSystemUtils.fileExistsAsync(fileUri))) {
            await FileSystemUtils.writeFileAsync(fileUri, defaultContent);
        }
    }

    private async initializeProjectInfoFiles(storageFolderUri: vscode.Uri): Promise<void> {
        this.logMessage(`Initializing project info files in ${storageFolderUri.fsPath}`);
        const projectInfoUri = vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME);
        
        for (const [fileKey, fileName] of Object.entries(EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES)) {
            const fileUri = vscode.Uri.joinPath(projectInfoUri, fileName);
            const defaultContent = await ExtensionUtils.getExtensionStorageFileDefaultContent(fileKey as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES);
            
            await this.writeStorageFileIfNotExistsAsync(fileUri, defaultContent);
            
            this.logMessage(`Initialized project info file: ${fileName}`);
        }
    }
    
    private async initializeWorkspaceFiles(workspace: vscode.WorkspaceFolder, storageFolderUri: vscode.Uri): Promise<void> {
        this.logMessage(`Initializing workspace files for ${workspace.name}`);
        const workspaceInfoUri = vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME);
        
        for (const [fileKey, fileName] of Object.entries(EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES)) {
            const fileUri = vscode.Uri.joinPath(workspaceInfoUri, fileName);
            const defaultContent = await ExtensionUtils.getExtensionStorageFileDefaultContent(fileKey as keyof typeof EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES);
            
            await this.writeStorageFileIfNotExistsAsync(fileUri, defaultContent);
            
            this.logMessage(`Initialized workspace file: ${fileName}`);
        }
    }

    private async updateWorkspaceFolderVscodeExcludeSettingAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
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


    private async removeWorkspaceFolderVscodeExcludeSettingAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        const config = vscode.workspace.getConfiguration('files', workspace.uri);
        const exclude = config.get('exclude') as { [key: string]: boolean };
        const storageFolderName = ExtensionUtils.getExtensionStorageFolderName(workspace);
        
        if (exclude[`**/${storageFolderName}`]) {
            delete exclude[`**/${storageFolderName}`];
            await config.update('exclude', exclude, vscode.ConfigurationTarget.WorkspaceFolder);
            this.logMessage(`Removed ${storageFolderName} from files.exclude for workspace ${workspace.name}`);
        }
    }
    
    private async clearExtensionStorageFilesAsync()
    {
        this.logMessage(`Clearing existing workspace storage folders`);
        const storageFolderUris = ExtensionUtils.getExtensionStorageFolderUrisMap();
        for (const [workspace, uri] of storageFolderUris) {
            this.logMessage(`Clearing existing storage in workspace folder: ${workspace.name}, Storage Folder URI: ${uri.fsPath}`);
            await FileSystemUtils.deleteDirectoryAsync(uri, { recursive: true, useTrash: false });
        }
    }
    


    private async removeRootSpecificFoldersAsync(workspace: vscode.WorkspaceFolder, deleteWorkspaceInfo: boolean, deleteOut: boolean): Promise<void> {
        const storageFolderUri = ExtensionUtils.getExtensionStorageFolderUri(workspace);
        this.logMessage(`Clearing existing workspace storage folders`);    
        if (deleteWorkspaceInfo) {
            const workspaceInfoUri = vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME);
            await FileSystemUtils.deleteDirectoryAsync(workspaceInfoUri);
            this.logMessage(`Deleted WORKSPACE_INFO folder in workspace: ${workspace.name}`);
        }
    
        if (deleteOut) {
            const outUri = vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME);
            await FileSystemUtils.deleteDirectoryAsync(outUri);
            this.logMessage(`Deleted OUT folder in workspace: ${workspace.name}`);
        }
    }
    
    
    // async refreshStorageFolderAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
    //     const oldUri = vscode.Uri.joinPath(workspace.uri, oldName);
    //     const newUri = vscode.Uri.joinPath(workspace.uri, newName);

    //     const oldExists = await FileSystemUtils.directoryExistsAsync(oldUri);
    //     const newExists = await FileSystemUtils.directoryExistsAsync(newUri);

    //     if (oldExists && newExists) {
    //         // Replace new folder with old folder
    //         await FileSystemUtils.deleteDirectoryAsync(newUri);
    //         await FileSystemUtils.moveDirectoryAsync(oldUri, newUri);
    //     } else if (oldExists) {
    //         // Rename old folder to new name
    //         await FileSystemUtils.moveDirectoryAsync(oldUri, newUri);
    //     } else if (newExists) {
    //         // Initialize new folder
    //         await this.initializeStorageFolderAsync(workspace);
    //     } else {
    //         // Neither folder exists, create and initialize new folder
    //         await FileSystemUtils.createDirectoryIfNotExistsAsync(newUri);
    //         await this.initializeStorageFolderAsync(workspace);
    //     }

    //     await this.validateStorageFoldersAsync();
    //}


}