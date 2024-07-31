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
    private eventEmitter = new EventEmitter();
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
            const lastKnownValues = this.getLastKnownValues();
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

    onWorkspaceConfigCacheValueChanged(listener: (workspace: vscode.WorkspaceFolder, key: keyof WorkspaceConfigCacheType, oldValue: any, newValue: any) => void): void {
        this.eventEmitter.on('workspaceConfigCacheValueChanged', listener);
    }

    getStorageDirectoryForWorkspace(workspace: vscode.WorkspaceFolder): string {
        const config = vscode.workspace.getConfiguration('promptScaffold', workspace.uri);
        return config.get<string>(EXTENSION_STORAGE.CONFIG_KEY, EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK);
    }

    isRootWorkspace(workspace: vscode.WorkspaceFolder): boolean {
        return vscode.workspace.workspaceFolders?.[0] === workspace;
    }

    async updateStorageDirectoryAsync(workspace: vscode.WorkspaceFolder, newValue: string): Promise<void> {
        const oldValue = this.getStorageDirectoryForWorkspace(workspace);
        if (oldValue !== newValue) {
            const config = vscode.workspace.getConfiguration('promptScaffold', workspace.uri);
            await config.update(EXTENSION_STORAGE.CONFIG_KEY, newValue, vscode.ConfigurationTarget.WorkspaceFolder);
            this.updateCachedValue(workspace, 'storageDirName', newValue);
        }
    }

    getCachedStorageDirectory(workspace: vscode.WorkspaceFolder): string | undefined {
        return this.getLastKnownValues()[workspace.uri.toString()]?.storageDirName;
    }

    getCachedRootWorkspace(): vscode.WorkspaceFolder | undefined {
        const lastKnownValues = this.getLastKnownValues();
        for (const [key, value] of Object.entries(lastKnownValues)) {
            if (value.isRoot) {
                const workspaceFolder = vscode.workspace.workspaceFolders?.find(folder => folder.uri.toString() === key);
                return workspaceFolder;
            }
        }
        return undefined;
    }

    updateCachedRootWorkspace(newRootWorkspace: vscode.WorkspaceFolder): void {
        const lastKnownValues = this.getLastKnownValues();
        for (const [key, value] of Object.entries(lastKnownValues)) {
            value.isRoot = key === newRootWorkspace.uri.toString();
        }
        this.setCachedValues(lastKnownValues);
    }

    private getLastKnownValues(): Record<string, WorkspaceConfigCacheType> {
        return this.context.globalState.get<Record<string, WorkspaceConfigCacheType>>(
            ExtensionConfigurationManager.LAST_KNOWN_VALUES_KEY,
            {}
        );
    }

    private setCachedValues(newValues: Record<string, WorkspaceConfigCacheType>): void {
        this.logMessage(`Setting last known values:`);
        
        for (const [workspaceKey, newValue] of Object.entries(newValues)) {
            const workspace = vscode.workspace.workspaceFolders?.find(folder => folder.uri.toString() === workspaceKey);
            
            if (workspace) {
                for (const key of Object.keys(newValue) as Array<keyof WorkspaceConfigCacheType>) {
                    this.updateCachedValue(workspace, key, newValue[key]);
                }
            } else {
                this.logMessage(`Warning: No matching workspace found for key ${workspaceKey}`);
            }
        }
    }
    
    private updateCachedValue<K extends keyof WorkspaceConfigCacheType>(
        workspace: vscode.WorkspaceFolder,
        key: K,
        newValue: WorkspaceConfigCacheType[K]
    ): void {
        const lastKnownValues = this.getLastKnownValues();
        const workspaceKey = workspace.uri.toString();
        
        if (!lastKnownValues[workspaceKey]) {
            lastKnownValues[workspaceKey] = { storageDirName: '', isRoot: false };
            this.logMessage(`Initializing last known values for workspace: ${workspace.name}`);
        }

        const oldValue = lastKnownValues[workspaceKey][key];
        
        if (oldValue !== newValue) {
            lastKnownValues[workspaceKey][key] = newValue;
            this.logMessage(`Updated last known value for workspace "${workspace.name}" - Key: ${key}, Old: ${oldValue}, New: ${newValue}`);            
            this.eventEmitter.emit('workspaceConfigCacheValueChanged', workspace, key, oldValue, newValue);
        }
    
        // Update the global state
        this.context.globalState.update(ExtensionConfigurationManager.LAST_KNOWN_VALUES_KEY, lastKnownValues);
    }
}