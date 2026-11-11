import { extractedObject } from "./contracts.mjs";
export const instructions =
  "Extraia a proposta de um único fornecedor. packUnits é a quantidade de unidades base (un, kg, l) em uma embalagem; packPriceCents é o preço dessa embalagem. Não confunda preço unitário e total. Quando não for explícito, use null. Validade YYYY-MM-DD somente se informada.";
import {
  fail,
  text,
  positive,
  integer,
  date,
  id,
  now,
  csv,
  money,
} from "./core.mjs";
import { nullable } from "./ai.mjs";
const units = ["un", "kg", "l"];
const rights = (u) => {
  if (!["admin", "buyer"].includes(u.role)) fail("Acesso restrito.", 403);
};
export const businessDay = (instant = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
export function validateProposal(data, request) {
  const supplier = text(data.supplier, 2, 120);
  if (
    !Array.isArray(data.items) ||
    !data.items.length ||
    data.items.length > 50
  )
    fail("Informe de 1 a 50 itens.", 400);
  const seen = new Set();
  const items = data.items.map((i) => {
    if (!units.includes(i.unit)) fail("Unidade inválida.", 400);
    const requestItemId = i.requestItemId || null;
    if (requestItemId && !request.items.some((r) => r.id === requestItemId))
      fail("Item solicitado inválido.", 400);
    if (requestItemId && seen.has(requestItemId))
      fail("Há dois itens vinculados à mesma necessidade.", 400);
    if (requestItemId) seen.add(requestItemId);
    return {
      description: text(i.description, 1, 250),
      unit: i.unit,
      packUnits: positive(i.packUnits),
      packPriceCents: integer(i.packPriceCents),
      requestItemId,
      confirmed: i.confirmed === true,
      evidence: i.evidence ? text(i.evidence, 1, 500) : "",
    };
  });
  return {
    supplier,
    items,
    freightCents: data.freightCents == null ? null : integer(data.freightCents),
    deadlineDays:
      data.deadlineDays == null ? null : integer(data.deadlineDays, 0, 365),
    validUntil: data.validUntil ? date(data.validUntil) : null,
  };
}
export function compare(request, proposals, today = businessDay()) {
  return proposals
    .map((p) => {
      const warnings = [],
        lines = [];
      let subtotal = 0;
      for (const wanted of request.items) {
        const matches = p.items.filter(
          (i) => i.requestItemId === wanted.id && i.confirmed,
        );
        const item = matches[0];
        if (matches.length !== 1 || !item) {
          warnings.push("Conferir correspondência: " + wanted.name);
          continue;
        }
        if (item.unit !== wanted.unit) {
          warnings.push("Unidades incompatíveis: " + wanted.name);
          continue;
        }
        const packs = Math.ceil(
            Math.round(wanted.quantity * 1e6) /
              Math.round(item.packUnits * 1e6),
          ),
          total = packs * item.packPriceCents;
        if (!Number.isSafeInteger(total) || total > 100000000)
          fail("Total excede o limite.", 400);
        subtotal += total;
        lines.push({
          name: wanted.name,
          packs,
          quantity: packs * item.packUnits,
          totalCents: total,
        });
      }
      if (p.freightCents == null) warnings.push("Frete não informado");
      if (!p.validUntil) warnings.push("Validade não informada");
      else if (p.validUntil < today) warnings.push("Proposta vencida");
      if (p.status !== "confirmed")
        warnings.push("Proposta ainda não conferida");
      const eligible = warnings.length === 0,
        total = subtotal + (p.freightCents || 0);
      return {
        id: p.id,
        supplier: p.supplier,
        eligible,
        warnings,
        lines,
        subtotalCents: subtotal,
        totalCents: eligible ? integer(total) : null,
        deadlineDays: p.deadlineDays,
      };
    })
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        (a.totalCents ?? Infinity) - (b.totalCents ?? Infinity),
    );
}
const properties = {
  supplier: { type: ["string", "null"] },
  freightCents: { type: ["integer", "null"] },
  deadlineDays: { type: ["integer", "null"] },
  validUntil: {
    type: ["string", "null"],
    pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
  },
  items: {
    type: "array",
    items: {
      type: "object",
      properties: {
        description: { type: "string" },
        unit: { type: "string", enum: ["un", "kg", "l"] },
        packUnits: { type: ["number", "null"] },
        packPriceCents: { type: ["integer", "null"] },
        evidence: { type: "string" },
      },
      required: [
        "description",
        "unit",
        "packUnits",
        "packPriceCents",
        "evidence",
      ],
      additionalProperties: false,
    },
  },
};
export const schema = {
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
};
export const domain = {
  product: "cotaflux",
  canReadFile: (s, u, f) => ["admin", "buyer"].includes(u.role),
  async process(s, job, runner) {
    const p = s.get("proposal", job.record_id),
      version = p.version;
    const f = s.db.prepare("SELECT * FROM files WHERE id=?").get(p.fileId);
    const result = await runner(f, schema, instructions);
    const d = result.data;
    extractedObject(d, {
      supplier: "string",
      freightCents: "integer",
      deadlineDays: "integer",
      validUntil: "string",
    });
    if (d.validUntil !== null) date(d.validUntil);
    if (!d || !Array.isArray(d.items) || d.items.length > 50)
      throw Error("Extração fora do contrato.");
    for (const i of d.items) {
      extractedObject(i, {
        description: "string",
        packPriceCents: "integer",
        evidence: "string",
      });
      if (!units.includes(i.unit))
        throw Error("Extração contém unidade inválida.");
      if (i.packUnits !== null) positive(i.packUnits);
    }
    const current = s.get("proposal", p.id);
    if (
      current.version !== version ||
      s.get("request", p.requestId).status === "closed"
    )
      throw Error(
        "Documento mudou durante a leitura. Nenhuma edição foi substituída.",
      );
    // Extração mantém campos desconhecidos; nunca confirma correspondência automaticamente.
    current.extraction = d;
    current.ai = {
      provider: result.provider,
      model: result.model,
      elapsedMs: result.elapsedMs,
    };
    current.status = "review";
    current.version++;
    s.save("proposal", current);
    s.log({ id: p.ownerId }, "proposal.extracted", p.id, {
      provider: result.provider,
    });
  },
  async route({ store: s, user: u, path, method, body }) {
    rights(u);
    if (method === "GET" && path === "/api/state")
      return {
        requests: s.list("request"),
        proposals: s.list("proposal"),
        jobs: s.db
          .prepare("SELECT * FROM jobs ORDER BY created DESC LIMIT 50")
          .all(),
      };
    if (method === "POST" && path === "/api/requests") {
      if (
        !Array.isArray(body.items) ||
        body.items.length < 1 ||
        body.items.length > 30
      )
        fail("Informe de 1 a 30 itens.", 400);
      const items = body.items.map((i) => {
        if (!units.includes(i.unit)) fail("Unidade inválida.", 400);
        return {
          id: id(),
          name: text(i.name, 2, 150),
          quantity: positive(i.quantity),
          unit: i.unit,
        };
      });
      const r = s.create("request", {
        title: text(body.title, 3, 150),
        items,
        status: "open",
        ownerId: u.id,
      });
      s.log(u, "request.created", r.id);
      return r;
    }
    const proposals = path.match(/^\/api\/requests\/([a-f0-9]+)\/proposals$/);
    if (method === "POST" && proposals) {
      const request = s.get("request", proposals[1]);
      if (request.status === "closed") fail("Cotação encerrada.", 409);
      return s.transaction(() => {
        const fileId = body.file ? s.file(body.file, u) : null;
        const key = id();
        s.db
          .prepare(
            "INSERT INTO sequences(kind,value) VALUES(?,1) ON CONFLICT(kind) DO UPDATE SET value=value+1",
          )
          .run("proposal");
        const p = s.save("proposal", {
          id: key,
          number: s.db
            .prepare("SELECT value FROM sequences WHERE kind='proposal'")
            .get().value,
          requestId: request.id,
          ownerId: u.id,
          supplier: text(body.supplier || "Fornecedor a conferir", 2, 120),
          fileId,
          items: [],
          freightCents: null,
          deadlineDays: null,
          validUntil: null,
          status: "draft",
          version: 1,
          createdAt: now(),
        });
        s.log(u, "proposal.created", p.id);
        return p;
      });
    }
    const pm = path.match(/^\/api\/proposals\/([a-f0-9]+)\/(read|review)$/);
    if (method === "POST" && pm) {
      const p = s.get("proposal", pm[1]);
      if (s.get("request", p.requestId).status === "closed")
        fail("Cotação encerrada.", 409);
      if (pm[2] === "read") {
        if (body.consent !== true)
          fail("Autorize o envio do documento ao Gemini.", 400);
        if (!p.fileId) fail("Anexe um documento para leitura.", 400);
        if (
          s.db
            .prepare(
              "SELECT id FROM jobs WHERE record_id=? AND state IN ('pending','running')",
            )
            .get(p.id)
        )
          fail("Já existe leitura em andamento.", 409);
        s.db
          .prepare(
            "INSERT INTO jobs(id,record_id,state,created) VALUES(?,?,'pending',?)",
          )
          .run(id(), p.id, now());
        s.log(u, "proposal.read.requested", p.id);
        return { queued: true };
      }
      if (body.version !== p.version)
        fail("A proposta mudou. Atualize antes de salvar.", 409);
      const data = validateProposal(body, s.get("request", p.requestId));
      const result = s.save("proposal", {
        ...p,
        ...data,
        version: p.version + 1,
        status: "confirmed",
        reviewedBy: u.id,
        reviewedAt: now(),
      });
      s.log(u, "proposal.reviewed", p.id, { version: result.version });
      return result;
    }
    const cm = path.match(
      /^\/api\/requests\/([a-f0-9]+)\/(comparison|export|close)$/,
    );
    if (cm) {
      const request = s.get("request", cm[1]),
        comparison =
          request.status === "closed" && request.decision?.comparisonSnapshot
            ? request.decision.comparisonSnapshot
            : compare(
                request,
                s.list("proposal").filter((p) => p.requestId === request.id),
              );
      if (method === "GET" && cm[2] === "comparison") return comparison;
      if (method === "GET" && cm[2] === "export")
        return {
          name: "cotacao-" + request.number + ".csv",
          csv: csv([
            ["Fornecedor", "Situação", "Total BRL", "Prazo dias", "Pendências"],
            ...comparison.map((p) => [
              p.supplier,
              p.eligible ? "Conferida" : "Pendente",
              p.totalCents == null ? "" : money(p.totalCents),
              p.deadlineDays ?? "",
              p.warnings.join(" / "),
            ]),
          ]),
        };
      if (method === "POST" && cm[2] === "close") {
        if (request.status === "closed") fail("Cotação já encerrada.", 409);
        const choice = comparison.find(
          (p) => p.id === body.proposalId && p.eligible,
        );
        if (!choice) fail("Escolha uma proposta conferida e comparável.", 400);
        request.status = "closed";
        request.decision = {
          proposalId: choice.id,
          note: text(body.note, 5, 1000),
          by: u.id,
          at: now(),
          supplier: choice.supplier,
          totalCents: choice.totalCents,
          comparisonSnapshot: comparison,
        };
        s.save("request", request);
        s.log(u, "request.closed", request.id, request.decision);
        return request;
      }
    }
  },
};
