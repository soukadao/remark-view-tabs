import { visit } from "unist-util-visit";
const attrAtEndPattern = /\s*\{([^{}\n]*)\}\s*$/;
const attrOnlyPattern = /^\s*\{([^{}\n]*)\}\s*$/;
const keyPattern = /^[A-Za-z0-9_-]+$/;
export function parseAttributeBlock(value) {
    const source = value.trim();
    if (!source.startsWith("{") || !source.endsWith("}")) {
        return undefined;
    }
    const body = source.slice(1, -1).trim();
    if (body.length === 0) {
        return { attrs: {}, empty: true };
    }
    const attrs = {};
    for (const token of body.split(/\s+/)) {
        const [rawKey, ...valueParts] = token.split("=");
        if (!keyPattern.test(rawKey)) {
            return undefined;
        }
        if (valueParts.length === 0) {
            attrs[rawKey] = true;
            continue;
        }
        const rawValue = valueParts.join("=");
        if (rawValue.length === 0 || /\s/.test(rawValue)) {
            return undefined;
        }
        attrs[rawKey] = rawValue;
    }
    return { attrs, empty: false };
}
export function extractTrailingAttributes(value) {
    const match = value.match(attrAtEndPattern);
    if (!match) {
        return undefined;
    }
    const parsed = parseAttributeBlock(`{${match[1]}}`);
    if (!parsed) {
        return undefined;
    }
    return {
        value: value.slice(0, match.index).trimEnd(),
        attrs: parsed.attrs,
        empty: parsed.empty,
    };
}
export function paragraphAttributeOnly(node) {
    if (node.type !== "paragraph" || node.children.length !== 1) {
        return undefined;
    }
    const child = node.children[0];
    if (child.type !== "text" || !attrOnlyPattern.test(child.value)) {
        return undefined;
    }
    return parseAttributeBlock(child.value);
}
export function attachAttrs(node, attrs) {
    const existing = typeof node.data === "object" && node.data !== null
        ? node.data
        : {};
    const currentDesign = typeof existing.design === "object" && existing.design !== null
        ? existing.design
        : {};
    const currentAttrs = typeof currentDesign.attrs === "object" && currentDesign.attrs !== null
        ? currentDesign.attrs
        : {};
    node.data = {
        ...existing,
        design: {
            ...currentDesign,
            attrs: {
                ...currentAttrs,
                ...attrs,
            },
        },
    };
}
function tableRowAttributeOnly(row) {
    if (row.children.length !== 1) {
        return undefined;
    }
    const cell = row.children[0];
    if (cell.children.length !== 1) {
        return undefined;
    }
    const child = cell.children[0];
    if (child.type !== "text" || !attrOnlyPattern.test(child.value)) {
        return undefined;
    }
    return parseAttributeBlock(child.value);
}
export function parseAttributes(tree) {
    const parsedNodes = [];
    visit(tree, "heading", (node) => {
        const last = node.children[node.children.length - 1];
        if (!last || last.type !== "text") {
            return;
        }
        const result = extractTrailingAttributes(last.value);
        if (!result) {
            return;
        }
        last.value = result.value;
        if (last.value.length === 0) {
            node.children.pop();
        }
        attachAttrs(node, result.attrs);
        parsedNodes.push({ node, empty: result.empty });
    });
    visit(tree, "paragraph", (node) => {
        for (let index = 1; index < node.children.length; index += 1) {
            const child = node.children[index];
            const previous = node.children[index - 1];
            if (child.type !== "text" || previous.type !== "image") {
                continue;
            }
            const result = extractTrailingAttributes(child.value);
            if (!result || result.value.length !== 0) {
                continue;
            }
            attachAttrs(previous, result.attrs);
            node.children.splice(index, 1);
            index -= 1;
            parsedNodes.push({ node: previous, empty: result.empty });
        }
    });
    for (let index = 0; index < tree.children.length - 1; index += 1) {
        const node = tree.children[index];
        const next = tree.children[index + 1];
        if (node.type !== "table") {
            continue;
        }
        const result = paragraphAttributeOnly(next);
        if (!result) {
            continue;
        }
        attachAttrs(node, result.attrs);
        tree.children.splice(index + 1, 1);
        parsedNodes.push({ node: node, empty: result.empty });
    }
    visit(tree, "table", (node) => {
        const lastRow = node.children[node.children.length - 1];
        if (!lastRow) {
            return;
        }
        const result = tableRowAttributeOnly(lastRow);
        if (!result) {
            return;
        }
        attachAttrs(node, result.attrs);
        node.children.pop();
        parsedNodes.push({ node: node, empty: result.empty });
    });
    return parsedNodes;
}
