
import * as vscode from 'vscode';
import { IFileFlagger, FileFlaggerFactory } from '../../shared/utility/fileFlaggers';
import { EXTENSION_STORAGE } from '../../constants/extensionStorage';

export class FileFilterHelper {
    static async createStructureFilter(workspace: vscode.WorkspaceFolder): Promise<IFileFlagger> {
        const includeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_STRUCTURE_INCLUDE.fileName;
        const excludeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_STRUCTURE_EXCLUDE.fileName;
        return FileFlaggerFactory.createExcludeIncludeFlagger(workspace, includeFileName, excludeFileName);
    }

    static async createContentFilter(workspace: vscode.WorkspaceFolder): Promise<IFileFlagger> {
        const includeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_CONTENT_INCLUDE.fileName;
        const excludeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_CONTENT_EXCLUDE.fileName;
        return FileFlaggerFactory.createExcludeIncludeFlagger(workspace, includeFileName, excludeFileName);
    }
}