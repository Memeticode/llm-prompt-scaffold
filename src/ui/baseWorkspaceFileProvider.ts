// workspaceFileProvider.ts
import * as vscode from 'vscode';
import { BaseProvider } from './baseProvider';

export class BaseWorkspaceFileProvider extends BaseProvider implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

    protected watcher: vscode.FileSystemWatcher;

    constructor(logName: string, outputChannel: vscode.OutputChannel) {
        super(logName, outputChannel);
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*');
        this.watcher.onDidChange(() => this.refresh());
        this.watcher.onDidCreate(() => this.refresh());
        this.watcher.onDidDelete(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FileItem): Promise<FileItem[]> {
        if (!element) {
            return this.getWorkspaceFolders();
        }

        if (element.contextValue === 'workspace') {
            return this.getWorkspaceContents(element.resourceUri);
        }

        return this.getDirectoryContents(element.resourceUri);
    }

    protected getWorkspaceFolders(): FileItem[] {
        return vscode.workspace.workspaceFolders?.map(folder => 
            new FileItem(folder.name, vscode.TreeItemCollapsibleState.Collapsed, folder.uri, 'workspace')
        ) || [];
    }

    protected async getWorkspaceContents(workspaceUri: vscode.Uri): Promise<FileItem[]> {
        const workspace = vscode.workspace.getWorkspaceFolder(workspaceUri);
        if (!workspace) {
            this.logMessage(`Workspace not found for URI: ${workspaceUri.fsPath}`);
            return [];
        }

        const entries = await vscode.workspace.fs.readDirectory(workspaceUri);
        return this.createFileItems(entries, workspaceUri);
    }

    protected async getDirectoryContents(directoryUri: vscode.Uri): Promise<FileItem[]> {
        const entries = await vscode.workspace.fs.readDirectory(directoryUri);
        return this.createFileItems(entries, directoryUri);
    }

    protected createFileItems(entries: [string, vscode.FileType][], parentUri: vscode.Uri): FileItem[] {
        return entries.map(([name, type]) => 
            new FileItem(
                name, 
                type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                vscode.Uri.joinPath(parentUri, name),
                type === vscode.FileType.Directory ? 'directory' : 'file'
            )
        ).sort(this.sortItems);
    }

    protected sortItems(a: FileItem, b: FileItem): number {
        if (a.contextValue === 'directory' && b.contextValue !== 'directory') {
            return -1;
        }
        if (a.contextValue !== 'directory' && b.contextValue === 'directory') {
            return 1;
        }
        return a.label.localeCompare(b.label);
    }

    dispose() {
        this.watcher.dispose();
    }
}

export class FileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri: vscode.Uri,
        public readonly contextValue: string
    ) {
        super(label, collapsibleState);
        this.resourceUri = resourceUri;
        this.contextValue = contextValue;
        if (this.contextValue === 'file') {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [this.resourceUri]
            };
        }
    }
}