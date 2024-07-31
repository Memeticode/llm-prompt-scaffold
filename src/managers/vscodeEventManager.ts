import * as vscode from 'vscode';
import { BaseManager } from './baseManager';
import { WorkspaceConfigCacheType, ExtensionConfigurationManager } from './extensionConfigurationManager';
import { ExtensionStorageManager } from './extensionStorageManager';
import { ExtensionUtils } from '../utils/extensionUtils';
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

    
    async initializeEventListenersAndCheckRootworkspaceAsync(): Promise<vscode.Disposable[]> {
        const disposables: vscode.Disposable[] = [];

        this.logMessage(`Registering listener for workspace onDidChangeWorkspaceFolders event`);
        disposables.push(vscode.workspace.onDidChangeWorkspaceFolders(this.handleWorkspaceFoldersChangedAsync.bind(this)));


        this.logMessage(`Registering listener for configuration changes`);
        disposables.push(vscode.workspace.onDidChangeConfiguration(this.handleConfigurationChangedAsync.bind(this)));

        const currentRoot = vscode.workspace.workspaceFolders?.[0];
        const cachedRoot = this.configManager.getCachedRootWorkspace();
        if (currentRoot && (!cachedRoot || currentRoot.uri.toString() !== cachedRoot.uri.toString())) {
            this.outputChannel.appendLine('Root workspace change detected on activation');
            await this.handleRootWorkspaceFolderChangedAsync(cachedRoot, currentRoot);
        }

        return disposables;
    }

    private async handleConfigurationChangedAsync(event: vscode.ConfigurationChangeEvent): Promise<void> {
        if (event.affectsConfiguration('llmPromptScaffold.extensionStorageDirectory')) {
            this.logMessage('Extension storage directory configuration changed');
            
            const workspaces = vscode.workspace.workspaceFolders || [];
            for (const workspace of workspaces) {
                if (event.affectsConfiguration('llmPromptScaffold.extensionStorageDirectory', workspace.uri)) {
                    this.logMessage(`Configuration changed for workspace: ${workspace.name}`);
                    const newValue = ExtensionUtils.getExtensionStorageFolderName(workspace);
                    await this.configManager.updateStorageDirectoryAsync(workspace, newValue);
                    await this.updateStorageDirectoryForWorkspaceAsync(workspace);
                }
            }
    
            if (event.affectsConfiguration('llmPromptScaffold.extensionStorageDirectory', undefined)) {
                this.logMessage('User-level configuration changed');
                await this.handleUserExtensionStorageDirectoryChangedAsync();
            }
        }
    }


    private async updateStorageDirectoryForWorkspaceAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        const oldStorageDirName = this.configManager.getCachedStorageDirectory(workspace);
        const newStorageDirName = ExtensionUtils.getExtensionStorageFolderName(workspace);
        
        this.logMessage(`Checking storage directory for workspace ${workspace.name}:`);
        this.logMessage(`  Old (cached): ${oldStorageDirName}`);
        this.logMessage(`  New (current config): ${newStorageDirName}`);
        
        if (oldStorageDirName !== newStorageDirName && oldStorageDirName !== undefined && newStorageDirName !== undefined) {
            this.logMessage(`Storage directory name changed for workspace ${workspace.name}: ${oldStorageDirName} -> ${newStorageDirName}`);
            await this.storageManager.handleStorageFolderNameConfigurationChangeAsync(workspace, oldStorageDirName, newStorageDirName);
        } else {
            this.logMessage(`No change or undefined values for workspace ${workspace.name}. Old: ${oldStorageDirName}, New: ${newStorageDirName}`);
        }
    }
    
    private async handleUserExtensionStorageDirectoryChangedAsync(): Promise<void> {
        const newUserSetting = vscode.workspace.getConfiguration('llmPromptScaffold').get<string>('extensionStorageDirectory');
        this.logMessage(`User-level storage directory setting changed to: ${newUserSetting}`);
        
        // Update the default for new workspaces
        this.configManager.updateDefaultStorageDirectory(newUserSetting);
    
        // For existing workspaces, we only update if they don't have a workspace-specific or folder-specific setting
        const workspaces = vscode.workspace.workspaceFolders || [];
        for (const workspace of workspaces) {
            const workspaceConfig = vscode.workspace.getConfiguration('llmPromptScaffold', workspace.uri);
            const hasWorkspaceOrFolderSetting = workspaceConfig.inspect('extensionStorageDirectory')?.workspaceValue !== undefined 
                                             || workspaceConfig.inspect('extensionStorageDirectory')?.workspaceFolderValue !== undefined;
            
            if (!hasWorkspaceOrFolderSetting) {
                await this.updateStorageDirectoryForWorkspaceAsync(workspace);
            }
        }
    }

    async handleWorkspaceFoldersChangedAsync(event: vscode.WorkspaceFoldersChangeEvent): Promise<void> {
        this.logMessage(`Handling workspace folders changed event: added ${event.added.length}, removed ${event.removed.length}`);
    
        const oldRoot = this.configManager.getCachedRootWorkspace();
        const currentRoot = vscode.workspace.workspaceFolders?.[0];
        
        //this.logMessage(`Old root: ${oldRoot?.name}, Current root: ${currentRoot?.name}`);
    
        // Handle changed root workspace
        if (currentRoot && (!oldRoot || currentRoot.uri.toString() !== oldRoot.uri.toString())) {
            this.logMessage(`Root workspace change detected: ${oldRoot?.name} -> ${currentRoot.name}`);
            await this.handleRootWorkspaceFolderChangedAsync(oldRoot, currentRoot);
        } 
 
        // Handle removed folders
        for (const removedFolder of event.removed) {
            await this.storageManager.deleteExtensionStorageForWorkspaceFolderAsync(removedFolder);
        }

        // Handle added folders
        for (const addedFolder of event.added) {
            await this.storageManager.initializeExtensionStorageForWorkspaceFolderAsync(addedFolder);
        }
    }

    async checkAndHandleRootWorkspaceChangeAsync(): Promise<void> {
        const currentRoot = vscode.workspace.workspaceFolders?.[0];
        const cachedRoot = this.configManager.getCachedRootWorkspace();
        if (currentRoot && (!cachedRoot || currentRoot.uri.toString() !== cachedRoot.uri.toString())) {
            this.outputChannel.appendLine('Root workspace change detected');
            await this.handleRootWorkspaceFolderChangedAsync(cachedRoot, currentRoot);
        }
    }
    private async handleRootWorkspaceFolderChangedAsync(oldRoot: vscode.WorkspaceFolder | undefined, newRoot: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Root workspace changed from ${oldRoot?.name || 'none'} to ${newRoot.name}`);
        
        if (oldRoot && await VscodeWorkspaceUtils.workspaceExistsAsync(oldRoot)) {
            await this.storageManager.handleRootWorkspaceFolderChangeAsync(oldRoot, newRoot);
        } else {
            // If old root doesn't exist or there was no previous root, initialize the new root
            await this.storageManager.initializeExtensionStorageForWorkspaceFolderAsync(newRoot);
        }

        this.configManager.updateCachedRootWorkspace(newRoot);
    }


}