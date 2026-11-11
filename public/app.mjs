import {
  $,
  el,
  append,
  btn,
  api,
  toast,
  money,
  day,
  badge,
  panel,
  field,
  select,
  check,
  formSubmit,
  fileField,
  attachment,
  sourceLink,
  link,
  table,
  metrics,
  empty,
  shell,
  hero,
  footer,
  login,
  account,
} from "./ui.mjs";
let session,
  state,
  view = "overview",
  active = null,
  editing = null;
const opts = [
  ["un", "Unidades"],
  ["kg", "Quilogramas"],
  ["l", "Litros"],
];
async function load() {
  session = await api("/api/session");
  if (!session.user) return login(session, "cotaflux", load);
  state = await api("/api/state");
  render();
}
async function refresh() {
  state = await api("/api/state");
  render();
}
function go(v) {
  toast("");
  view = v;
  editing = null;
  render();
}
function render() {
  const main = shell(
    session,
    "cotaflux",
    [
      ["overview", "◫  Visão geral"],
      ["requests", "≋  Cotações"],
      ...(session.user.role === "admin"
        ? [
            ["people", "♙  Equipe"],
            ["audit", "◷  Histórico"],
          ]
        : []),
    ],
    view,
    go,
  );
  if (view === "account") account(main, session);
  else if (view === "new") requestForm(main);
  else if (view === "people") people(main).catch((e) => toast(e.message));
  else if (view === "audit") audit(main).catch((e) => toast(e.message));
  else if (view === "requests") requests(main);
  else overview(main);
  footer(main, "cotaflux");
}
function overview(main) {
  hero(
    main,
    "OPERAÇÃO DE COMPRAS",
    "Comprar bem começa por comparar.",
    "Propostas, critérios e conferências em um único lugar.",
    [btn("+ Nova cotação", () => go("new"))],
  );
  const open = state.requests.filter((r) => r.status === "open");
  main.append(
    metrics([
      ["Cotações em andamento", open.length, "Necessidades ainda abertas"],
      [
        "Propostas recebidas",
        state.proposals.length,
        "Documentos e registros manuais",
      ],
      [
        "A conferir",
        state.proposals.filter((p) => p.status !== "confirmed").length,
        "Dados que pedem revisão",
      ],
      [
        "Decisões registradas",
        state.requests.filter((r) => r.status === "closed").length,
        "Escolhas com justificativa",
      ],
    ]),
  );
  const p = panel("Cotações recentes");
  if (!state.requests.length)
    p.append(
      empty(
        "Sua primeira comparação começa aqui",
        "Cadastre os itens e adicione propostas dos fornecedores.",
      ),
    );
  for (const r of state.requests.slice(0, 6)) p.append(requestRow(r));
  main.append(p);
  const note = panel("Do documento à decisão");
  note.append(
    table(
      ["Etapa", "O que acontece"],
      [
        [
          "Leitura",
          "A IA propõe os dados extraídos; o documento original continua disponível.",
        ],
        [
          "Conferência",
          "Você valida preço por embalagem, unidade, frete, validade e correspondência.",
        ],
        [
          "Comparação",
          "O código calcula a quantidade de embalagens e o custo completo.",
        ],
        [
          "Escolha",
          "A decisão fica registrada, com justificativa. Nenhuma compra é executada.",
        ],
      ],
    ),
  );
  main.append(note);
}
function requestRow(r) {
  const p = state.proposals.filter((p) => p.requestId === r.id),
    b = btn(
      "",
      () => {
        active = r.id;
        editing = null;
        view = "requests";
        render();
      },
      "record-row" + (active === r.id ? " selected" : ""),
    );
  b.append(
    append(
      el("div", null, "rowtop"),
      el("span", "#" + r.number),
      badge(r.status),
    ),
    el("strong", r.title),
    el("small", r.items.length + " itens · " + p.length + " propostas"),
  );
  return b;
}
function requests(main) {
  hero(
    main,
    "COTAÇÕES",
    "Critérios claros, propostas comparáveis.",
    "Selecione uma compra para conferir os documentos e comparar.",
    [btn("+ Nova cotação", () => go("new"))],
  );
  const grid = el("div", null, "grid"),
    list = panel("Sua fila de compras");
  const search = el("input");
  search.type = "search";
  search.placeholder = "Buscar cotação";
  search.setAttribute("aria-label", "Buscar cotação");
  list.append(search);
  const records = el("div");
  function rows() {
    records.replaceChildren();
    for (const r of state.requests.filter((r) =>
      (r.title + " #" + r.number)
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    ))
      records.append(requestRow(r));
  }
  search.oninput = rows;
  rows();
  list.append(records);
  const detail = el("div");
  grid.append(list, detail);
  main.append(grid);
  const r = state.requests.find((r) => r.id === active);
  if (!r) {
    detail.append(
      append(
        panel("Sua próxima decisão"),
        empty(
          "Escolha uma cotação",
          "Você verá as propostas e as pendências antes da comparação.",
        ),
      ),
    );
    return;
  }
  if (editing) {
    proposalReview(
      detail,
      r,
      state.proposals.find((p) => p.id === editing),
    );
    return;
  }
  requestDetail(detail, r);
}
function requestForm(main) {
  hero(
    main,
    "NOVA COTAÇÃO",
    "Defina o que precisa comprar.",
    "Informe quantidades em unidades base. As embalagens serão conferidas em cada proposta.",
  );
  const p = panel("Necessidade de compra"),
    f = el("form");
  field(f, "Nome da cotação", "title", "text");
  const rows = el("div"),
    items = [];
  function add() {
    if (items.length >= 30) {
      toast("Limite de 30 itens por cotação.");
      return;
    }
    const box = el("div", null, "fieldrow"),
      name = field(box, "Item", "name", "text"),
      quantity = field(box, "Quantidade", "quantity", "number", 1),
      unit = select(box, "Unidade", "unit", opts, "un");
    quantity.min = "0.001";
    rows.append(box);
    const control = { name, quantity, unit };
    items.push(control);
    box.append(
      btn(
        "Remover item",
        () => {
          if (items.length === 1) {
            toast("A cotação precisa de pelo menos um item.");
            return;
          }
          items.splice(items.indexOf(control), 1);
          box.remove();
        },
        "subtle",
      ),
    );
  }
  add();
  f.append(rows, btn("+ Adicionar item", add, "subtle"));
  formSubmit(f, "Criar cotação", async (data) => {
    const r = await api("/api/requests", {
      title: data.get("title"),
      items: items.map((i) => ({
        name: i.name.value,
        quantity: Number(i.quantity.value),
        unit: i.unit.value,
      })),
    });
    active = r.id;
    view = "requests";
    await refresh();
    toast("Cotação criada. Adicione as propostas recebidas.");
  });
  p.append(f);
  main.append(p);
}
function requestDetail(out, r) {
  const p = panel("#" + r.number + " · " + r.title);
  p.append(
    badge(r.status),
    table(
      ["Item solicitado", "Quantidade", "Unidade"],
      r.items.map((i) => [i.name, i.quantity, i.unit]),
    ),
  );
  if (r.decision) p.append(el("p", "Decisão: " + r.decision.note, "note"));
  out.append(p);
  const proposals = state.proposals.filter((p) => p.requestId === r.id),
    section = panel("Propostas de fornecedores");
  if (!proposals.length)
    section.append(
      el(
        "p",
        "Nenhuma proposta recebida. Anexe um documento ou registre os valores manualmente.",
      ),
    );
  for (const p of proposals) {
    const b = btn(
      "",
      () => {
        editing = p.id;
        render();
      },
      "record-row",
    );
    b.append(
      append(
        el("div", null, "rowtop"),
        el("span", "Proposta #" + p.number),
        badge(p.status),
      ),
      el("strong", p.supplier),
      el(
        "small",
        p.items.length +
          " itens conferidos · " +
          (p.fileId ? "com documento" : "registro manual"),
      ),
    );
    section.append(b);
  }
  if (r.status === "open") {
    const details = el("details");
    details.append(el("summary", "+ Adicionar proposta"));
    const f = el("form");
    field(f, "Fornecedor", "supplier", "text");
    const upload = fileField(f);
    upload.required = false;
    const pasted = field(
      f,
      "Ou cole a proposta recebida",
      "pasted",
      "textarea",
      "",
      false,
    );
    pasted.placeholder = "Cole o texto do fornecedor, com itens e condições.";
    formSubmit(f, "Adicionar proposta", async (data) => {
      let file = await attachment(upload);
      if (!file && pasted.value.trim())
        file = {
          name: "proposta-recebida.txt",
          mime: "text/plain",
          data: btoa(
            String.fromCharCode(...new TextEncoder().encode(pasted.value)),
          ),
        };
      const p = await api("/api/requests/" + r.id + "/proposals", {
        supplier: data.get("supplier"),
        file,
      });
      editing = p.id;
      await refresh();
    });
    details.append(f);
    section.append(details);
  }
  out.append(section);
  const comp = panel("Comparação do custo completo");
  comp.append(
    el(
      "p",
      "Só entram no ranking propostas conferidas, com todos os itens vinculados, unidades compatíveis, frete e validade conhecidos.",
      "hint",
    ),
  );
  const box = el("div");
  comp.append(box);
  api("/api/requests/" + r.id + "/comparison")
    .then((rows) => {
      if (!box.isConnected) return;
      box.replaceChildren(
        table(
          ["Fornecedor", "Total da compra", "Prazo", "Conferência"],
          rows.map((p) => [
            p.supplier,
            p.totalCents == null ? "—" : money(p.totalCents),
            p.deadlineDays == null ? "Não informado" : p.deadlineDays + " dias",
            p.eligible ? "Comparável" : p.warnings.join(" · "),
          ]),
        ),
      );
      const eligible = rows.filter((p) => p.eligible);
      if (eligible.length && r.status === "open") {
        const f = el("form");
        select(
          f,
          "Proposta escolhida",
          "proposalId",
          eligible.map((p) => [p.id, p.supplier + " · " + money(p.totalCents)]),
        );
        field(f, "Justifique a escolha", "note", "textarea");
        formSubmit(f, "Registrar escolha e encerrar", async (data) => {
          await api(
            "/api/requests/" + r.id + "/close",
            Object.fromEntries(data),
          );
          await refresh();
          toast("Decisão registrada. Nenhuma compra foi executada.");
        });
        box.append(f);
      }
    })
    .catch((e) => toast(e.message));
  comp.append(
    link("Exportar comparação CSV", "/api/requests/" + r.id + "/export"),
  );
  out.append(comp);
}
async function readProposal(p) {
  toast("Lendo o documento. Você continuará responsável pela conferência.");
  await api("/api/proposals/" + p.id + "/read", { consent: true });
  for (let i = 0; i < 65; i++) {
    await new Promise((r) => setTimeout(r, 750));
    const fresh = await api("/api/state"),
      job = fresh.jobs.find((j) => j.record_id === p.id);
    if (job && !["pending", "running"].includes(job.state)) {
      state = fresh;
      render();
      toast(
        job.state === "failed"
          ? job.error
          : "Leitura concluída. Confira os campos e vincule cada item.",
      );
      return;
    }
  }
  await refresh();
  toast("A leitura continua no servidor. Atualize a lista para acompanhar.");
}
function proposalReview(out, request, p) {
  out.append(
    btn(
      "← Voltar à comparação",
      () => {
        editing = null;
        render();
      },
      "secondary back",
    ),
  );
  const card = panel("Proposta #" + p.number + " · " + p.supplier);
  card.append(badge(p.status), sourceLink(p.fileId));
  const job = state.jobs.find((j) => j.record_id === p.id);
  if (job) {
    card.append(
      el(
        "p",
        job.state === "failed"
          ? job.error
          : "Leitura: " + (job.state === "done" ? "concluída" : job.state),
        "note" + (job.state === "failed" ? " error" : ""),
      ),
    );
  }
  if (request.status === "open" && p.fileId) {
    const consentForm = el("div"),
      consent = check(
        consentForm,
        "Permito enviar este documento ao Gemini para extrair os dados.",
        "consent",
      );
    consentForm.append(
      btn(
        "Ler documento com IA",
        async () => {
          if (!consent.checked)
            throw Error("Marque a autorização antes de enviar.");
          await readProposal(p);
        },
        "secondary",
      ),
    );
    card.append(consentForm);
  }
  if (p.extraction)
    card.append(
      el(
        "p",
        "A leitura é uma sugestão. Correspondências e valores precisam ser conferidos no documento original.",
        "note",
      ),
    );
  out.append(card);
  if (request.status === "closed") {
    card.append(
      el(
        "p",
        "Esta cotação está encerrada. Os registros permanecem disponíveis para consulta.",
      ),
    );
    return;
  }
  const d = p.items.length ? p : p.extraction || p,
    f = el("form"),
    general = el("div", null, "form-grid");
  field(general, "Fornecedor", "supplier", "text", d.supplier || p.supplier);
  field(
    general,
    "Frete total (R$)",
    "freight",
    "number",
    d.freightCents == null ? "" : d.freightCents / 100,
    true,
  ).step = "0.01";
  field(
    general,
    "Prazo em dias",
    "deadline",
    "number",
    d.deadlineDays ?? "",
    false,
  ).step = "1";
  field(
    general,
    "Validade da proposta",
    "validUntil",
    "date",
    d.validUntil || "",
  );
  f.append(general);
  const itemArea = el("div"),
    controls = [];
  function itemRow(value = {}) {
    const box = el("section", null, "item-review");
    box.append(el("h3", "Item " + (controls.length + 1)));
    const desc = field(
      box,
      "Descrição no documento",
      "description",
      "text",
      value.description || "",
    );
    const grid = el("div", null, "form-grid");
    const pack = field(
        grid,
        "Quantidade por embalagem",
        "packUnits",
        "number",
        value.packUnits ?? "",
      ),
      price = field(
        grid,
        "Preço da embalagem (R$)",
        "price",
        "number",
        value.packPriceCents == null ? "" : value.packPriceCents / 100,
      );
    price.step = "0.01";
    const unit = select(grid, "Unidade base", "unit", opts, value.unit || "un"),
      match = select(
        grid,
        "Corresponde ao item solicitado",
        "match",
        [
          ["", "Selecione após conferir"],
          ...request.items.map((i) => [i.id, i.name]),
        ],
        value.requestItemId || "",
      );
    box.append(grid);
    const confirmed = check(
      box,
      "Conferi a equivalência, a embalagem, a unidade e o preço.",
      "confirmed",
      value.confirmed === true,
    );
    if (value.evidence) box.append(el("div", value.evidence, "source"));
    itemArea.append(box);
    const control = {
      desc,
      pack,
      price,
      unit,
      match,
      confirmed,
      evidence: value.evidence || "",
    };
    controls.push(control);
    box.append(
      btn(
        "Remover linha",
        () => {
          if (controls.length === 1) {
            toast("Mantenha pelo menos uma linha na proposta.");
            return;
          }
          controls.splice(controls.indexOf(control), 1);
          box.remove();
        },
        "subtle",
      ),
    );
  }
  for (const i of d.items?.length ? d.items : [{}]) itemRow(i);
  f.append(
    itemArea,
    btn("+ Adicionar linha", () => itemRow(), "subtle"),
  );
  formSubmit(f, "Salvar conferência da proposta", async (data) => {
    const cents = (name) =>
      data.get(name) === "" ? null : Math.round(Number(data.get(name)) * 100);
    await api("/api/proposals/" + p.id + "/review", {
      version: p.version,
      supplier: data.get("supplier"),
      freightCents: cents("freight"),
      deadlineDays:
        data.get("deadline") === "" ? null : Number(data.get("deadline")),
      validUntil: data.get("validUntil"),
      items: controls.map((i) => ({
        description: i.desc.value,
        packUnits: Number(i.pack.value),
        packPriceCents: Math.round(Number(i.price.value) * 100),
        unit: i.unit.value,
        requestItemId: i.match.value || null,
        confirmed: i.confirmed.checked,
        evidence: i.evidence,
      })),
    });
    editing = null;
    await refresh();
    toast("Conferência salva. O comparativo sinaliza o que ainda falta.");
  });
  const review = panel("Conferir dados e correspondências");
  review.append(f);
  out.append(review);
}
async function people(main) {
  hero(
    main,
    "EQUIPE",
    "Pessoas da sua operação.",
    "Uma instalação atende uma empresa. Compradores acessam as cotações; administradores gerenciam a equipe.",
  );
  const p = panel("Acessos cadastrados");
  main.append(p);
  const users = await api("/api/users");
  p.append(
    table(
      ["Nome", "E-mail", "Perfil"],
      users.map((u) => [
        u.name,
        u.email,
        u.role === "admin" ? "Administrador" : "Comprador",
      ]),
    ),
  );
  if (!session.demo) {
    const f = el("form");
    field(f, "Nome", "name");
    field(f, "E-mail", "email", "email");
    field(
      f,
      "Senha inicial (mínimo de 12 caracteres)",
      "password",
      "password",
    ).minLength = 12;
    formSubmit(f, "Adicionar comprador", async (data) => {
      await api("/api/users", Object.fromEntries(data));
      render();
      toast("Acesso criado. Entregue a senha por um canal privado.");
    });
    p.append(f);
  } else
    p.append(
      el("p", "Criação de pessoas fica desativada na demonstração.", "hint"),
    );
}
async function audit(main) {
  hero(
    main,
    "HISTÓRICO",
    "Decisões que podem ser acompanhadas.",
    "Últimos 100 eventos da instalação. O registro não é um mecanismo de auditoria inviolável.",
  );
  const p = panel("Eventos recentes");
  main.append(p);
  const rows = await api("/api/audit");
  p.append(
    table(
      ["Quando", "Pessoa", "Ação"],
      rows.map((r) => [
        new Date(r.at).toLocaleString("pt-BR"),
        r.name || "Operação",
        r.action,
      ]),
    ),
  );
}
load().catch((e) => {
  toast(e.message);
  $("app").replaceChildren(
    empty(
      "Não foi possível abrir",
      "Verifique se o servidor está em execução e atualize a página.",
    ),
  );
});
