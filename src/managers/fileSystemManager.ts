// import * as vscode from 'vscode';
// import * as path from 'path';
// import { BaseManager } from './baseManager';
// import { ConfigurationManager } from './configurationManager';
// import { FileFilter, IncludeExcludeGitignoreParser, GitignoreParser } from '../utils/fileFilters';

// // file manager provides methods for working with files & directories and getting workspaces
// // it's mostly used by other manager classes
// export class FileSystemManager extends BaseManager {

//     constructor(
//         logName: string,
//         outputChannel: vscode.OutputChannel,
//         private configurationManager: ConfigurationManager
//     ) {
//         super(logName, outputChannel);
//     }
    
    
//     static async readFileIfExistsSkipHashtagLinesAsync(uri: vscode.Uri): Promise<string | null> {           
//         const content = await this.readFileIfExistsAsync(uri);
//         if (content)
//         {
//             return content.split('\n')
//                 .filter(line => !line.trim().startsWith('#'))
//                 .join('\n');    
//         }
//         else
//         {
//             return content;
//         }
//     }


//     // Get the vscode file type for a given vscode uri 
//     async getFileTypeAsync(uri: vscode.Uri): Promise<vscode.FileType> {
//         const stat = await vscode.workspace.fs.stat(uri);
//         return stat.type;
//     }

//     // FILE OPERATIONS
//     async fileExistsAsync(filePath: string): Promise<boolean> {
//         try {
//             await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
//             return true;
//         } catch (error) {
//             if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
//                 return false;
//             }
//             throw error;
//         }
//     }

//     async readFileAsync(filePath: string): Promise<string> {
//         try {
//             const fileUri = vscode.Uri.file(filePath);
//             const fileContent = await vscode.workspace.fs.readFile(fileUri);
//             return Buffer.from(fileContent).toString('utf8');
//         } catch (error) {
//             throw new Error(`Failed to read file ${filePath}. Error: ${error}`);
//         }
//     }

//     async readUserManagedFileForPromptAsync(filePath: string): Promise<string> {           
//         try {
//             const content = await this.readFileAsync(filePath);
//             return content.split('\n')
//                 .filter(line => !line.trim().startsWith('#'))
//                 .join('\n');    
//         } catch (error) {
//             throw new Error(`Failed to read default file content at ${filePath}. Error: ${error}`);
//         }
//     }

//     async readFileIfExistsAsync(filePath: string): Promise<string | null> {
//         try {
//             const fileUri = vscode.Uri.file(filePath);
//             const fileContent = await vscode.workspace.fs.readFile(fileUri);
//             const content = Buffer.from(fileContent).toString('utf8');
//             return content.trim() !== '' ? content : null;
//         } catch (error) {
//             if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
//                 return null;
//             }
//             throw error;
//         }
//     }

//     async deleteFileAsync(filePath: string): Promise<void> {
//         try {
//             const fileUri = vscode.Uri.file(filePath);
//             await vscode.workspace.fs.delete(fileUri);
//         } catch (error) {
//             throw new Error(`Failed to delete file ${filePath}. Error: ${error}`);
//         }
//     }

//     async writeFileAsync(filePath: string, content: string): Promise<void> {
//         try {
//             this.logMessage(`Writing content to file: ${filePath}`);
//             if (!(await this.isValidFilePathAsync(filePath))) {
//                 throw new Error(`Invalid file path: ${filePath}`);
//             }
//             const fileUri = vscode.Uri.file(filePath);
//             await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//             this.logError(errorMessage);
//             throw new Error(`Failed to write content to file ${filePath}. Error: ${errorMessage}`);
//         }
//     }

