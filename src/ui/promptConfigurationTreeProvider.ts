import * as vscode from 'vscode';
import { ExtensionConfigurationManager } from '../managers/extensionConfigurationManager';
import { EXTENSION_STORAGE, ExtensionUtils } from '../utils/extensionUtils';
import { BaseProvider } from './baseProvider';

export class PromptConfigurationTreeProvider extends BaseProvider implements vscode.TreeDataProvider<ConfigurationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ConfigurationItem | undefined | null | void> = new vscode.EventEmitter<ConfigurationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ConfigurationItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private configManager: ExtensionConfigurationManager
    ) {
        super(logName, outputChannel);

        // display updated config
        this.configManager.onActiveWorkspaceChanged(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ConfigurationItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ConfigurationItem): Promise<ConfigurationItem[]> {
        const activeWorkspace = this.configManager.getActiveWorkspace();
        if (!activeWorkspace) {
            return [new ConfigurationItem('No active workspace', vscode.TreeItemCollapsibleState.None)];
        }

        if (!element) {
            return this.getRootItems(activeWorkspace);
        }

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

    private getRootItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
        return [
            new ConfigurationItem('System Prompt', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'SYSTEM_PROMPT')),
            new ConfigurationItem('Project Description', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'PROJECT_DESCRIPTION')),
            new ConfigurationItem('Session Goals', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'PROJECT_GOALS')),
            new ConfigurationItem('File Context', vscode.TreeItemCollapsibleState.Collapsed, 'fileContext')
        ];
    }

    private getFileContextItems(): ConfigurationItem[] {
        return [
            new ConfigurationItem('Structure', vscode.TreeItemCollapsibleState.Collapsed, 'structure'),
            new ConfigurationItem('Content', vscode.TreeItemCollapsibleState.Collapsed, 'content')
        ];
    }

    private getStructureItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
        return [
            new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'PROJECT_CONTEXT_STRUCTURE_EXCLUDE')),
            new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'PROJECT_CONTEXT_STRUCTURE_INCLUDE'))
        ];
    }

    private getContentItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
        return [
            new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'PROJECT_CONTEXT_CONTENT_EXCLUDE')),
            new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'PROJECT_CONTEXT_CONTENT_INCLUDE'))
        ];
    }

    private getFileCommand(workspace: vscode.WorkspaceFolder, fileType: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES): vscode.Command {
        const fileUri = ExtensionUtils.getExtensionStorageFileUri(workspace, fileType);
        return {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [fileUri]
        };
    }
}


class ConfigurationItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string,
        public readonly command?: vscode.Command
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
            case 'fileContext':
                return new vscode.ThemeIcon('filter');
            case 'structure':
                return new vscode.ThemeIcon('list-tree');
            case 'content':
                return new vscode.ThemeIcon('file-text');
            case 'file':
                if (this.label.toLowerCase() === 'system prompt') {
                    return new vscode.ThemeIcon('comment-discussion');
                } else if (this.label.toLowerCase() === 'project description') {
                    return new vscode.ThemeIcon('info');
                } else if (this.label.toLowerCase() === 'session goals') {
                    return new vscode.ThemeIcon('milestone');
                } else if (this.label.toLowerCase() === 'include') {
                    return new vscode.ThemeIcon('eye');
                } else if (this.label.toLowerCase() === 'exclude') {
                    return new vscode.ThemeIcon('eye-closed');
                }
                return new vscode.ThemeIcon('file');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }

    private getTooltip(): string {
        switch (this.label) {
            case 'System Prompt':
                return 'The base prompt used for the project';
            case 'Project Description':
                return 'Description of the entire project';
            case 'Session Goals':
                return 'Current development session goals';
            case 'File Context':
                return 'Settings for including/excluding files in structure and content summaries';
            case 'Structure':
                return 'Settings for including/excluding files in structure summaries';
            case 'Content':
                return 'Settings for including/excluding files in content summaries';
            case 'Exclude':
                return 'Files to exclude from the context';
            case 'Include':
                return 'Files to include in the context';
            default:
                return '';
        }
    }
}