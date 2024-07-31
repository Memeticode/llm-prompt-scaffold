// // fileStructureContextProvider.ts

// import * as vscode from 'vscode';
// import { BaseProvider } from './baseProvider';
// import { FileContextManager } from '../managers/fileContextManager';
// import { WORKSPACE_INFO_FILES } from '../constants/extensionStorageFolderItems';

// export class FileStructureContextProvider extends BaseProvider implements vscode.TreeDataProvider<FileItem> {
//     private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
//     readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

//     private watcher: vscode.FileSystemWatcher;

//     constructor(
//         logName: string,
//         outputChannel: vscode.OutputChannel,
//         private fileContextManager: FileContextManager
//     ) {
//         super(logName, outputChannel);
//         this.watcher = vscode.workspace.createFileSystemWatcher('**/*');
//         this.watcher.onDidChange(uri => this.handleFileChange(uri));
//         this.watcher.onDidCreate(uri => this.handleFileChange(uri));
//         this.watcher.onDidDelete(uri => this.handleFileChange(uri));
//     }

//     private async handleFileChange(uri: vscode.Uri) {
//         const workspace = vscode.workspace.getWorkspaceFolder(uri);
//         if (workspace) {
//             const relativePath = vscode.workspace.asRelativePath(uri, false);
//             if (relativePath === WORKSPACE_INFO_FILES.INCLUDE_STRUCTURE_GITIGNORE ||
//                 relativePath === WORKSPACE_INFO_FILES.EXCLUDE_STRUCTURE_GITIGNORE) {
//                 await this.fileContextManager.refreshWorkspaceFilter(workspace.uri);
//                 this._onDidChangeTreeData.fire();
//             }
//         }
//     }

//     async refresh(): Promise<void> {
//         this.logMessage('Refreshing File Structure Context');
//         await this.fileContextManager.refreshAllWorkspaceFilters();
//         this._onDidChangeTreeData.fire();
//     }

//     getTreeItem(element: FileItem): vscode.TreeItem {
//         return element;
//     }

//     async getChildren(element?: FileItem): Promise<FileItem[]> {
//         if (!element) {
//             return this.getWorkspaceFolders();
//         }

//         return this.getDirectoryContents(element.resourceUri);
//     }

//     private getWorkspaceFolders(): FileItem[] {
//         return vscode.workspace.workspaceFolders?.map(folder => 
//             new FileItem(folder.name, vscode.TreeItemCollapsibleState.Collapsed, folder.uri, 'workspace')
//         ) || [];
//     }

//     private async getDirectoryContents(directoryUri: vscode.Uri): Promise<FileItem[]> {
//         const entries = await this.fileContextManager.getDirectoryContents(directoryUri);
//         return entries.map(([name, type]) => 
//             new FileItem(
//                 name, 
//                 type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
//                 vscode.Uri.joinPath(directoryUri, name),
//                 type === vscode.FileType.Directory ? 'directory' : 'file'
//             )
//         ).sort(this.sortItems);
//     }

//     private sortItems(a: FileItem, b: FileItem): number {
//         if (a.contextValue === 'directory' && b.contextValue !== 'directory') {
//             return -1;
//         }
//         if (a.contextValue !== 'directory' && b.contextValue === 'directory') {
//             return 1;
//         }
//         return a.label.localeCompare(b.label);
//     }

//     dispose() {
//         this.watcher.dispose();
//     }
// }

// class FileItem extends vscode.TreeItem {
//     constructor(
//         public readonly label: string,
//         public readonly collapsibleState: vscode.TreeItemCollapsibleState,
//         public readonly resourceUri: vscode.Uri,
//         public readonly contextValue: string
//     ) {
//         super(label, collapsibleState);
//         this.resourceUri = resourceUri;
//         this.contextValue = contextValue;
//         if (this.contextValue === 'file') {
//             this.command = {
//                 command: 'vscode.open',
//                 title: 'Open File',
//                 arguments: [this.resourceUri]
//             };
//         }
//     }
// }