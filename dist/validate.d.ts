import type { Content, Root } from "mdast";
import type { VFile } from "vfile";
import { type DesignTabGroup, type RemarkDesignMdOptions } from "./types.js";
export declare function validateDesignMd(tree: Root, file: VFile, tabs: DesignTabGroup[], parsedAttrs: Array<{
    node: Content;
    empty: boolean;
}>, options: Required<Pick<RemarkDesignMdOptions, "validate">> & Omit<RemarkDesignMdOptions, "validate">): void;
//# sourceMappingURL=validate.d.ts.map