import * as vscode from 'vscode';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { ExtensionStateManager } from '../managers/extensionStateManager';


export class WorkspaceSelectionTreeProvider extends BaseLoggable implements vscode.TreeDataProvider<WorkspaceTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<WorkspaceTreeItem | undefined | null | void> = new vscode.EventEmitter<WorkspaceTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<WorkspaceTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private extensionStateManager: ExtensionStateManager
    ) {
        super(logName, outputChannel);
        extensionStateManager.onActiveWorkspaceChanged(() => this.refresh());
        //vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: WorkspaceTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: WorkspaceTreeItem): Thenable<WorkspaceTreeItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            const activeWorkspace = this.extensionStateManager.getActiveWorkspace();
            return Promise.resolve(
                (vscode.workspace.workspaceFolders || []).map(
                    ws => new WorkspaceTreeItem(ws, ws === activeWorkspace, {
                        command: 'llmPromptScaffold.setActiveWorkspace',
                        title: 'Set Active Workspace',
                        arguments: [ws]
                    })
                )
            );
        }
    }

    async showWorkspaceQuickPick(): Promise<void> {
        const workspaces = vscode.workspace.workspaceFolders;
        if (!workspaces || workspaces.length === 0) {
            vscode.window.showErrorMessage('No workspaces are currently open.');
            return;
        }

        const activeWorkspace = this.extensionStateManager.getActiveWorkspace();
        const items = workspaces.map(ws => ({
            label: ws.name,
            description: ws === activeWorkspace ? '(Active)' : '',
            workspace: ws
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select the active workspace for LLM Prompt Scaffold'
        });

        if (selected) {
            await this.setActiveWorkspace(selected.workspace);
        }
    }

    async setActiveWorkspace(workspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Setting active workspace to: ${workspace.name}`);
        this.extensionStateManager.setActiveWorkspace(workspace);
        this.refresh();
    }
}

class WorkspaceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly workspace: vscode.WorkspaceFolder,
        private isActive: boolean,
        public readonly command?: vscode.Command
    ) {
        super(workspace.name, vscode.TreeItemCollapsibleState.None);
        this.description = isActive ? '(Active)' : '';
        this.contextValue = 'workspace';
        
        if (isActive) {
            this.iconPath = new vscode.ThemeIcon('check');
        } else {
            this.iconPath = undefined;
        }
    }
}