import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { STORAGE_FOLDER_STRUCTURE, SYSTEM_FILES, WORKSPACE_FILES } from '../constants/extensionStorageFolderItems';

suite('Extension Test Suite', () => {
    const extensionId = 'Memeticode.propmt-scaffold'; // Replace with your actual extension ID
    let extension: vscode.Extension<any>;
    const tempWorkspacePath = path.join(__dirname, '..', '..', 'test-workspace');
    const storagefolderName = '.prompt-scaffold'; // Replace with your actual storage folder name

    suiteSetup(async () => {
        // Get the extension
        extension = vscode.extensions.getExtension(extensionId)!;
        assert.ok(extension, 'Extension not found');

        // Activate the extension
        await extension.activate();
        
        // Ensure the temp workspace directory exists
        if (!fs.existsSync(tempWorkspacePath)) {
            fs.mkdirSync(tempWorkspacePath, { recursive: true });
        }
    });

    suiteTeardown(async () => {
        // Clean up the temp workspace
        if (fs.existsSync(tempWorkspacePath)) {
            fs.rmdirSync(tempWorkspacePath, { recursive: true });
        }
    });

    test('Extension activates with no workspace folders', async () => {
        // Ensure no workspace folders are open
        vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0);
        
        assert.strictEqual(vscode.workspace.workspaceFolders?.length, 0, 'Workspace should have no folders');
        assert.ok(extension.isActive, 'Extension should be active');
    });

    test('Adding first workspace folder creates all expected files', async () => {
        const folderPath = path.join(tempWorkspacePath, 'folder1');
        fs.mkdirSync(folderPath, { recursive: true });

        // Add the folder to the workspace
        const added = vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.file(folderPath) });
        assert.ok(added, 'Failed to add folder to workspace');

        // Wait for the extension to process the new folder
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check for system-info and workspace-info directories and files
        const storagePath = path.join(folderPath, storagefolderName);
        assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO)), 'system-info directory should exist');
        assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO)), 'workspace-info directory should exist');
        assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.OUT)), 'out directory should exist');

        // Check for system files
        for (const file of Object.values(SYSTEM_FILES)) {
            assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO, file)), `${file} should exist in system-info`);
        }

        // Check for workspace files
        for (const file of Object.values(WORKSPACE_FILES)) {
            assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO, file)), `${file} should exist in workspace-info`);
        }
    });

    test('Adding second workspace folder creates only workspace-info files', async () => {
        const folderPath = path.join(tempWorkspacePath, 'folder2');
        fs.mkdirSync(folderPath, { recursive: true });

        // Add the second folder to the workspace
        const added = vscode.workspace.updateWorkspaceFolders(1, 0, { uri: vscode.Uri.file(folderPath) });
        assert.ok(added, 'Failed to add second folder to workspace');

        // Wait for the extension to process the new folder
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check for system-info and workspace-info directories
        const storagePath = path.join(folderPath, storagefolderName);
        assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO)), 'system-info directory should exist');
        assert.ok(!fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO)), 'workspace-info directory should not exist');
        assert.ok(!fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.OUT)), 'out directory should not exist');

        // Check for workspace files in system-info
        for (const file of Object.values(WORKSPACE_FILES)) {
            assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO, file)), `${file} should exist in system-info`);
        }

        // Ensure no system files were created
        for (const file of Object.values(SYSTEM_FILES)) {
            assert.ok(!fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO, file)), `${file} should not exist in system-info`);
        }
    });
});
