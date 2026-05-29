import type { Root } from "mdast";
import type { VFile } from "vfile";
import type { DesignTabGroup } from "./types.js";
type ParseOptions = {
    validate: boolean;
};
export declare function parseTabs(tree: Root, file: VFile, options: ParseOptions): DesignTabGroup[];
export {};
//# sourceMappingURL=parse-tabs.d.ts.map