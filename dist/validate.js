import { visit } from "unist-util-visit";
import { recommendedTypes } from "./types.js";
function designAttrs(node) {
    const data = typeof node.data === "object" && node.data !== null
        ? node.data
        : {};
    const design = data.design;
    if (typeof design !== "object" || design === null) {
        return undefined;
    }
    const attrs = design.attrs;
    return typeof attrs === "object" && attrs !== null ? attrs : undefined;
}
function warning(file, reason, node) {
    const message = file.message(reason);
    message.fatal = false;
    message.source = "remark-design-md";
    message.ruleId = "validation";
}
function error(file, reason, node) {
    const message = file.message(reason);
    message.fatal = true;
    message.source = "remark-design-md";
    message.ruleId = "validation";
}
function collectFrontmatterKeys(tree) {
    const keys = new Set();
    const yaml = tree.children.find((node) => node.type === "yaml");
    if (!yaml) {
        return keys;
    }
    for (const line of yaml.value.split(/\r?\n/)) {
        const match = line.match(/^([A-Za-z0-9_-]+):/);
        if (match) {
            keys.add(match[1]);
        }
    }
    return keys;
}
export function validateDesignMd(tree, file, tabs, parsedAttrs, options) {
    if (!options.validate) {
        return;
    }
    const groups = new Map();
    for (const group of tabs) {
        if (groups.has(group.name)) {
            error(file, `Duplicate tabs group "${group.name}"`);
            continue;
        }
        groups.set(group.name, group);
    }
    if (options.knownTabNames) {
        for (const group of tabs) {
            if (!options.knownTabNames.includes(group.name)) {
                warning(file, `Unknown tabs group "${group.name}"`);
            }
        }
    }
    const allowedTypes = options.knownTypes ?? recommendedTypes;
    const ids = new Map();
    visit(tree, (node) => {
        if (node.type === "image" && (node.alt ?? "").length === 0) {
            warning(file, "Image alt is empty", node);
        }
        const attrs = designAttrs(node);
        if (!attrs) {
            return;
        }
        if (typeof attrs.id === "string") {
            if (ids.has(attrs.id)) {
                warning(file, `Duplicate id "${attrs.id}"`, node);
            }
            else {
                ids.set(attrs.id, node);
            }
        }
        if (typeof attrs.type === "string" && !allowedTypes.includes(attrs.type)) {
            warning(file, `Unknown type "${attrs.type}"`, node);
        }
        validateTabValue("device", attrs, groups, file, node);
        validateTabValue("state", attrs, groups, file, node);
    });
    for (const item of parsedAttrs) {
        if (item.node.type === "heading" && item.empty) {
            warning(file, "Heading has empty attributes", item.node);
        }
    }
    if (options.requiredFrontmatter && options.requiredFrontmatter.length > 0) {
        const keys = collectFrontmatterKeys(tree);
        for (const key of options.requiredFrontmatter) {
            if (!keys.has(key)) {
                error(file, `Missing required frontmatter "${key}"`);
            }
        }
    }
}
function validateTabValue(name, attrs, groups, file, node) {
    const value = attrs[name];
    if (typeof value !== "string") {
        return;
    }
    const group = groups.get(name);
    if (!group) {
        error(file, `Missing tabs group "${name}" for ${name}="${value}"`, node);
        return;
    }
    if (!group.tabs.some((tab) => tab.key === value)) {
        error(file, `Unknown ${name} "${value}"`, node);
    }
}
