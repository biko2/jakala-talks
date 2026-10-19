import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listItems, renderMarkdown } from "./public/assets/markdown.mjs";

describe("renderMarkdown", () => {
  it("devuelve cadena vacía si no hay texto", () => {
    assert.equal(renderMarkdown(""), "");
    assert.equal(renderMarkdown(null), "");
    assert.equal(renderMarkdown("   \n"), "");
  });

  it("convierte ### en subtítulo y viñetas en lista", () => {
    const html = renderMarkdown(
      "### Spec\n- issue #17\n- rama feat/17\n\nPárrafo con https://example.com/x y **negrita**."
    );
    assert.match(html, /<h4>Spec<\/h4>/);
    assert.match(html, /<ul><li>issue #17<\/li><li>rama feat\/17<\/li><\/ul>/);
    assert.match(html, /<a href="https:\/\/example.com\/x" target="_blank" rel="noreferrer">https:\/\/example.com\/x<\/a>/);
    assert.match(html, /<strong>negrita<\/strong>/);
  });

  it("escapa HTML crudo", () => {
    const html = renderMarkdown("- <script>alert(1)</script>");
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
  });

  it("deja un valor de una línea como párrafo", () => {
    assert.equal(renderMarkdown("correr yarn test"), "<p>correr yarn test</p>");
  });
});

describe("listItems", () => {
  it("extrae viñetas en orden y ignora el resto", () => {
    assert.deepEqual(
      listItems("- Grill cerrado\n- spec #17\n\nnota suelta\n- PR verde"),
      ["Grill cerrado", "spec #17", "PR verde"]
    );
  });

  it("devuelve vacío si no hay viñetas", () => {
    assert.deepEqual(listItems("solo un párrafo"), []);
    assert.deepEqual(listItems(""), []);
    assert.deepEqual(listItems(null), []);
  });
});
