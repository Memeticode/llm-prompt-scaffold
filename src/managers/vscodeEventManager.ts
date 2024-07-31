import * as vscode from 'vscode';
import { BaseManager } from './baseManager';
import { WorkspaceConfigCacheType, ExtensionConfigurationManager } from './extensionConfigurationManager';
import { ExtensionStorageManager } from './extensionStorageManager';
import { VscodeWorkspaceUtils } from '../utils/vscodeWorkspaceUtils';

export class VscodeEventManager extends BaseManager {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private configManager: ExtensionConfigurationManager,
        private storageManager: ExtensionStorageManager
    ) {
        super(logName, outputChannel);
    }

    initializeEventListeners(): void {
        this.logMessage(`Registering listener for workspace onDidChangeWorkspaceFolders event`);
        vscode.workspace.onDidChangeWorkspaceFolders(this.handleWorkspaceFoldersChanged.bind(this));

        this.logMessage(`Registering listener for configManager onWorkspaceConfigCacheValueChanged event`);
        this.configManager.onWorkspaceConfigCacheValueChanged(this.handleWorkspaceConfigCacheValueChanged.bind(this));
        
    }


    private handleWorkspaceConfigCacheValueChanged(workspace: vscode.WorkspaceFolder, key: keyof WorkspaceConfigCacheType, oldValue: any, newValue: any): void {
        this.logMessage(`Handling workspace config cached value change for workspace: ${workspace.name}`);
        try
        {
            if (key === 'storageDirName' && oldValue !== newValue) {
                this.storageManager.handleStorageFolderNameConfigurationChangeAsync(workspace, oldValue as string, newValue as string);
            }
        }
        catch (error) 
        {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(errorMessage);
            vscode.window.showErrorMessage(`Error occurred when handling workspace config cached value change: ${errorMessage}`);
            throw error;
        }
    }
    

    private async handleWorkspaceFoldersChanged(event: vscode.WorkspaceFoldersChangeEvent): Promise<void> {
        const oldRoot = this.configManager.getCachedRootWorkspace();
        const currentRoot = vscode.workspace.workspaceFolders?.[0];

        // Handle changed root workspace
        if ((oldRoot && currentRoot) 
            && (currentRoot.uri.toString() !== oldRoot.uri.toString())) 
        {
            this.logMessage(`Root workspace changed from ${oldRoot} to ${currentRoot.name}`);
            await this.handleRootWorkspaceChangeAsync(oldRoot, currentRoot);
        }
 
        // Handle removed folders
        for (const removedFolder of event.removed) {
            await this.storageManager.cleanupStorageFolderAsync(removedFolder);
        }

        // Handle added folders
        for (const addedFolder of event.added) {
            await this.storageManager.initializeStorageFolderAsync(addedFolder);
        }
   }

    private async handleRootWorkspaceChangeAsync(oldRoot: vscode.WorkspaceFolder, newRoot: vscode.WorkspaceFolder): Promise<void> {
        if (oldRoot && await VscodeWorkspaceUtils.workspaceExistsAsync(oldRoot)) 
        {
            await this.storageManager.migrateRootWorkspaceStorageFolderItems(oldRoot, newRoot);
        } else {
            // Initialize new root workspace storage folder
            this.logMessage(`Old root workspace storage folder not found, initializing`);
            await this.storageManager.initializeStorageFolderAsync(newRoot);
        }

        // Update the cached root workspace
        this.configManager.updateCachedRootWorkspace(newRoot);
    }
}