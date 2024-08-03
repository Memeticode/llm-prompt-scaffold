import * as vscode from 'vscode';
import { BaseManager } from './baseManager';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';


export class ExtensionConfigurationManager extends BaseManager {
    private activeWorkspace: vscode.WorkspaceFolder | undefined;
    private _onActiveWorkspaceChanged = new vscode.EventEmitter<void>();
    readonly onActiveWorkspaceChanged = this._onActiveWorkspaceChanged.event;

    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel
    ) {
        super(logName, outputChannel);
        this.initializeActiveWorkspace();
    }

    private initializeActiveWorkspace(): void {
        this.activeWorkspace = vscode.workspace.workspaceFolders?.[0];
        if (this.activeWorkspace) {
            this.logMessage(`Initialized active workspace to: ${this.activeWorkspace.name}`);
        } else {
            this.logMessage('No active workspace initialized - no workspace folders available');
        }
    }

    getActiveWorkspace(): vscode.WorkspaceFolder | undefined {
        if (!this.activeWorkspace && vscode.workspace.workspaceFolders?.length) {
            this.initializeActiveWorkspace();
        }
        return this.activeWorkspace;
    }

    setActiveWorkspace(workspace: vscode.WorkspaceFolder): void {
        this.activeWorkspace = workspace;
        this._onActiveWorkspaceChanged.fire();
        this.logMessage(`Set active workspace to: ${workspace.name}`);
    }

    getStorageFolderName(workspace: vscode.WorkspaceFolder): string {
        const folderName = vscode.workspace.getConfiguration('llmPromptScaffold', workspace.uri)
            .get(EXTENSION_STORAGE.CONFIG_KEY, EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK);
        this.logMessage(`Getting storage folder name for workspace ${workspace.name}: ${folderName}`);
        return folderName;
    }

    async setStorageFolderName(workspace: vscode.WorkspaceFolder, name: string): Promise<void> {
        this.logMessage(`Setting storage folder name for workspace ${workspace.name} to: ${name}`);
        try {
            await vscode.workspace.getConfiguration('llmPromptScaffold', workspace.uri)
                .update(EXTENSION_STORAGE.CONFIG_KEY, name, vscode.ConfigurationTarget.WorkspaceFolder);
            this.logMessage(`Successfully set storage folder name for workspace ${workspace.name} to: ${name}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`Failed to set storage folder name for workspace ${workspace.name}: ${errorMessage}`);
            throw error;
        }
    }
    
}