import * as vscode from 'vscode';
import { FileSystemUtils } from '../../utility/fileSystemUtils';
import { EXTENSION_STORAGE } from '../../../constants/extensionStorage';
import { ExtensionUtils } from '../../utility/extensionUtils';

export class StorageInitializationHelper {
    
    static async createStorageFolder(uri: vscode.Uri): Promise<void> {
        await FileSystemUtils.createDirectoryIfNotExistsAsync(uri);
    }

    static async initializeConfigFolder(configFolderUri: vscode.Uri): Promise<void> {
        await FileSystemUtils.createDirectoryIfNotExistsAsync(configFolderUri);

        for (const [fileKey, fileInfo] of Object.entries(EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES)) {
            const fileUri = vscode.Uri.joinPath(configFolderUri, fileInfo.fileName);
            if (!(await FileSystemUtils.fileExistsAsync(fileUri))) {
                const defaultContent = await ExtensionUtils.getExtensionStoragePromptConfigFileDefaultContent(fileKey as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES);
                await FileSystemUtils.writeFileAsync(fileUri, defaultContent);
            }
        }
    }

    static async initializeOutFolder(outFolderUri: vscode.Uri): Promise<void> {
        await FileSystemUtils.createDirectoryIfNotExistsAsync(outFolderUri);
    }

    static async updateWorkspaceExcludeSetting(workspace: vscode.WorkspaceFolder, folderName: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('files', workspace.uri);
        const exclude = config.get('exclude') as { [key: string]: boolean };
        exclude[`**/${folderName}`] = true;
        await config.update('exclude', exclude, vscode.ConfigurationTarget.WorkspaceFolder);
    }
}