import {
  describe,
  expect,
  it
} from "vitest";

import {
  parseNumericValue,
  readJsonPath
} from "../src/services/collector-utils.js";

describe("parseNumericValue", () => {
  it("parses an integer with spaces", () => {
    expect(
      parseNumericValue("1 284 likes")
    ).toBe(1284);
  });

  it("parses non-breaking spaces", () => {
    expect(
      parseNumericValue("12\u00a0345")
    ).toBe(12345);
  });

  it("parses decimal commas", () => {
    expect(
      parseNumericValue("42,5")
    ).toBe(42.5);
  });

  it("parses negative values", () => {
    expect(
      parseNumericValue("-12")
    ).toBe(-12);
  });

  it("rejects text without numbers", () => {
    expect(() =>
      parseNumericValue("aucune valeur")
    ).toThrow(
      "No numeric value found"
    );
  });
});

describe("readJsonPath", () => {
  it("reads a nested property", () => {
    const data = {
      article: {
        stats: {
          likes: 1284
        }
      }
    };

    expect(
      readJsonPath(
        data,
        "article.stats.likes"
      )
    ).toBe(1284);
  });

  it("throws for an unknown path", () => {
    expect(() =>
      readJsonPath(
        { article: {} },
        "article.likes"
      )
    ).toThrow(
      'JSON path "article.likes" not found'
    );
  });
});
