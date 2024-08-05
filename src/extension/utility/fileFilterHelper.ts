
import * as vscode from 'vscode';
import { FileFilter, IncludeExcludeGitignoreParser } from '../../shared/utility/fileFilters';
import { EXTENSION_STORAGE } from '../../constants/extensionStorage';

export class FileFilterHelper {
    static async createStructureFilter(workspace: vscode.WorkspaceFolder): Promise<FileFilter> {
        const includeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_STRUCTURE_INCLUDE.fileName;
        const excludeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_STRUCTURE_EXCLUDE.fileName;
        return IncludeExcludeGitignoreParser.create(workspace.uri, includeFileName, excludeFileName);
    }

    static async createContentFilter(workspace: vscode.WorkspaceFolder): Promise<FileFilter> {
        const includeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_CONTENT_INCLUDE.fileName;
        const excludeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_CONTENT_EXCLUDE.fileName;
        return IncludeExcludeGitignoreParser.create(workspace.uri, includeFileName, excludeFileName);
    }
}