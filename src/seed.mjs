import { randomBytes } from "node:crypto";
import { now } from "./core.mjs";
export function seed(store) {
  if (store.users().length) return;
  const admin = store.user({
    name: "Marina · demonstração",
    email: "compras@example.test",
    password: randomBytes(30).toString("hex"),
    role: "admin",
  });
  const request = store.create("request", {
    title: "Materiais para a operação · exemplo fictício",
    ownerId: admin.id,
    status: "open",
    items: [
      { id: "papel", name: "Copo de papel 200 ml", quantity: 1000, unit: "un" },
      { id: "cafe", name: "Café torrado", quantity: 10, unit: "kg" },
    ],
  });
  for (const [supplier, freight, price, coffee] of [
    ["Fornecedor Aurora · fictício", 3500, 1890, 2600],
    ["Fornecedor Horizonte · fictício", 0, 2050, 2850],
  ])
    store.create("proposal", {
      requestId: request.id,
      ownerId: admin.id,
      supplier,
      fileId: null,
      items: [
        {
          description: "Pacote com 100 copos de papel 200 ml",
          packUnits: 100,
          unit: "un",
          packPriceCents: price,
          requestItemId: "papel",
          confirmed: true,
          evidence: "Exemplo digitado e conferido.",
        },
        {
          description: "Café torrado 1 kg",
          packUnits: 1,
          unit: "kg",
          packPriceCents: coffee,
          requestItemId: "cafe",
          confirmed: true,
          evidence: "Exemplo digitado e conferido.",
        },
      ],
      freightCents: freight,
      deadlineDays: 3,
      validUntil: "2026-12-31",
      status: "confirmed",
      reviewedBy: admin.id,
      reviewedAt: now(),
    });
  store.log(admin, "demo.seeded", request.id);
}
