import { parseAttributes } from "./parse-attrs.js";
import { parseTabs } from "./parse-tabs.js";
import { validateDesignMd } from "./validate.js";
const remarkDesignMd = (options = {}) => {
    const normalized = {
        validate: options.validate ?? true,
        knownTabNames: options.knownTabNames,
        knownTypes: options.knownTypes,
        requiredFrontmatter: options.requiredFrontmatter,
    };
    return (tree, file) => {
        const tabs = parseTabs(tree, file, { validate: normalized.validate });
        const parsedAttrs = parseAttributes(tree);
        validateDesignMd(tree, file, tabs, parsedAttrs, normalized);
    };
};
export default remarkDesignMd;
