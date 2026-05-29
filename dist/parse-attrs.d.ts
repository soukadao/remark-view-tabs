import type { Content, Root } from "mdast";
import type { DesignAttrs } from "./types.js";
export type AttrParseResult = {
    attrs: DesignAttrs;
    empty: boolean;
};
export declare function parseAttributeBlock(value: string): AttrParseResult | undefined;
export declare function extractTrailingAttributes(value: string): {
    value: string;
    attrs: DesignAttrs;
    empty: boolean;
} | undefined;
export declare function paragraphAttributeOnly(node: Content): AttrParseResult | undefined;
export declare function attachAttrs(node: {
    data?: unknown;
}, attrs: DesignAttrs): void;
export declare function parseAttributes(tree: Root): Array<{
    node: Content;
    empty: boolean;
}>;
//# sourceMappingURL=parse-attrs.d.ts.map