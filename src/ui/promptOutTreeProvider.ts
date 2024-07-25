// import * as vscode from 'vscode';
// import * as path from 'path';
// import { ConfigurationManager } from '../managers/configurationManager';
// import { FileManager } from '../utils/fileManager';

// export class PromptOutTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
//     private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
//     readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
//     private fileSystemWatcher: vscode.FileSystemWatcher;
//     private actionStatuses: Map<string, 'default' | 'inProgress'> = new Map();


//     constructor(
//         private outputChannel: vscode.OutputChannel,
//         private configManager: ConfigurationManager,
//         private fileManager: FileManager
//     ) {
//         this.fileSystemWatcher = this.createFileSystemWatcher();
//     }

//     private createFileSystemWatcher(): vscode.FileSystemWatcher {
//         const outDir = this.configManager.getOutDirectorySystemPath();
//         const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(outDir, '*'));

//         watcher.onDidCreate(() => this.refresh());
//         watcher.onDidDelete(() => this.refresh());
//         watcher.onDidChange(() => this.refresh());

//         return watcher;
//     }

//     getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
//         return element;
//     }
//     getChildren(element?: vscode.TreeItem): vscode.TreeItem[] | Thenable<vscode.TreeItem[]> {
//         return this.getFileItems();
//     }


//     updateActionStatus(actionId: string, status: 'default' | 'inProgress'): void {
//         this.actionStatuses.set(actionId, status);
//         this._onDidChangeTreeData.fire();
//     }

//     getActionStatus(actionId: string): 'default' | 'inProgress' {
//         return this.actionStatuses.get(actionId) || 'default';
//     }
//     private async getFileItems(): Promise<vscode.TreeItem[]> {
//         const outDir = this.configManager.getOutDirectorySystemPath();
//         try {
//             const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(outDir));
//             return Promise.all(files
//                 .filter(([name, type]) => type === vscode.FileType.File)
//                 .map(async ([name, type]) => {
//                     const fileUri = vscode.Uri.file(path.join(outDir, name));
//                     const fileStat = await vscode.workspace.fs.stat(fileUri);
//                     const fileSizeString = this.formatFileSize(fileStat.size);
    
//                     const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None);
//                     item.description = fileSizeString;
//                     item.iconPath = new vscode.ThemeIcon('file');
//                     item.command = { 
//                         command: 'vscode.open', 
//                         title: "Open File", 
//                         arguments: [fileUri]
//                     };
//                     return item;
//                 }));
//         } catch (error) {
//             console.error('Error reading prompt files directory:', error);
//             return [];
//         }
//     }
    
//     private formatFileSize(bytes: number): string {
//         const units = ['B', 'KB', 'MB', 'GB', 'TB'];
//         let size = bytes;
//         let unitIndex = 0;
    
//         while (size >= 1024 && unitIndex < units.length - 1) {
//             size /= 1024;
//             unitIndex++;
//         }
    
//         return `${size.toFixed(1)} ${units[unitIndex]}`;
//     }
    
//     refresh(): void {
//         this._onDidChangeTreeData.fire();
//     }

//     dispose(): void {
//         this.fileSystemWatcher.dispose();
//     }
// }