// /*
// A storage folder (i.e. '.prompt-scaffold') is created in each workspace folder.
// This folder will include the workspace files in the 'workspace-info' subdirectory.
// If it's the root workspace, the storage folder will also include the project-info and out subdirectories.
// Users configure the extension functionality by editing these files.
// */

export const EXTENSION_STORAGE = {
    EXTENSION_ID: "memeticode.llm-prompt-scaffold",
    CONFIG_KEY: 'extensionStorageDirectory',
    STORAGE_FOLDER_NAME_FALLBACK: '.llm-prompt-scaffold',
    STRUCTURE: {
        PROMPT_CONFIG_DIR: {
            NAME: 'config',
            FILES: {
                SYSTEM_PROMPT: 'project-system-prompt.txt',
                PROJECT_DESCRIPTION: 'project-description.txt',
                PROJECT_GOALS: 'project-goals.txt',
                PROJECT_CONTEXT_STRUCTURE_INCLUDE: 'project-context-structure-include.gitignore',
                PROJECT_CONTEXT_STRUCTURE_EXCLUDE: 'project-context-structure-exclude.gitignore',
                PROJECT_CONTEXT_CONTENT_INCLUDE: 'project-context-content-include.gitignore',
                PROJECT_CONTEXT_CONTENT_EXCLUDE: 'project-context-content-exclude.gitignore'
            }
        },
        PROMPT_OUT_DIR: {
            NAME: 'out',
            FILES: {
                SYSTEM_PROMPT: 'out-system-prompt.txt',
                PROJECT_DESCRIPTION: 'out-project-description.txt',
                PROJECT_GOALS: 'out-project-goals.txt',
                FILE_CONTEXT_STRUCTURE: 'out-file-context-structure.txt',
                FILE_CONTEXT_CONTENT: 'out-file-context-content.txt'
            }
        }
    }
};

