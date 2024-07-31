// import * as assert from 'assert';
// import * as vscode from 'vscode';
// import * as path from 'path';
// import * as fs from 'fs';
// import { STORAGE_FOLDER_STRUCTURE, PROJECT_FILES, WORKSPACE_INFO_FILES } from '../constants/extensionStorageFolderItems';


// /*
//     extension storage folder name is excluded from visible workspace files via .vscode config folder file.

// */
// suite('Extension Test Suite', () => {
//     const extensionId = 'abcdevco.llm-propmt-scaffold'; // Replace with your actual extension ID
//     let extension: vscode.Extension<any>;
//     const tempWorkspacePath = path.join(__dirname, '..', '..', 'test-workspace');
//     const timeout = 5000; 
//     let storageFolderName: string;

    
//     suiteSetup(async () => {
//         extension = vscode.extensions.getExtension(extensionId)!;
//         assert.ok(extension, 'Extension not found');
//         await extension.activate();
        
//         if (!fs.existsSync(tempWorkspacePath)) {
//             fs.mkdirSync(tempWorkspacePath, { recursive: true });
//         }

//         const config = vscode.workspace.getConfiguration('promptScaffold');
//         storageFolderName = config.get('extensionStorageDirectory', '.prompt-scaffold');
//     });

//     suiteTeardown(async () => {
//         if (fs.existsSync(tempWorkspacePath)) {
//             fs.rmSync(tempWorkspacePath, { recursive: true, force: true });
//         }
//     });

//     suite('Basic Activation and Configuration', () => {
//         test('Extension activates with no workspace folders', async () => {
//             // Ensure no workspace folders are open
//             vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0);
            
//             assert.strictEqual(vscode.workspace.workspaceFolders?.length, 0, 'Workspace should have no folders');
//             assert.ok(extension.isActive, 'Extension should be active');
//         });

//         test('Extension registers its commands', () => {
//             return vscode.commands.getCommands(true).then((commands) => {
//                 const extensionCommands = [
//                     'promptScaffold.initializeWorkspaceStorageFolders',
//                     // Add other commands later
//                 ];

//                 for (const command of extensionCommands) {
//                     assert.ok(commands.includes(command), `Command ${command} should be registered`);
//                 }
//             });
//         });

//         test('Default configuration is set correctly', async () => {
//             // Save the original configuration
//             const originalConfig = vscode.workspace.getConfiguration('promptScaffold').get('extensionStorageDirectory');
        
//             try {
//                 // Reset to default configuration
//                 await vscode.workspace.getConfiguration('promptScaffold').update('extensionStorageDirectory', undefined, vscode.ConfigurationTarget.Global);
        
//                 // Now test the default value
//                 const config = vscode.workspace.getConfiguration('promptScaffold');
//                 assert.strictEqual(
//                     config.get('extensionStorageDirectory'),
//                     '.prompt-scaffold',
//                     'Default extensionStorageDirectory should be .prompt-scaffold'
//                 );
//             } finally {
//                 // Restore the original configuration
//                 await vscode.workspace.getConfiguration('promptScaffold').update('extensionStorageDirectory', originalConfig, vscode.ConfigurationTarget.Global);
//             }
//         });
//     });

//     // suite('Single Workspace Folder', () => {
//     //     const folderName = 'testFolder';
//     //     let folderPath: string;
//     //     let storageFolderName: string;

//     //     setup(async () => {
//     //         // Clear workspace folders
//     //         await vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0);
            
//     //         folderPath = path.join(tempWorkspacePath, folderName);
//     //         fs.mkdirSync(folderPath, { recursive: true });
            
//     //         const config = vscode.workspace.getConfiguration('promptScaffold');
//     //         storageFolderName = config.get('extensionStorageDirectory', '.prompt-scaffold');
    
//     //         console.log(`Setup complete. Folder path: ${folderPath}`);
//     //     });
    
//     //     teardown(async () => {
//     //         await vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0);
//     //         if (fs.existsSync(folderPath)) {
//     //             fs.rmSync(folderPath, { recursive: true, force: true });
//     //         }
//     //         console.log('Teardown complete');
//     //     });
    
