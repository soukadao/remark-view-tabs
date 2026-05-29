import type { Content, List, Root } from "mdast";
import type { VFile } from "vfile";
import type { DesignTab, DesignTabGroup } from "./types.js";

type ParseOptions = {
  validate: boolean;
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

  return { name, tabs };
}

function parsePseudoTabsStart(node: Content): string | undefined {
  const text = paragraphText(node);
  if (!text) {
    return undefined;
  }

  const match = text.match(/^::tabs(?:\s+([A-Za-z0-9_-]+))?\s*$/);
  return match ? match[1] ?? "" : undefined;
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
      const name = typeof directiveNode.label === "string" ? directiveNode.label.trim() : "";
      if (name.length === 0 && options.validate) {
        message(file, "Missing tabs group name", directiveNode);
      }

      const list = Array.isArray(directiveNode.children)
        ? directiveNode.children.find((child) => child.type === "list")
        : undefined;
      if (name.length > 0 && list?.type === "list") {
        tabs.push(parseTabsList(name, list, file, options));
      }
      tree.children.splice(index, 1);
      index -= 1;
      continue;
    }

    const name = parsePseudoTabsStart(contentNode);
    if (name === undefined) {
      continue;
    }

    if (name.length === 0 && options.validate) {
      message(file, "Missing tabs group name", contentNode);
    }

    const list = tree.children[index + 1];
    if (name.length > 0 && list?.type === "list") {
      tabs.push(parseTabsList(name, list, file, options));
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
