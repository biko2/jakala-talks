import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseBitacora,
  isClosed,
  listBitacoras,
  getBitacora,
  BITACORAS_REL_DIR,
} from "./bitacora.mjs";

const fullTemplate = `# Bitácora: Votación por fases

## Objetivo y alcance
Cerrar la fase de voto automáticamente.

## Estado actual
- Completado: dominio VotingRules
- En curso: adaptador Supabase
- Bloqueos: ninguno
- Siguiente paso exacto: correr yarn test en VoteTalk

## Artefactos y verificación
- src/domain/valueObjects/VotingRules.ts — tests verdes

## Hitos
- Fase closed implementada

## Decisiones
- Fechas en UTC: evitar desfase de Vercel

## Aprendizajes verificados
- RPC get_talk_vote_counts devuelve bigint (ver test integración)

## Errores y correcciones
- Mock de reloj global rompía Jest; usar inyección de Clock

## Preguntas abiertas
- ¿Cupo por fase o global?
`;

describe("parseBitacora", () => {
  it("lee título y todas las secciones de la plantilla de la skill", () => {
    const b = parseBitacora(fullTemplate);
    assert.equal(b.title, "Votación por fases");
    assert.equal(b.sections.objetivo, "Cerrar la fase de voto automáticamente.");
    assert.deepEqual(b.sections.estadoActual, {
      completado: "dominio VotingRules",
      enCurso: "adaptador Supabase",
      bloqueos: "ninguno",
      siguientePaso: "correr yarn test en VoteTalk",
    });
    assert.equal(
      b.sections.artefactos,
      "- src/domain/valueObjects/VotingRules.ts — tests verdes"
    );
    assert.equal(b.sections.hitos, "- Fase closed implementada");
    assert.equal(b.sections.decisiones, "- Fechas en UTC: evitar desfase de Vercel");
    assert.equal(
      b.sections.aprendizajes,
      "- RPC get_talk_vote_counts devuelve bigint (ver test integración)"
    );
    assert.equal(
      b.sections.errores,
      "- Mock de reloj global rompía Jest; usar inyección de Clock"
    );
    assert.equal(b.sections.preguntas, "- ¿Cupo por fase o global?");
  });

  it("deja en null las secciones ausentes o vacías", () => {
    const b = parseBitacora("# Bitácora: X\n\n## Decisiones\n\n## Hitos\n- uno\n");
    assert.equal(b.sections.decisiones, null);
    assert.equal(b.sections.hitos, "- uno");
    assert.equal(b.sections.objetivo, null);
    assert.equal(b.sections.estadoActual, null);
    assert.equal(b.sections.preguntas, null);
  });

  it("deja en null los campos vacíos de Estado actual", () => {
    const b = parseBitacora(
      "## Estado actual\n- Completado:\n- En curso: algo\n- Bloqueos:\n- Siguiente paso exacto:\n"
    );
    assert.deepEqual(b.sections.estadoActual, {
      completado: null,
      enCurso: "algo",
      bloqueos: null,
      siguientePaso: null,
    });
  });

  it("une las sub-viñetas al campo de Estado actual al que pertenecen", () => {
    const b = parseBitacora(
      "## Estado actual\n- Completado:\n  - ticket 1\n  - ticket 2\n- Siguiente paso exacto: PR\n"
    );
    assert.equal(b.sections.estadoActual.completado, "- ticket 1\n- ticket 2");
    assert.equal(b.sections.estadoActual.siguientePaso, "PR");
  });

  it("reconoce títulos con contenido extra, sin tildes o en otra caja", () => {
    const b = parseBitacora(
      "## DECISIONES (sprint 2)\n- a\n\n## Aprendizajes verificados y pendientes\n- b\n\n## Errores y correcciones\n- c\n"
    );
    assert.equal(b.sections.decisiones, "- a");
    assert.equal(b.sections.aprendizajes, "- b");
    assert.equal(b.sections.errores, "- c");
  });

  it("ignora encabezados dentro de bloques de código", () => {
    const b = parseBitacora("## Hitos\n```md\n## Decisiones\n```\n");
    assert.equal(b.sections.decisiones, null);
    assert.equal(b.sections.hitos, "```md\n## Decisiones\n```");
  });

  it("usa el encabezado tal cual si no lleva prefijo Bitácora, y null si no hay", () => {
    assert.equal(parseBitacora("# Migrar auth\n").title, "Migrar auth");
    assert.equal(parseBitacora("## Hitos\n- x\n").title, null);
    assert.equal(parseBitacora("").title, null);
  });
});