//     async writeStorageFileIfNotExistsAsync(filePath: string, defaultContentPath: string): Promise<void> {
//         if (!(await this.fileExistsAsync(filePath))) {
//             let content = '';
//             if (defaultContentPath) {
//                 this.logMessage(`Loading default content: file=${filePath}, defaultContentPath=${defaultContentPath}`);
//                 if (await this.fileExistsAsync(defaultContentPath)) {
//                     content = await this.readFileAsync(defaultContentPath);
//                 } else {
//                     const errorMessage = `Loading default content: file=${filePath}, defaultContentPath=${defaultContentPath}`;
//                     this.logError(errorMessage);
//                     throw new Error(`Failed to write content to file ${filePath}. Error: ${errorMessage}`);
//                 }
//             }
//             await this.writeFileAsync(filePath, content);
//         }
//     }
    
//     async appendToFileAsync(filePath: string, content: string): Promise<void> {
//         try {
//             this.logMessage(`Appending content to file: ${filePath}`);
//             const fileUri = vscode.Uri.file(filePath);
//             const existingContent = await this.readFileIfExistsAsync(filePath) || '';
//             const newContent = existingContent + content;
//             await vscode.workspace.fs.writeFile(fileUri, Buffer.from(newContent, 'utf8'));
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//             this.logError(errorMessage);
//             throw new Error(`Failed to append content to file ${filePath}. Error: ${errorMessage}`);
//         }
//     }

//     async copyFileAsync(oldFilePath: string, newFilePath: string, allowOverwrite: boolean = false): Promise<void> {
//         this.logMessage(`Copying file: old=${oldFilePath}, new=${newFilePath}, overwrite=${allowOverwrite}`);
//         try {
//             const oldUri = vscode.Uri.file(oldFilePath);
//             const newUri = vscode.Uri.file(newFilePath);
//             await vscode.workspace.fs.copy(oldUri, newUri, { overwrite: allowOverwrite });
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//             this.logError(errorMessage);
//             throw new Error(`Failed to copy file from ${oldFilePath} to ${newFilePath}. Error: ${error}`);
//         }
//     }
    
//     async moveFileAsync(oldFilePath: string, newFilePath: string, allowOverwrite: boolean = false): Promise<void> {
//         this.logMessage(`Moving file: old=${oldFilePath}, new=${newFilePath}, overwrite=${allowOverwrite}`);
//         try {
//             const oldUri = vscode.Uri.file(oldFilePath);
//             const newUri = vscode.Uri.file(newFilePath);
//             await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: allowOverwrite });
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//             this.logError(errorMessage);
//             throw new Error(`Failed to move file from ${oldFilePath} to ${newFilePath}. Error: ${error}`);
//         }
//     }


//     // DIRECTORY OPERATIONS

//     async directoryExistsAsync(uri: vscode.Uri): Promise<boolean> {
//         try {
//             await vscode.workspace.fs.stat(uri);
//             return true;
//         } catch {
//             return false;
//         }
//     }

//     async getDirectoryContentsAsync(uri: vscode.Uri, filters?: FileFilter | FileFilter[]): Promise<[string, vscode.FileType][]> {
//         const entries = await vscode.workspace.fs.readDirectory(uri);
//         if (!filters) {
//             return entries;
//         }

//         const filterArray = Array.isArray(filters) ? filters : [filters];
//         const filteredEntries = [];

//         for (const entry of entries) {
//             const entryUri = vscode.Uri.joinPath(uri, entry[0]);
//             if (await this.shouldIncludeFile(entryUri, filterArray)) {
//                 filteredEntries.push(entry);
//             }
//         }

//         return filteredEntries;
//     }

//     private async shouldIncludeFile(uri: vscode.Uri, filters: FileFilter[]): Promise<boolean> {
//         for (const filter of filters) {
//             if (!(await filter.shouldInclude(uri))) {
//                 return false;
//             }
//         }
//         return true;
//     }

//     async deleteDirectoryAsync(uri: vscode.Uri, recursive: boolean = true): Promise<void> {
//         this.logMessage(`Deleting directory (recursive=${recursive}): ${uri}`);
//         await vscode.workspace.fs.delete(uri, { recursive: recursive });
//     }
        
