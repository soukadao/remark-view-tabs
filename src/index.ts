import type { Plugin } from "unified";
import type { Root } from "mdast";
import type { VFile } from "vfile";
import { parseAttributes } from "./parse-attrs.js";
import { parseTabs } from "./parse-tabs.js";
import { validateDesignMd } from "./validate.js";
import type { RemarkDesignMdOptions } from "./types.js";

export type {
  DesignAttrs,
  DesignData,
  DesignTab,
  DesignTabDisplay,
  DesignTabGroup,
  RemarkDesignMdOptions,
} from "./types.js";

const remarkDesignMd: Plugin<[RemarkDesignMdOptions?], Root> = (options = {}) => {
  const normalized = {
    validate: options.validate ?? true,
    knownTabNames: options.knownTabNames,
    knownTypes: options.knownTypes,
    requiredFrontmatter: options.requiredFrontmatter,
  };

  return (tree: Root, file: VFile) => {
    const tabs = parseTabs(tree, file, { validate: normalized.validate });
    const parsedAttrs = parseAttributes(tree);
    validateDesignMd(tree, file, tabs, parsedAttrs, normalized);
  };
};

export default remarkDesignMd;