function withRepo(fn) {
  const root = mkdtempSync(join(tmpdir(), "bitacora-repo-"));
  const dir = join(root, BITACORAS_REL_DIR);
  mkdirSync(dir, { recursive: true });
  try {
    fn({ root, dir });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("listBitacoras / getBitacora", () => {
  it("devuelve lista vacía si la carpeta no existe", () => {
    assert.deepEqual(listBitacoras(join(tmpdir(), "no-existe-bitacoras-xyz")), []);
  });

  it("lista solo .md con título y siguiente paso", () => {
    withRepo(({ dir }) => {
      writeFileSync(join(dir, "votacion.md"), fullTemplate);
      writeFileSync(join(dir, "nota.txt"), "no");
      const list = listBitacoras(dir);
      assert.equal(list.length, 1);
      assert.equal(list[0].slug, "votacion");
      assert.equal(list[0].title, "Votación por fases");
      assert.equal(list[0].siguientePaso, "correr yarn test en VoteTalk");
      assert.equal(list[0].bloqueos, "ninguno");
      assert.equal(typeof list[0].updatedAt, "string");
    });
  });

  it("lee una bitácora por slug", () => {
    withRepo(({ dir }) => {
      writeFileSync(join(dir, "votacion.md"), fullTemplate);
      const result = getBitacora(dir, "votacion");
      assert.equal(result.ok, true);
      assert.equal(result.path, `${BITACORAS_REL_DIR}/votacion.md`);
      assert.equal(result.data.title, "Votación por fases");
    });
  });

  it("responde 404 si el slug no existe", () => {
    withRepo(({ dir }) => {
      const result = getBitacora(dir, "nada");
      assert.equal(result.ok, false);
      assert.equal(result.status, 404);
    });
  });

  it("rechaza slugs con traversal o separadores", () => {
    withRepo(({ dir }) => {
      for (const slug of ["../secreto", "a/b", "..", "a\\b", ""]) {
        const result = getBitacora(dir, slug);
        assert.equal(result.ok, false, `slug ${slug} debería rechazarse`);
        assert.equal(result.status, 400);
      }
    });
  });
});

describe("isClosed", () => {
  it("cierra solo si el siguiente paso exacto es ninguno", () => {
    const withNext = (next) =>
      parseBitacora(`## Estado actual\n- Siguiente paso exacto: ${next}\n`);
    assert.equal(isClosed(withNext("ninguno")), true);
    assert.equal(isClosed(withNext("Ninguno (entregada)")), true);
    assert.equal(isClosed(withNext("abrir PR")), false);
    assert.equal(isClosed(parseBitacora("## Estado actual\n- Siguiente paso exacto:\n")), false);
    assert.equal(isClosed(parseBitacora("# Sin estado\n")), false);
  });
});

describe("estado y origen en el listado", () => {
  it("marca cerrada y origen deliver por el prefijo del slug", () => {
    withRepo(({ dir }) => {
      writeFileSync(
        join(dir, "deliver-fases.md"),
        "# Bitácora: Fases\n\n## Estado actual\n- Siguiente paso exacto: ninguno\n"
      );
      writeFileSync(join(dir, "suelta.md"), fullTemplate);
      const bySlug = Object.fromEntries(listBitacoras(dir).map((b) => [b.slug, b]));
      assert.equal(bySlug["deliver-fases"].closed, true);
      assert.equal(bySlug["deliver-fases"].workflow, "deliver");
      assert.equal(bySlug.suelta.closed, false);
      assert.equal(bySlug.suelta.workflow, null);
      const detail = getBitacora(dir, "deliver-fases");
      assert.equal(detail.closed, true);
      assert.equal(detail.workflow, "deliver");
    });
  });
});
