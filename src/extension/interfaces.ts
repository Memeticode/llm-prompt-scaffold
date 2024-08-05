// src/interfaces.ts
import { Uri } from 'vscode';
import { PromptConfigFileKey, PromptContextFileKey } from './types';

export interface ExtensionFileItemInfo {
    fileName: string;
    label: string;
    description: string;
    icon: string;
}
export interface ConfigFileInfo extends ExtensionFileItemInfo {}
export interface GeneratedFileInfo extends ExtensionFileItemInfo {}

export interface PromptConfigItem {
    key: PromptConfigFileKey;
    info: ConfigFileInfo;
    uri: Uri;
}
export interface GeneratedPromptItem {
    key: PromptContextFileKey;
    info: GeneratedFileInfo;
    uri: Uri;
}
