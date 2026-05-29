import type { Root } from "mdast";

export type DesignAttrs = Record<string, string | boolean>;

export type DesignTab = {
  key: string;
  label: string;
};

export type DesignTabDisplay = "tabs" | "select";

export type DesignTabGroup = {
  name: string;
  display: DesignTabDisplay;
  tabs: DesignTab[];
};

export type DesignData = {
  attrs?: DesignAttrs;
  tabs?: DesignTabGroup[];
};

export type RemarkDesignMdOptions = {
  validate?: boolean;
  knownTabNames?: string[];
  knownTypes?: string[];
  requiredFrontmatter?: string[];
};

export type DesignRoot = Root & {
  data?: Root["data"] & {
    design?: DesignData;
  };
};

export const recommendedTypes = [
  "overview",
  "layout",
  "controls",
  "events",
  "messages",
  "api",
  "data",
  "rules",
  "history",
  "checklist",
];
