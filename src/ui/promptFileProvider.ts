// import * as vscode from 'vscode';
// import { ExtensionStorageManager } from '../managers/extensionStorageManager';
// import { EXTENSION_STORAGE, ExtensionUtils } from '../utils/extensionUtils';
// import { VscodeWorkspaceUtils } from '../utils/vscodeWorkspaceUtils';


// export class PromptFileProvider implements vscode.TreeDataProvider<ConfigurationItem> {
//     private _onDidChangeTreeData: vscode.EventEmitter<ConfigurationItem | undefined | null | void> = new vscode.EventEmitter<ConfigurationItem | undefined | null | void>();
//     readonly onDidChangeTreeData: vscode.Event<ConfigurationItem | undefined | null | void> = this._onDidChangeTreeData.event;

//     constructor() {}

//     refresh(): void {
//         this._onDidChangeTreeData.fire();
//     }

//     getTreeItem(element: ConfigurationItem): vscode.TreeItem {
//         return element;
//     }

//     async getChildren(element?: ConfigurationItem): Promise<ConfigurationItem[]> {
//         if (!element) {
//             return this.getRootItems();
//         }

//         switch (element.contextValue) {
//             case 'projectInfo':
//                 return await this.getProjectInfoItemsAsync();
//             case 'projectFileContext':
//                 return this.getProjectFileContextItems();
//             case 'projectFileContextStructure':
//                 return await this.getProjectFileContextStructureItemsAsync();
//             case 'projectFileContextContent':
//                 return this.getProjectFileContextContentItemsAsync();
//             case 'workspaceFolders':
//                 return await this.getWorkspaceFolderItemsAsync();
//             case 'workspaceFolder':
//                 return this.getWorkspaceFolderConfigItems(element.workspaceFolder!);
//             case 'workspaceFolderFileContext':
//                 return this.getWorkspaceFolderFileContextItems(element.workspaceFolder!);
//             case 'workspaceFolderFileContextStructure':
//                 return this.getWorkspaceFolderFileContextStructureItems(element.workspaceFolder!);
//             case 'workspaceFolderFileContextContent':
//                 return this.getWorkspaceFolderFileContextContentItems(element.workspaceFolder!);
//             default:
//                 return [];
//         }
//     }

//     private getRootItems(): ConfigurationItem[] {
//         return [
//             new ConfigurationItem('Project Info', vscode.TreeItemCollapsibleState.Collapsed, 'projectInfo'),
//             new ConfigurationItem('Workspace Folder Info', vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolders')
//         ];
//     }

//     private async getProjectInfoItemsAsync(): Promise<ConfigurationItem[]> {
//         const rootWorkspace = await VscodeWorkspaceUtils.getRootWorkspaceFolderAsync();
//         const projectInfoFiles = EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES;

//         return [
//             new ConfigurationItem('System Prompt', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'SYSTEM_PROMPT')),
//             new ConfigurationItem('Project Description', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_DESCRIPTION')),
//             new ConfigurationItem('Session Goals', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_GOALS')),
//             new ConfigurationItem('File Context', vscode.TreeItemCollapsibleState.Collapsed, 'projectFileContext')
//         ];
//     }

//     private getProjectFileContextItems(): ConfigurationItem[] {
//         return [
//             new ConfigurationItem('Structure', vscode.TreeItemCollapsibleState.Collapsed, 'projectFileContextStructure'),
//             new ConfigurationItem('Content', vscode.TreeItemCollapsibleState.Collapsed, 'projectFileContextContent')
//         ];
//     }

//     private async getProjectFileContextStructureItemsAsync(): Promise<ConfigurationItem[]> {
//         const rootWorkspace = await VscodeWorkspaceUtils.getRootWorkspaceFolderAsync();
//         return [
//             new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_CONTEXT_STRUCTURE_EXCLUDE')),
//             new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_CONTEXT_STRUCTURE_INCLUDE'))
//         ];
//     }

//     private async getProjectFileContextContentItemsAsync(): Promise<ConfigurationItem[]> {
//         const rootWorkspace = await VscodeWorkspaceUtils.getRootWorkspaceFolderAsync();
//         return [
//             new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_CONTEXT_CONTENT_EXCLUDE')),
//             new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(rootWorkspace, 'PROJECT_CONTEXT_CONTENT_INCLUDE'))
//         ];
//     }

//     private async getWorkspaceFolderItemsAsync(): Promise<ConfigurationItem[]> {
//         const workspaces = await VscodeWorkspaceUtils.getAllWorkspaceFoldersAsync();
//         return workspaces.map(workspace => 
//             new ConfigurationItem(workspace.name, vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolder', undefined, workspace)
//         );
//     }

//     private getWorkspaceFolderConfigItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
//         return [
//             new ConfigurationItem('Folder Description', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'WORKSPACE_FOLDER_DESCRIPTION')),
//             new ConfigurationItem('Folder File Context', vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolderFileContext', undefined, workspace)
//         ];
//     }

//     private getWorkspaceFolderFileContextItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
//         return [
//             new ConfigurationItem('Structure', vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolderFileContextStructure', undefined, workspace),
//             new ConfigurationItem('Content', vscode.TreeItemCollapsibleState.Collapsed, 'workspaceFolderFileContextContent', undefined, workspace)
//         ];
//     }

//     private getWorkspaceFolderFileContextStructureItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
//         return [
//             new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'WORKSPACE_FOLDER_CONTEXT_STRUCTURE_EXCLUDE')),
//             new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'WORKSPACE_FOLDER_CONTEXT_STRUCTURE_INCLUDE'))
//         ];
//     }

//     private getWorkspaceFolderFileContextContentItems(workspace: vscode.WorkspaceFolder): ConfigurationItem[] {
//         return [
//             new ConfigurationItem('Exclude', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'WORKSPACE_FOLDER_CONTEXT_CONTENT_EXCLUDE')),
//             new ConfigurationItem('Include', vscode.TreeItemCollapsibleState.None, 'file', this.getFileCommand(workspace, 'WORKSPACE_FOLDER_CONTEXT_CONTENT_INCLUDE'))
//         ];
//     }

//     private getFileCommand(workspace: vscode.WorkspaceFolder, fileType: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES | keyof typeof EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES): vscode.Command {
//         const fileUri = ExtensionUtils.getExtensionStorageFileUri(workspace, fileType);
//         return {
//             command: 'vscode.open',
//             title: 'Open File',
//             arguments: [fileUri]
//         };
//     }
// }
