import * as vscode from 'vscode';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { IExtensionStateManager } from '../managers/extensionStateManager';
import { PromptConfigFileKey } from '../extension/types';
import { MessageTreeItem, PromptConfigurationTreeItem } from './treeItems';

export class PromptConfigurationTreeProvider extends BaseLoggable implements vscode.TreeDataProvider<PromptConfigurationTreeItem | MessageTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PromptConfigurationTreeItem | MessageTreeItem | undefined | null | void> = new vscode.EventEmitter<PromptConfigurationTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PromptConfigurationTreeItem | MessageTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private stateManager: IExtensionStateManager
    ) {
        super(logName, outputChannel);
        this.addDisposable(
            this.stateManager.onActiveWorkspaceChanged(() => this.refresh())
        );
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PromptConfigurationTreeItem | MessageTreeItem): vscode.TreeItem {
        return element;
    }
    

    async getChildren(element?: PromptConfigurationTreeItem | MessageTreeItem): Promise<(PromptConfigurationTreeItem | MessageTreeItem)[]>
    {
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
        if (!element) {
            return this.getRootItems(activeWorkspace);
        }
        if (element instanceof PromptConfigurationTreeItem) {
            switch (element.contextValue) {
                case 'fileContext':
                    return this.getFileContextItems();
                case 'structure':
                    return this.getStructureItems(activeWorkspace);
                case 'content':
                    return this.getContentItems(activeWorkspace);
                default:
                    return [];
            }    
        }
        return [];

    }

    private getRootItems(workspace: vscode.WorkspaceFolder): PromptConfigurationTreeItem[] {
        return [
            new PromptConfigurationTreeItem('System Prompt', vscode.TreeItemCollapsibleState.None, 'file', this.getOpenFileCommand(workspace, 'SYSTEM_PROMPT')),
            new PromptConfigurationTreeItem('Project Description', vscode.TreeItemCollapsibleState.None, 'file', this.getOpenFileCommand(workspace, 'PROJECT_DESCRIPTION')),
            new PromptConfigurationTreeItem('Session Goals', vscode.TreeItemCollapsibleState.None, 'file', this.getOpenFileCommand(workspace, 'SESSION_GOALS')),
            new PromptConfigurationTreeItem('File Context', vscode.TreeItemCollapsibleState.Collapsed, 'fileContext')
        ];
    }

    private getFileContextItems(): PromptConfigurationTreeItem[] {
        return [
            new PromptConfigurationTreeItem('Structure', vscode.TreeItemCollapsibleState.Collapsed, 'structure'),
            new PromptConfigurationTreeItem('Content', vscode.TreeItemCollapsibleState.Collapsed, 'content')
        ];
    }

    private getStructureItems(workspace: vscode.WorkspaceFolder): PromptConfigurationTreeItem[] {
        return [
            new PromptConfigurationTreeItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getOpenFileCommand(workspace, 'PROJECT_CONTEXT_STRUCTURE_EXCLUDE')),
            new PromptConfigurationTreeItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getOpenFileCommand(workspace, 'PROJECT_CONTEXT_STRUCTURE_INCLUDE'))
        ];
    }

    private getContentItems(workspace: vscode.WorkspaceFolder): PromptConfigurationTreeItem[] {
        return [
            new PromptConfigurationTreeItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getOpenFileCommand(workspace, 'PROJECT_CONTEXT_CONTENT_EXCLUDE')),
            new PromptConfigurationTreeItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getOpenFileCommand(workspace, 'PROJECT_CONTEXT_CONTENT_INCLUDE'))
        ];
    }

    private getOpenFileCommand(workspace: vscode.WorkspaceFolder, fileType: PromptConfigFileKey): vscode.Command {
        return {
            command: 'llmPromptScaffold.openPromptConfigurationItem',
            title: 'Open File',
            arguments: [workspace, fileType]
        };
    }
}
