import * as vscode from 'vscode';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';
import { IExtensionStateManager } from './extensionStateManager';
import { ExtensionStorageManager } from './extensionStorageManager';

export class ExtensionEventManager extends BaseLoggable {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private stateManager: IExtensionStateManager,
        private storageManager: ExtensionStorageManager
    ) {
        super(logName, outputChannel);
    }

    registerEventListeners(): void {
        this.logMessage('Registering event listeners');
        
        // editor event listeners
        this.addDisposable(
            vscode.workspace.onDidChangeWorkspaceFolders(this.handleWorkspaceFoldersChanged.bind(this))
        );


        
        // extension event listeners
        
        // this.addDisposable(
        //     vscode.workspace.onDidChangeConfiguration(this.handleConfigurationChanged.bind(this))
        // );

        // Listen for storage folder name changes from ExtensionStateManager
        // this.addDisposable(
        //     this.stateManager.onWorkspaceStorageFolderNameChanged(this.handleStorageFolderNameChanged.bind(this))
        // );
        
        this.logMessage('Event listeners registered');
    }
    private async handleWorkspaceFoldersChanged(event: vscode.WorkspaceFoldersChangeEvent): Promise<void> {
        this.logMessage(`Workspace folders changed: ${event.added.length} added, ${event.removed.length} removed`);
    
        for (const folder of event.added) {
            this.logMessage(`Initializing storage for added workspace: ${folder.name}`);
            // add to state, then add storage folders
            await this.stateManager.initializeWorkspaceStorageFolderNameAsync(folder);
            await this.storageManager.initializeWorkspaceStorageAsync(folder);
        }
    
        let activeWorkspaceRemoved = false;
        const activeWorkspace = this.stateManager.getActiveWorkspace();
        for (const folder of event.removed) {
            this.logMessage(`Workspace removed: ${folder.name}`);
            if (folder === activeWorkspace) {
                activeWorkspaceRemoved = true;
            }
            // cleanup storage folders, state
            await this.storageManager.cleanupWorkspaceStorageAsync(folder);
            this.stateManager.cleanupWorkspaceStorageFolderName(folder);            
        }
    
        if (activeWorkspaceRemoved) {
            this.stateManager.initializeActiveWorkspace();
        }
    }

    // private async handleConfigurationChanged(event: vscode.ConfigurationChangeEvent): Promise<void> {
    //     if (event.affectsConfiguration(`${EXTENSION_STORAGE.EXTENSION_ID}.${EXTENSION_STORAGE.CONFIG_KEY}`)) {
    //         this.logMessage('Extension storage directory configuration changed');
            
    //         for (const workspace of vscode.workspace.workspaceFolders || []) {
    //             if (event.affectsConfiguration(`${EXTENSION_STORAGE.EXTENSION_ID}.${EXTENSION_STORAGE.CONFIG_KEY}`, workspace.uri)) {
    //                 await this.handleStorageDirectoryChangeForWorkspace(workspace);
    //             }
    //         }
    //     }
    // }

    // private async handleStorageDirectoryChangeForWorkspace(workspace: vscode.WorkspaceFolder): Promise<void> {
    //     const config = vscode.workspace.getConfiguration(EXTENSION_STORAGE.EXTENSION_ID, workspace.uri);
    //     const newName = config.get<string>(EXTENSION_STORAGE.CONFIG_KEY, EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK);
    //     await this.stateManager.setStorageFolderName(workspace, newName);
    // }

    // private async handleStorageFolderNameChanged(event: {workspace: vscode.WorkspaceFolder, oldName: string, newName: string}): Promise<void> {
    //     this.logMessage(`Storage directory name changed for workspace ${event.workspace.name}: ${event.oldName} -> ${event.newName}`);
    //     await this.storageManager.updateWorkspaceStorageFolderAsync(event.workspace, event.oldName, event.newName);
    // }

}