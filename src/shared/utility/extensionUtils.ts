import * as vscode from 'vscode';
import { FileSystemUtils } from './fileSystemUtils';
import { EXTENSION_STORAGE } from '../../constants/extensionStorage';


export class ExtensionUtils {

    static getWorkspaceConfig(workspaceFolder: vscode.WorkspaceFolder): vscode.WorkspaceConfiguration
    {
        return vscode.workspace.getConfiguration('llmPromptScaffold', workspaceFolder.uri);
    }
    
    static getExtensionStorageFolderName(workspaceFolder: vscode.WorkspaceFolder): string
    {
        const config = this.getWorkspaceConfig(workspaceFolder);
        const inspectedConfig = config.inspect<string>(EXTENSION_STORAGE.WORKSPACE_STORAGE_KEY);        
        const effectiveValue = inspectedConfig?.workspaceFolderValue ??
                               // inspectedConfig?.workspaceValue ??    // don't support setting this at workspace value
                               inspectedConfig?.globalValue ??
                               inspectedConfig?.defaultValue ??
                               EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK;
        return effectiveValue;
    }
    
    static getExtensionStorageFolderUri(workspaceFolder: vscode.WorkspaceFolder): vscode.Uri 
    {
        const storageFolderName = this.getExtensionStorageFolderName(workspaceFolder);
        const uri = vscode.Uri.joinPath(workspaceFolder.uri, storageFolderName);
        return uri;
    }

    // get the uri of a prompt config file (for workspace)
    static getExtensionStoragePromptConfigFileUri(workspace: vscode.WorkspaceFolder, fileType: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES): vscode.Uri {
        const storageFolderUri = this.getExtensionStorageFolderUri(workspace);
        let fileName: string;
        let dirName: string;

        if (fileType in EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES) {
            fileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES[fileType as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES].fileName;
            dirName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.NAME;
        } else {
            throw new Error(`Unable to get extension storage prompt configuration file item uri. Unknown file type: ${fileType}`);
        }

        return vscode.Uri.joinPath(storageFolderUri, dirName, fileName);
    }

    // get the uri of a prompt out file (for workspace)
    static getExtensionStoragePromptOutFileUri(workspace: vscode.WorkspaceFolder, fileType: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES): vscode.Uri {
        const storageFolderUri = this.getExtensionStorageFolderUri(workspace);
        let fileName: string;
        let dirName: string;

        if (fileType in EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES) {
            fileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES[fileType as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES].fileName;
            dirName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.NAME;
        } else {
            throw new Error(`Unable to get extension storage prompt out file item uri. Unknown file type: ${fileType}`);
        }

        return vscode.Uri.joinPath(storageFolderUri, dirName, fileName);
    }

}