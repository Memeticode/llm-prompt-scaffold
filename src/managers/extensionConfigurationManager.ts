import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { BaseManager } from './baseManager';
import { EXTENSION_STORAGE } from '../utils/extensionUtils';

// These are cached in global storage to determine if/when value changes
export type WorkspaceConfigCacheType = {
    storageDirName: string;
    isRoot: boolean;
};

export class ExtensionConfigurationManager extends BaseManager {
    private eventEmitter = new vscode.EventEmitter<{
        workspace: vscode.WorkspaceFolder;
        key: keyof WorkspaceConfigCacheType;
        oldValue: any;
        newValue: any;
    }>();
    readonly onDidChangeWorkspaceConfigCache = this.eventEmitter.event;
    private static readonly LAST_KNOWN_VALUES_KEY = 'lastKnownValues';

    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private context: vscode.ExtensionContext
    ) {
        super(logName, outputChannel);
    }

    initializeWorkspaceConfigCache() {
        this.logMessage('Initializing workspace extension config cache in global storage');
        try 
        {
            const workspaces = vscode.workspace.workspaceFolders || [];
            const lastKnownValues = this.getLastKnownWorkspaceConfigValues();
            for (const workspace of workspaces) {
                const key = workspace.uri.toString();
                if (!lastKnownValues[key]) {
                    lastKnownValues[key] = {
                        storageDirName: this.getStorageDirectoryForWorkspace(workspace),
                        isRoot: this.isRootWorkspace(workspace)
                    };
                }
            }
            this.setCachedValues(lastKnownValues);
            this.logMessage('Workspace extension config cache');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(errorMessage);
            vscode.window.showErrorMessage(`Failed to initialize workspace extension config cache: ${errorMessage}`);
            throw error;
        }

    }

    private fireWorkspaceConfigCacheChanged(workspace: vscode.WorkspaceFolder, key: keyof WorkspaceConfigCacheType, oldValue: any, newValue: any): void {
        this.eventEmitter.fire({ workspace, key, oldValue, newValue });
    }
    
    getStorageDirectoryForWorkspace(workspace: vscode.WorkspaceFolder): string {
        const config = vscode.workspace.getConfiguration('promptScaffold', workspace.uri);
        return config.get<string>(EXTENSION_STORAGE.CONFIG_KEY, EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK);
    }

    isRootWorkspace(workspace: vscode.WorkspaceFolder): boolean {
        return vscode.workspace.workspaceFolders?.[0] === workspace;
    }

    async updateStorageDirectoryAsync(workspace: vscode.WorkspaceFolder, newValue: string): Promise<void> {
        const oldValue = this.getCachedStorageDirectory(workspace);
        this.logMessage(`Updating storage directory for ${workspace.name}:`);
        this.logMessage(`  Old value: ${oldValue}`);
        this.logMessage(`  New value: ${newValue}`);
        
        if (oldValue !== newValue) {
            const config = vscode.workspace.getConfiguration('llmPromptScaffold', workspace.uri);
            await config.update('extensionStorageDirectory', newValue, vscode.ConfigurationTarget.WorkspaceFolder);
            this.updateCachedValue(workspace, 'storageDirName', newValue);
            this.logMessage(`  Updated cached value to: ${newValue}`);
        } else {
            this.logMessage(`  No change in value, skipping update`);
        }
    }

    getCachedStorageDirectory(workspace: vscode.WorkspaceFolder): string {
        return this.getLastKnownWorkspaceConfigValues()[workspace.uri.toString()]?.storageDirName || EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK;
    }

    getCachedRootWorkspace(): vscode.WorkspaceFolder | undefined {
        const lastKnownValues = this.getLastKnownWorkspaceConfigValues();
        for (const [key, value] of Object.entries(lastKnownValues)) {
            if (value.isRoot) {
                const workspaceFolder = vscode.workspace.workspaceFolders?.find(folder => folder.uri.toString() === key);
                return workspaceFolder;
            }
        }
        return undefined;
    }

    updateDefaultStorageDirectory(newValue: string | undefined): void {
        // This method updates the default value used for new workspaces
        // You might store this in the extension's global state
        this.context.globalState.update('defaultStorageDirectory', newValue);
    }

    updateCachedRootWorkspace(newRootWorkspace: vscode.WorkspaceFolder): void {
        this.logMessage(`Updating cached root workspace to: ${newRootWorkspace.name}`);
        const lastKnownValues = this.getLastKnownWorkspaceConfigValues();
        for (const [key, value] of Object.entries(lastKnownValues)) {
            const isNewRoot = key === newRootWorkspace.uri.toString();
            this.logMessage(`Workspace ${key}: isRoot changed from ${value.isRoot} to ${isNewRoot}`);
            value.isRoot = isNewRoot;
        }
        this.setCachedValues(lastKnownValues);
        this.logMessage(`Cached root workspace updated`);
    }

    getLastKnownWorkspaceConfigValues(): Record<string, WorkspaceConfigCacheType> {
        const values = this.context.globalState.get<Record<string, WorkspaceConfigCacheType>>(
            ExtensionConfigurationManager.LAST_KNOWN_VALUES_KEY,
            {}
        );
        return JSON.parse(JSON.stringify(values)); // Create a deep copy
    }
    
    private setCachedValues(newValues: Record<string, WorkspaceConfigCacheType>): void {
        this.logMessage(`Setting last known values:`);
        
        const updatedValues: Record<string, WorkspaceConfigCacheType> = {};
        
        for (const [workspaceKey, newValue] of Object.entries(newValues)) {
            const workspace = vscode.workspace.workspaceFolders?.find(folder => folder.uri.toString() === workspaceKey);
            
            if (workspace) {
                updatedValues[workspaceKey] = newValue;                
                for (const key of Object.keys(newValue) as Array<keyof WorkspaceConfigCacheType>) {
                    this.updateCachedValue(workspace, key, newValue[key]);
                }
            } else {
                this.logMessage(`Removing cached values for non-existent workspace: ${workspaceKey}`);
            }
        }

        this.logMessage(`Summary of updated last known values:`);
        for (const [workspaceKey, value] of Object.entries(updatedValues)) {
            this.logMessage(`  Workspace Key: ${workspaceKey}:`);
            this.logMessage(`    Storage Directory: ${value.storageDirName}`);
            this.logMessage(`    Is Root: ${value.isRoot}`);
        }
    
        // Update global state with cleaned-up values
        this.context.globalState.update(ExtensionConfigurationManager.LAST_KNOWN_VALUES_KEY, updatedValues);
        this.logMessage(`Global state updated with new last known values`);
    }
    

    updateCachedValue<K extends keyof WorkspaceConfigCacheType>(
        workspace: vscode.WorkspaceFolder,
        key: K,
        newValue: WorkspaceConfigCacheType[K]
    ): void {
        const lastKnownValues = this.getLastKnownWorkspaceConfigValues();
        const workspaceKey = workspace.uri.toString();
        
        if (!lastKnownValues[workspaceKey]) {
            lastKnownValues[workspaceKey] = { storageDirName: '', isRoot: false };
        }

        const oldValue = lastKnownValues[workspaceKey][key];
        
        if (oldValue !== newValue) {
            lastKnownValues[workspaceKey][key] = newValue;
            this.logMessage(`Updated cached value for workspace "${workspace.name}" - Key: ${key}, Old: ${oldValue}, New: ${newValue}`);            
            this.eventEmitter.fire({ workspace, key, oldValue, newValue });
        }
    
        // Update the global state
        this.context.globalState.update(ExtensionConfigurationManager.LAST_KNOWN_VALUES_KEY, lastKnownValues);
    }

}