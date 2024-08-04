import * as vscode from 'vscode';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';
import { ExtensionUtils } from '../shared/utility/extensionUtils';
import { FileSystemUtils } from '../shared/utility/fileSystemUtils';
import { FileFilter } from '../shared/utility/fileFilters';

export class ExtensionStorageManager extends BaseLoggable {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel
    ) {
        super(logName, outputChannel);
    }

    async initializeStorageForWorkspaceAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Initializing storage for workspace: ${workspace.name}`);
        const storageFolderName = this.getStorageFolderName(workspace);
        const storageFolderUri = vscode.Uri.joinPath(workspace.uri, storageFolderName);

        await this.createStorageFolder(storageFolderUri);
        await this.initializeConfigFolder(storageFolderUri);
        await this.initializeOutFolder(storageFolderUri);
        await this.updateWorkspaceExcludeSetting(workspace, storageFolderName);

        this.logMessage(`Storage initialized for workspace: ${workspace.name}`);
    }
    
    async cleanupStorageForWorkspaceAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Cleaning up storage for workspace: ${workspace.name}`);
        const storageFolderName = this.getStorageFolderName(workspace);
        const storageFolderUri = vscode.Uri.joinPath(workspace.uri, storageFolderName);
        if (await FileSystemUtils.directoryExistsAsync(storageFolderUri))
        {
            await FileSystemUtils.deleteDirectoryAsync(storageFolderUri, { recursive: true, useTrash: false});
        }
        this.logMessage(`Storage initialized for workspace: ${workspace.name}`);
    }

    async generatePromptFilesAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Generating prompt files for workspace: ${workspace.name}`);
        try 
        {
            await this.generatePromptOutFileAsync(workspace, 'SYSTEM_PROMPT');
            await this.generatePromptOutFileAsync(workspace, 'PROJECT_DESCRIPTION');
            await this.generatePromptOutFileAsync(workspace, 'PROJECT_GOALS');
            await this.generatePromptOutFileAsync(workspace, 'FILE_CONTEXT_STRUCTURE');
            await this.generatePromptOutFileAsync(workspace, 'FILE_CONTEXT_CONTENT');
    
            this.logMessage(`Prompt out files generated successfully for workspace '${workspace.name}'`);
    
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`An error occurred when generating prompt files for workspace '${workspace.name}': ${errorMessage}`);
            throw error;
        }
    }

    async generatePromptOutFileAsyncIfNotExistsAsync(workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES): Promise<vscode.Uri> {
        let fileUri = ExtensionUtils.getExtensionStoragePromptOutFileUri(workspace, fileKey);
        if (!(await FileSystemUtils.fileExistsAsync(fileUri))) {
            this.logMessage(`"${fileKey}" prompt out file does not exist: ${fileUri}`);
            fileUri = await this.generatePromptOutFileAsync(workspace, fileKey);
        }
        return fileUri;
    }

    async generatePromptOutFileAsync(workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES): Promise<vscode.Uri> {
        let fileUri: vscode.Uri;
        switch (fileKey) {
            case 'SYSTEM_PROMPT':
                fileUri = await this.generatePromptOutSystemPromptAsync(workspace);
                break;
            case 'PROJECT_DESCRIPTION':
                fileUri = await this.generateProjectDescriptionAsync(workspace);
                break;
            case 'PROJECT_GOALS':
                fileUri = await this.generateCurrentGoalsAsync(workspace);
                break;
            case 'FILE_CONTEXT_STRUCTURE':
                fileUri = await this.generateFileStructureAsync(workspace);
                break;
            case 'FILE_CONTEXT_CONTENT':
                fileUri = await this.generateFileContentAsync(workspace);
                break;
        }
        if (!fileUri)
        {
            throw new Error(`An error occurred when generating the "${fileUri}" prompt out file`);
        }
        else 
        {
            this.logMessage(`Generated prompt out file: ${fileUri}`);
        }
        return fileUri;
    }

    async handleStorageFolderNameChange(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
        this.logMessage(`Handling storage folder name change for workspace ${workspace.name}: ${oldName} -> ${newName}`);
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

            await this.updateWorkspaceExcludeSetting(workspace, newName);
            this.logMessage(`Successfully handled storage folder name change for workspace ${workspace.name}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`Failed to handle storage folder name change for workspace ${workspace.name}: ${errorMessage}`);
            throw error;
        }
    }

    private getStorageFolderName(workspace: vscode.WorkspaceFolder): string {
        return vscode.workspace.getConfiguration('llmPromptScaffold', workspace.uri)
            .get(EXTENSION_STORAGE.CONFIG_KEY, EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK);
    }
    

    private async createStorageFolder(uri: vscode.Uri): Promise<void> {
        this.logMessage(`Creating storage folder: ${uri.fsPath}`);
        await FileSystemUtils.createDirectoryIfNotExistsAsync(uri);
    }

    private async initializeConfigFolder(storageUri: vscode.Uri): Promise<void> {
        const configFolderUri = vscode.Uri.joinPath(storageUri, EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.NAME);
        this.logMessage(`Initializing config folder: ${configFolderUri.fsPath}`);

        await FileSystemUtils.createDirectoryIfNotExistsAsync(configFolderUri);

        for (const [fileKey, fileName] of Object.entries(EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES)) {
            const fileUri = vscode.Uri.joinPath(configFolderUri, fileName.fileName);
            if (!(await FileSystemUtils.fileExistsAsync(fileUri))) {
                const defaultContent = await ExtensionUtils.getExtensionStoragePromptConfigFileDefaultContent(fileKey as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES);
                await FileSystemUtils.writeFileAsync(fileUri, defaultContent);
                this.logMessage(`Created config file: ${fileUri.fsPath}`);
            }
        }
    }

    private async initializeOutFolder(storageUri: vscode.Uri): Promise<void> {
        const outFolderUri = vscode.Uri.joinPath(storageUri, EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME);
        this.logMessage(`Initializing out folder: ${outFolderUri.fsPath}`);
        await FileSystemUtils.createDirectoryIfNotExistsAsync(outFolderUri);
    }

    private async updateWorkspaceExcludeSetting(workspace: vscode.WorkspaceFolder, folderName: string): Promise<void> {
        this.logMessage(`Updating workspace exclude setting for: ${workspace.name}`);
        const config = vscode.workspace.getConfiguration('files', workspace.uri);
        const exclude = config.get('exclude') as { [key: string]: boolean };

        exclude[`**/${folderName}`] = true;

        await config.update('exclude', exclude, vscode.ConfigurationTarget.WorkspaceFolder);
        this.logMessage(`Updated workspace exclude setting for: ${workspace.name}`);
    }

    // PROMPT OUT FILE GENERATION METHODS

    private async generatePromptOutSystemPromptAsync(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri> {
        const sourceFileUri = ExtensionUtils.getExtensionStoragePromptConfigFileUri(workspace, 'SYSTEM_PROMPT');
        const outFileUri = ExtensionUtils.getExtensionStoragePromptOutFileUri(workspace, 'SYSTEM_PROMPT');
        await this.copyFileWithoutCommentsAsync(sourceFileUri, outFileUri);
        return outFileUri;
    }

    private async generateProjectDescriptionAsync(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri> {
        const sourceFileUri = ExtensionUtils.getExtensionStoragePromptConfigFileUri(workspace, 'PROJECT_DESCRIPTION');
        const outFileUri = ExtensionUtils.getExtensionStoragePromptOutFileUri(workspace, 'PROJECT_DESCRIPTION');
        await this.copyFileWithoutCommentsAsync(sourceFileUri, outFileUri);
        return outFileUri;
    }

    private async generateCurrentGoalsAsync(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri> {
        const sourceFileUri = ExtensionUtils.getExtensionStoragePromptConfigFileUri(workspace, 'PROJECT_GOALS');
        const outFileUri = ExtensionUtils.getExtensionStoragePromptOutFileUri(workspace, 'PROJECT_GOALS');
        await this.copyFileWithoutCommentsAsync(sourceFileUri, outFileUri);
        return outFileUri;
    }

    private async generateFileStructureAsync(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri> {
        const outFileUri = ExtensionUtils.getExtensionStoragePromptOutFileUri(workspace, 'FILE_CONTEXT_STRUCTURE');
        await FileSystemUtils.writeFileAsync(outFileUri, "fileStructure-contentGoHere");
        return outFileUri;
    }

    private async generateFileContentAsync(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri> {
        const outFileUri = ExtensionUtils.getExtensionStoragePromptOutFileUri(workspace, 'FILE_CONTEXT_CONTENT');        
        await FileSystemUtils.writeFileAsync(outFileUri, "fileContent-contentGoHere");
        return outFileUri;
    }

    private async createStructureFilter(workspace: vscode.WorkspaceFolder): Promise<FileFilter> {
        // Implement logic to create a FileFilter based on structure include/exclude files
        throw new Error('createStructureFilter is not implemented');
    }

    private async createContentFilter(workspace: vscode.WorkspaceFolder): Promise<FileFilter> {
        // Implement logic to create a FileFilter based on content include/exclude files
        throw new Error('createContentFilter is not implemented');
    }

    private async getFileStructure(rootUri: vscode.Uri, filter: FileFilter): Promise<string> {
        // Implement logic to get file structure as a string
        throw new Error('getFileStructure is not implemented');
    }

    private async getFileContent(rootUri: vscode.Uri, structureFilter: FileFilter, contentFilter: FileFilter): Promise<string> {
        // Implement logic to get file content as a string
        throw new Error('getFileContent is not implemented');
    }

    private async copyFileWithoutCommentsAsync(sourceUri: vscode.Uri, targetUri: vscode.Uri): Promise<void> {
        const content = await FileSystemUtils.readFileAsync(sourceUri);
        const filteredContent = content.split('\n')
            .filter(line => !line.trim().startsWith('#'))
            .join('\n');
        await FileSystemUtils.writeFileAsync(targetUri, filteredContent);
    }

}