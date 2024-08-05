import * as vscode from 'vscode';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';
import { PromptConfigFileKey, PromptContextFileKey} from '../extension/types';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { FileSystemUtils } from '../shared/utility/fileSystemUtils';
import { PromptFileGenerator } from '../extension/utility/promptFileGenerator';
import { EditorWorkspaceUtils } from '../shared/utility/editorWorkspaceUtils';
import { IExtensionStateManager } from './extensionStateManager';


export interface IExtensionStorageManager
{
    // get storage folder and subfolder uris
    getStorageFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri
    getPromptConfigFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri
    getPromptContextFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri

    // get storage file uris
    getPromptConfigFileUri(workspace: vscode.WorkspaceFolder, fileKey: PromptConfigFileKey): vscode.Uri
    getPromptContextFileUri(workspace: vscode.WorkspaceFolder, fileKey: PromptContextFileKey): vscode.Uri

    // generate prompt config files
    generatePromptConfigFilesAsync(workspace: vscode.WorkspaceFolder, overwrite: boolean): Promise<void>
    generatePromptConfigFileAsync(workspace: vscode.WorkspaceFolder, fileKey: PromptConfigFileKey, overwrite: boolean): Promise<vscode.Uri>

    // generate prompt out files
    generatePromptContextFilesAsync(workspace: vscode.WorkspaceFolder, overwrite: boolean): Promise<void>
    generatePromptContextFileAsync(workspace: vscode.WorkspaceFolder, fileKey: PromptContextFileKey, overwrite: boolean): Promise<void>

    // initialization and action logic
    initializeStorageAsync(): Promise<void>
    initializeWorkspaceStorageAsync(workspace: vscode.WorkspaceFolder): Promise<void>
    initializeWorkspacePromptConfigStorageAsync(workspace: vscode.WorkspaceFolder): Promise<void>
    initializeWorkspacePromptContextStorageAsync(workspace: vscode.WorkspaceFolder): Promise<void>

    cleanupWorkspaceStorageAsync(workspace: vscode.WorkspaceFolder): Promise<void>
    renameWorkspaceStorageFolderAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void>
    
} 

