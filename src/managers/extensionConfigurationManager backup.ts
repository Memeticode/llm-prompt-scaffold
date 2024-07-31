// // ConfigurationManager serves as a single point of access for all configuration-related operations

// import * as vscode from 'vscode';
// import { BaseManager } from './baseManager';
// import { PROJECT_FILES, WORKSPACE_INFO_FILES } from '../constants/extensionStorageFolderItems';

// // file type describes files which may allow user to specify default content by setting a configurable property 
// type SystemFileType = keyof typeof PROJECT_FILES;
// type WorkspaceFileType = keyof typeof WORKSPACE_INFO_FILES;
// type FileType = SystemFileType | WorkspaceFileType;

// // workspace manager provides methods for controlling the extensionDirectory folders
// // this folder will be created in each workspace (if dne)
// // the root directory will also contain subfolders
// export class ConfigurationManager extends BaseManager {
//     private storageFolderNameChangeDelegate: ((workspace: vscode.WorkspaceFolder, oldName: string, newName: string) => Promise<void>) | null = null;
//     private refreshStorageFolderDelegate: ((workspace: vscode.WorkspaceFolder, oldName: string, newName: string) => Promise<void>) | null = null;

//     // blank entries will have nothing applied
//     private configKeyMap: Record<FileType, string> = {
//         SCAFFOLD_PROMPT: 'systemPromptDefaultPath',
//         INCLUDE_STRUCTURE_GITIGNORE: 'fileStructureContextIncludeDefaultPath',
//         EXCLUDE_STRUCTURE_GITIGNORE: 'fileStructureContextExcludeDefaultPath',
//         INCLUDE_CONTENT_GITIGNORE: 'fileSystemContextIncludeDefaultPath',
//         EXCLUDE_CONTENT_GITIGNORE: 'fileSystemContextExcludeDefaultPath',
//         // Add mappings for other file types if needed
//         SYSTEM_DESCRIPTION: '',
//         SESSION_GOALS: '',
//         WORKSPACE_DESCRIPTION: ''
//     };

//     constructor(
//         logName: string,
//         outputChannel: vscode.OutputChannel,
//         private context: vscode.ExtensionContext
//     ) {
//         super(logName, outputChannel);
//         this.initializeLastKnownValues();
//         this.setupConfigurationChangeListener();
//     }
        
//     private initializeLastKnownValues() {
//         const workspaces = vscode.workspace.workspaceFolders || [];
//         const lastKnownValues = this.context.globalState.get<Record<string, string>>('lastKnownStorageDirectories') || {};
//         let updated = false;

//         for (const workspace of workspaces) {
//             const key = workspace.uri.toString();
//             if (!lastKnownValues[key]) {
//                 lastKnownValues[key] = this.getStorageDirectoryForWorkspace(workspace);
//                 updated = true;
//             }
//         }

//         if (updated) {
//             this.context.globalState.update('lastKnownStorageDirectories', lastKnownValues);
//         }
//     }


//     // SET DELEGATES
    
//     setStorageFolderNameChangeDelegate(delegate: (workspace: vscode.WorkspaceFolder, oldName: string, newName: string) => Promise<void>): void {
//         this.storageFolderNameChangeDelegate = delegate;
//         this.logMessage('Storage folder name change delegate set');
//     }

//     setRefreshStorageFolderDelegate(delegate: (workspace: vscode.WorkspaceFolder, oldName: string, newName: string) => Promise<void>): void {
//         this.refreshStorageFolderDelegate = delegate;
//         this.logMessage('Refresh storage folder delegate set');
//     }


//     // MISC CONFIGURATION INFO GETTERS

//     getStorageDirectoryForWorkspace(workspace: vscode.WorkspaceFolder): string {
//         // Always use workspace configuration, falling back to user settings if not set
//         const config = vscode.workspace.getConfiguration('promptScaffold', workspace.uri);
//         return config.get<string>('extensionStorageDirectory', '.prompt-scaffold');
//     }
    
//     getExtensionStorageFolderName(workspace: vscode.WorkspaceFolder): string {
//         return this.getStorageDirectoryForWorkspace(workspace);
//     }

//     getExtensionStorageFileDefaultContentPath(fileType: FileType): string {
//         const configKey = this.configKeyMap[fileType];
//         if (!configKey) {
//             return this.getDefaultFilePath(fileType);
//         }
    
//         const configuredPath = this.getString(configKey, '');    
//         if (configuredPath) {
//             const fileUri = vscode.Uri.file(configuredPath);
//             return fileUri.fsPath;
//         }

