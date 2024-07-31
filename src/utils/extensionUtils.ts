import * as vscode from 'vscode';
import { FileSystemUtils } from './fileSystemUtils';


export const EXTENSION_STORAGE = {
    EXTENSION_ID: "abcdevco.llm-prompt-scaffold",
    CONFIG_KEY: 'llmPromptScaffold.extensionStorageDirectory',
    STORAGE_FOLDER_NAME_FALLBACK: '.llm-prompt-scaffold',
    STRUCTURE: {
        PROJECT_INFO_DIR: {
            NAME: 'project-info',
            FILES: {
                SYSTEM_PROMPT: 'project-system-prompt.txt',
                PROJECT_DESCRIPTION: 'project-description.txt',
                PROJECT_GOALS: 'project-goals.txt',
                PROJECT_CONTEXT_STRUCTURE_INCLUDE: 'project-context-structure-include.gitignore',
                PROJECT_CONTEXT_STRUCTURE_EXCLUDE: 'project-context-structure-exclude.gitignore',
                PROJECT_CONTEXT_CONTENT_INCLUDE: 'project-context-content-include.gitignore',
                PROJECT_CONTEXT_CONTENT_EXCLUDE: 'project-context-content-exclude.gitignore'
            }
        },
        PROMPT_OUT_DIR: {
            NAME: 'prompt-out'
        },
        WORKSPACE_FOLDER_INFO_DIR: {
            NAME: 'workspace-folder-info',
            FILES: {
                WORKSPACE_FOLDER_DESCRIPTION: 'workspace-folder-description.txt',
                WORKSPACE_FOLDER_CONTEXT_STRUCTURE_INCLUDE: 'workspace-folder-context-structure-include.gitignore',
                WORKSPACE_FOLDER_CONTEXT_STRUCTURE_EXCLUDE: 'workspace-folder-context-structure-exclude.gitignore',
                WORKSPACE_FOLDER_CONTEXT_CONTENT_INCLUDE: 'workspace-folder-context-content-include.gitignore',
                WORKSPACE_FOLDER_CONTEXT_CONTENT_EXCLUDE: 'workspace-folder-context-content-exclude.gitignore',
            }
        },
    }
};


export class ExtensionUtils {
    
    static getExtensionStorageFolderName(workspaceFolder: vscode.WorkspaceFolder): string {
        const config = vscode.workspace.getConfiguration('llmPromptScaffold', workspaceFolder.uri);
        return config.get<string>(EXTENSION_STORAGE.CONFIG_KEY, EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK);
    }

    static getExtensionStorageFolderUri(workspaceFolder: vscode.WorkspaceFolder): vscode.Uri {
        const storageFolderName = this.getExtensionStorageFolderName(workspaceFolder);
        return vscode.Uri.joinPath(workspaceFolder.uri, storageFolderName);
    }
    

    static getExtensionStorageFolderUrisMap(): Map<vscode.WorkspaceFolder, vscode.Uri> {
        const storageFolderUris = new Map<vscode.WorkspaceFolder, vscode.Uri>();        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            for (const workspace of workspaceFolders) {
                const storageFolderUri = this.getExtensionStorageFolderUri(workspace);
                storageFolderUris.set(workspace, storageFolderUri);
            }
        }
        return storageFolderUris;
    }

    static getExtensionStorageFileUri(workspace: vscode.WorkspaceFolder, fileType: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES | keyof typeof EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES): vscode.Uri {
        const storageFolderUri = this.getExtensionStorageFolderUri(workspace);
        let fileName: string;
        let dirName: string;

        if (fileType in EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES) {
            fileName = EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES[fileType as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES];
            dirName = EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME;
        } else if (fileType in EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES) {
            fileName = EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES[fileType as keyof typeof EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES];
            dirName = EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME;
        } else {
            throw new Error(`Unable to get extension storage file item uri. Unknown file type: ${fileType}`);
        }

        return vscode.Uri.joinPath(storageFolderUri, dirName, fileName);
    }

    static async getExtensionStorageFileDefaultContent(fileType: keyof typeof EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES | keyof typeof EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES): Promise<string> {
        let fileName: string;
        
        if (fileType in EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES) {
            fileName = EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES[fileType as keyof typeof EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES];
        } else if (fileType in EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES) {
            fileName = EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES[fileType as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES];
        } else {
            throw new Error(`Unable to get extension storage file default content. Unknown file type: ${fileType}`);
        }

        const extensionPath = vscode.extensions.getExtension(EXTENSION_STORAGE.EXTENSION_ID)?.extensionPath;
        if (!extensionPath) {
            throw new Error(`Extension path not found! (Extension Id: ${EXTENSION_STORAGE.EXTENSION_ID}`);
        }

        const defaultContentUri = vscode.Uri.joinPath(vscode.Uri.file(extensionPath), 'dist', 'defaultFileContent', fileName);
        if (await FileSystemUtils.fileExistsAsync(defaultContentUri))
        {
            return await FileSystemUtils.readFileIfExistsAsync(defaultContentUri) || '# No default content specified\n';
        }
        else
        {
            throw new Error(`Default content not not found for file type: ${fileType}. Default content uri: ${defaultContentUri}`);
        }
    }

}