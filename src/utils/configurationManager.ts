// src/configurationManager.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigurationManager {
    private readonly configSection = 'promptScaffold';
    
    public isExtensionEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(this.configSection);
        return config.get('enabled', true);
    }

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