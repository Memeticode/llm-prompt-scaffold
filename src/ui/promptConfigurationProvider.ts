import * as vscode from 'vscode';
import { ExtensionStorageManager } from '../managers/extensionStorageManager';
import { EXTENSION_STORAGE, ExtensionUtils } from '../utils/extensionUtils';
import { VscodeWorkspaceUtils } from '../utils/vscodeWorkspaceUtils';

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
        this.iconPath = this.getThemeIcon();
        this.tooltip = this.getTooltip();
    }

    private getThemeIcon(): vscode.ThemeIcon {
        switch (this.contextValue) {
            case 'projectInfo':
                return new vscode.ThemeIcon('root-folder');
            case 'workspaceFolders':
                return new vscode.ThemeIcon('folder-library');
            case 'workspaceFolder':
                return new vscode.ThemeIcon('folder');
            case 'projectFileContext':
            case 'workspaceFolderFileContext':
                return new vscode.ThemeIcon('filter');
            case 'projectFileContextStructure':
            case 'workspaceFolderFileContextStructure':
                return new vscode.ThemeIcon('list-tree');
            case 'projectFileContextContent':
            case 'workspaceFolderFileContextContent':
                return new vscode.ThemeIcon('files');
            case 'file':
                if (this.label.toLowerCase().includes('description')) {
                    return new vscode.ThemeIcon('info');
                } else if (this.label.toLowerCase().includes('goals')) {
                    return new vscode.ThemeIcon('milestone');
                } else if (this.label.toLowerCase().includes('prompt')) {
                    return new vscode.ThemeIcon('comment-discussion');
                } else if (this.label.toLowerCase().includes('include')) {
                    return new vscode.ThemeIcon('eye');
                } else if (this.label.toLowerCase().includes('exclude')) {
                    return new vscode.ThemeIcon('eye-closed');
                }
                return new vscode.ThemeIcon('file');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }

    private getTooltip(): string {
        switch (this.contextValue) {
            case 'projectInfo':
                return 'Project-level prompt configuration settings';
            case 'workspaceFolders':
                return 'Workspace folder-level prompt configuration settings';
            case 'workspaceFolder':
                return `${this.label} workspace folder configuration settings`;
            case 'projectFileContext':
                return 'Project-level file context settings (not overridden by workspace-level file context rules)';
            case 'workspaceFolderFileContext':
                return `File context settings for the ${this.workspaceFolder?.name} workspace folder`;
            case 'projectFileContextStructure':
            case 'workspaceFolderFileContextStructure':
                return 'Settings for including/excluding files in structure summaries';
            case 'projectFileContextContent':
            case 'workspaceFolderFileContextContent':
                return 'Settings for including/excluding files in content summaries';
            case 'file':
                if (this.label.toLowerCase().includes('system prompt')) {
                    return 'The base prompt used for the project';
                } else if (this.label.toLowerCase().includes('project description')) {
                    return 'Description of the entire project';
                } else if (this.label.toLowerCase().includes('session goals')) {
                    return 'Current development session goals';
                } else if (this.label.toLowerCase().includes('folder description')) {
                    return 'Description of this specific workspace folder';
                } else if (this.label.toLowerCase().includes('include')) {
                    return 'Files to include in the context';
                } else if (this.label.toLowerCase().includes('exclude')) {
                    return 'Files to exclude from the context';
                }
                return 'Configuration file';
            default:
                return '';
        }
    }
}

