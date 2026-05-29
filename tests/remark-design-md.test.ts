import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkDirective from "remark-directive";
import type { Root } from "mdast";
import { VFile } from "vfile";
import remarkDesignMd from "../src/index.js";

const fixtureDir = join(import.meta.dir, "fixtures");

function fixture(name: string): string {
  return readFileSync(join(fixtureDir, name), "utf8");
}

function createTree(markdown: string, options = {}) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter)
    .use(remarkDirective)
    .use(remarkDesignMd, options);

  const file = new VFile({ value: markdown, path: "fixture.md" });
  const tree = processor.parse(file) as Root;
  const result = processor.runSync(tree, file) as Root;
  return { tree: result, file };
}

describe("remarkDesignMd", () => {
  test("collects tabs and attaches heading and image attributes", () => {
    const { tree, file } = createTree(fixture("screen.md"));
    expect(file.messages).toHaveLength(0);
    expect(tree?.data?.design?.tabs).toEqual([
      {
        name: "device",
        display: "select",
        tabs: [
          { key: "pc", label: "PC" },
          { key: "tablet", label: "タブレット" },
          { key: "mobile", label: "スマホ" },
        ],
      },
      {
        name: "state",
        display: "tabs",
        tabs: [
          { key: "normal", label: "通常" },
          { key: "empty", label: "データなし" },
          { key: "error", label: "エラー" },
        ],
      },
    ]);

    const heading = tree?.children.find((node) => node.type === "heading" && node.depth === 2);
    expect(heading?.data?.design?.attrs).toEqual({ type: "layout" });

    const paragraph = tree?.children.find((node) => node.type === "paragraph");
    const image = paragraph?.type === "paragraph"
      ? paragraph.children.find((node) => node.type === "image")
      : undefined;
    expect(image?.data?.design?.attrs).toEqual({ device: "pc", state: "normal" });
    expect(tree?.children.some((node) => node.type === "list")).toBe(false);
  });

  test("moves table trailing attributes onto the table", () => {
    const { tree, file } = createTree(fixture("table-attrs.md"));
    expect(file.messages).toHaveLength(0);

    const table = tree?.children.find((node) => node.type === "table");
    expect(table?.data?.design?.attrs).toEqual({ type: "controls" });
    expect(tree?.children).toHaveLength(1);
  });

  test("reports unknown device values", () => {
    const { file } = createTree(fixture("invalid-unknown-device.md"));
    expect(file.messages.some((message) => message.fatal === true && /Unknown device/.test(message.reason))).toBe(true);
  });

  test("reports duplicate tab keys", () => {
    const { file } = createTree(fixture("invalid-duplicate-tab.md"));
    expect(file.messages.some((message) => message.fatal === true && /Duplicate tab key/.test(message.reason))).toBe(true);
  });

  test("reports unknown type warnings", () => {
    const { file } = createTree(fixture("warning-unknown-type.md"));
    expect(file.messages.some((message) => message.fatal === false && /Unknown type/.test(message.reason))).toBe(true);
  });

  test("suppresses validation messages when validate is false", () => {
    const { file } = createTree(fixture("invalid-unknown-device.md"), { validate: false });
    expect(file.messages).toHaveLength(0);
  });
});
