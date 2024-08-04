import * as vscode from 'vscode';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';

export class ExtensionStateManager extends BaseLoggable {
    private activeWorkspace: vscode.WorkspaceFolder | undefined;
    private _onActiveWorkspaceChanged = new vscode.EventEmitter<vscode.WorkspaceFolder | undefined>();
    readonly onActiveWorkspaceChanged = this._onActiveWorkspaceChanged.event;

    constructor(logName: string, outputChannel: vscode.OutputChannel) {
        super(logName, outputChannel);
        this.initializeActiveWorkspace();
    }

    private initializeActiveWorkspace(): void {
        const initialWorkspace = vscode.workspace.workspaceFolders?.[0];
        this.setActiveWorkspace(initialWorkspace);
    }

    getActiveWorkspace(): vscode.WorkspaceFolder | undefined {
        return this.activeWorkspace;
    }

    setActiveWorkspace(workspace: vscode.WorkspaceFolder | undefined): void {
        if (this.activeWorkspace !== workspace) {
            this.activeWorkspace = workspace;
            this._onActiveWorkspaceChanged.fire(workspace);
            this.logMessage(workspace 
                ? `Set active workspace to: ${workspace.name}`
                : 'Active workspace unset');
        }
    }

    getStorageFolderName(workspace: vscode.WorkspaceFolder): string {
        const config = vscode.workspace.getConfiguration('llmPromptScaffold', workspace.uri);
        const folderName = config.get<string>(EXTENSION_STORAGE.CONFIG_KEY, EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK);
        this.logMessage(`Storage folder name for workspace ${workspace.name}: ${folderName}`);
        return folderName;
    }

    async setStorageFolderName(workspace: vscode.WorkspaceFolder, name: string): Promise<void> {
        this.logMessage(`Setting storage folder name for workspace ${workspace.name} to: ${name}`);
        try {
            const config = vscode.workspace.getConfiguration('llmPromptScaffold', workspace.uri);
            await config.update(EXTENSION_STORAGE.CONFIG_KEY, name, vscode.ConfigurationTarget.WorkspaceFolder);
            this.logMessage(`Successfully set storage folder name for workspace ${workspace.name} to: ${name}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`Failed to set storage folder name for workspace ${workspace.name}: ${errorMessage}`);
            throw error;
        }
    }

    dispose(): void {
        this._onActiveWorkspaceChanged.dispose();
        super.dispose();
    }
}