export class PromptConfigurationProvider implements vscode.TreeDataProvider<ConfigurationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConfigurationItem | undefined | null | void> = new vscode.EventEmitter<ConfigurationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConfigurationItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {}

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
                return await this.getProjectInfoItemsAsync();
            case 'projectFileContext':
                return this.getProjectFileContextItems();
            case 'projectFileContextStructure':
                return await this.getProjectFileContextStructureItemsAsync();
            case 'projectFileContextContent':
                return this.getProjectFileContextContentItemsAsync();
            case 'workspaceFolders':
                return await this.getWorkspaceFolderItemsAsync();
            case 'workspaceFolder':
                return this.getWorkspaceFolderConfigItems(element.workspaceFolder!);
            case 'workspaceFolderFileContext':
                return this.getWorkspaceFolderFileContextItems(element.workspaceFolder!);
            case 'workspaceFolderFileContextStructure':
                return this.getWorkspaceFolderFileContextStructureItems(element.workspaceFolder!);
            case 'workspaceFolderFileContextContent':
                return this.getWorkspaceFolderFileContextContentItems(element.workspaceFolder!);
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

    private async getProjectInfoItemsAsync(): Promise<ConfigurationItem[]> {
        const rootWorkspace = await VscodeWorkspaceUtils.getRootWorkspaceFolderAsync();
        const projectInfoFiles = EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES;

        return [
            new ConfigurationItem('System Prompt', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'SYSTEM_PROMPT')),
            new ConfigurationItem('Project Description', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_DESCRIPTION')),
            new ConfigurationItem('Session Goals', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_GOALS')),
            new ConfigurationItem('File Context', vscode.TreeItemCollapsibleState.Collapsed, 'projectFileContext')
        ];
    }

    private getProjectFileContextItems(): ConfigurationItem[] {
        return [
            new ConfigurationItem('Structure', vscode.TreeItemCollapsibleState.Collapsed, 'projectFileContextStructure'),
            new ConfigurationItem('Content', vscode.TreeItemCollapsibleState.Collapsed, 'projectFileContextContent')
        ];
    }

    private async getProjectFileContextStructureItemsAsync(): Promise<ConfigurationItem[]> {
        const rootWorkspace = await VscodeWorkspaceUtils.getRootWorkspaceFolderAsync();
        return [
            new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_CONTEXT_STRUCTURE_EXCLUDE')),
            new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_CONTEXT_STRUCTURE_INCLUDE'))
        ];
    }

    private async getProjectFileContextContentItemsAsync(): Promise<ConfigurationItem[]> {
        const rootWorkspace = await VscodeWorkspaceUtils.getRootWorkspaceFolderAsync();
        return [
            new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_CONTEXT_CONTENT_EXCLUDE')),
            new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_CONTEXT_CONTENT_INCLUDE'))
        ];
    }

    private async getWorkspaceFolderItemsAsync(): Promise<ConfigurationItem[]> {
        const workspaces = await VscodeWorkspaceUtils.getAllWorkspaceFoldersAsync();
        return workspaces.map(workspace => 
            new ConfigurationItem(workspace.name, vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolder', undefined, workspace)
        );
    }

    private getWorkspaceFolderConfigItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
        return [
            new ConfigurationItem('Folder Description', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'WORKSPACE_FOLDER_DESCRIPTION')),
            new ConfigurationItem('Folder File Context', vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolderFileContext', undefined, workspace)
        ];
    }

    private getWorkspaceFolderFileContextItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
        return [
            new ConfigurationItem('Structure', vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolderFileContextStructure', undefined, workspace),
            new ConfigurationItem('Content', vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolderFileContextContent', undefined, workspace)
        ];
    }

    private getWorkspaceFolderFileContextStructureItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
        return [
            new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'WORKSPACE_FOLDER_CONTEXT_STRUCTURE_EXCLUDE')),
            new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'WORKSPACE_FOLDER_CONTEXT_STRUCTURE_INCLUDE'))
        ];
    }

    private getWorkspaceFolderFileContextContentItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
        return [
            new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'WORKSPACE_FOLDER_CONTEXT_CONTENT_EXCLUDE')),
            new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'WORKSPACE_FOLDER_CONTEXT_CONTENT_INCLUDE'))
        ];
    }

    private getFileCommand(workspace: vscode.WorkspaceFolder, fileType: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES | keyof typeof EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES): vscode.Command {
        const fileUri = ExtensionUtils.getExtensionStorageFileUri(workspace, fileType);
        return {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [fileUri]
        };
    }
}
