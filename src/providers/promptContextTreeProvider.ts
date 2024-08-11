import * as vscode from 'vscode';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';
import { IExtensionStateManager } from '../managers/extensionStateManager';
import { IExtensionStorageManager } from '../managers/extensionStorageManager';
import { ExtensionUtils } from '../extension/utility/extensionUtils';
import { FileSystemUtils } from '../shared/utility/fileSystemUtils';
import { PromptContextFileKey } from '../extension/types';
import { MessageTreeItem, PromptContextTreeItem } from './treeItems';

export class PromptContextTreeProvider extends BaseLoggable implements vscode.TreeDataProvider<PromptContextTreeItem | MessageTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PromptContextTreeItem | MessageTreeItem | undefined | null | void> = new vscode.EventEmitter<PromptContextTreeItem | MessageTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PromptContextTreeItem | MessageTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private stateManager: IExtensionStateManager,
        private storageManager: IExtensionStorageManager
    ) {
        super(logName, outputChannel);
        this.addDisposable(
            this.stateManager.onActiveWorkspaceChanged(() => this.refresh())
        );
        this.addDisposable(
            this.storageManager.onPromptContextItemChanged(({ workspace, fileKey }) => this.refreshItem(workspace, fileKey))
        );
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PromptContextTreeItem | MessageTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: PromptContextTreeItem | MessageTreeItem): Promise<(PromptContextTreeItem | MessageTreeItem)[]> {
        const activeWorkspace = this.stateManager.getActiveWorkspace();
        if (!activeWorkspace) {
            return [
                new MessageTreeItem(
                    'No active workspace',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'llmPromptScaffold.setActiveWorkspace',
                        title: 'Select Active Workspace'
                    }
                )
            ];
        }
        return this.getPromptContextTreeItems(activeWorkspace);
    }    

    async refreshItem(workspace: vscode.WorkspaceFolder, fileKey: PromptContextFileKey | undefined): Promise<void> {
        if (fileKey === undefined) {
            this.refresh();
        } else {
            const updatedItem = await this.getPromptContextTreeItem(workspace, fileKey);
            this._onDidChangeTreeData.fire(updatedItem);
        }
    }
    
    private async getPromptContextTreeItems(workspace: vscode.WorkspaceFolder): Promise<PromptContextTreeItem[]> {
        const fileKeys = Object.keys(EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES) as PromptContextFileKey[];
        return Promise.all(fileKeys.map(fileKey => this.getPromptContextTreeItem(workspace, fileKey)));
    }

    private async getPromptContextTreeItem(workspace: vscode.WorkspaceFolder, fileKey: PromptContextFileKey): Promise<PromptContextTreeItem> {
        // this is returning config uri instead of context uri
        const fileUri = ExtensionUtils.getExtensionStoragePromptContextFileUri(workspace, fileKey);
        const fileSize = await FileSystemUtils.getFileSizeFormattedAsync(fileUri);
        return new PromptContextTreeItem(
            fileKey,
            vscode.TreeItemCollapsibleState.None,
            'file',
            {
                command: 'llmPromptScaffold.openPromptContextItem',
                title: 'Open Prompt Context Item',
                arguments: [workspace, fileKey]
            },
            [{
                command: 'llmPromptScaffold.generatePromptContextItem',
                title: 'Regenerate',
                arguments: [workspace, fileKey]
            }],
            fileSize
        );
    }
}