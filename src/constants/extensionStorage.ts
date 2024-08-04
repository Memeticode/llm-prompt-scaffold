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
                SYSTEM_PROMPT: {
                    fileName: 'project-system-prompt.txt',
                    label: 'System Prompt',
                    description: 'The base prompt used for the project',
                    icon: 'symbol-keyword'
                },
                PROJECT_DESCRIPTION: {
                    fileName: 'project-description.txt',
                    label: 'Project Description',
                    description: 'Description of the entire project',
                    icon: 'book'
                },
                PROJECT_GOALS: {
                    fileName: 'project-goals.txt',
                    label: 'Session Goals',
                    description: 'Current development session goals',
                    icon: 'target'
                },
                PROJECT_CONTEXT_STRUCTURE_INCLUDE: {
                    fileName: 'project-context-structure-include.gitignore',
                    label: 'Structure Include Rules',
                    description: 'Rules for including files in structure summaries',
                    icon: 'list-tree'
                },
                PROJECT_CONTEXT_STRUCTURE_EXCLUDE: {
                    fileName: 'project-context-structure-exclude.gitignore',
                    label: 'Structure Exclude Rules',
                    description: 'Rules for excluding files from structure summaries',
                    icon: 'list-tree'
                },
                PROJECT_CONTEXT_CONTENT_INCLUDE: {
                    fileName: 'project-context-content-include.gitignore',
                    label: 'Content Include Rules',
                    description: 'Rules for including files in content summaries',
                    icon: 'file-text'
                },
                PROJECT_CONTEXT_CONTENT_EXCLUDE: {
                    fileName: 'project-context-content-exclude.gitignore',
                    label: 'Content Exclude Rules',
                    description: 'Rules for excluding files from content summaries',
                    icon: 'file-text'
                }
            }
        },
        PROMPT_OUT_DIR: {
            NAME: 'out',
            FILES: {
                SYSTEM_PROMPT: {
                    fileName: 'out-system-prompt.txt',
                    label: 'System Prompt',
                    description: 'Generated system prompt',
                    icon: 'symbol-keyword'
                },
                PROJECT_DESCRIPTION: {
                    fileName: 'out-project-description.txt',
                    label: 'Project Description',
                    description: 'Generated project description',
                    icon: 'book'
                },
                PROJECT_GOALS: {
                    fileName: 'out-project-goals.txt',
                    label: 'Session Goals',
                    description: 'Generated session goals',
                    icon: 'target'
                },
                FILE_CONTEXT_STRUCTURE: {
                    fileName: 'out-file-context-structure.txt',
                    label: 'File Structure',
                    description: 'Generated file structure context',
                    icon: 'symbol-structure'
                },
                FILE_CONTEXT_CONTENT: {
                    fileName: 'out-file-context-content.txt',
                    label: 'File Content',
                    description: 'Generated file content context',
                    icon: 'symbol-file'
                }
            }
        }
    }
};