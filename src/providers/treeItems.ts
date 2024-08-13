import * as vscode from 'vscode';
import { PromptConfigFileKey, PromptContextFileKey } from '../extension/types';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';

export class MessageTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.contextValue = 'message';
        if (command) {
            this.command = command;
        }
        this.iconPath = new vscode.ThemeIcon('info');
    }
}


export class PromptConfigurationTreeItem extends vscode.TreeItem {
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

export class PromptContextTreeItem extends vscode.TreeItem {
    constructor(
        public readonly workspace: vscode.WorkspaceFolder,
        public readonly fileKey: PromptContextFileKey,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly command?: vscode.Command,
        public readonly fileSize?: string
    ) {
        const label = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES[fileKey].label;
        super(label, collapsibleState);

        this.contextValue = contextValue;
        if (command) {
            this.command = command;
        }
        this.iconPath = this.getThemeIcon();
        this.description = `${fileSize}`;
        this.tooltip = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES[fileKey].description;
    }

    private getThemeIcon(): vscode.ThemeIcon {
        switch (this.fileKey) {
            case 'SYSTEM_PROMPT':
                return new vscode.ThemeIcon('comment-discussion');
            case 'PROJECT_DESCRIPTION':
                return new vscode.ThemeIcon('info');
            case 'SESSION_GOALS':
                return new vscode.ThemeIcon('milestone');
            case 'FILE_STRUCTURE':
                return new vscode.ThemeIcon('list-tree');
            case 'FILE_CONTENT':
                return new vscode.ThemeIcon('symbol-file');
            case 'AGGREGATE_PROMPT':
                return new vscode.ThemeIcon('unfold');
            default:
                return new vscode.ThemeIcon('file');
        }
    }
}
