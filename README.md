# llm-prompt-scaffold README

This extension provides **tooling to enable coding with a large-context LLM by auto-generating a large prompt file**. 
After generating the prompt file, you can simply drag-and-drop it into your favorite large-context LLM's web application window. 

The prompt file contains:
- A description of the project
- Your current development goals
- A selection of project files which may be relvant (a.k.a "file context") 

You can configure this infomration via the extension's sidebar window, or by editing files in the ".prompt-scaffold/info/" directory (which the extension creates).

Generated prompt files are be stored in the ".prompt-scaffold/out" directory. It's recommended to add this directory to your project's .gitignore file. You may want to keep the ".project-scaffold/info" directory, so that you can maintain your description across development sessions.

## Features

**1. Set prompt information via the sidebar tab, under "Project Context" > "Prompt Configuration".** 
- To determine the file context, you can add or remove lines to the exclude and include .gitignore files under "Project Context" > "Prompt Configuration" > "File Context". 
- The current file context is visible under "Project Context" > "Current File Context".

**2. Generate prompt files by clicking the "Refresh" button under "Prompt Files" on the sidebar tab.**

**3. Open the folder containing prompt.txt by clicking the "Open System Folder", then drag that file into your favorite large-context LLM.**

## Requirements

Vscode engine 1.91.0+

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Let me know!

## Release Notes

Users appreciate release notes as you update your extension.

### 0.0.1

Dev release with core functionality.

### 1.0.0

To-do...

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)


