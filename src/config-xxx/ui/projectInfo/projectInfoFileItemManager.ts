// import * as vscode from 'vscode';
// import * as path from 'path';
// import { ConfigurationManager } from '../../managers/configurationManager';
// import { FileManager } from '../../utils/fileManager';
// import { ProjectInfoItem, ProjectInfoItemDefinition, ProjectInfoItemType } from './definitions';

// export class ProjectInfoFileItemManager {
//     private openProjectInfoFiles: Map<string, boolean> = new Map();
//     private _onDidChangeFileStatus: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
//     readonly onDidChangeFileStatus: vscode.Event<string> = this._onDidChangeFileStatus.event;

//     constructor(
//         private outputChannel: vscode.OutputChannel,
//         private configManager: ConfigurationManager,
//         private fileManager: FileManager
//     ) {
//         vscode.window.onDidChangeActiveTextEditor(this.handleActiveEditorChange, this);
//         vscode.workspace.onDidOpenTextDocument(this.handleDocumentOpen, this);
//         vscode.workspace.onDidCloseTextDocument(this.handleDocumentClose, this);
//         this.updateOpenFiles();
//     }

//     public getProjectInfoFilePath(contextValue: string): string {
//         const infoDir = this.configManager.getInfoDirectorySystemPath();
//         return path.join(infoDir, contextValue);
//     }

//     public isProjectInfoFile(uri: vscode.Uri): boolean {
//         const infoDir = this.configManager.getInfoDirectorySystemPath();
//         return uri.fsPath.startsWith(infoDir);
//     }

//     public isActive(filePath: string): boolean {
//         return this.openProjectInfoFiles.get(filePath) || false;
//     }

//     public async openProjectInfoFile(item: ProjectInfoItem) {
//         const filePath = this.getProjectInfoFilePath(item.definition.contextValue);
        
//         try {
//             await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
//         } catch (error) {
//             await this.createProjectInfoFileIfNotExists(filePath, item.definition);
//         }

//         const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
//         await vscode.window.showTextDocument(document, { preview: false });
//     }

//     public async loadProjectInfoFilesIfNotExist(itemsDefinition: ProjectInfoItemDefinition[]): Promise<void> {
//         const projectInfoFiles = this.getAllProjectInfoFiles(itemsDefinition);

//         for (const item of projectInfoFiles) {
//             const filePath = this.getProjectInfoFilePath(item.contextValue);
//             await this.createProjectInfoFileIfNotExists(filePath, item);
//         }
//     }

//     private getAllProjectInfoFiles(items: ProjectInfoItemDefinition[]): ProjectInfoItemDefinition[] {
//         return items.reduce((acc: ProjectInfoItemDefinition[], item) => {
//             if (item.itemType === ProjectInfoItemType.ProjectInfoFile) {
//                 acc.push(item);
//             }
//             if (item.children) {
//                 acc.push(...this.getAllProjectInfoFiles(item.children));
//             }
//             return acc;
//         }, []);
//     }

//     private async createProjectInfoFileIfNotExists(filePath: string, item: ProjectInfoItemDefinition): Promise<void> {
//         try {
//             await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
//         } catch (error) {
//             if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
//                 const defaultsDir = this.configManager.getProjectInfoDefaultsDirectorySystemPath();
//                 const defaultFilePath = path.join(defaultsDir, item.contextValue);
//                 let defaultContent = '';
//                 try {
//                     defaultContent = await this.fileManager.readFileIfExists(defaultFilePath) || '';
//                 } catch (err) {
//                     this.outputChannel.appendLine(`Error reading default content for project context configuration item: ${item.contextValue}. Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
//                 }
//                 await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(defaultContent, 'utf8'));
//                 this.outputChannel.appendLine(`Created project info file: ${filePath}`);
//             } else {
//                 throw error;
//             }
//         }
//     }

//     private handleActiveEditorChange = (editor: vscode.TextEditor | undefined): void => {
//         this.updateActiveState(editor);
//     };

//     private handleDocumentOpen = (document: vscode.TextDocument): void => {
//         if (this.isProjectInfoFile(document.uri)) {
//             this.openProjectInfoFiles.set(document.uri.fsPath, false);
//             this.updateActiveState(vscode.window.activeTextEditor);
//         }
//     };

//     private handleDocumentClose = (document: vscode.TextDocument): void => {
//         if (this.openProjectInfoFiles.has(document.uri.fsPath)) {
//             this.openProjectInfoFiles.delete(document.uri.fsPath);
//             this._onDidChangeFileStatus.fire(document.uri.fsPath);
//         }
//     };

//     private updateOpenFiles(): void {
//         this.openProjectInfoFiles.clear();
//         vscode.workspace.textDocuments.forEach(document => {
//             if (this.isProjectInfoFile(document.uri)) {
//                 this.openProjectInfoFiles.set(document.uri.fsPath, false);
//             }
//         });
//         this.updateActiveState(vscode.window.activeTextEditor);
//     }

//     private updateActiveState(activeEditor: vscode.TextEditor | undefined): void {
//         let activeFilePath: string | undefined;

//         if (activeEditor && this.isProjectInfoFile(activeEditor.document.uri)) {
//             activeFilePath = activeEditor.document.uri.fsPath;
//         }

//         let changed: string[] = [];

//         this.openProjectInfoFiles.forEach((isActive, filePath) => {
//             const shouldBeActive = filePath === activeFilePath;
//             if (isActive !== shouldBeActive) {
//                 this.openProjectInfoFiles.set(filePath, shouldBeActive);
//                 changed.push(filePath);
//             }
//         });

//         changed.forEach(filePath => {
//             this._onDidChangeFileStatus.fire(filePath);
//         });
//     }

//     dispose() { }
// }