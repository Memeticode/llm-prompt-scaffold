// src/interfaces.ts
import { Uri } from 'vscode';
import { ConfigFileKey, GeneratedFileKey } from './types';

export interface ExtensionFileItemInfo {
    fileName: string;
    label: string;
    description: string;
    icon: string;
}
export interface ConfigFileInfo extends ExtensionFileItemInfo {}
export interface GeneratedFileInfo extends ExtensionFileItemInfo {}

export interface PromptConfigItem {
    key: ConfigFileKey;
    info: ConfigFileInfo;
    uri: Uri;
}
export interface GeneratedPromptItem {
    key: GeneratedFileKey;
    info: GeneratedFileInfo;
    uri: Uri;
}
