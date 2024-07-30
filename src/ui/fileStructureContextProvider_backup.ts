// import * as vscode from 'vscode';
// import * as path from 'path';
// import { BaseProvider } from './baseProvider';
// import { FileSystemManager } from '../managers/fileSystemManager';
// import { FileContextManager } from '../managers/fileContextManager';

// export class FileStructureContextProvider extends BaseProvider implements vscode.TreeDataProvider<FileItem> {

//     private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
//     readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

//     private treeCache: Map<string, Promise<FileItem[]>> = new Map();
//     private watcher: vscode.FileSystemWatcher;

//     constructor(
//         logName: string,
//         outputChannel: vscode.OutputChannel,
//         private fileSystemManager: FileSystemManager,
//         private fileContextManager: FileContextManager
//     ) {
//         super(logName, outputChannel);
//         this.watcher = vscode.workspace.createFileSystemWatcher('**/*');
//         this.watcher.onDidChange((uri) => this.handleFileChange(uri));
//         this.watcher.onDidCreate((uri) => this.handleFileChange(uri));
//         this.watcher.onDidDelete((uri) => this.handleFileChange(uri));
//     }

//     refresh(): void {
//         this.treeCache.clear();
//         this._onDidChangeTreeData.fire();
//     }

//     getTreeItem(element: FileItem): vscode.TreeItem {
//         return element;
//     }

//     async getChildren(element?: FileItem): Promise<FileItem[]> {
//         try {
//             if (!element) {
//                 return this.getWorkspaceFolders();
//             }

//             const cacheKey = element.resourceUri.fsPath;
//             if (this.treeCache.has(cacheKey)) {
//                 return this.treeCache.get(cacheKey)!;
//             }

//             let childrenPromise: Promise<FileItem[]>;

//             if (element.contextValue === 'workspace') {
//                 childrenPromise = this.getWorkspaceTopLevelItems(element.resourceUri);
//             } else if (element.contextValue === 'directory') {
//                 childrenPromise = this.getDirectoryChildren(element.resourceUri);
//             } else {
//                 this.outputChannel.appendLine(`Unknown context value: ${element.contextValue}`);
//                 childrenPromise = Promise.resolve([]);
//             }

//             const sortedChildrenPromise = childrenPromise.then(children => {
//                 this.outputChannel.appendLine(`Got ${children.length} children for ${element.label}`);
//                 return this.sortFileItems(children);
//             });
//             this.treeCache.set(cacheKey, sortedChildrenPromise);
//             return sortedChildrenPromise;
//         } catch (error) {
//             this.outputChannel.appendLine(`Error in getChildren: ${error}`);
//             return [];
//         }
//     }

//     private getWorkspaceFolders(): FileItem[] {
//         return vscode.workspace.workspaceFolders?.map(folder => 
//             new FileItem(folder.name, vscode.TreeItemCollapsibleState.Collapsed, folder.uri, 'workspace')
//         ) || [];
//     }

//     private async getWorkspaceTopLevelItems(workspaceUri: vscode.Uri): Promise<FileItem[]> {
//         const workspace = vscode.workspace.getWorkspaceFolder(workspaceUri);
//         if (!workspace) {
//             this.logMessage(`Workspace not found for URI: ${workspaceUri.fsPath}`);
//             return [];
//         }
//         const files = await this.fileContextManager.getWorkspaceFileStructure(workspace);
//         this.logMessage(`Total files for workspace ${workspace.name}: ${files.length}`);
        
//         const topLevelItems = files.filter(file => !file.includes(path.sep) || file.split(path.sep).length === 1);
//         this.logMessage(`Top-level items for workspace ${workspace.name}: ${topLevelItems.length}`);
        
//         return Promise.all(
//             topLevelItems.map(file => this.createFileItemAsync(file, workspaceUri))
//         );
//     }

//     private async createFileItemAsync(file: string, rootUri: vscode.Uri): Promise<FileItem> {
//         const filePath = path.join(rootUri.fsPath, file);
//         const fileUri = vscode.Uri.file(filePath);
//         const isDirectory = await this.fileSystemManager.directoryExistsAsync(fileUri);
        
//         // Log the item being created
//         this.logMessage(`Creating file item: ${file}, isDirectory: ${isDirectory}`);
        
//         return new FileItem(
//             path.basename(file),
//             isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
//             fileUri,
//             isDirectory ? 'directory' : 'file'
//         );
//     }

//     private async getDirectoryChildren(directoryUri: vscode.Uri): Promise<FileItem[]> {
//         const workspace = vscode.workspace.getWorkspaceFolder(directoryUri);
//         if (!workspace) {
//             this.logMessage(`Workspace not found for directory: ${directoryUri.fsPath}`);
//             return [];
//         }
//         const files = await this.fileContextManager.getWorkspaceFileStructure(workspace);
//         const directoryPath = path.relative(workspace.uri.fsPath, directoryUri.fsPath);
        
//         const children = files.filter(file => {
//             const fileDirname = path.dirname(file);
//             return fileDirname === directoryPath || 
//                    (directoryPath === '' && !file.includes(path.sep));
//         });
        
//         this.logMessage(`Children for directory ${directoryPath}: ${children.length}`);
        
//         return Promise.all(
//             children.map(file => this.createFileItemAsync(file, workspace.uri))
//         );
//     }
    

//     private sortFileItems(items: FileItem[]): FileItem[] {
//         return items.sort((a, b) => {
//             if (a.contextValue === 'directory' && b.contextValue !== 'directory') {
//                 return -1;
//             }
//             if (a.contextValue !== 'directory' && b.contextValue === 'directory') {
//                 return 1;
//             }
//             return a.label.localeCompare(b.label);
//         });
//     }

//     private async handleFileChange(uri: vscode.Uri): Promise<void> {
//         const workspace = vscode.workspace.getWorkspaceFolder(uri);
//         if (workspace) {
//             this.treeCache.clear();
//             this._onDidChangeTreeData.fire();
//         }
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