//     async createDirectoryAsync(uri: vscode.Uri): Promise<void> {
//         this.logMessage(`Creating directory: ${uri}`);
//         try {
//             await vscode.workspace.fs.createDirectory(uri);
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//             this.logError(errorMessage);
//             throw new Error(`Failed to create directory ${uri.fsPath}. Error: ${error}`);
//         }
//     }

//     async createDirectoryIfNotExistsAsync(uri: vscode.Uri): Promise<void> {
//         this.logMessage(`Creating directory if not exists: ${uri}`);
//         try {
//             this.logMessage(`Directory already exists: ${uri}`);
//             await vscode.workspace.fs.stat(uri);
//         } catch {
//             this.logMessage(`Directory does not exist, creating: ${uri}`);
//             await vscode.workspace.fs.createDirectory(uri);
//         }
//     }
    
//     async copyDirectoryAsync(oldPath: string, newPath: string, allowOverwrite: boolean = false): Promise<void> {
//         this.logMessage(`Copying directory: old=${oldPath}, new=${newPath}, overwrite=${allowOverwrite}`);
//         try {
//             const oldUri = vscode.Uri.file(oldPath);
//             const newUri = vscode.Uri.file(newPath);
//             await this.recursiveCopy(oldUri, newUri, allowOverwrite);
//         } catch (error) {
//             throw new Error(`Failed to copy directory from ${oldPath} to ${newPath}. Error: ${error}`);
//         }
//     }

//     private async recursiveCopy(source: vscode.Uri, target: vscode.Uri, allowOverwrite: boolean): Promise<void> {
//         const stat = await vscode.workspace.fs.stat(source);
//         if (stat.type === vscode.FileType.Directory) {
//             await vscode.workspace.fs.createDirectory(target);
//             const entries = await vscode.workspace.fs.readDirectory(source);
//             for (const [name, type] of entries) {
//                 await this.recursiveCopy(vscode.Uri.joinPath(source, name), vscode.Uri.joinPath(target, name), allowOverwrite);
//             }
//         } else {
//             await vscode.workspace.fs.copy(source, target, { overwrite: allowOverwrite });
//         }
//     }
    
//     async moveDirectoryAsync(oldPath: string, newPath: string, allowOverwrite: boolean = false): Promise<void> {
//         this.logMessage(`Moving directory: old=${oldPath}, new=${newPath}, overwrite=${allowOverwrite}`);
//         // implement, moves the directory and content to new location (oldPath should not exist after)
//         try {
//             const oldUri = vscode.Uri.file(oldPath);
//             const newUri = vscode.Uri.file(newPath);
//             await vscode.workspace.fs.rename(oldUri, newUri, { overwrite: allowOverwrite });
//         } catch (error) {
//             throw new Error(`Failed to move directory from ${oldPath} to ${newPath}. Error: ${error}`);
//         }
//     }

//     // WORKSPACE OPERATIONS
    
//     hasWorkspace(): boolean {
//         // implement, checks to see if workspace exists
//         const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
//         if (workspaceFolder) {
//             return true;
//         }
//         else {
//             return false;
//         }
//     }

//     isRootWorkspace(workspaceFolder: vscode.WorkspaceFolder): boolean {
//         const isRoot = vscode.workspace.workspaceFolders?.[0] === workspaceFolder;
//         return isRoot;
//     }

//     async getRootWorkspaceAsync(): Promise<vscode.WorkspaceFolder> {
//         const workspaceFolders = vscode.workspace.workspaceFolders;
//         if (!workspaceFolders || workspaceFolders.length === 0) {
//             throw new Error('No workspace folders found');
//         }
//         return workspaceFolders[0];
//     }

//     async getWorkspaceByNameAsync(name: string): Promise<vscode.WorkspaceFolder> {
//         const workspaceFolders = vscode.workspace.workspaceFolders;
//         if (!workspaceFolders) {
//             throw new Error('No workspace folders found');
//         }
//         const workspace = workspaceFolders.find(folder => folder.name === name);
//         if (!workspace) {
//             throw new Error(`Workspace with name "${name}" not found`);
//         }
//         return workspace;
//     }
        
