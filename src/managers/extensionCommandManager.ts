import * as vscode from 'vscode';
import { BaseCommandQueue, ClearCommandQueueStrategy } from '../shared/base/baseCommandQueue';
import { ExtensionStateManager } from './extensionStateManager';
import { ExtensionStorageManager } from '../managers/extensionStorageManager';

export class CommandManager extends BaseCommandQueue {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private configManager: ExtensionStateManager,
        private storageManager: ExtensionStorageManager,
        maxHistoryLength: number = 100
    ) {
        super(logName, outputChannel, maxHistoryLength);
    }

    async setActiveWorkspace(workspaceFolder?: vscode.WorkspaceFolder): Promise<void> {
        return this.queueCommand(async (cancellationToken: vscode.CancellationToken) => {
            if (!workspaceFolder) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    throw new Error('No workspace folders are currently open.');
                }

                // If there's only one workspace folder, use it
                if (workspaceFolders.length === 1) {
                    workspaceFolder = workspaceFolders[0];
                } else {
                    // If multiple workspace folders, let the user choose
                    const selected = await vscode.window.showQuickPick(
                        workspaceFolders.map(folder => ({
                            label: folder.name,
                            description: folder.uri.fsPath,
                            folder: folder
                        })),
                        { placeHolder: 'Select a workspace folder' }
                    );

                    if (!selected) {
                        throw new Error('No workspace folder selected.');
                    }

                    workspaceFolder = selected.folder;
                }
            }

            // Check for cancellation before setting the active workspace
            if (cancellationToken.isCancellationRequested) {
                throw new vscode.CancellationError();
            }

            // Set the active workspace
            await this.configManager.setActiveWorkspace(workspaceFolder);

            // Log the action
            this.logMessage(`Active workspace set to: ${workspaceFolder.name}`);

            // Show a message to the user
            vscode.window.showInformationMessage(`Active workspace set to: ${workspaceFolder.name}`);
        }, true, true);  // Include command args and track command processing
    }

    // Other command methods will be added here...
}