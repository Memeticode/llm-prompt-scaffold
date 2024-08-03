import * as vscode from 'vscode';
import { FileSystemUtils } from './fileSystemUtils';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';


export class ExtensionUtils {

    static getWorkspaceConfig(workspaceFolder: vscode.WorkspaceFolder): vscode.WorkspaceConfiguration
    {
        return vscode.workspace.getConfiguration('llmPromptScaffold', workspaceFolder.uri);
    }
    
    static getExtensionStorageFolderName(workspaceFolder: vscode.WorkspaceFolder): string
    {
        const config = this.getWorkspaceConfig(workspaceFolder);
        const inspectedConfig = config.inspect<string>(EXTENSION_STORAGE.CONFIG_KEY);        
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
    
    // can be cleaned up/removed
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

    // get the uri of a prompt config file (for workspace)
    static getExtensionStoragePromptConfigFileUri(workspace: vscode.WorkspaceFolder, fileType: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES): vscode.Uri {
        const storageFolderUri = this.getExtensionStorageFolderUri(workspace);
        let fileName: string;
        let dirName: string;

        if (fileType in EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES) {
            fileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES[fileType as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES];
            dirName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.NAME;
        } else {
            throw new Error(`Unable to get extension storage prompt configuration file item uri. Unknown file type: ${fileType}`);
        }

        return vscode.Uri.joinPath(storageFolderUri, dirName, fileName);
    }

    // get the uri of a prompt out file (for workspace)
    static getExtensionStoragePromptOutFileUri(workspace: vscode.WorkspaceFolder, fileType: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES): vscode.Uri {
        const storageFolderUri = this.getExtensionStorageFolderUri(workspace);
        let fileName: string;
        let dirName: string;

        if (fileType in EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES) {
            fileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES[fileType as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES];
            dirName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.NAME;
        } else {
            throw new Error(`Unable to get extension storage prompt out file item uri. Unknown file type: ${fileType}`);
        }

        return vscode.Uri.joinPath(storageFolderUri, dirName, fileName);
    }

    // get default content for extension storage prompt config file
    static async getExtensionStoragePromptConfigFileDefaultContent(fileType: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES): Promise<string> {
        let fileName: string;
        
        if (fileType in EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES) {
            fileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES[fileType as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES];
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