//     //     test('Adding first workspace folder creates all expected files', async () => {
//     //         console.log('Starting test: Adding first workspace folder creates all expected files');
//     //         const added = await new Promise<boolean>(resolve => {
//     //             vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.file(folderPath) });
//     //             setTimeout(() => resolve(true), timeout);
//     //         });
            
//     //         assert.ok(added, 'Failed to add folder to workspace');
//     //         console.log(`Folder added to workspace: ${folderPath}`);
    
//     //         // Wait for the extension to process the new folder
//     //         await new Promise(resolve => setTimeout(resolve, timeout * 2));
    
//     //         const storagePath = path.join(folderPath, storageFolderName);
//     //         console.log(`Checking storage path: ${storagePath}`);
            
//     //         assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO)), 'system-info directory should exist');
//     //         assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO)), 'workspace-info directory should exist');
//     //         assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.OUT)), 'out directory should exist');
    
//     //         for (const file of Object.values(SYSTEM_FILES)) {
//     //             assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO, file)), `${file} should exist in system-info`);
//     //         }
    
//     //         for (const file of Object.values(WORKSPACE_FILES)) {
//     //             assert.ok(fs.existsSync(path.join(storagePath, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO, file)), `${file} should exist in workspace-info`);
//     //         }
    
//     //         console.log('Test completed successfully');
//     //     });

//     //     test('Storage folder name matches configuration', async () => {
//     //         const added = vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.file(folderPath) });
//     //         assert.ok(added, 'Failed to add folder to workspace');

//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         const storagePath = path.join(folderPath, storageFolderName);
//     //         assert.ok(fs.existsSync(storagePath), `Storage folder ${storageFolderName} should exist`);
//     //     });

//     //     test('Changing storage folder name updates directory structure', async () => {
//     //         const added = vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.file(folderPath) });
//     //         assert.ok(added, 'Failed to add folder to workspace');

//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         const oldStoragePath = path.join(folderPath, storageFolderName);
//     //         assert.ok(fs.existsSync(oldStoragePath), 'Old storage folder should exist');

//     //         const newStorageName = '.new-prompt-scaffold';
//     //         await vscode.workspace.getConfiguration('promptScaffold').update('extensionStorageDirectory', newStorageName, vscode.ConfigurationTarget.Workspace);

//     //         // Wait for the extension to process the configuration change
//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         const newStoragePath = path.join(folderPath, newStorageName);
//     //         assert.ok(fs.existsSync(newStoragePath), 'New storage folder should exist');
//     //         assert.ok(!fs.existsSync(oldStoragePath), 'Old storage folder should not exist');

//     //         // Check if all expected files and folders exist in the new location
//     //         assert.ok(fs.existsSync(path.join(newStoragePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO)), 'system-info directory should exist in new location');
//     //         assert.ok(fs.existsSync(path.join(newStoragePath, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO)), 'workspace-info directory should exist in new location');
//     //         assert.ok(fs.existsSync(path.join(newStoragePath, STORAGE_FOLDER_STRUCTURE.OUT)), 'out directory should exist in new location');
//     //     });
//     // });


//     // suite('Multi-Folder Workspace', () => {
//     //     const folder1Name = 'folder1';
//     //     const folder2Name = 'folder2';
//     //     let folder1Path: string;
//     //     let folder2Path: string;

//     //     setup(async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0);
            
//     //         folder1Path = path.join(tempWorkspacePath, folder1Name);
//     //         folder2Path = path.join(tempWorkspacePath, folder2Name);
//     //         fs.mkdirSync(folder1Path, { recursive: true });
//     //         fs.mkdirSync(folder2Path, { recursive: true });
//     //     });

//     //     teardown(async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0);
//     //         if (fs.existsSync(folder1Path)) { fs.rmSync(folder1Path, { recursive: true, force: true }); }
//     //         if (fs.existsSync(folder2Path)) { fs.rmSync(folder2Path, { recursive: true, force: true }); }
//     //     });

