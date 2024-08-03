import * as vscode from 'vscode';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';
import { ExtensionConfigurationManager } from './extensionConfigurationManager';
import { ExtensionStorageManager } from './extensionStorageManager';
import { BaseManager } from './baseManager';

export class VscodeEventManager extends BaseManager {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private configManager: ExtensionConfigurationManager,
        private storageManager: ExtensionStorageManager
    ) {
        super(logName, outputChannel);
    }

    registerEventListeners(): void {
        this.logMessage('Registering event listeners');
        
        vscode.workspace.onDidChangeWorkspaceFolders(this.handleWorkspaceFoldersChanged.bind(this));
        vscode.workspace.onDidChangeConfiguration(this.handleConfigurationChanged.bind(this));
        
        this.logMessage('Event listeners registered');
    }

    private async handleWorkspaceFoldersChanged(event: vscode.WorkspaceFoldersChangeEvent): Promise<void> {
        this.logMessage(`Workspace folders changed: ${event.added.length} added, ${event.removed.length} removed`);

        for (const folder of event.added) {
            this.logMessage(`Initializing storage for added workspace: ${folder.name}`);
            await this.storageManager.initializeStorageForWorkspaceAsync(folder);
        }

        for (const folder of event.removed) {
            this.logMessage(`Workspace removed: ${folder.name}`);
            await this.storageManager.cleanupStorageForWorkspaceAsync(folder);
        }
    }

    private async handleConfigurationChanged(event: vscode.ConfigurationChangeEvent): Promise<void> {
        if (event.affectsConfiguration('llmPromptScaffold.extensionStorageDirectory')) {
            this.logMessage('Extension storage directory configuration changed');
            
            for (const workspace of vscode.workspace.workspaceFolders || []) {
                if (event.affectsConfiguration('llmPromptScaffold.extensionStorageDirectory', workspace.uri)) {
                    await this.handleStorageDirectoryChangeForWorkspace(workspace);
                }
            }
        }
    }

    private async handleStorageDirectoryChangeForWorkspace(workspace: vscode.WorkspaceFolder): Promise<void> {
        const oldName = this.configManager.getStorageFolderName(workspace);
        const newName = vscode.workspace.getConfiguration('llmPromptScaffold', workspace.uri)
            .get(EXTENSION_STORAGE.CONFIG_KEY, EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK);

        if (oldName !== newName) {
            this.logMessage(`Storage directory name changed for workspace ${workspace.name}: ${oldName} -> ${newName}`);
            await this.storageManager.handleStorageFolderNameChange(workspace, oldName, newName);
        } else {
            this.logMessage(`No change in storage directory name for workspace ${workspace.name}`);
        }
    }

    async initializeForExistingWorkspaces(): Promise<void> {
        this.logMessage('Initializing storage for existing workspaces');
        
        const workspaces = vscode.workspace.workspaceFolders || [];
        for (const workspace of workspaces) {
            await this.storageManager.initializeStorageForWorkspaceAsync(workspace);
        }
        
        this.logMessage('Storage initialized for all existing workspaces');
    }
}