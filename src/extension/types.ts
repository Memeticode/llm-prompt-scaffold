// src/types.ts
import { EXTENSION_STORAGE } from '../constants/extensionStorage';

export type PromptConfigFileKey = keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES;
export type PromptContextFileKey = keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES;
