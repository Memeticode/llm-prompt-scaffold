// // fileContextManager.ts

// import * as vscode from 'vscode';
// import { BaseManager } from './baseManager';
// import { ConfigurationManager } from './configurationManager';
// import { FileSystemManager } from './fileSystemManager';
// import { FileFilter, GitignoreParser, IncludeExcludeGitignoreParser } from '../utils/fileFilters';
// import { WORKSPACE_INFO_FILES } from '../constants/extensionStorageFolderItems';

// export class FileContextManager extends BaseManager {
//     private workspaceFilters: Map<string, IncludeExcludeGitignoreParser> = new Map();
//     // make ContextGitignoreParser a 2 item tuple of ContextGitignoreParser,
//     // where the first is the structure ignore parser, and the second is the  
//     // [StructureContextGitignoreParser, ContentContextGitignoreParser] 

//     constructor(
//         logName: string,
//         outputChannel: vscode.OutputChannel,
//         private configManager: ConfigurationManager,
//         private fileSystemManager: FileSystemManager
//     ) {
//         super(logName, outputChannel);
//     }

//     private async getWorkspaceFilters(workspaceUri: vscode.Uri): Promise<IncludeExcludeGitignoreParser> {
//         const workspaceKey = workspaceUri.toString();
//         if (!this.workspaceFilters.has(workspaceKey)) {
//             const structureFilter = await IncludeExcludeGitignoreParser.create(
//                 workspaceUri,
//                 WORKSPACE_INFO_FILES.INCLUDE_STRUCTURE_GITIGNORE,
//                 WORKSPACE_INFO_FILES.EXCLUDE_STRUCTURE_GITIGNORE
//             );
//             const contentFilter = await ContentContextGitignoreParser.create(
//                 workspaceUri,
//                 WORKSPACE_INFO_FILES.INCLUDE_STRUCTURE_GITIGNORE,
//                 WORKSPACE_INFO_FILES.EXCLUDE_STRUCTURE_GITIGNORE
//             );

//             this.workspaceFilters.set(workspaceKey, filter);
//         }
//         return this.workspaceFilters.get(workspaceKey)!;
//     }


//     async getWorkspaceStructureContextFiles(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
//         const filter = await this.getWorkspaceFilter(workspace.uri);
//         // Add any additional filters here if needed
//         const filters = [filter]; 
//         return this.fileSystemManager.getAllFilesInWorkspaceAsync(workspace, filters);
//     }

//     async refreshWorkspaceFilter(workspaceUri: vscode.Uri): Promise<void> {
//         const workspaceKey = workspaceUri.toString();
//         this.workspaceFilters.delete(workspaceKey);
//         await this.getWorkspaceFilter(workspaceUri); 
//     }

//     async refreshAllWorkspaceFilters(): Promise<void> {
//         this.workspaceFilters.clear();
//         for (const workspace of (vscode.workspace.workspaceFolders || [])) {
//             await this.getWorkspaceFilter(workspace.uri);
//         }
//     }
// }