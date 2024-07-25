// import * as vscode from 'vscode';
// import * as path from 'path';
// import { ConfigurationManager } from '../managers/configurationManager';
// import { ContextGitignoreParser, GitignoreParser } from './gitIgnoreParser';

// // Class for performing file operations using vscode native api
// export class FileManager {
//     constructor() {}

//     async createDirectoryIfNotExistsAsync(uri: vscode.Uri): Promise<void> {
//         try {
//             await vscode.workspace.fs.stat(uri);
//         } catch {
//             await vscode.workspace.fs.createDirectory(uri);
//         }
//     }

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

//     async writeFileAsync(filePath: string, content: string, fileType: string): Promise<void> {
//         try {
//             const fileUri = vscode.Uri.file(filePath);
//             await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//             throw new Error(`Failed to write ${fileType.toLowerCase()} file: ${errorMessage}`);
//         }
//     }
    
//     async appendToFileAsync(filePath: string, content: string, fileType: string): Promise<void> {
//         try {
//             const fileUri = vscode.Uri.file(filePath);
//             const existingContent = await this.readFileIfExistsAsync(filePath) || '';
//             const newContent = existingContent + content;
//             await vscode.workspace.fs.writeFile(fileUri, Buffer.from(newContent, 'utf8'));
//         } catch (error) {
//             const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//             throw new Error(`Failed to append to ${fileType.toLowerCase()} file: ${errorMessage}`);
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
    
//     async getAllWorkspacesAsync(): Promise<readonly vscode.WorkspaceFolder[]> {
//         const workspaceFolders = vscode.workspace.workspaceFolders;
//         if (!workspaceFolders) {
//             throw new Error('No workspace folders found');
//         }
//         return workspaceFolders;
//     }

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

//     async getAllFilesInWorkspaceAsync(workspace: vscode.WorkspaceFolder): Promise<string[]> {
//         const result: string[] = [];
//         const gitignoreParser = await this.getWorkspaceGitignoreAsync(workspace);

//         const files = await vscode.workspace.findFiles(
//             new vscode.RelativePattern(workspace, '**/*'),
//             new vscode.RelativePattern(workspace, '**/.git/**')
//         );

//         for (const file of files) {
//             const relativePath = path.relative(workspace.uri.fsPath, file.fsPath);
//             if (!gitignoreParser.shouldIgnore(relativePath)) {
//                 result.push(file.fsPath);
//             }
//         }
//         return result;
//     }
// }

// export class ContextFileManager extends FileManager {

//     constructor(configManager: ConfigurationManager) {
//         super(configManager);
//         // Initialize excludeParser and includeParser
//     }
    
    
//     async getWorkspaceStructureContextGitIgnoreAsync(workspace: vscode.WorkspaceFolder): Promise<ContextGitignoreParser> {}
//     async getWorkspaceContentContextGitIgnoreAsync(workspace: vscode.WorkspaceFolder): Promise<ContextGitignoreParser> {}
//     async getWorkspaceStructureFilesAsync(workspace: vscode.WorkspaceFolder): Promise<string[]> {}    
//     async getWorkspaceContentFilesAsync(workspace: vscode.WorkspaceFolder): Promise<string[]> {}
    



//     async generateAggregateFile(): Promise<void> {}
// }

// export class PromptFileManager extends FileManager {
//     constructor(configManager: ConfigurationManager) {
//         super(configManager);
//     }

//     async generateProjectSummaryFileAsync(): Promise<void> {}
//     async generateProjectGoalsFileAsync(): Promise<void> {}
//     async generateProjectStructureFileAsync(): Promise<void> {}
//     async generateProjectContentFileAsync(): Promise<void> {}

//     async generateFullPromptTextFile(): Promise<void> {}

//     async refreshAllFiles(): Promise<void> {}
// }