// correct class to update, we are going to put the prompt stuff elsewhere
export class ExtensionStorageManager extends BaseLoggable implements IExtensionStorageManager {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private extensionStateManager: IExtensionStateManager
    ) {
        super(logName, outputChannel);
    }
    
    getStorageFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri { 
        const storageFolderName = this.extensionStateManager.getWorkspaceStorageFolderName(workspace);   
        return vscode.Uri.joinPath(workspace.uri, storageFolderName);
    }

    getPromptConfigFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
        return vscode.Uri.joinPath(this.getStorageFolderUri(workspace), EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.NAME);
    }

    getPromptContextFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
        return vscode.Uri.joinPath(this.getStorageFolderUri(workspace), EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.NAME);
    }

    getPromptConfigFileUri(workspace: vscode.WorkspaceFolder, fileKey: PromptConfigFileKey): vscode.Uri {
        const fileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES[fileKey].fileName;
        return vscode.Uri.joinPath(this.getPromptConfigFolderUri(workspace), fileName);
    }

    getPromptContextFileUri(workspace: vscode.WorkspaceFolder, fileKey: PromptContextFileKey): vscode.Uri {
        const fileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES[fileKey].fileName;
        return vscode.Uri.joinPath(this.getPromptContextFolderUri(workspace), fileName);
    }

    async generatePromptConfigFilesAsync(workspace: vscode.WorkspaceFolder, overwrite: boolean): Promise<void> {
        this.logMessage(`Generating prompt config files for workspace: ${workspace.name}`);
        try {
            const configFileKeys = Object.keys(EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES) as Array<PromptConfigFileKey>;
            for (const fileKey of configFileKeys) {
                await this.generatePromptConfigFileAsync(workspace, fileKey, overwrite);
            }
            this.logMessage(`Prompt config files generated successfully for workspace '${workspace.name}'`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`An error occurred when generating prompt config files for workspace '${workspace.name}': ${errorMessage}`);
            throw error;
        }
    }

    async generatePromptConfigFileAsync(workspace: vscode.WorkspaceFolder, fileKey: PromptConfigFileKey, overwrite: boolean): Promise<vscode.Uri> {
        const fileUri = this.getPromptConfigFileUri(workspace, fileKey);
        if (overwrite || !(await FileSystemUtils.fileExistsAsync(fileUri))) {
            await this.generateDefaultPromptConfigFileAsync(fileKey, fileUri);
            this.logMessage(`Generated prompt config file: ${fileUri}`);
        }
        else {
            this.logMessage(`Prompt config file already exists: ${fileUri}`);
        }
        return fileUri;
    }
    
    async generatePromptContextFilesAsync(workspace: vscode.WorkspaceFolder, overwrite: boolean): Promise<void> {
        this.logMessage(`Generating prompt context files for workspace: ${workspace.name}`);
        try {
            for (const fileKey of Object.keys(EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES) as Array<PromptContextFileKey>) {
                await this.generatePromptContextFileAsync(workspace, fileKey, overwrite);
            }
            this.logMessage(`Prompt context files generated successfully for workspace '${workspace.name}'`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`An error occurred when generating prompt context files for workspace '${workspace.name}': ${errorMessage}`);
            throw error;
        }
    }

    async generatePromptContextFileAsync(workspace: vscode.WorkspaceFolder, fileKey: PromptContextFileKey, overwrite: boolean): Promise<void> {
        const outFileUri = this.getPromptContextFileUri(workspace, fileKey);
        if (overwrite || !(await FileSystemUtils.fileExistsAsync(outFileUri))) {
            const configFileUri = this.getPromptConfigFileUri(workspace, fileKey as PromptConfigFileKey);

            switch (fileKey) {
                case 'SYSTEM_PROMPT':
                case 'PROJECT_DESCRIPTION':
                case 'PROJECT_GOALS':
                    await PromptFileGenerator.generateFromConfig(configFileUri, outFileUri);
                    break;
                case 'FILE_CONTEXT_STRUCTURE':
                    await PromptFileGenerator.generateFileStructure(workspace, outFileUri);
                    break;
                case 'FILE_CONTEXT_CONTENT':
                    await PromptFileGenerator.generateFileContent(workspace, outFileUri);
                    break;
                default:
                    throw new Error(`Unknown file key: ${fileKey}`);
            }

            this.logMessage(`Generated prompt context file: ${outFileUri}`);
        }
        else {
            this.logMessage(`Prompt context file already exists: ${outFileUri}`);
        }
    }
    


    async initializeStorageAsync(): Promise<void> {
        this.logMessage(`Initializing storage folders`);
        const workspaceFolders = EditorWorkspaceUtils.getAllWorkspaceFolders();
        for (const workspace of workspaceFolders) {
            await this.initializeWorkspaceStorageAsync(workspace);
        }
        this.logMessage(`All storage folders initialized`);
    }

    async initializeWorkspaceStorageAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Initializing storage for workspace: ${workspace.name}`);

        const storageFolderName = this.extensionStateManager.getWorkspaceStorageFolderName(workspace);
        const storageFolderUri = this.getStorageFolderUri(workspace);
        await FileSystemUtils.createDirectoryIfNotExistsAsync(storageFolderUri);
        await EditorWorkspaceUtils.updateWorkspaceExplorerExcludeSettingAsync(workspace, storageFolderName);

        await this.initializeWorkspacePromptConfigStorageAsync(workspace);
        await this.initializeWorkspacePromptContextStorageAsync(workspace);
        
        this.logMessage(`Storage initialized for workspace: ${workspace.name}`);
    }

    async initializeWorkspacePromptConfigStorageAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        const folderUri = this.getPromptConfigFolderUri(workspace);
        await FileSystemUtils.createDirectoryIfNotExistsAsync(folderUri);
        await this.generatePromptConfigFilesAsync(workspace, false);
    }

    async initializeWorkspacePromptContextStorageAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        const folderUri = this.getPromptContextFolderUri(workspace);
        await FileSystemUtils.createDirectoryIfNotExistsAsync(folderUri);
        //await this.generatePromptContextFilesAsync(workspace, false);
    }
    
    async cleanupWorkspaceStorageAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Cleaning up storage for workspace: ${workspace.name}`);
        const storageFolderUri = this.getStorageFolderUri(workspace);
        if (await FileSystemUtils.directoryExistsAsync(storageFolderUri)) {
            await FileSystemUtils.deleteDirectoryAsync(storageFolderUri, { recursive: true, useTrash: false });
        }
        this.logMessage(`Storage cleaned up for workspace: ${workspace.name}`);
    }

    async renameWorkspaceStorageFolderAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
        this.logMessage(`Updating storage folder name for workspace ${workspace.name}: ${oldName} -> ${newName}`);
        const oldUri = vscode.Uri.joinPath(workspace.uri, oldName);
        const newUri = vscode.Uri.joinPath(workspace.uri, newName);

        try {
            if (await FileSystemUtils.directoryExistsAsync(oldUri)) {
                await FileSystemUtils.moveDirectoryAsync(oldUri, newUri);
                this.logMessage(`Renamed storage folder from ${oldUri.fsPath} to ${newUri.fsPath}`);
            } else {
                this.logMessage(`Old storage folder doesn't exist. Creating new folder: ${newUri.fsPath}`);
                await FileSystemUtils.createDirectoryIfNotExistsAsync(newUri);
            }

            await EditorWorkspaceUtils.updateWorkspaceExplorerExcludeSettingAsync(workspace, newName, oldName);
            this.logMessage(`Successfully updated storage folder name for workspace ${workspace.name}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`Failed to update storage folder name for workspace ${workspace.name}: ${errorMessage}`);
            throw error;
        }
    }
    


    // get default content for extension storage prompt config file
    private async generateDefaultPromptConfigFileAsync(
        fileType: PromptConfigFileKey,
        fileUri: vscode.Uri
    ): Promise<void> {
        try 
        {
            let defaultFileName: string;        
            if (fileType in EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES) {
                defaultFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES[fileType as PromptConfigFileKey].fileName;
            } else {
                throw new Error(`Unable to get extension storage file default content. Unknown file type: ${fileType}`);
            }
            const extensionPath = vscode.extensions.getExtension(EXTENSION_STORAGE.EXTENSION_ID)?.extensionPath;
            if (!extensionPath) {
                throw new Error(`Extension path not found! (Extension Id: ${EXTENSION_STORAGE.EXTENSION_ID}`);
            }
    
            const defaultContentUri = vscode.Uri.joinPath(vscode.Uri.file(extensionPath), 'dist', 'defaultFileContent', defaultFileName);
            if (await FileSystemUtils.fileExistsAsync(defaultContentUri)) {
                await FileSystemUtils.copyFileAsync(defaultContentUri, fileUri, {overwrite:true});
            }
            else
            {
                throw new Error(`Default content file not not found for file type: ${fileType}. Expected default content at URI: ${defaultContentUri}`);
            }
        }
        catch (error)
        {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            throw new Error(`Error occured when generating default file for prompt configuration item type '${fileType}'. Error: ${errorMessage}`);
        }
    }

}