//         return this.getDefaultFilePath(fileType);
//     }

//     // CONFIGRUATION MANAGEMENT
//     async initializeWorkspaceConfiguration() {
//         this.logMessage(`Initializing configuration for workspace`);
        
//         // Get the default storage directory name from user settings
//         const defaultStorageDir = vscode.workspace.getConfiguration('promptScaffold').get<string>('extensionStorageDirectory', '.prompt-scaffold');
        
//         // Set the workspace-level configuration if it's not already set
//         const workspaceConfig = vscode.workspace.getConfiguration('promptScaffold');
//         const currentValue = workspaceConfig.get<string>('extensionStorageDirectory');
        
//         if (currentValue === undefined) {
//             await workspaceConfig.update('extensionStorageDirectory', defaultStorageDir, vscode.ConfigurationTarget.Workspace);
//             this.logMessage(`Set workspace configuration to ${defaultStorageDir}`);
//         } else {
//             this.logMessage(`Workspace already has configuration: ${currentValue}`);
//         }
//     }

//     async updateConfigurationAsync(key: string, value: string, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
//         this.logMessage(`Attempting to set configuration value: target=${target.toString()}, key=${key}, value=${value}`);
//         try {
//             if (key === 'extensionStorageDirectory') {
//                 if (await this.isValidFilePathAsync(value)) {
//                     await this.updateConfigurationFilePathAsync(key, value, target);
                    
//                     // Handle the change for each affected workspace
//                     const workspaces = this.getAffectedWorkspaces(target);
//                     for (const workspace of workspaces) {
//                         const oldValue = this.getStorageDirectoryForWorkspace(workspace);
//                         if (oldValue !== value && this.storageFolderNameChangeDelegate) {
//                             this.logMessage(`Invoking storage folder name change delegate for workspace: ${workspace.name}`);
//                             await this.storageFolderNameChangeDelegate(workspace, oldValue, value);
//                         }
//                     }
        
//                     // Update the last known value
//                     if (target !== vscode.ConfigurationTarget.Global) {
//                         const workspace = this.getWorkspaceFromTarget(target);
//                         if (workspace) {
//                             this.updateLastKnownStorageDirectory(workspace, value);
//                         }
//                     }
//                 } else {
//                     throw new Error(`Specified extension storage directory value is not a valid file name: ${value}`);
//                 }
//             } else if (key.endsWith('DefaultPath')) {
//                 await this.updateConfigurationFilePathAsync(key, value, target);
//             } else {
//                 const config = vscode.workspace.getConfiguration('promptScaffold');
//                 await config.update(key, value, target);
//             }
//             this.logMessage(`Successfully updated configuration: ${key}`);
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//             this.logError(errorMessage);
//             vscode.window.showErrorMessage(`Failed to update configuration ${key}: ${errorMessage}`);
//             throw error;
//         }
//     }
    
//     updateLastKnownStorageDirectory(workspace: vscode.WorkspaceFolder, value: string) {
//         const lastKnownValues = this.context.globalState.get<Record<string, string>>('lastKnownStorageDirectories') || {};
//         lastKnownValues[workspace.uri.toString()] = value;
//         this.context.globalState.update('lastKnownStorageDirectories', lastKnownValues);
//     }
    

//     // PRIVATE HELPERS
        
//     private getString(key: string, defaultValue: string, resource?: vscode.Uri): string {
//         return vscode.workspace.getConfiguration('promptScaffold', resource)
//             .get<string>(key, defaultValue);
//     }


//     private setupConfigurationChangeListener() {
//         vscode.workspace.onDidChangeConfiguration(e => {
//             if (e.affectsConfiguration('promptScaffold.extensionStorageDirectory')) {
//                 this.handleStorageDirectoryChange();
//             }
//         });
//     }

//     private async handleStorageDirectoryChange() {
//         const workspaces = vscode.workspace.workspaceFolders || [];
//         if (workspaces.length === 0) { return; }
    
//         const workspaceConfig = vscode.workspace.getConfiguration('promptScaffold', workspaces[0].uri);
//         const newValue = workspaceConfig.get<string>('extensionStorageDirectory', '.prompt-scaffold');
//         const lastKnownValue = this.context.workspaceState.get<string>('lastKnownStorageDirectory') || '.prompt-scaffold';
    
//         if (newValue !== lastKnownValue) {
//             this.logMessage(`Storage directory changed. Old: ${lastKnownValue}, New: ${newValue}`);
            
