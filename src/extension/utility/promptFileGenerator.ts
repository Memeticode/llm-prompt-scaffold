
import * as vscode from 'vscode';
import { FileSystemUtils } from '../../shared/utility/fileSystemUtils';
import { FileFilterHelper } from './fileFilterHelper';
import { FileContentHelper } from './fileContentHelper';

export class PromptFileGenerator {
    static async generateFromConfig(sourceUri: vscode.Uri, outUri: vscode.Uri): Promise<void> {
        const content = await FileSystemUtils.readFileAsync(sourceUri);
        const filteredContent = content.split('\n')
            .filter(line => !line.trim().startsWith('#'))
            .join('\n');
        await FileSystemUtils.writeFileAsync(outUri, filteredContent);
    }

    static async generateFileStructure(workspace: vscode.WorkspaceFolder, outUri: vscode.Uri): Promise<void> {
        const filter = await FileFilterHelper.createStructureFilter(workspace);
        const content = await FileContentHelper.getFileStructure(workspace.uri, filter);
        await FileSystemUtils.writeFileAsync(outUri, content);
    }

    static async generateFileContent(workspace: vscode.WorkspaceFolder, outUri: vscode.Uri): Promise<void> {
        const structureFilter = await FileFilterHelper.createStructureFilter(workspace);
        const contentFilter = await FileFilterHelper.createContentFilter(workspace);
        const content = await FileContentHelper.getFileContent(workspace.uri, structureFilter, contentFilter);
        await FileSystemUtils.writeFileAsync(outUri, content);
    }
}