//     //     test('Adding second workspace folder creates only workspace-info files', async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, 0, 
//     //             { uri: vscode.Uri.file(folder1Path) },
//     //             { uri: vscode.Uri.file(folder2Path) }
//     //         );

//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         const storagePath2 = path.join(folder2Path, storageFolderName);
//     //         assert.ok(fs.existsSync(path.join(storagePath2, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO)), 'workspace-info directory should exist in second folder');
//     //         assert.ok(!fs.existsSync(path.join(storagePath2, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO)), 'system-info directory should not exist in second folder');
//     //         assert.ok(!fs.existsSync(path.join(storagePath2, STORAGE_FOLDER_STRUCTURE.OUT)), 'out directory should not exist in second folder');
//     //     });

//     //     test('Root workspace has all folders, others have only workspace-info', async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, 0, 
//     //             { uri: vscode.Uri.file(folder1Path) },
//     //             { uri: vscode.Uri.file(folder2Path) }
//     //         );

//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         const storagePath1 = path.join(folder1Path, storageFolderName);
//     //         const storagePath2 = path.join(folder2Path, storageFolderName);

//     //         assert.ok(fs.existsSync(path.join(storagePath1, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO)), 'system-info should exist in root workspace');
//     //         assert.ok(fs.existsSync(path.join(storagePath1, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO)), 'workspace-info should exist in root workspace');
//     //         assert.ok(fs.existsSync(path.join(storagePath1, STORAGE_FOLDER_STRUCTURE.OUT)), 'out should exist in root workspace');

//     //         assert.ok(!fs.existsSync(path.join(storagePath2, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO)), 'system-info should not exist in non-root workspace');
//     //         assert.ok(fs.existsSync(path.join(storagePath2, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO)), 'workspace-info should exist in non-root workspace');
//     //         assert.ok(!fs.existsSync(path.join(storagePath2, STORAGE_FOLDER_STRUCTURE.OUT)), 'out should not exist in non-root workspace');
//     //     });

//     //     test('Changing storage folder name updates all workspace folders', async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, 0, 
//     //             { uri: vscode.Uri.file(folder1Path) },
//     //             { uri: vscode.Uri.file(folder2Path) }
//     //         );

//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         const newStorageName = '.new-prompt-scaffold';
//     //         await vscode.workspace.getConfiguration('promptScaffold').update('extensionStorageDirectory', newStorageName, vscode.ConfigurationTarget.Workspace);

//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         assert.ok(fs.existsSync(path.join(folder1Path, newStorageName)), 'New storage folder should exist in first workspace');
//     //         assert.ok(fs.existsSync(path.join(folder2Path, newStorageName)), 'New storage folder should exist in second workspace');
//     //         assert.ok(!fs.existsSync(path.join(folder1Path, storageFolderName)), 'Old storage folder should not exist in first workspace');
//     //         assert.ok(!fs.existsSync(path.join(folder2Path, storageFolderName)), 'Old storage folder should not exist in second workspace');
//     //     });
//     // });

//     // suite('Configuration Changes', () => {
//     //     const folderName = 'configTest';
//     //     let folderPath: string;

//     //     setup(async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0);
//     //         folderPath = path.join(tempWorkspacePath, folderName);
//     //         fs.mkdirSync(folderPath, { recursive: true });
//     //         vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.file(folderPath) });
//     //         await new Promise(resolve => setTimeout(resolve, timeout));
//     //     });

//     //     teardown(async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0);
//     //         if (fs.existsSync(folderPath)) { fs.rmSync(folderPath, { recursive: true, force: true }); }
//     //     });

//     //     test('Updating user settings does not affect existing workspaces', async () => {
//     //         const originalStoragePath = path.join(folderPath, storageFolderName);
//     //         assert.ok(fs.existsSync(originalStoragePath), 'Original storage folder should exist');

//     //         const newGlobalStorageName = '.global-prompt-scaffold';
//     //         await vscode.workspace.getConfiguration('promptScaffold').update('extensionStorageDirectory', newGlobalStorageName, vscode.ConfigurationTarget.Global);

//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         assert.ok(fs.existsSync(originalStoragePath), 'Original storage folder should still exist');
//     //         assert.ok(!fs.existsSync(path.join(folderPath, newGlobalStorageName)), 'New global storage folder should not exist in workspace');
//     //     });