//             let errors = false;
//             for (const workspace of workspaces) {
//                 if (this.storageFolderNameChangeDelegate) {
//                     try {
//                         await this.storageFolderNameChangeDelegate(workspace, lastKnownValue, newValue);
//                         this.logMessage(`Successfully updated storage folder for workspace: ${workspace.name}`);
//                     } catch (error) {
//                         errors = true;
//                         this.logError(`Error updating storage folder for workspace ${workspace.name}: ${error}`);
//                     }
//                 }
//             }
    
//             if (errors) {
//                 vscode.window.showWarningMessage(
//                     'There were errors updating some storage folders. You may lose data if you refresh. Would you like to refresh all files or manually review?',
//                     'Refresh (May Lose Data)', 'I\'ll Review Manually'
//                 ).then(selection => {
//                     if (selection === 'Refresh (May Lose Data)') {
//                         this.refreshAllStorageFiles(lastKnownValue, newValue);
//                     } else {
//                         vscode.window.showInformationMessage(
//                             'Please review and update the extension storage folder (from old name to new name) in each workspace folder manually.'
//                         );
//                     }
//                 });
//             } else {
//                 vscode.window.showInformationMessage('Storage directories successfully updated.');
//             }
    
//             this.context.workspaceState.update('lastKnownStorageDirectory', newValue);
//         }
//     }
    
//     private async refreshAllStorageFiles(lastKnownValue: string, newValue: string) {
//         const workspaces = vscode.workspace.workspaceFolders || [];
//         for (const workspace of workspaces) {
//             if (this.refreshStorageFolderDelegate) {
//                 try {
//                     await this.refreshStorageFolderDelegate(workspace, lastKnownValue, newValue);
//                     this.logMessage(`Refreshed storage folder for workspace ${workspace.name}`);
//                 } catch (error) {
//                     this.logError(`Error refreshing storage folder for workspace ${workspace.name}: ${error}`);
//                 }
//             }
//         }
//     }
    
//     private getAffectedWorkspaces(target: vscode.ConfigurationTarget): readonly vscode.WorkspaceFolder[] {
//         if (target === vscode.ConfigurationTarget.Global) {
//             // Global changes affect all workspaces
//             return vscode.workspace.workspaceFolders || [];
//         } else if (target === vscode.ConfigurationTarget.Workspace) {
//             // Workspace changes affect all folders in the current workspace
//             return vscode.workspace.workspaceFolders || [];
//         } else if (target === vscode.ConfigurationTarget.WorkspaceFolder) {
//             // WorkspaceFolder changes only affect the active workspace folder
//             const activeTextEditor = vscode.window.activeTextEditor;
//             if (activeTextEditor) {
//                 const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeTextEditor.document.uri);
//                 return workspaceFolder ? [workspaceFolder] : [];
//             }
//         }
//         return [];
//     }
    
//     // Validates that the property being set is a valid file name (for file name extension configuration settings)
//     private async updateConfigurationFilePathAsync(key: string, value: string, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
//         if (await this.isValidFilePathAsync(value)) {
//             const config = vscode.workspace.getConfiguration('promptScaffold');
//             await config.update(key, value, target);
//         } else {
//             const errorMessage = `Can't set ${key} to an invalid file path: ${value}`;
//             this.logError(errorMessage);
//             throw new Error(errorMessage);
//         }
//     }

//     private getDefaultFilePath(fileType: FileType): string {
//         if (this.isSystemFile(fileType)) {
//             return vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'defaultFileContent', PROJECT_FILES[fileType]).fsPath;
//         } else {
//             return vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'defaultFileContent', WORKSPACE_INFO_FILES[fileType]).fsPath;
//         }
//     }
    
//     private isSystemFile(fileType: FileType): fileType is keyof typeof PROJECT_FILES {
//         return fileType in PROJECT_FILES;
//     }

//     private getWorkspaceFromTarget(target: vscode.ConfigurationTarget): vscode.WorkspaceFolder | undefined {
//         if (target === vscode.ConfigurationTarget.Global) {
//             return undefined; // Global target doesn't correspond to a specific workspace
//         } else if (target === vscode.ConfigurationTarget.Workspace) {
//             // For workspace target, return the first workspace folder
//             return vscode.workspace.workspaceFolders?.[0];
//         } else if (target === vscode.ConfigurationTarget.WorkspaceFolder) {
//             // For workspace folder target, try to get the active workspace folder
//             const activeTextEditor = vscode.window.activeTextEditor;
//             if (activeTextEditor) {
//                 return vscode.workspace.getWorkspaceFolder(activeTextEditor.document.uri);
//             }
//         }
//         return undefined;
//     }
    
// }

