import type { Content, List, Root } from "mdast";
import type { VFile } from "vfile";
import type { DesignTab, DesignTabDisplay, DesignTabGroup } from "./types.js";

type ParseOptions = {
  validate: boolean;
};

type TabsStart = {
  name: string;
  display: DesignTabDisplay;
  invalidDisplay?: string;
};

function message(file: VFile, reason: string, node: unknown, fatal = true): void {
  const vfileMessage = file.message(reason);
  vfileMessage.fatal = fatal;
  vfileMessage.source = "remark-design-md";
  vfileMessage.ruleId = "tabs";
}

function paragraphText(node: Content): string | undefined {
  if (node.type !== "paragraph" || node.children.length !== 1) {
    return undefined;
  }

  const child = node.children[0];
  return child.type === "text" ? child.value : undefined;
}

function parseItemText(value: string): DesignTab | undefined {
  const index = value.indexOf(":");
  if (index === -1) {
    return undefined;
  }

  const key = value.slice(0, index).trim();
  const label = value.slice(index + 1).trim();
  if (key.length === 0 || label.length === 0) {
    return undefined;
  }

  return { key, label };
}

function parseTabsList(
  name: string,
  display: DesignTabDisplay,
  list: List,
  file: VFile,
  options: ParseOptions,
): DesignTabGroup {
  const tabs: DesignTab[] = [];
  const seen = new Set<string>();

  for (const item of list.children) {
    if (item.children.length !== 1) {
      if (options.validate) {
        message(file, `Invalid tabs item in "${name}"`, item);
      }
      continue;
    }

    const text = paragraphText(item.children[0]);
    if (text === undefined) {
      if (options.validate) {
        message(file, `Invalid tabs item in "${name}"`, item);
      }
      continue;
    }

    const normalized = text.replace(/\n::\s*$/, "");
    const tab = parseItemText(normalized);
    if (!tab) {
      if (options.validate) {
        message(file, `Invalid tabs item format in "${name}": ${JSON.stringify(text)}`, item);
      }
      continue;
    }

    if (seen.has(tab.key)) {
      if (options.validate) {
        message(file, `Duplicate tab key "${tab.key}" in tabs "${name}"`, item);
      }
      continue;
    }

    seen.add(tab.key);
    tabs.push(tab);
  }

  return { name, display, tabs };
}

function parseTabsStart(value: string): TabsStart | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith("tabs")) {
    return undefined;
  }

  const tokens = trimmed.split(/\s+/);
  if (tokens[0] !== "tabs" || tokens.length > 3) {
    return undefined;
  }

  const name = tokens[1] ?? "";
  if (name.length > 0 && !/^[A-Za-z0-9_-]+$/.test(name)) {
    return undefined;
  }

  const display = tokens[2] ?? "tabs";
  if (display === "tabs" || display === "select") {
    return { name, display };
  }

  return { name, display: "tabs", invalidDisplay: display };
}

function parsePseudoTabsStart(node: Content): TabsStart | undefined {
  const text = paragraphText(node);
  if (!text) {
    return undefined;
  }

  const match = text.match(/^::(.+)$/);
  return match ? parseTabsStart(match[1]) : undefined;
}

function attachRootTabs(tree: Root, tabs: DesignTabGroup[]): void {
  const data = typeof tree.data === "object" && tree.data !== null
    ? tree.data as Record<string, unknown>
    : {};
  const currentDesign = typeof data.design === "object" && data.design !== null
    ? data.design as Record<string, unknown>
    : {};

  tree.data = {
    ...data,
    design: {
      ...currentDesign,
      tabs,
    },
  };
}

export function parseTabs(tree: Root, file: VFile, options: ParseOptions): DesignTabGroup[] {
  const tabs: DesignTabGroup[] = [];

  for (let index = 0; index < tree.children.length; index += 1) {
    const node = tree.children[index] as any;
    const contentNode = tree.children[index] as Content;

    const directiveNode = node as {
      type?: string;
      name?: string;
      label?: string;
      children?: Content[];
    };

    if (directiveNode.type === "containerDirective" && directiveNode.name === "tabs") {
      const start = parseTabsStart(`tabs ${typeof directiveNode.label === "string" ? directiveNode.label : ""}`);
      const name = start?.name ?? "";
      const display = start?.display ?? "tabs";
      if (start?.invalidDisplay && options.validate) {
        message(file, `Invalid tabs display "${start.invalidDisplay}" in "${name}"`, directiveNode);
      }
      if (name.length === 0 && options.validate) {
        message(file, "Missing tabs group name", directiveNode);
      }

      const list = Array.isArray(directiveNode.children)
        ? directiveNode.children.find((child) => child.type === "list")
        : undefined;
      if (name.length > 0 && list?.type === "list") {
        tabs.push(parseTabsList(name, display, list, file, options));
      }
      tree.children.splice(index, 1);
      index -= 1;
      continue;
    }

    const start = parsePseudoTabsStart(contentNode);
    if (start === undefined) {
      continue;
    }

    const { name, display } = start;
    if (start.invalidDisplay && options.validate) {
      message(file, `Invalid tabs display "${start.invalidDisplay}" in "${name}"`, contentNode);
    }

    if (name.length === 0 && options.validate) {
      message(file, "Missing tabs group name", contentNode);
    }

    const list = tree.children[index + 1];
    if (name.length > 0 && list?.type === "list") {
      tabs.push(parseTabsList(name, display, list, file, options));
      tree.children.splice(index, 2);
      index -= 1;
      continue;
    }

    if (options.validate) {
      message(file, `Missing tabs list for "${name}"`, contentNode);
    }
    tree.children.splice(index, 1);
    index -= 1;
  }

  attachRootTabs(tree, tabs);
  return tabs;
}
