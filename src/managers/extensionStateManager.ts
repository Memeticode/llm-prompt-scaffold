import * as vscode from 'vscode';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { EditorWorkspaceUtils } from '../shared/utility/editorWorkspaceUtils';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';


export interface IExtensionStateManager {
    // Active workspace management
    getActiveWorkspace(): vscode.WorkspaceFolder | undefined;
    setActiveWorkspace(workspace: vscode.WorkspaceFolder): void;
    onActiveWorkspaceChanged: vscode.Event<vscode.WorkspaceFolder | undefined>;

    // Storage folder name management
    getWorkspaceStorageFolderName(workspace: vscode.WorkspaceFolder): string;
    setWorkspaceStorageFolderNameAsync(workspace: vscode.WorkspaceFolder, name: string): Promise<void>;
    onWorkspaceStorageFolderNameChanged: vscode.Event<{workspace: vscode.WorkspaceFolder, oldName: string, newName: string}>;

    // Initialization and cleanup
    initializeStateAsync(): Promise<void>;
    initializeActiveWorkspace(): void;
    initializeWorkspaceStorageFolderNamesAsync(): Promise<void> 
    initializeWorkspaceStorageFolderNameAsync(workspace: vscode.WorkspaceFolder): Promise<void>
    cleanupWorkspaceStorageFolderName(workspace: vscode.WorkspaceFolder): void
    dispose(): void;
}

export class ExtensionStateManager extends BaseLoggable implements IExtensionStateManager {
    private activeWorkspace: vscode.WorkspaceFolder | undefined;
    private workspaceStorageFolderNames: Record<string, string> = {};

    private _onActiveWorkspaceChanged = new vscode.EventEmitter<vscode.WorkspaceFolder | undefined>();
    readonly onActiveWorkspaceChanged = this._onActiveWorkspaceChanged.event;

    private _onStorageFolderNameChanged = new vscode.EventEmitter<{workspace: vscode.WorkspaceFolder, oldName: string, newName: string}>();
    readonly onWorkspaceStorageFolderNameChanged = this._onStorageFolderNameChanged.event;

    constructor(
        logName: string, 
        outputChannel: vscode.OutputChannel,
        private context: vscode.ExtensionContext
    ) {
        super(logName, outputChannel);
    }

    getActiveWorkspace(): vscode.WorkspaceFolder | undefined {
        return this.activeWorkspace;
    }
    setActiveWorkspace(workspace: vscode.WorkspaceFolder): void {
        if (!EditorWorkspaceUtils.workspaceExists(workspace)) {
            throw new Error(`Workspace ${workspace.name} does not exist in the current workspace folders.`);
        }

        if (this.activeWorkspace !== workspace) {
            this.activeWorkspace = workspace;
            this._onActiveWorkspaceChanged.fire(workspace);
            this.logMessage(`Set active workspace to: ${workspace.name}`);
        }
    }

    getWorkspaceStorageFolderName(workspace: vscode.WorkspaceFolder): string {
        const workspaceKey = workspace.uri.toString();
        return this.workspaceStorageFolderNames[workspaceKey] || EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK;
    }
    async setWorkspaceStorageFolderNameAsync(workspace: vscode.WorkspaceFolder, name: string): Promise<void> {
        const workspaceKey = workspace.uri.toString();
        const oldName = this.getWorkspaceStorageFolderName(workspace);

        if (oldName !== name) {
            this.workspaceStorageFolderNames[workspaceKey] = name;
            await this.saveWorkspaceStorageInfo();
            this._onStorageFolderNameChanged.fire({workspace, oldName, newName: name});
            this.logMessage(`Storage folder name for workspace ${workspace.name} changed from ${oldName} to ${name}`);
        }
    }

    async initializeStateAsync(): Promise<void> {
        this.logMessage('Initializing extension state');
        this.initializeActiveWorkspace();
        await this.initializeWorkspaceStorageFolderNamesAsync();
        this.logMessage('Extension state initialized');
    }
    initializeActiveWorkspace(): void {
        const workspaces = vscode.workspace.workspaceFolders;
        if (workspaces && workspaces.length > 0) {
            this.setActiveWorkspace(workspaces[0]);
        }
    }
    async initializeWorkspaceStorageFolderNamesAsync(): Promise<void> {
        const workspaceStorageFolders = this.context.globalState.get<Record<string, string>>(EXTENSION_STORAGE.WORKSPACE_STORAGE_KEY, {});
        vscode.workspace.workspaceFolders?.forEach(workspace => {      
            const workspaceKey = workspace.uri.toString();
            if (!workspaceStorageFolders[workspaceKey]) {
                workspaceStorageFolders[workspaceKey] = EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK;
            }
        });
        
        this.workspaceStorageFolderNames = workspaceStorageFolders;
        await this.saveWorkspaceStorageInfo();
    }
    async initializeWorkspaceStorageFolderNameAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        const workspaceKey = workspace.uri.toString();
        if (!this.workspaceStorageFolderNames[workspaceKey]) {
            this.workspaceStorageFolderNames[workspaceKey] = EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK;
        }
        await this.saveWorkspaceStorageInfo();
    }
    cleanupWorkspaceStorageFolderName(workspace: vscode.WorkspaceFolder): void {
        const workspaceKey = workspace.uri.toString();
        if (this.workspaceStorageFolderNames[workspaceKey]) {
            delete this.workspaceStorageFolderNames[workspaceKey];
            this.logMessage(`Cleaned up workspace storage folder name for workspace: ${workspace.name}`);
        }
    }

    dispose(): void {
        this._onActiveWorkspaceChanged.dispose();
        this._onStorageFolderNameChanged.dispose();
        super.dispose();
    }

    private async saveWorkspaceStorageInfo(): Promise<void> {
        const existingStorage = this.context.globalState.get<Record<string, string>>(EXTENSION_STORAGE.WORKSPACE_STORAGE_KEY, {});
        
        // Create a new object with existing storage as the base
        const updatedStorage = { ...existingStorage };
    
        // Update or add entries from this.workspaceStorageFolderNames
        for (const [key, value] of Object.entries(this.workspaceStorageFolderNames)) {
            updatedStorage[key] = value;
        }
    
        // Save the updated storage
        await this.context.globalState.update(EXTENSION_STORAGE.WORKSPACE_STORAGE_KEY, updatedStorage);
    
        this.logMessage('Workspace storage information saved successfully');
    }

}