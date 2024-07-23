import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigurationManager } from './configurationManager';
import { GitignoreParser } from './gitIgnoreParser';

/*
    responsible for
    - getting file context files
    - writing files to the info and out directories
*/
export class FileManager {
    private excludeParser: GitignoreParser;
    private includeParser: GitignoreParser;

    constructor(private configManager: ConfigurationManager) {
        this.configManager = new ConfigurationManager();
        
        const excludeFilePath = this.configManager.getExcludeFileContextSystemPath();
        const includeFilePath = this.configManager.getIncludeFileContextSystemPath();
        this.excludeParser = new GitignoreParser(path.dirname(excludeFilePath), path.basename(excludeFilePath));
        this.includeParser = new GitignoreParser(path.dirname(includeFilePath), path.basename(includeFilePath));
    }


    // PRIVATE METHODS 

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true; // The file exists
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return false; // The file does not exist
            }
            throw error; // An unexpected error occurred (e.g., permission issues)
        }
    }
    private async getWorkspaceGitIgnoreIfExists(): Promise<GitignoreParser | null>
    {
        const workspaceRoot = this.configManager.getSystemPath();
        if (await this.fileExists(path.join(workspaceRoot, '.gitignore')))
        {
            return new GitignoreParser(workspaceRoot, '.gitignore');
        }
        else
        {
            return null;
        }
    }
    private shouldIgnoreFile(workspaceRoot: string, file: string, gitignoreParser: GitignoreParser | null): boolean {
        const relativePath = path.relative(workspaceRoot, file);
        if (gitignoreParser instanceof GitignoreParser)
        {
            return gitignoreParser.shouldIgnore(relativePath);
        }
        else
        {
            return false;
        }
    }
    
    
    private async writeFile(filePath: string, content: string, fileType: string): Promise<void> {
        try {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content);
            //vscode.window.showInformationMessage(`${fileType} file generated at ${filePath}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            throw new Error(`Failed to generate ${fileType.toLowerCase()} file: ${errorMessage}`);
        }
    }
    private async getAllWithGitignore(workspaceRoot: string, dir: string, gitignoreParser: GitignoreParser | null): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(entries.map(async (entry) => {
            const res = path.resolve(dir, entry.name);
            if (entry.isDirectory()) {
                // Skip .git directory entirely
                if (entry.name === '.git') {
                    return [];
                }
                return this.getAllWithGitignore(workspaceRoot, res, gitignoreParser);
            } else {
                if (this.shouldIgnoreFile(workspaceRoot, res, gitignoreParser)) {
                    return [];
                }
                return res;
            }
        }));
        return files.flat();
    }

    // PUBLIC METHODS
    
    async readFileIfExists(filePath: string): Promise<string | null> {
        try {
            const fileUri = vscode.Uri.file(filePath);
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(fileContent).toString('utf8');
            return content.trim() !== '' ? content : null;
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return null;
            }
            throw error;
        }
    }

    // Get files
    async getAllFiles(): Promise<string[]> {
        const workspaceRoot = this.configManager.getSystemPath();
        const workspaceGitignoreParser = await this.getWorkspaceGitIgnoreIfExists();
        const extensionWorkspaceFolder = this.configManager.getExtensionDirectory();  // ".prompt-scaffold/"
        const allFiles = await this.getAllWithGitignore(workspaceRoot, workspaceRoot, workspaceGitignoreParser);
        
        // Create a platform-independent path for the extension workspace folder
        const extensionWorkspacePath = path.join(extensionWorkspaceFolder);
    
        // Filter out .git/ directory and .gitignore files
        // (anything that might not be in .gitignore that we don't want to see in the file context)
        return allFiles.filter(file => {
            const relativePath = path.relative(workspaceRoot, file);
            return !relativePath.startsWith('.git' + path.sep) && 
                   path.basename(file) !== '.gitignore' && 
                   !relativePath.startsWith(extensionWorkspacePath);
        });
    }

    public reloadFileContextGitignoreRules(): void {
        this.excludeParser.loadRules();
        this.includeParser.loadRules();
    }
    async getAllContextFiles(): Promise<string[]> {
        this.reloadFileContextGitignoreRules();
        const workspaceRoot = this.configManager.getSystemPath();
        const allFiles = await this.getAllFiles();
        return allFiles.filter(file => {
            const relativePath = path.relative(workspaceRoot, file);
            const isExcluded = this.excludeParser.shouldIgnore(relativePath);
            const isIncluded = this.includeParser.shouldIgnore(relativePath);
            return isIncluded || !isExcluded;
        });
    }


    // Generate files
    async generateSummaryFile(): Promise<void> {
        // read files
        const infoDescriptionFilePath = this.configManager.getDescriptionSystemPath();
        const infoGoalsFilePath = this.configManager.getSessionGoalsSystemPath();

        // write
        const outputDirectory = this.configManager.getOutDirectorySystemPath();
        const summaryFileName = this.configManager.getSummaryOutFileName();
        const summaryFilePath = path.join(outputDirectory, summaryFileName);

        // generate content
        let summaryContent = '<project-info>\n';

        const descriptionContent = await this.readFileIfExists(infoDescriptionFilePath);
        if (descriptionContent) {
            summaryContent += '<project-info-description>\n' + descriptionContent + '\n</project-info-description>\n';
        }

        const sessionGoalsContent = await this.readFileIfExists(infoGoalsFilePath);
        if (sessionGoalsContent) {
            summaryContent += '<project-info-session-goals>\n' + sessionGoalsContent + '\n</project-info-session-goals>\n';
        }

        summaryContent += '</project-info>';

        await this.writeFile(summaryFilePath, summaryContent, 'Summary');
    }

    async generateStructureFile(): Promise<void> {
        const workspaceRoot = this.configManager.getSystemPath();
        const structureFilePath = path.join(this.configManager.getOutDirectorySystemPath(), this.configManager.getStructureOutFileName());
        const files = await this.getAllFiles();
        const structureContent = files
            .map(file => path.relative(workspaceRoot, file))
            .join('\n');

        await this.writeFile(structureFilePath, structureContent, 'Structure');
    }

    async generateAggregateFile(): Promise<void> {
        const workspaceRoot = this.configManager.getSystemPath();
        const aggregateFilePath = path.join(this.configManager.getOutDirectorySystemPath(), this.configManager.getAggregateOutFileName());

        const files = await this.getAllContextFiles();

        let fileNames: string[] = ['<files-list>'];
        let fileContents: string[] = ['<files-content>'];

        const contentPromises = files.map(async (file) => {
            const relativePath = path.relative(workspaceRoot, file);
            const content = await fs.readFile(file, 'utf8');
            fileNames.push(`${relativePath}\n`);
            fileContents.push(`<file-content file="${relativePath}">\n${content}\n</file-content>\n`);
        });
        await Promise.all(contentPromises);

        fileNames.push('</files-list>\n');
        fileContents.push('</files-content>\n');

        const aggregateContent = '<project-files-content>\n' 
                                    + fileNames.join('')
                                    + fileContents.join('') 
                                    + '</project-files-content>\n';

        await this.writeFile(aggregateFilePath, aggregateContent, 'Aggregate');
    }

    async generatePromptTextFile(): Promise<void> {
        const outputDirectory = this.configManager.getOutDirectorySystemPath();

        // write
        const promptFileName = this.configManager.getPromptTxtOutFileName();
        const promptFilePath = path.join(outputDirectory, promptFileName);

        // read contents
        const systemPromptContent = await this.readFileIfExists(this.configManager.getSystemPromptSystemPath());
        const summaryContent = await this.readFileIfExists(path.join(outputDirectory, this.configManager.getSummaryOutFileName())) || '';
        const structureContent = await this.readFileIfExists(path.join(outputDirectory, this.configManager.getStructureOutFileName())) || '';
        const aggregateContent = await this.readFileIfExists(path.join(outputDirectory, this.configManager.getAggregateOutFileName())) || '';
        
        // build content
        const promptContent = `
[Prompt]
${systemPromptContent}

[project-summary.txt]
${summaryContent}

[project-structure.txt]
${structureContent}

[project-code-aggregate.txt]
${aggregateContent}
        `.trim();

        await this.writeFile(promptFilePath, promptContent, 'Prompt');
    }


    async refreshAllFiles(): Promise<void> {
        await this.generateSummaryFile();
        await this.generateStructureFile();
        await this.generateAggregateFile();
        await this.generatePromptTextFile();
    }

}