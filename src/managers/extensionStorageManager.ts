import * as vscode from 'vscode';
import { EXTENSION_STORAGE } from '../constants/extensionStorage';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { FileSystemUtils } from '../shared/utility/fileSystemUtils';
import { StorageInitializationHelper } from '../shared/extension/logic/storageInitializationHelper';
import { PromptFileGenerator } from '../shared/extension/logic/promptFileGenerator';
import { ExtensionStateManager } from './extensionStateManager';

export class ExtensionStorageManager extends BaseLoggable {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private extensionStateManager: ExtensionStateManager
    ) {
        super(logName, outputChannel);
    }

    async initializeStorageForWorkspaceAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Initializing storage for workspace: ${workspace.name}`);
        const storageFolderUri = this.getStorageFolderUri(workspace);
        await StorageInitializationHelper.createStorageFolder(storageFolderUri);
        await StorageInitializationHelper.initializeConfigFolder(this.getConfigFolderUri(workspace));
        await StorageInitializationHelper.initializeOutFolder(this.getOutFolderUri(workspace));
        await StorageInitializationHelper.updateWorkspaceExcludeSetting(workspace, this.extensionStateManager.getStorageFolderName(workspace));
        this.logMessage(`Storage initialized for workspace: ${workspace.name}`);
    }

    async updateStorageFolderNameAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
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

            await StorageInitializationHelper.updateWorkspaceExcludeSetting(workspace, newName);
            this.logMessage(`Successfully updated storage folder name for workspace ${workspace.name}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`Failed to update storage folder name for workspace ${workspace.name}: ${errorMessage}`);
            throw error;
        }
    }

    async cleanupStorageForWorkspaceAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Cleaning up storage for workspace: ${workspace.name}`);
        const storageFolderUri = this.getStorageFolderUri(workspace);
        if (await FileSystemUtils.directoryExistsAsync(storageFolderUri)) {
            await FileSystemUtils.deleteDirectoryAsync(storageFolderUri, { recursive: true, useTrash: false });
        }
        this.logMessage(`Storage cleaned up for workspace: ${workspace.name}`);
    }

    async generatePromptOutFilesAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Generating prompt out files for workspace: ${workspace.name}`);
        try {
            for (const fileKey of Object.keys(EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES) as Array<keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES>) {
                await this.generatePromptOutFileAsync(workspace, fileKey);
            }
            this.logMessage(`Prompt out files generated successfully for workspace '${workspace.name}'`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`An error occurred when generating prompt files for workspace '${workspace.name}': ${errorMessage}`);
            throw error;
        }
    }

    async generatePromptOutFileIfNotExistsAsync(workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES): Promise<vscode.Uri> {
        const fileUri = this.getOutFileUri(workspace, fileKey);
        if (!(await FileSystemUtils.fileExistsAsync(fileUri))) {
            this.logMessage(`"${fileKey}" prompt out file does not exist: ${fileUri}`);
            return await this.generatePromptOutFileAsync(workspace, fileKey);
        }
        return fileUri;
    }

    async generatePromptOutFileAsync(workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES): Promise<vscode.Uri> {
        const outFileUri = this.getOutFileUri(workspace, fileKey);
        const configFileUri = this.getConfigFileUri(workspace, fileKey as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES);

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

        this.logMessage(`Generated prompt out file: ${outFileUri}`);
        return outFileUri;
    }

    getStorageFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
        const storageFolderName = this.extensionStateManager.getStorageFolderName(workspace);
        return vscode.Uri.joinPath(workspace.uri, storageFolderName);
    }

    getConfigFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
        return vscode.Uri.joinPath(this.getStorageFolderUri(workspace), EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.NAME);
    }

    getOutFolderUri(workspace: vscode.WorkspaceFolder): vscode.Uri {
        return vscode.Uri.joinPath(this.getStorageFolderUri(workspace), EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME);
    }

    getConfigFileUri(workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES): vscode.Uri {
        const fileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES[fileKey].fileName;
        return vscode.Uri.joinPath(this.getConfigFolderUri(workspace), fileName);
    }

    getOutFileUri(workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES): vscode.Uri {
        const fileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES[fileKey].fileName;
        return vscode.Uri.joinPath(this.getOutFolderUri(workspace), fileName);
    }
}