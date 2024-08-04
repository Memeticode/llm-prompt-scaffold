// src/types.ts
import { EXTENSION_STORAGE } from '../../constants/extensionStorage';

export type ConfigFileKey = keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES;
export type GeneratedFileKey = keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES;
