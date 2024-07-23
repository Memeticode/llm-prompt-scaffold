import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';

export class GitignoreParser {
    private ig: ReturnType<typeof ignore>;
    private filePath: string;

    constructor(workspaceRoot: string, fileName: string) {
        this.ig = ignore();
        this.filePath = path.join(workspaceRoot, fileName);
        this.loadRules();
    }

    public loadRules(): void {
        this.ig = ignore();
        if (fs.existsSync(this.filePath)) {
            const gitignoreContent = fs.readFileSync(this.filePath, 'utf8');
            this.ig.add(gitignoreContent);
        }
    }

    public shouldIgnore(filePath: string): boolean {
        return this.ig.ignores(filePath);
    }
}