//     //     test('Updating workspace settings affects all folders in the workspace', async () => {
//     //         const newWorkspaceStorageName = '.workspace-prompt-scaffold';
//     //         await vscode.workspace.getConfiguration('promptScaffold').update('extensionStorageDirectory', newWorkspaceStorageName, vscode.ConfigurationTarget.Workspace);

//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         assert.ok(fs.existsSync(path.join(folderPath, newWorkspaceStorageName)), 'New workspace storage folder should exist');
//     //         assert.ok(!fs.existsSync(path.join(folderPath, storageFolderName)), 'Old storage folder should not exist');
//     //     });
//     // });

//     // suite('Workspace Changes', () => {
//     //     const folder1Name = 'wsChange1';
//     //     const folder2Name = 'wsChange2';
//     //     let folder1Path: string;
//     //     let folder2Path: string;

//     //     setup(async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0);
//     //         folder1Path = path.join(tempWorkspacePath, folder1Name);
//     //         folder2Path = path.join(tempWorkspacePath, folder2Name);
//     //         fs.mkdirSync(folder1Path, { recursive: true });
//     //     });

//     //     teardown(async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length || 0);
//     //         if (fs.existsSync(folder1Path)) { fs.rmSync(folder1Path, { recursive: true, force: true }); }
//     //         if (fs.existsSync(folder2Path)) { fs.rmSync(folder2Path, { recursive: true, force: true }); }
//     //     });

//     //     test('Adding a new folder to existing workspace initializes it correctly', async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.file(folder1Path) });
//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         fs.mkdirSync(folder2Path, { recursive: true });
//     //         vscode.workspace.updateWorkspaceFolders(1, 0, { uri: vscode.Uri.file(folder2Path) });
//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         assert.ok(fs.existsSync(path.join(folder2Path, storageFolderName, STORAGE_FOLDER_STRUCTURE.WORKSPACE_INFO)), 'workspace-info should exist in new folder');
//     //     });

//     //     test('Removing a folder from workspace cleans up extension files', async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.file(folder1Path) });
//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         const storagePath = path.join(folder1Path, storageFolderName);
//     //         assert.ok(fs.existsSync(storagePath), 'Storage folder should exist');

//     //         vscode.workspace.updateWorkspaceFolders(0, 1);
//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         assert.ok(!fs.existsSync(storagePath), 'Storage folder should be removed');
//     //     });

//     //     test('Changing root workspace migrates system and out folders', async () => {
//     //         vscode.workspace.updateWorkspaceFolders(0, 0, 
//     //             { uri: vscode.Uri.file(folder1Path) },
//     //             { uri: vscode.Uri.file(folder2Path) }
//     //         );
//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         const originalRootStoragePath = path.join(folder1Path, storageFolderName);
//     //         assert.ok(fs.existsSync(path.join(originalRootStoragePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO)), 'system-info should exist in original root');
//     //         assert.ok(fs.existsSync(path.join(originalRootStoragePath, STORAGE_FOLDER_STRUCTURE.OUT)), 'out should exist in original root');

//     //         vscode.workspace.updateWorkspaceFolders(0, 1);
//     //         await new Promise(resolve => setTimeout(resolve, timeout));

//     //         const newRootStoragePath = path.join(folder2Path, storageFolderName);
//     //         assert.ok(fs.existsSync(path.join(newRootStoragePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO)), 'system-info should exist in new root');
//     //         assert.ok(fs.existsSync(path.join(newRootStoragePath, STORAGE_FOLDER_STRUCTURE.OUT)), 'out should exist in new root');
//     //         assert.ok(!fs.existsSync(path.join(originalRootStoragePath, STORAGE_FOLDER_STRUCTURE.SYSTEM_INFO)), 'system-info should not exist in old root');
//     //         assert.ok(!fs.existsSync(path.join(originalRootStoragePath, STORAGE_FOLDER_STRUCTURE.OUT)), 'out should not exist in old root');
//     //     });
//     // });
// });

// export {};