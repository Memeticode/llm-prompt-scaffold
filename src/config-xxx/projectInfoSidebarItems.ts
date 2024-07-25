
// import { ProjectInfoItemType, ProjectInfoItemDefinition, } from '../ui/projectInfo/definitions';

// // This defines the project info items menu
// export const PROJECT_INFO_ITEMS: ProjectInfoItemDefinition[] = [
//     {
//         label: 'Prompt Configuration',
//         contextValue: 'prompt-configuration-group',
//         itemType: ProjectInfoItemType.Dropdown,
//         tooltip: 'Configure prompt contents',
//         iconName: 'gear',
//         children: [
//             {
//                 label: 'System Prompt',
//                 contextValue: 'system-prompt.txt',
//                 itemType: ProjectInfoItemType.ProjectInfoFile,
//                 tooltip: 'Defines the system prompt for the model',
//                 iconName: 'symbol-keyword'
//             },
//             {
//                 label: 'Description',
//                 contextValue: 'project-description.txt',
//                 itemType: ProjectInfoItemType.ProjectInfoFile,
//                 tooltip: 'Provides an overview of the project',
//                 iconName: 'book' 
//             },
//             {
//                 label: 'Session Goals',
//                 contextValue: 'session-goals.txt',
//                 itemType: ProjectInfoItemType.ProjectInfoFile,
//                 tooltip: 'Outlines the specific goals for the current development session',
//                 iconName: 'target'
//             },
//             {
//                 label: 'File Context',
//                 contextValue: 'files-context-group',
//                 itemType: ProjectInfoItemType.Dropdown,
//                 tooltip: 'Manages which files are included in the prompt context',
//                 iconName: 'filter-filled',
//                 children: [
//                     {
//                         label: 'Exclude',
//                         contextValue: 'exclude.gitignore',
//                         itemType: ProjectInfoItemType.ProjectInfoFile,
//                         tooltip: 'Specifies files to exclude from the prompt context',
//                         iconName: 'eye-closed'
//                     },
//                     {
//                         label: 'Include',
//                         contextValue: 'include.gitignore',
//                         itemType: ProjectInfoItemType.ProjectInfoFile,
//                         tooltip: 'Specifies files to include in the prompt context (overrides exclude)',
//                         iconName: 'eye' 
//                     }
//                 ]
//             }

//         ]
//     },
//     {
//         label: 'Current File Context',
//         contextValue: 'current-context',
//         itemType: ProjectInfoItemType.FileContext,
//         tooltip: 'The current selection of project files that will have their full content included in the prompt - files shown are controlled by file context configuration exclude/include .gitignore files',
//         iconName: 'files'
//     }
// ];

