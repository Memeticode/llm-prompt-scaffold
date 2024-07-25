// ConfigurationManager serves as a single point of access for all configuration-related operations

import * as vscode from 'vscode';
import { BaseManager } from './baseManager';
import { SYSTEM_FILES, WORKSPACE_FILES } from '../constants/extensionStorageFolderItems';

// file type describes files which may allow user to specify default content by setting a configurable property 
type SystemFileType = keyof typeof SYSTEM_FILES;
type WorkspaceFileType = keyof typeof WORKSPACE_FILES;
type FileType = SystemFileType | WorkspaceFileType;

// workspace manager provides methods for controlling the extensionDirectory folders
// this folder will be created in each workspace (if dne)
// the root directory will also contain subfolders
export class ConfigurationManager extends BaseManager {
    private config: vscode.WorkspaceConfiguration;
    private storageFolderNameChangeDelegate: ((oldName: string, newName: string) => Promise<void>) | null = null;


    private configKeyMap: Record<FileType, string> = {
        SCAFFOLD_PROMPT: 'systemPromptDefaultPath',
        INCLUDE_STRUCTURE_GITIGNORE: 'fileStructureContextIncludeDefaultPath',
        EXCLUDE_STRUCTURE_GITIGNORE: 'fileStructureContextExcludeDefaultPath',
        INCLUDE_CONTENT_GITIGNORE: 'fileSystemContextIncludeDefaultPath',
        EXCLUDE_CONTENT_GITIGNORE: 'fileSystemContextExcludeDefaultPath',
        // Add mappings for other file types if needed
        SYSTEM_DESCRIPTION: '',
        SESSION_GOALS: '',
        WORKSPACE_DESCRIPTION: ''
    };

    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private context: vscode.ExtensionContext
    ) {
        super(logName, outputChannel);
        this.config = vscode.workspace.getConfiguration('promptScaffold');
    }
    
    private getString(key: string, defaultValue: string): string {
        return this.config.get<string>(key, defaultValue);
    }

    private refreshConfiguration(): void {
        this.config = vscode.workspace.getConfiguration('promptScaffold');
    }

    setStorageFolderNameChangeDelegate(delegate: (oldName: string, newName: string) => Promise<void>): void {
        this.logMessage(`Registered storage folder name change delegate...`);
        this.storageFolderNameChangeDelegate = delegate;
    }

    async updateConfigurationAsync(key: string, value: string, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
        this.logMessage(`Attempting to set configuration value: target=${target.toString()}, key=${key}, value=${value}`);
        try {
            if (key === 'extensionStorageDirectory') {
                const oldValue = this.getString(key, '');
                await this.updateConfigurationFilePathAsync(key, value, target);
                if (oldValue && this.storageFolderNameChangeDelegate) {
                    this.logMessage(`Invoking storage folder name change delegate`);
                    await this.storageFolderNameChangeDelegate(oldValue, value);
                }
            }
            else if (key.endsWith('DefaultPath')) {
                await this.updateConfigurationFilePathAsync(key, value, target);
            }
            else {
                await this.config.update(key, value, target);
            }
            this.refreshConfiguration();
            this.logMessage(`Successfully updated configuration: ${key}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(errorMessage);
            vscode.window.showErrorMessage(`Failed to update configuration ${key}: ${errorMessage}`);
            throw error;
        }
    }

    private async updateConfigurationFilePathAsync(key: string, value: string, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void>{
        if (await this.isValidFilePathAsync(value)) {
            await this.config.update(key, value, target);
        } else {
            const errorMessage = `Can't set ${key} to an invalid file path: ${value}`;
            this.logError(errorMessage);
            throw new Error(errorMessage);
        }
    }

    getExtensionStorageFolderName(): string {
        return this.getString('workspaceInfoFolderName', '.prompt-scaffold');
    }
    
    
    getExtensionStorageFileDefaultContentPath(fileType: FileType): string {
        const configKey = this.configKeyMap[fileType];
        if (!configKey) {
            return this.getDefaultFilePath(fileType);
        }
    
        const configuredPath = this.getString(configKey, '');    
        if (configuredPath) {
            const fileUri = vscode.Uri.file(configuredPath);
            return fileUri.fsPath;
        }

        return this.getDefaultFilePath(fileType);
    }
    
    private getDefaultFilePath(fileType: FileType): string {
        if (this.isSystemFile(fileType)) {
            return vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'defaultFileContent', SYSTEM_FILES[fileType]).fsPath;
        } else {
            return vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'defaultFileContent', WORKSPACE_FILES[fileType]).fsPath;
        }
    }
    
    private isSystemFile(fileType: FileType): fileType is keyof typeof SYSTEM_FILES {
        return fileType in SYSTEM_FILES;
    }
    
}

