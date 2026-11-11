import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/http.mjs";
import {
  domain,
  compare,
  validateProposal,
  businessDay,
} from "../src/domain.mjs";
const password = "senha-ficticia-123";
async function setup(t, runner) {
  const dir = await mkdtemp(join(tmpdir(), "cotaflux-"));
  const app = createApp(domain, { dir, ...(runner ? { runner } : {}) });
  await new Promise((r) => app.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + app.address().port;
  let cookie = "";
  t.after(async () => {
    await new Promise((r) => app.close(r));
    await rm(dir, { recursive: true, force: true });
  });
  async function request(path, data, headers = {}) {
    const r = await fetch(base + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(data === undefined
          ? {}
          : { "Content-Type": "application/json", "X-Requested-With": "app" }),
        ...headers,
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    if (r.headers.get("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return { status: r.status, data: await r.json() };
  }
  return { app, request, base };
}
const need = {
  id: "request",
  items: [{ id: "i", name: "Produto", quantity: 1000, unit: "un" }],
};
const proposal = {
  id: "p",
  supplier: "Fornecedor",
  status: "confirmed",
  freightCents: 3500,
  validUntil: "2099-12-31",
  deadlineDays: 3,
  items: [
    {
      description: "Caixa",
      requestItemId: "i",
      confirmed: true,
      unit: "un",
      packUnits: 100,
      packPriceCents: 1890,
    },
  ],
};
test("validade usa o dia de Brasília mesmo quando UTC já mudou de data", () => {
  assert.equal(businessDay(new Date("2026-11-11T01:00:00Z")), "2026-11-10");
});
test("leitura que termina após o encerramento não altera a proposta ou a decisão", async (t) => {
  let finish, started;
  const startedPromise = new Promise((r) => (started = r));
  const { request, app } = await setup(t, async () => {
    started();
    return new Promise((r) => (finish = r));
  });
  await request("/api/setup", {
    name: "Comprador Teste",
    email: "a@example.test",
    password,
  });
  const r = (
    await request("/api/requests", {
      title: "Compra controlada",
      items: [{ name: "Produto", quantity: 1000, unit: "un" }],
    })
  ).data;
  const p = (
    await request("/api/requests/" + r.id + "/proposals", {
      supplier: "Fornecedor",
      file: {
        name: "proposta.txt",
        mime: "text/plain",
        data: Buffer.from("Proposta fictícia de teste.").toString("base64"),
      },
    })
  ).data;
  await request("/api/proposals/" + p.id + "/review", {
    ...proposal,
    version: p.version,
    items: [{ ...proposal.items[0], requestItemId: r.items[0].id }],
  });
  await request("/api/proposals/" + p.id + "/read", { consent: true });
  await startedPromise;
  const closed = await request("/api/requests/" + r.id + "/close", {
    proposalId: p.id,
    note: "Comparação conferida pelo operador.",
  });
  assert.equal(closed.data.decision.totalCents, 22400);
  assert.equal(closed.data.decision.comparisonSnapshot.length, 1);
  finish({
    data: {
      supplier: "Fornecedor",
      freightCents: 3500,
      deadlineDays: 3,
      validUntil: "2099-12-31",
      items: [
        {
          description: "Caixa",
          unit: "un",
          packUnits: 100,
          packPriceCents: 1890,
          evidence: "Proposta fictícia",
        },
      ],
    },
    provider: "stub",
    model: "test",
    elapsedMs: 1,
  });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(app.store.get("proposal", p.id).status, "confirmed");
  assert.equal(app.store.get("proposal", p.id).extraction, undefined);
  assert.equal((await request("/api/state")).data.jobs[0].state, "failed");
  // Uma nova versão de regra ou uma data posterior não reescreve o comparativo da decisão.
  const comparison = (await request("/api/requests/" + r.id + "/comparison"))
    .data;
  assert.equal(comparison[0].totalCents, 22400);
});
test("comparação calcula embalagens inteiras e inclui frete uma vez", () => {
  const [r] = compare(need, [proposal], "2026-11-10");
  assert.equal(r.totalCents, 22400);
  assert.equal(r.lines[0].packs, 10);
  assert.equal(r.eligible, true);
});
test("divisão decimal não compra uma embalagem extra por erro de ponto flutuante", () => {
  const n = {
      ...need,
      items: [{ ...need.items[0], quantity: 0.07, unit: "kg" }],
    },
    p = {
      ...proposal,
      items: [{ ...proposal.items[0], packUnits: 0.01, unit: "kg" }],
    };
  assert.equal(compare(n, [p], "2026-11-10")[0].lines[0].packs, 7);
});
test("ranking bloqueia embalagem não confirmada, unidade divergente e proposta vencida", () => {
  for (const p of [
    { ...proposal, validUntil: "2020-01-01" },
    { ...proposal, freightCents: null },
    { ...proposal, items: [{ ...proposal.items[0], confirmed: false }] },
    { ...proposal, items: [{ ...proposal.items[0], unit: "kg" }] },
  ]) {
    const r = compare(need, [p], "2026-11-10")[0];
    assert.equal(r.eligible, false);
    assert.equal(r.totalCents, null);
  }
});
test("vinculação duplicada e preço fracionário em centavos são rejeitados", () => {
  assert.throws(() =>
    validateProposal(
      { ...proposal, items: [proposal.items[0], proposal.items[0]] },
      need,
    ),
  );
  assert.throws(() =>
    validateProposal(
      { ...proposal, items: [{ ...proposal.items[0], packPriceCents: 10.2 }] },
      need,
    ),
  );
});
test("API exige sessão, bloqueia origem externa, arquivos privados e setup repetido", async (t) => {
  const { request } = await setup(t);
  assert.equal((await request("/api/state")).status, 401);
  assert.equal(
    (
      await request("/api/setup", {
        name: "Comprador Teste",
        email: "a@example.test",
        password,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await request("/api/setup", {
        name: "Outro",
        email: "b@example.test",
        password,
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/api/state", undefined, { Origin: "https://externo.test" }))
      .status,
    403,
  );
  assert.equal((await request("/.env")).status, 404);
});
test("fluxo HTTP compara e encerra sem permitir edição posterior", async (t) => {
  const { request } = await setup(t);
  await request("/api/setup", {
    name: "Comprador Teste",
    email: "a@example.test",
    password,
  });
  let r = await request("/api/requests", {
    title: "Compra de teste",
    items: [{ name: "Produto", quantity: 1000, unit: "un" }],
  });
  const req = r.data;
  assert.equal(req.number, 1);
  r = await request("/api/requests/" + req.id + "/proposals", {
    supplier: "Fornecedor",
  });
  const p = r.data;
  assert.equal(
    (
      await request("/api/proposals/" + p.id + "/review", {
        ...proposal,
        version: p.version,
        items: [{ ...proposal.items[0], requestItemId: req.items[0].id }],
      })
    ).status,
    200,
  );
  const comparison = await request("/api/requests/" + req.id + "/comparison");
  assert.equal(comparison.data[0].totalCents, 22400);
  assert.equal(
    (
      await request("/api/proposals/" + p.id + "/review", {
        ...proposal,
        version: 1,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/api/requests/" + req.id + "/close", {
        proposalId: p.id,
        note: "Melhor custo conferido.",
      })
    ).data.status,
    "closed",
  );
  assert.equal(
    (
      await request("/api/requests/" + req.id + "/proposals", {
        supplier: "Fornecedor",
      })
    ).status,
    409,
  );
});
test("comprador não pode criar usuários nem ler auditoria administrativa", async (t) => {
  const { request, app } = await setup(t);
  app.store.user({
    name: "Comprador",
    email: "buyer@example.test",
    password,
    role: "buyer",
  });
  await request("/api/login", { email: "buyer@example.test", password });
  assert.equal(
    (
      await request("/api/users", {
        name: "Outro",
        email: "outro@example.test",
        password,
      })
    ).status,
    403,
  );
  assert.equal((await request("/api/audit")).status, 403);
});
