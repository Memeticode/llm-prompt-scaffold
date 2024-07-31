import * as vscode from 'vscode';
import { BaseManager } from './baseManager';
import { WorkspaceConfigCacheType } from './extensionConfigurationManager';
import { FileSystemUtils } from '../utils/fileSystemUtils';
import { VscodeWorkspaceUtils } from '../utils/vscodeWorkspaceUtils';
import { EXTENSION_STORAGE, ExtensionUtils } from '../utils/extensionUtils';

export class ExtensionStorageManager extends BaseManager {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel
    ) {
        super(logName, outputChannel);
    }

    // creates extension storage folders and files in all workspace folders
    // async initializeExtensionStorageAsync(lastKnownWorkspaceConfigValues: Record<string, WorkspaceConfigCacheType>): Promise<void> {
    //     this.logMessage('Initializing extension storage for workspace');
    //     try
    //     {
    //         // get unique workspace id from workspace code folder
    //         const workspaceId = vscode.workspace.workspaceFile?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    //         if (!workspaceId) {
    //             this.outputChannel.appendLine('No valid workspace found. Unable to initialize workspace storage files. Exiting initialization.');
    //             return;
    //         }

    //         const workspaces = await VscodeWorkspaceUtils.getAllWorkspaceFoldersAsync();
    //         for (const workspace of workspaces) {
    //             await this.initializeExtensionStorageForWorkspaceFolderAsync(workspace);
    //         }
    //         await this.validateStorageFoldersAsync();            
    //     }
    //     catch (error) {
    //         const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    //         this.logError(errorMessage);
    //         vscode.window.showErrorMessage(`Error occured when initializing extension storage folders: ${errorMessage}`);
    //     }
    // }

    async initializeExtensionStorageAsync(lastKnownWorkspaceConfigValues: Record<string, WorkspaceConfigCacheType>): Promise<void> {
        this.logMessage('Initializing extension storage for workspace');
        try {
            const workspaceId = vscode.workspace.workspaceFile?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
            if (!workspaceId) {
                this.outputChannel.appendLine('No valid workspace found. Unable to initialize workspace storage files. Exiting initialization.');
                return;
            }
    
            const workspaces = await VscodeWorkspaceUtils.getAllWorkspaceFoldersAsync();
            for (const workspace of workspaces) {
                await this.initializeExtensionStorageForWorkspaceFolderAsync(workspace, lastKnownWorkspaceConfigValues[workspace.uri.toString()]);
            }
            await this.validateStorageFoldersAsync(); //lastKnownWorkspaceConfigValues);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(errorMessage);
            vscode.window.showErrorMessage(`Error occurred when initializing extension storage folders: ${errorMessage}`);
        }
    }

    // creates extension storage folders and files in specific workspace folder
    // async initializeExtensionStorageForWorkspaceFolderAsync(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {

    //     this.logMessage(`Initializing extension storage folders and files for workspace folder ${workspaceFolder.name}`);
    //     try 
    //     {
    //         const storageFolderName = ExtensionUtils.getExtensionStorageFolderName(workspaceFolder);
    //         const storageFolderUri = ExtensionUtils.getExtensionStorageFolderUri(workspaceFolder);
    //         const isRoot = VscodeWorkspaceUtils.isRootWorkspaceFolder(workspaceFolder);
            
    //         // create initial storage folder if dne and hide in vscode
    //         await FileSystemUtils.createDirectoryIfNotExistsAsync(storageFolderUri);        
    //         await this.updateWorkspaceFolderVscodeExcludeSettingAsync(workspaceFolder, '', storageFolderName);
    
    //         // create workspace info sub dir (all workspace folders)
    //         await this.initializeWorkspaceFolderStorageAsync(storageFolderUri);
            
    //         // create workspace info sub dir (root workspace folder only)
    //         if (isRoot) { await this.initializeRootWorkspaceFolderStorageAsync(storageFolderUri); }
        
    //         this.logMessage(`Successfully initialized extension storage folders and files for workspace folder ${workspaceFolder.name}`);
    //     }
    //     catch (error)
    //     {
    //         const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    //         this.logError(errorMessage);
    //         vscode.window.showErrorMessage(`Error occurred when initializing extension storage folders and files for workspace folder ${workspaceFolder.name}: ${errorMessage}`);
    //         throw error;
    //     }   
    // }

    async initializeExtensionStorageForWorkspaceFolderAsync(workspaceFolder: vscode.WorkspaceFolder, lastKnownConfig?: WorkspaceConfigCacheType): Promise<void> {
        this.logMessage(`Initializing extension storage folders and files for workspace folder ${workspaceFolder.name}`);
        try {
            const storageFolderName = lastKnownConfig?.storageDirName || ExtensionUtils.getExtensionStorageFolderName(workspaceFolder);
            const storageFolderUri = vscode.Uri.joinPath(workspaceFolder.uri, storageFolderName);
            const isRoot = lastKnownConfig?.isRoot ?? VscodeWorkspaceUtils.isRootWorkspaceFolder(workspaceFolder);
            
            await FileSystemUtils.createDirectoryIfNotExistsAsync(storageFolderUri);        
            await this.updateWorkspaceFolderVscodeExcludeSettingAsync(workspaceFolder, '', storageFolderName);
    
            await this.initializeWorkspaceFolderStorageAsync(storageFolderUri);
            
            if (isRoot) { await this.initializeRootWorkspaceFolderStorageAsync(storageFolderUri); }
        
            this.logMessage(`Successfully initialized extension storage folders and files for workspace folder ${workspaceFolder.name}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(errorMessage);
            vscode.window.showErrorMessage(`Error occurred when initializing extension storage folders and files for workspace folder ${workspaceFolder.name}: ${errorMessage}`);
            throw error;
        }
    }

    // creates workspace-specific extension storage folders and files in workspace folder extension storage
    private async initializeWorkspaceFolderStorageAsync(storageFolderUri: vscode.Uri): Promise<void> {
        this.logMessage(`Initializing workspace storage in: ${storageFolderUri.fsPath}`);

        // create workspace info dir if dne
        await FileSystemUtils.createDirectoryIfNotExistsAsync(vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME));

        // create workspace info dir files if dne (and load default content)
        const workspaceInfoUri = vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME);        
        for (const [fileKey, fileName] of Object.entries(EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES)) {
            const fileUri = vscode.Uri.joinPath(workspaceInfoUri, fileName);
            if (!(await FileSystemUtils.fileExistsAsync(fileUri)))
            {
                const defaultContent = await ExtensionUtils.getExtensionStorageFileDefaultContent(fileKey as keyof typeof EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.FILES);
                await FileSystemUtils.writeFileAsync(fileUri, defaultContent);     
            }
        }
    }

    // creates root workspace-specific extension storage folders and files in workspace folder extension storage
    private async initializeRootWorkspaceFolderStorageAsync(storageFolderUri: vscode.Uri): Promise<void> {
        this.logMessage(`Initializing root-only workspace storage in: ${storageFolderUri.fsPath}`);

        // create project info and prompt out storage folders if dne
        const projectInfoDir = vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME);
        await FileSystemUtils.createDirectoryIfNotExistsAsync(projectInfoDir);
        this.logMessage(`Initialized root-only workspace storage folder: ${projectInfoDir.fsPath}`);

        const promptOutDir = vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME);
        await FileSystemUtils.createDirectoryIfNotExistsAsync(promptOutDir);
        //this.logMessage(`Initialized root-only workspace storage folder: ${promptOutDir.fsPath}`);
        
        // create files in project info dir if dne
        for (const [fileKey, fileName] of Object.entries(EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES)) {
            const fileUri = vscode.Uri.joinPath(projectInfoDir, fileName);
            if (!(await FileSystemUtils.fileExistsAsync(fileUri)))
            {
                const defaultContent = await ExtensionUtils.getExtensionStorageFileDefaultContent(fileKey as keyof typeof EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.FILES);
                await FileSystemUtils.writeFileAsync(fileUri, defaultContent); 
                //this.logMessage(`Initialized root-only workspace storage file: ${fileUri.fsPath}`);
            }
            else {
                //this.logMessage(`Root-only workspace storage file already exists: ${fileUri.fsPath}`);
            }
        }
    }


    async deleteExtensionStorageAsync(): Promise<void>
    {
        this.logMessage(`Deleting existing extension workspace storage folders`);
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders)
        {
            for (const workspaceFolder of workspaceFolders) 
            {
                await this.deleteExtensionStorageForWorkspaceFolderAsync(workspaceFolder);
            }    
        }
        else 
        {
            this.logMessage(`No workspace folders found`);
        }
    }

    async deleteExtensionStorageForWorkspaceFolderAsync(workspaceFolder: vscode.WorkspaceFolder): Promise<void>
    {
        const uri = ExtensionUtils.getExtensionStorageFolderUri(workspaceFolder);
        if (await FileSystemUtils.directoryExistsAsync(uri))
        {
            this.logMessage(`Deleting extension workspace ${workspaceFolder.name} storage folder: ${uri.fsPath}`);
            await FileSystemUtils.deleteDirectoryAsync(uri, { recursive: true, useTrash: false });
            await this.removeWorkspaceFolderVscodeExcludeSettingAsync(workspaceFolder);
        }
    }
    
    async deleteRootWorkspaceExtensionStorageForWorkspaceFolderAsync(workspaceFolder: vscode.WorkspaceFolder): Promise<void>
    {
        const storageFolderUri = ExtensionUtils.getExtensionStorageFolderUri(workspaceFolder);
        this.logMessage(`Clearing root-specific extension storage folders for workspace ${workspaceFolder.name}`);    

        const outDirUri = vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME);
        if (await FileSystemUtils.directoryExistsAsync(outDirUri)) {
            await FileSystemUtils.deleteDirectoryAsync(outDirUri, { recursive: true, useTrash: false });
        }
    
        const projectInfoDirUri = vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME);
        if (await FileSystemUtils.directoryExistsAsync(projectInfoDirUri)) {
            await FileSystemUtils.deleteDirectoryAsync(outDirUri, { recursive: true, useTrash: false });
        }
    }


    // async refreshExtensionStorageAsync(): Promise<void> {
    //     this.logMessage('Refreshing storage folders for workspace');        
    //     try {
    //         await this.deleteExtensionStorageAsync();
    //         await this.initializeExtensionStorageAsync();    
    //     }
    //     catch (error) {
    //         const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    //         this.logError(errorMessage);
    //         vscode.window.showErrorMessage(`Error occured when refreshing extension storage folders: ${errorMessage}`);
    //     }
    // }

    async refreshExtensionStorageAsync(lastKnownWorkspaceConfigValues: Record<string, WorkspaceConfigCacheType>): Promise<void> {
        this.logMessage('Refreshing storage folders for workspace');        
        try {
            await this.deleteExtensionStorageAsync();
            await this.initializeExtensionStorageAsync(lastKnownWorkspaceConfigValues);    
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(errorMessage);
            vscode.window.showErrorMessage(`Error occurred when refreshing extension storage folders: ${errorMessage}`);
        }
    }
    

    // confirm that all extension storage folders and files are present in all workspace folders
    // confirm that root-specific storage folders only present in root workspace folder
    // alert user and give option to reload extension storage if there is an error
    async validateStorageFoldersAsync(): Promise<void> {
        this.logMessage('Validating storage folders for all workspaces');
        const workspaces = await VscodeWorkspaceUtils.getAllWorkspaceFoldersAsync();
    
        for (const workspace of workspaces) {
            const isRoot = VscodeWorkspaceUtils.isRootWorkspaceFolder(workspace);
            const storageFolderUri = ExtensionUtils.getExtensionStorageFolderUri(workspace);
            
            this.logMessage(`Validating workspace: ${workspace.name}, isRoot: ${isRoot}, storageFolderUri: ${storageFolderUri.fsPath}`);

            const hasWorkspaceInfo = await FileSystemUtils.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME));
            const hasSystemInfo = await FileSystemUtils.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME));
            const hasOut = await FileSystemUtils.directoryExistsAsync(vscode.Uri.joinPath(storageFolderUri, EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME));
    
            this.logMessage(`Workspace ${workspace.name}: hasWorkspaceInfo: ${hasWorkspaceInfo}, hasSystemInfo: ${hasSystemInfo}, hasOut: ${hasOut}`);
    
            if (isRoot) {
                // validate extension folder in project root workspace has all required folders
                let missingExtensionFolders: string = '';
                if (!hasSystemInfo) { missingExtensionFolders += EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME; }
                if (!hasOut) { missingExtensionFolders += `${missingExtensionFolders ? ', ' : ''}` + EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME; }
                if (!hasWorkspaceInfo) { missingExtensionFolders += `${missingExtensionFolders ? ', ' : ''}` + EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME; } 

                if (missingExtensionFolders) {
                    const message = `Root workspace ${workspace.name} is missing required folders in extension directory '${storageFolderUri}' (${missingExtensionFolders}). Would you like to initialize them?`;
                    this.logMessage(message);
                    const action = await vscode.window.showWarningMessage(message, 'Initialize', 'Ignore');
                    if (action === 'Initialize') {
                        await this.initializeExtensionStorageForWorkspaceFolderAsync(workspace);
                    }
                }
            } else {
                // validate extension folder not in project root workspace has all required folders
                if (!hasWorkspaceInfo) {  
                    const message = `Workspace ${workspace.name} is missing workspace info folder in workspace's extension directory '${storageFolderUri}' (${EXTENSION_STORAGE.STRUCTURE.WORKSPACE_FOLDER_INFO_DIR.NAME}). Would you like to initialize it?`;
                    this.logMessage(message);
                    const action = await vscode.window.showWarningMessage(message, 'Initialize', 'Ignore');
                    if (action === 'Initialize') {
                        await this.initializeExtensionStorageForWorkspaceFolderAsync(workspace);
                    }
                }
                // and validate that it does not have the system info folders
                let unexpectedExtensionFolders: string = '';
                if (hasSystemInfo) { unexpectedExtensionFolders += EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME; }
                if (hasOut) { unexpectedExtensionFolders += `${unexpectedExtensionFolders ? ', ' : ''}` + EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME; }
                if (unexpectedExtensionFolders) {
                    const message = `Found unexpected extension folders in non-root workspace ${workspace.name} extension directory '${storageFolderUri}'. These folders (${unexpectedExtensionFolders}) should only exist in the root workspace.`;
                    this.logMessage(message);
                    const action = await vscode.window.showWarningMessage(message, 'Delete', 'Ignore');
                    if (action === 'Delete') {
                        await this.deleteRootWorkspaceExtensionStorageForWorkspaceFolderAsync(workspace);
                    }
                }
            }
        }
    }

    // update storage folder names in response to change
    async handleStorageFolderNameConfigurationChangeAsync(workspaceFolder: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
        this.logMessage(`Handling storage folder name change for workspace ${workspaceFolder.name} from ${oldName} to ${newName}`);
        const oldUri = vscode.Uri.joinPath(workspaceFolder.uri, oldName);
        const newUri = vscode.Uri.joinPath(workspaceFolder.uri, newName);            
        try {
            if (await FileSystemUtils.directoryExistsAsync(oldUri)) {
                this.logMessage(`Renaming directory from ${oldUri.fsPath} to ${newUri.fsPath}`);
                await FileSystemUtils.moveDirectoryAsync(oldUri, newUri, { overwrite: false }); // error if renamed directory already exists
            } else {
                this.logMessage(`Old directory doesn't exist for workspace ${workspaceFolder.name}. Creating new directory.`);
                await FileSystemUtils.createDirectoryIfNotExistsAsync(newUri);
            }
            await this.updateWorkspaceFolderVscodeExcludeSettingAsync(workspaceFolder, oldName, newName);
        } catch (error) {
            this.logError(`Error updating directory for workspace ${workspaceFolder.name}: ${error}`);
            throw error;
        }
    }

    async handleRootWorkspaceFolderChangeAsync(oldRoot: vscode.WorkspaceFolder, newRoot: vscode.WorkspaceFolder): Promise<void> {
        this.logMessage(`Migrating root workspace storage folder items from ${oldRoot.name} to ${newRoot.name}`);
        try {
            const storageDirName = ExtensionUtils.getExtensionStorageFolderName(newRoot); 
            const oldStorageDir = vscode.Uri.joinPath(oldRoot.uri, storageDirName);
            const newStorageDir = vscode.Uri.joinPath(newRoot.uri, storageDirName);
            const oldStorageDirExists = await FileSystemUtils.directoryExistsAsync(oldStorageDir);
            const newStorageDirExists = await FileSystemUtils.directoryExistsAsync(newStorageDir);
            if (!newStorageDirExists) {
                await this.initializeExtensionStorageForWorkspaceFolderAsync(newRoot);
            }
            if (oldStorageDirExists) {
                for (const dir of [EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME, EXTENSION_STORAGE.STRUCTURE.PROJECT_INFO_DIR.NAME]) {
                    const oldPath = vscode.Uri.joinPath(oldStorageDir, dir);
                    const newPath = vscode.Uri.joinPath(newStorageDir, dir);      
                    if (await FileSystemUtils.directoryExistsAsync(oldPath)) {
                        await FileSystemUtils.moveDirectoryAsync(oldPath, newPath, { overwrite: true });
                        this.logMessage(`Moved ${dir} folder from old root to new root workspace.`);
                        
                        // Delete the old directory after successful move
                        // await FileSystemUtils.deleteDirectoryAsync(oldPath, { recursive: true, useTrash: false });
                        // this.logMessage(`Deleted old ${dir} folder from previous root workspace.`);
                    }
                }
                await this.initializeRootWorkspaceFolderStorageAsync(newStorageDir);
            }
        } catch (error) {
            this.logError(`Failed to handle root workspace folder change: ${error}`);
            throw error; // Re-throw the error to be handled by the caller
        }
    }
    
    // async refreshStorageFolderAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
    //     const oldUri = vscode.Uri.joinPath(workspace.uri, oldName);
    //     const newUri = vscode.Uri.joinPath(workspace.uri, newName);

    //     const oldExists = await FileSystemUtils.directoryExistsAsync(oldUri);
    //     const newExists = await FileSystemUtils.directoryExistsAsync(newUri);

    //     if (oldExists && newExists) {
    //         // Replace new folder with old folder
    //         await FileSystemUtils.deleteDirectoryAsync(newUri);
    //         await FileSystemUtils.moveDirectoryAsync(oldUri, newUri);
    //     } else if (oldExists) {
    //         // Rename old folder to new name
    //         await FileSystemUtils.moveDirectoryAsync(oldUri, newUri);
    //     } else if (newExists) {
    //         // Initialize new folder
    //         await this.initializeStorageFolderAsync(workspace);
    //     } else {
    //         // Neither folder exists, create and initialize new folder
    //         await FileSystemUtils.createDirectoryIfNotExistsAsync(newUri);
    //         await this.initializeStorageFolderAsync(workspace);
    //     }
    //     await this.validateStorageFoldersAsync();
    // }
    
    

    // .vscode settings management (add/remove storage folders from vscode file explorer exclusion)
    private async updateWorkspaceFolderVscodeExcludeSettingAsync(workspace: vscode.WorkspaceFolder, oldName: string, newName: string): Promise<void> {
        this.logMessage(`updateWorkspaceFolderVscodeExcludeSettingAsync invoked. workspace: ${workspace.name}, oldName: ${oldName}, newName: ${newName}`)
        const config = vscode.workspace.getConfiguration('files', workspace.uri);
        const exclude = config.get('exclude') as { [key: string]: boolean };

        // Remove the old pattern
        if (exclude[`**/${oldName}`]) {
            delete exclude[`**/${oldName}`];
        }

        // Add the new pattern
        exclude[`**/${newName}`] = true;

        // Update the configuration
        await config.update('exclude', exclude, vscode.ConfigurationTarget.Workspace);
        this.logMessage(`Updated files.exclude setting for workspace ${workspace.name}`);
    }

    private async removeWorkspaceFolderVscodeExcludeSettingAsync(workspace: vscode.WorkspaceFolder): Promise<void> {
        const config = vscode.workspace.getConfiguration('files', workspace.uri);
        const exclude = config.get('exclude') as { [key: string]: boolean };
        const storageFolderName = ExtensionUtils.getExtensionStorageFolderName(workspace);
        
        if (exclude[`**/${storageFolderName}`]) {
            delete exclude[`**/${storageFolderName}`];
            await config.update('exclude', exclude, vscode.ConfigurationTarget.WorkspaceFolder);
            this.logMessage(`Removed ${storageFolderName} from files.exclude for workspace ${workspace.name}`);
        }
    }


}