/*
export class ConfigurationManager {
    private readonly configSection = 'promptScaffold';
    
    getSystemPath(): string
    {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('Can\'t get system path (workspace root). Is there a workspace folder open?');
        }
        return workspaceFolder.uri.fsPath;
    }
    getExtensionDirectory(): string
    {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get('extensionDirectory', '.prompt-scaffold/');
    }

    // info directory (holds user-managed config files which inform prompt)
    getInfoDirectory(): string {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return path.join(
            this.getExtensionDirectory(),
            config.get('infoDirectory', 'info/'));
    } 
    getInfoDirectorySystemPath(): string {
        return path.join(this.getSystemPath(), this.getInfoDirectory());
    }
    getSystemPromptSystemPath(): string {
        return path.join(this.getInfoDirectorySystemPath(), "system-prompt.txt");
    }
    getDescriptionSystemPath(): string {
        return path.join(this.getInfoDirectorySystemPath(), "project-description.txt");
    }
    getSessionGoalsSystemPath(): string {
        return path.join(this.getInfoDirectorySystemPath(), "session-goals.txt");
    }
    getExcludeFileContextSystemPath(): string {
        return path.join(this.getInfoDirectorySystemPath(), "exclude.gitignore");
    }
    getIncludeFileContextSystemPath(): string {
        return path.join(this.getInfoDirectorySystemPath(), "include.gitignore");
    }

    
    
    // out directory (holds extension-managed files can be used to supply prompt)
    getOutDirectory(): string {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return path.join(
            this.getExtensionDirectory(),
            config.get('outputDirectory', 'out/'));
    }
    getOutDirectorySystemPath(): string {
        return path.join(this.getSystemPath(), this.getOutDirectory());
    }

    getPromptTxtOutFileName(): string {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get('promptTextFileName', 'prompt.txt');
    }
    getSummaryOutFileName(): string {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get('summaryFileName', 'project-summary.txt');
    }
    getStructureOutFileName(): string {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get('structureFileName', 'project-structure.txt');
    }
    getAggregateOutFileName(): string {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get('aggregateFileName', 'project-code-aggregate.txt');
    }


    // this one references the extension files
    getProjectInfoDefaultsDirectorySystemPath(): string {
        return path.resolve(__dirname, '..', 'src', 'project-info-defaults');
    }


    async ensureOutputDirectoryExists(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder is open');
        }

        const outputDir = path.join(workspaceFolder.uri.fsPath, this.getOutDirectory());
        
        try {
            await fs.promises.mkdir(outputDir, { recursive: true });
        } catch (error: unknown) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error creating the output directory: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred while creating the output directory.');
            }
        }
    }

    validateConfiguration(): string[] {
        const errors: string[] = [];
        const outputDir = this.getOutDirectory();
        const structureFileName = this.getStructureOutFileName();

        if (!outputDir || outputDir.trim() === '') {
            errors.push('Output directory cannot be empty.');
        }

        if (!structureFileName || structureFileName.trim() === '') {
            errors.push('Structure file name cannot be empty.');
        }

        if (structureFileName.includes(path.sep)) {
            errors.push('Structure file name cannot contain path separators.');
        }

        return errors;
    }    
}
*/
