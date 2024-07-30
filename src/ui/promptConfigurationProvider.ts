import * as vscode from 'vscode';
import * as path from 'path';
import { STORAGE_FOLDER_STRUCTURE, SYSTEM_FILES, WORKSPACE_FILES } from '../constants/extensionStorageFolderItems';
import { ConfigurationManager } from '../managers/configurationManager';
import { FileSystemManager } from '../managers/fileSystemManager';

export class PromptConfigurationProvider implements vscode.TreeDataProvider<ConfigurationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConfigurationItem | undefined | null | void> = new vscode.EventEmitter<ConfigurationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConfigurationItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private configManager: ConfigurationManager,
        private fileSystemManager: FileSystemManager
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ConfigurationItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ConfigurationItem): Promise<ConfigurationItem[]> {
        if (!element) {
            return this.getRootItems();
        }

        switch (element.contextValue) {
            case 'projectInfo':
                return this.getProjectInfoItems();
            case 'workspaceFolders':
                return this.getWorkspaceFolderItems();
            case 'workspaceFolder':
                return this.getWorkspaceFolderConfigItems(element.workspaceFolder!);
            case 'fileStructureContext':
                return this.getFileContextItems(element.workspaceFolder!, 'structure');
            case 'fileContentContext':
                return this.getFileContextItems(element.workspaceFolder!, 'content');
            default:
                return [];
        }
    }

    private getRootItems(): ConfigurationItem[] {
        return [
            new ConfigurationItem('Project Info', vscode.TreeItemCollapsibleState.Collapsed, 'projectInfo'),
            new ConfigurationItem('Workspace Folder Info', vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolders')
        ];
    }

    private async getProjectInfoItems(): Promise<ConfigurationItem[]> {
        const rootWorkspace = await this.fileSystemManager.getRootWorkspaceAsync();
        const storageFolderName = this.configManager.getExtensionStorageFolderName(rootWorkspace);
        const systemInfoPath = path.join(rootWorkspace.uri.fsPath, storageFolderName, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO);

        return [
            new ConfigurationItem('System Prompt', vscode.TreeItemCollapsibleState.None, 'file', {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(path.join(systemInfoPath, SYSTEM_FILES.SCAFFOLD_PROMPT))]
            }),
            new ConfigurationItem('Project Description', vscode.TreeItemCollapsibleState.None, 'file', {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(path.join(systemInfoPath, SYSTEM_FILES.SYSTEM_DESCRIPTION))]
            }),
            new ConfigurationItem('Current Goals', vscode.TreeItemCollapsibleState.None, 'file', {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(path.join(systemInfoPath, SYSTEM_FILES.SESSION_GOALS))]
            })
        ];
    }

    private async getWorkspaceFolderItems(): Promise<ConfigurationItem[]> {
        const workspaces = await this.fileSystemManager.getAllWorkspacesAsync();
        return workspaces.map(workspace => 
            new ConfigurationItem(workspace.name, vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolder', undefined, workspace)
        );
    }

    private getWorkspaceFolderConfigItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
        return [
            new ConfigurationItem('Description', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, WORKSPACE_FILES.WORKSPACE_DESCRIPTION)),
            new ConfigurationItem('File Structure Context', vscode.TreeItemCollapsibleState.Collapsed, 'fileStructureContext', undefined, workspace),
            new ConfigurationItem('File Content Context', vscode.TreeItemCollapsibleState.Collapsed, 'fileContentContext', undefined, workspace)
        ];
    }

    private getFileContextItems(workspace: vscode.WorkspaceFolder, contextType: 'structure' | 'content'): ConfigurationItem[] {
        const includeFile = contextType === 'structure' ? WORKSPACE_FILES.INCLUDE_STRUCTURE_GITIGNORE : WORKSPACE_FILES.INCLUDE_CONTENT_GITIGNORE;
        const excludeFile = contextType === 'structure' ? WORKSPACE_FILES.EXCLUDE_STRUCTURE_GITIGNORE : WORKSPACE_FILES.EXCLUDE_CONTENT_GITIGNORE;

        return [
            new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, includeFile)),
            new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, excludeFile))
        ];
    }

    private getFileCommand(workspace: vscode.WorkspaceFolder, fileName: string): vscode.Command {
        const storageFolderName = this.configManager.getExtensionStorageFolderName(workspace);
        const filePath = path.join(workspace.uri.fsPath, storageFolderName, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO, fileName);
        return {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(filePath)]
        };
    }
}

class ConfigurationItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly command?: vscode.Command,
        public readonly workspaceFolder?: vscode.WorkspaceFolder
    ) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        if (command) {
            this.command = command;
        }
    }
}