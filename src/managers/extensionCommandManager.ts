import * as vscode from 'vscode';
import { FileSystemUtils } from '../shared/utility/fileSystemUtils';
import { BaseCommandQueue, ClearCommandQueueStrategy } from '../shared/base/baseCommandQueue';
import { IExtensionStateManager } from './extensionStateManager';
import { IExtensionStorageManager } from '../managers/extensionStorageManager';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';
import { PromptConfigFileKey, PromptContextFileKey } from '../extension/types';

export class ExtensionCommandManager extends BaseCommandQueue {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private stateManager: IExtensionStateManager,
        private storageManager: IExtensionStorageManager,
        maxHistoryLength: number = 100
    ) {
        super(logName, outputChannel, maxHistoryLength);
    }

    async setActiveWorkspaceAsync(workspaceFolder?: vscode.WorkspaceFolder): Promise<void> {
        return this.queueCommand("setActiveWorkspaceAsync",
            async (cancellationToken: vscode.CancellationToken) => {
            if (!workspaceFolder) {
                workspaceFolder = await this.showWorkspaceQuickPick();
                if (!workspaceFolder) {
                    return; // User cancelled the selection
                }
            }

            // Check for cancellation before setting the active workspace
            if (cancellationToken.isCancellationRequested) {
                throw new vscode.CancellationError();
            }

            // Set the active workspace
            await this.stateManager.setActiveWorkspace(workspaceFolder);

            // Log the action
            this.logMessage(`Active workspace set to: ${workspaceFolder.name}`);

            // Show a message to the user
            vscode.window.showInformationMessage(`Active workspace set to: ${workspaceFolder.name}`);
        }, true, true);  // Include command args and track command processing
    }
    
    // PROMPT CONFIGRUATION

    async setDefaultPromptConfigurationAsync(): Promise<void> {
        return this.queueCommand("setDefaultPromptConfigurationAsync",
            async (cancellationToken: vscode.CancellationToken) => {
            const workspace = await this.showWorkspaceQuickPick();
            if (!workspace) {
                return;
            }

            const confirmation = await vscode.window.showWarningMessage(
                `This will reset all ${workspace.name} prompt configurations to their defaults. This action cannot be undone. Are you sure you want to continue?`,
                'Yes', 'No'
            );
            
            if (confirmation !== 'Yes') {
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Setting default prompt configuration...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                
                const configItems = Object.keys(EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES) as PromptConfigFileKey[];
                const increment = 100 / configItems.length;
                
                for (const item of configItems) {
                    if (cancellationToken.isCancellationRequested) {
                        throw new vscode.CancellationError();
                    }
                    await this.storageManager.generatePromptConfigFileAsync(workspace, item, true);
                    progress.report({ increment, message: `Reset ${item}` });
                }
            });

            vscode.window.showInformationMessage('All prompt configurations have been reset to their default values.');
        }, true, true);
    }
    
    async setDefaultPromptConfigurationItemAsync(): Promise<void> {
        return this.queueCommand("setDefaultPromptConfigurationItemAsync",
            async (cancellationToken: vscode.CancellationToken) => {
            const workspace = await this.showWorkspaceQuickPick();
            if (!workspace) { return; }

            const fileKey = await this.showPromptConfigItemQuickPick();
            if (!fileKey) { return; }

            const confirmation = await vscode.window.showWarningMessage(
                `This will overwrite the existing ${workspace.name} configuration for ${fileKey}. Are you sure?`,
                'Yes', 'No'
            );
            if (confirmation === 'Yes') {
                if (cancellationToken.isCancellationRequested) {
                    throw new vscode.CancellationError();
                }
                await this.storageManager.generatePromptConfigFileAsync(workspace, fileKey, true);
                vscode.window.showInformationMessage(`Default configuration set for ${fileKey}.`);
            }
        }, true, true);
    }
    
    async openPromptConfigurationItemAsync(workspace?: vscode.WorkspaceFolder, fileKey?: PromptConfigFileKey): Promise<void> {
        return this.queueCommand("openPromptConfigurationItemAsync",
            async (cancellationToken: vscode.CancellationToken) => {
            if (!workspace) {
                workspace = await this.showWorkspaceQuickPick();
                if (!workspace) { return; }
            }

            if (!fileKey) {
                fileKey = await this.showPromptConfigItemQuickPick();
                if (!fileKey) { return; }
            }

            if (cancellationToken.isCancellationRequested) {
                throw new vscode.CancellationError();
            }

            const fileUri = this.storageManager.getPromptConfigFileUri(workspace, fileKey);
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);
        }, true, true);
    }
    
    // PROMPT CONTEXT
    
    async generatePromptContextItemsAsync(): Promise<void> {
        return this.queueCommand("generatePromptContextItemsAsync", async (cancellationToken: vscode.CancellationToken) => {
            const workspace = await this.getWorkspaceForCommand();
            if (!workspace) { return; }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Generating prompt context items for ${workspace.name}...`,
                cancellable: true
            }, async (progress, token) => {
                try {
                    await this.storageManager.generatePromptContextFilesAsync(workspace, true, progress, token);
                    vscode.window.showInformationMessage(`All prompt context items have been generated for ${workspace.name}.`);
                } catch (error) {
                    if (error instanceof vscode.CancellationError) {
                        vscode.window.showInformationMessage(`Generation of prompt context items for ${workspace.name} was cancelled.`);
                    } else {
                        throw error;
                    }
                }
            });
        }, true, true);
    }

    
    async generatePromptContextItemAsync(workspace?: vscode.WorkspaceFolder, fileKey?: PromptContextFileKey): Promise<void> {
        return this.queueCommand("generatePromptContextItemAsync",
            async (cancellationToken: vscode.CancellationToken) => {
            workspace = workspace || await this.getWorkspaceForCommand();
            if (!workspace) { return; }

            if (!fileKey) {
                fileKey = await this.showPromptContextItemQuickPick();
                if (!fileKey) { return; }
            }

            if (cancellationToken.isCancellationRequested) {
                throw new vscode.CancellationError();
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Generating ${fileKey} for ${workspace.name}...`,
                cancellable: false
            }, async (progress) => {
                if (!workspace) { throw new Error('Unable to generate prompt context item, no workspace specified.'); }
                await this.storageManager.generatePromptContextFileAsync(workspace, fileKey!, true);
                progress.report({ increment: 100 });
            });

            vscode.window.showInformationMessage(`${fileKey} has been generated for ${workspace.name}.`);
        }, true, true);
    }
    
    async openPromptContextItemAsync(workspace?: vscode.WorkspaceFolder, fileKey?: PromptContextFileKey): Promise<void> {
        return this.queueCommand("openPromptContextItemAsync",
            async (cancellationToken: vscode.CancellationToken) => {
            workspace = workspace || await this.getWorkspaceForCommand();
            if (!workspace) { return; }

            if (!fileKey) {
                fileKey = await this.showPromptContextItemQuickPick();
                if (!fileKey) { return; }
            }

            if (cancellationToken.isCancellationRequested) {
                throw new vscode.CancellationError();
            }

            const fileUri = this.storageManager.getPromptContextFileUri(workspace, fileKey);
            
            // Check if file exists, if not, create it
            if (!await FileSystemUtils.fileExistsAsync(fileUri)) {
                await this.storageManager.generatePromptContextFileAsync(workspace, fileKey, true);
            }

            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);
        }, true, true);
    }
    
    async copyPromptContextItemToClipboardAsync(workspace?: vscode.WorkspaceFolder, fileKey?: PromptContextFileKey): Promise<void> {
        return this.queueCommand("copyPromptContextItemToClipboardAsync",
            async (cancellationToken: vscode.CancellationToken) => {
            workspace = workspace || await this.getWorkspaceForCommand();
            if (!workspace) { return; }

            if (!fileKey) {
                fileKey = await this.showPromptContextItemQuickPick();
                if (!fileKey) { return; }
            }

            if (cancellationToken.isCancellationRequested) {
                throw new vscode.CancellationError();
            }

            const fileUri = this.storageManager.getPromptContextFileUri(workspace, fileKey);
            const content = await FileSystemUtils.readFileAsync(fileUri);
            await vscode.env.clipboard.writeText(content);
            vscode.window.showInformationMessage(`Content of ${fileKey} copied to clipboard.`);
        }, true, true);
    }

    async openPromptContextItemInFileManagerAsync(workspace?: vscode.WorkspaceFolder, fileKey?: PromptContextFileKey): Promise<void> {
        return this.queueCommand("openPromptContextItemInFileManagerAsync",
            async (cancellationToken: vscode.CancellationToken) => {
            workspace = workspace || await this.getWorkspaceForCommand();
            if (!workspace) { return; }

            if (!fileKey) {
                fileKey = await this.showPromptContextItemQuickPick();
                if (!fileKey) { return; }
            }

            if (cancellationToken.isCancellationRequested) {
                throw new vscode.CancellationError();
            }

            const fileUri = this.storageManager.getPromptContextFileUri(workspace, fileKey);
            await vscode.env.openExternal(vscode.Uri.file(fileUri.fsPath));
        }, true, true);
    }
    
    async openPromptContextFolderInFileManagerAsync(workspace?: vscode.WorkspaceFolder): Promise<void> {
        return this.queueCommand("openPromptContextFolderInFileManagerAsync",
            async (cancellationToken: vscode.CancellationToken) => {
            workspace = workspace || await this.getWorkspaceForCommand();
            if (!workspace) { return; }

            if (cancellationToken.isCancellationRequested) {
                throw new vscode.CancellationError();
            }

            const folderUri = this.storageManager.getPromptContextFolderUri(workspace);
            await vscode.env.openExternal(vscode.Uri.file(folderUri.fsPath));
        }, true, true);
    }



    // PRIVATE QUICK PICKERS

    private async showWorkspaceQuickPick(): Promise<vscode.WorkspaceFolder | undefined> {
        const workspaces = vscode.workspace.workspaceFolders;
        if (!workspaces || workspaces.length === 0) {
            vscode.window.showErrorMessage('No workspaces are currently open.');
            return undefined;
        }

        if (workspaces.length === 1) {
            return workspaces[0];
        }

        const activeWorkspace = this.stateManager.getActiveWorkspace();
        const items = workspaces.map(ws => ({
            label: ws.name,
            description: ws === activeWorkspace ? '(Active)' : '',
            workspace: ws
        }));

        // Move active workspace to the top
        items.sort((a, b) => b.description ? 1 : a.description ? -1 : 0);

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a workspace'
        });

        return selected?.workspace;
    }    

    private async showPromptConfigItemQuickPick(): Promise<PromptConfigFileKey | undefined> {
        const items = Object.entries(EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES).map(([key, value]) => ({
            label: value.label,
            description: value.description,
            fileKey: key as PromptConfigFileKey
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a prompt configuration item'
        });

        return selected?.fileKey;
    }
    
    private async showPromptContextItemQuickPick(): Promise<PromptContextFileKey | undefined> {
        const items = Object.entries(EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES).map(([key, value]) => ({
            label: value.label,
            description: value.description,
            fileKey: key as PromptContextFileKey
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a generated prompt item'
        });

        return selected?.fileKey;
    }


    // PRIVATE HELPERS
    private async getWorkspaceForCommand(): Promise<vscode.WorkspaceFolder | undefined> {
        const activeWorkspace = this.stateManager.getActiveWorkspace();
        if (activeWorkspace) {
            return activeWorkspace;
        }
        return this.showWorkspaceQuickPick();
    }
}