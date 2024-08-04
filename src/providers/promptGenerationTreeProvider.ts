import * as vscode from 'vscode';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';
import { ExtensionStateManager } from '../managers/extensionStateManager';
import { ExtensionUtils } from '../shared/utility/extensionUtils';
import { FileSystemUtils } from '../shared/utility/fileSystemUtils';

export class PromptGenerationTreeProvider extends BaseLoggable implements vscode.TreeDataProvider<PromptGenerationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PromptGenerationItem | undefined | null | void> = new vscode.EventEmitter<PromptGenerationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PromptGenerationItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private configManager: ExtensionStateManager
    ) {
        super(logName, outputChannel);
        this.configManager.onActiveWorkspaceChanged(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PromptGenerationItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: PromptGenerationItem): Promise<PromptGenerationItem[]> {
        const activeWorkspace = this.configManager.getActiveWorkspace();
        if (!activeWorkspace) {
            return [
                new PromptGenerationItem(
                    'NO_ACTIVE_WORKSPACE',
                    vscode.TreeItemCollapsibleState.None,
                    'message',
                    {
                        command: 'llmPromptScaffold.setActiveWorkspace',
                        title: 'Select Active Workspace'
                    }
                )
            ];
        }
        return this.getPromptOutFilesAsync(activeWorkspace);
    }
    
    private async getPromptOutFilesAsync(workspace: vscode.WorkspaceFolder): Promise<PromptGenerationItem[]> {
        const items = await Promise.all(Object.entries(EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES).map(async ([key, fileName]) => {
            const fileUri = ExtensionUtils.getExtensionStoragePromptOutFileUri(workspace, key as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES);
            const fileSize = await FileSystemUtils.getFileSizeFormattedAsync(fileUri);
            return new PromptGenerationItem(
                key,
                vscode.TreeItemCollapsibleState.None,
                'file',
                {
                    command: 'llmPromptScaffold.openPromptOutFileInEditor',
                    title: 'Open Prompt Out File',
                    arguments: [workspace, key as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES]
                },
                [{
                    command: 'llmPromptScaffold.regenerateAndOpenPromptOutFileInEditor',
                    title: 'Regenerate',
                    arguments: [workspace, key as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES]
                }],
                fileSize
            );
        }));

        return items;
    }
    

}



class PromptGenerationItem extends vscode.TreeItem {
    constructor(
        public readonly fileKey: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly command?: vscode.Command,
        public readonly buttons?: vscode.Command[],
        public readonly fileSize?: string
    ) {
        const label = fileKey.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
        super(label, collapsibleState);

        this.fileKey = fileKey;
        this.contextValue = contextValue;
        if (command) {
            this.command = command;
        }
        if (buttons) {
            this.buttons = buttons;
        }
        this.iconPath = this.getThemeIcon();
        this.description = `${fileSize}`;

    }
    
    // private static formatLabel(key: string): string {
    //     return key.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
    // }

    private getThemeIcon(): vscode.ThemeIcon {
        switch (this.fileKey) {
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
                return new vscode.ThemeIcon('warning');
        }
    }
}