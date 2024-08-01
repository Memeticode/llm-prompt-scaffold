import * as vscode from 'vscode';
import { ExtensionConfigurationManager } from '../managers/extensionConfigurationManager';
import { ExtensionStorageManager } from '../managers/extensionStorageManager';
import { EXTENSION_STORAGE, ExtensionUtils } from '../utils/extensionUtils';
import { BaseProvider } from './baseProvider';

export class PromptGenerationTreeProvider extends BaseProvider implements vscode.TreeDataProvider<PromptGenerationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PromptGenerationItem | undefined | null | void> = new vscode.EventEmitter<PromptGenerationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PromptGenerationItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private configManager: ExtensionConfigurationManager,
        private storageManager: ExtensionStorageManager
    ) {
        super(logName, outputChannel);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PromptGenerationItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PromptGenerationItem): Thenable<PromptGenerationItem[]> {
        const activeWorkspace = this.configManager.getActiveWorkspace();
        if (!activeWorkspace) {
            return Promise.resolve([
                new PromptGenerationItem(
                    'No active workspace',
                    vscode.TreeItemCollapsibleState.None,
                    'message',
                    undefined,
                    new vscode.ThemeIcon('warning')
                )
            ]);
        }

        return Promise.resolve(this.getPromptOutFiles(activeWorkspace));
    }

    private getPromptOutFiles(workspace: vscode.WorkspaceFolder): PromptGenerationItem[] {
        return Object.entries(EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES).map(([key, fileName]) => 
            new PromptGenerationItem(
                this.formatLabel(key),
                vscode.TreeItemCollapsibleState.None,
                'file',
                {
                    command: 'llmPromptScaffold.openOrGeneratePromptFile',
                    title: 'Open or Generate Prompt File',
                    arguments: [workspace, key as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES]
                },
                this.getFileIcon(key)
            )
        );
    }

    private formatLabel(key: string): string {
        return key.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
    }

    private getFileIcon(key: string): vscode.ThemeIcon {
        switch (key) {
            case 'SYSTEM_PROMPT':
                return new vscode.ThemeIcon('symbol-keyword');
            case 'PROJECT_DESCRIPTION':
                return new vscode.ThemeIcon('book');
            case 'PROJECT_GOALS':
                return new vscode.ThemeIcon('target');
            case 'FILE_CONTEXT_STRUCTURE':
                return new vscode.ThemeIcon('symbol-structure');
            case 'FILE_CONTEXT_CONTENT':
                return new vscode.ThemeIcon('symbol-file');
            default:
                return new vscode.ThemeIcon('file');
        }
    }
}

class PromptGenerationItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly command?: vscode.Command,
        public readonly iconPath?: vscode.ThemeIcon
    ) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        if (command) {
            this.command = command;
        }
        if (iconPath) {
            this.iconPath = iconPath;
        }
    }
}