//     async getAllWorkspaceNamesAsync(): Promise<string[]> {
//         const workspaceFolders = vscode.workspace.workspaceFolders;
//         if (!workspaceFolders) {
//             return [];
//         }
//         return workspaceFolders.map(folder => folder.name);
//     }

//     async getAllWorkspacesAsync(): Promise<readonly vscode.WorkspaceFolder[]> {
//         const workspaceFolders = vscode.workspace.workspaceFolders;
//         if (!workspaceFolders) {
//             throw new Error('No workspace folders found');
//         }
//         return workspaceFolders;
//     }


//     // WORKSPACE GIT IGNORE OPERATIONS

//     async workspaceHasGitignoreAsync(workspace: vscode.WorkspaceFolder): Promise<boolean> {
//         const gitignorePath = vscode.Uri.joinPath(workspace.uri, '.gitignore');
//         try {
//             await vscode.workspace.fs.stat(gitignorePath);
//             return true;
//         } catch (error) {
//             if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
//                 return false;
//             }
//             throw error;
//         }
//     }
    
//     async getWorkspaceGitignoreAsync(workspace: vscode.WorkspaceFolder): Promise<GitignoreParser> {
//         const gitignorePath = vscode.Uri.joinPath(workspace.uri, '.gitignore');
//         const parser = new GitignoreParser(workspace.uri, '.gitignore');
//         try {
//             await parser.loadRules();
//         } catch (error) {
//             if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
//                 // Return empty ruleset by default
//                 console.log(`No .gitignore found in workspace ${workspace.name}. Using empty ruleset.`);
//             } else {
//                 throw error;
//             }
//         }
//         return parser;
//     }
    

//     async getAllFilesInWorkspaceAsync(workspace: vscode.WorkspaceFolder, filters?: FileFilter | FileFilter[]): Promise<vscode.Uri[]> {
//         const files = await vscode.workspace.findFiles(
//             new vscode.RelativePattern(workspace, '**/*'),
//             new vscode.RelativePattern(workspace, '**/.git/**')
//         );

//         if (!filters) {
//             return files;
//         }

//         const filterArray = Array.isArray(filters) ? filters : [filters];

//         const filteredFiles = [];
//         for (const file of files) {
//             let includeFile = true;
//             for (const filter of filterArray) {
//                 if (!(await filter.shouldInclude(file))) {
//                     includeFile = false;
//                     break;
//                 }
//             }
//             if (includeFile) {
//                 filteredFiles.push(file);
//             }
//         }

//         return filteredFiles;
//     }


//     async getAllFilesInWorkspaceApplyGitignoreAsync(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
//         const extStorageFolderName = this.configurationManager.getExtensionStorageFolderName(workspace);
//         const excludePattern = `**/{.git,${extStorageFolderName}}/**`;
    
//         const files = await vscode.workspace.findFiles(
//             new vscode.RelativePattern(workspace, '**/*'),
//             new vscode.RelativePattern(workspace, excludePattern)
//         );
    
//         const gitignoreFilter = await this.getWorkspaceGitignoreFilterAsync(workspace);
        
//         const filteredFiles = [];
//         for (const file of files) {
//             if (await gitignoreFilter.shouldInclude(file)) {
//                 filteredFiles.push(file);
//             }
//         }
    
//         return filteredFiles;
//     }
    
//     private async getWorkspaceGitignoreFilterAsync(workspace: vscode.WorkspaceFolder): Promise<FileFilter> {
//         const hasGitignore = await this.workspaceHasGitignoreAsync(workspace);
//         if (hasGitignore) {
//             const gitignoreParser = new GitignoreParser(workspace.uri, '.gitignore');
//             await gitignoreParser.loadRules();
//             return gitignoreParser;
//         } else {
//             // If no .gitignore exists, return a filter that includes everything
//             return {
//                 shouldInclude: async () => true
//             };
//         }
//     }
// }