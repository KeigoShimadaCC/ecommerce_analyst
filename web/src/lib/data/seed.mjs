import { pbkdf2Sync } from "node:crypto";

export const DEMO_CREDENTIALS = [
  {
    merchantId: "merchant-aurora",
    merchantName: "Aurora Outfitters",
    email: "owner@aurora.example",
    password: "demo-aurora-2026"
  },
  {
    merchantId: "merchant-harbor",
    merchantName: "Harbor Home Goods",
    email: "owner@harbor.example",
    password: "demo-harbor-2026"
  }
];

export const SEED_MONTHS = [
  "2025-01",
  "2025-02",
  "2025-03",
  "2025-04",
  "2025-05",
  "2025-06",
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06"
];

const REGIONS = [
  { id: "region-northeast", name: "Northeast" },
  { id: "region-south", name: "South" },
  { id: "region-midwest", name: "Midwest" },
  { id: "region-west", name: "West" }
];

const REGION_ORDER_COUNTS = [18, 21, 24, 27];
const SEASONAL_MULTIPLIERS = new Map([
  [1, 0.9],
  [2, 0.95],
  [3, 1.0],
  [4, 1.05],
  [5, 1.2],
  [6, 1.1],
  [7, 1.0],
  [8, 0.98],
  [9, 1.08],
  [10, 1.15],
  [11, 1.35],
  [12, 1.55]
]);

const BASE_PRODUCTS = [
  ["beans", "Espresso Beans", "Coffee", 1800, 900],
  ["brew-kit", "Cold Brew Kit", "Coffee", 4200, 2100],
  ["dripper", "Ceramic Dripper", "Coffee", 2800, 1200],
  ["towel", "Linen Towel", "Home", 2400, 1000],
  ["basket", "Storage Basket", "Home", 3600, 1500],
  ["candle", "Candle Set", "Home", 3200, 1300],
  ["tee", "Everyday Tee", "Apparel", 2600, 900],
  ["apron", "Canvas Apron", "Apparel", 3400, 1400],
  ["balm", "Hand Balm", "Beauty", 1600, 550],
  ["soap", "Travel Soap Trio", "Beauty", 1900, 700]
];

function monthParts(monthKey) {
  const [year, month] = monthKey.split("-").map((part) => Number(part));
  return { year, month };
}

function centsWithSeasonality(baseCents, month) {
  const multiplier = SEASONAL_MULTIPLIERS.get(month) ?? 1;
  return Math.round(baseCents * multiplier);
}

export function hashPassword(password, salt = "phase-01-demo-salt") {
  const digest = pbkdf2Sync(password, salt, 210000, 32, "sha256").toString(
    "base64"
  );
  return `pbkdf2_sha256$210000$${salt}$${digest}`;
}

function buildMerchants() {
  const timestamp = "2026-06-01T00:00:00.000Z";
  return DEMO_CREDENTIALS.map((credential) => ({
    id: credential.merchantId,
    name: credential.merchantName,
    slug: credential.merchantId.replace("merchant-", ""),
    createdAt: timestamp,
    updatedAt: timestamp
  }));
}

function buildUsers() {
  const timestamp = "2026-06-01T00:00:00.000Z";
  return DEMO_CREDENTIALS.map((credential) => ({
    id: `user-${credential.merchantId.replace("merchant-", "")}-owner`,
    merchantId: credential.merchantId,
    email: credential.email,
    name: `${credential.merchantName} Owner`,
    passwordHash: hashPassword(credential.password),
    role: "owner",
    createdAt: timestamp,
    updatedAt: timestamp
  }));
}

function buildProducts(merchants) {
  const timestamp = "2026-06-01T00:00:00.000Z";
  return merchants.flatMap((merchant) =>
    BASE_PRODUCTS.map(([suffix, name, category, priceCents, unitCostCents]) => ({
      id: `product-${merchant.slug}-${suffix}`,
      merchantId: merchant.id,
      sku: `${merchant.slug.toUpperCase()}-${suffix.toUpperCase()}`,
      name,
      category,
      priceCents,
      unitCostCents,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp
    }))
  );
}

function buildCustomers(merchants) {
  const timestamp = "2025-01-01T00:00:00.000Z";
  return merchants.flatMap((merchant) =>
    Array.from({ length: 60 }, (_, index) => {
      const region = REGIONS[index % REGIONS.length];
      const customerNumber = index + 1;
      return {
        id: `customer-${merchant.slug}-${String(customerNumber).padStart(3, "0")}`,
        merchantId: merchant.id,
        regionId: region.id,
        email: `${merchant.slug}.customer${String(customerNumber).padStart(3, "0")}@example.com`,
        name: `${merchant.name} Customer ${customerNumber}`,
        createdAt: timestamp
      };
    })
  );
}

function buildOrdersAndLines(merchants, products, customers) {
  const orders = [];
  const orderLines = [];

  for (const merchant of merchants) {
    const merchantProducts = products.filter(
      (product) => product.merchantId === merchant.id
    );
    const merchantCustomers = customers.filter(
      (customer) => customer.merchantId === merchant.id
    );
    let sequence = 1;

    for (const monthKey of SEED_MONTHS) {
      const { year, month } = monthParts(monthKey);

      REGIONS.forEach((region, regionIndex) => {
        for (
          let regionalOrderIndex = 0;
          regionalOrderIndex < REGION_ORDER_COUNTS[regionIndex];
          regionalOrderIndex += 1
        ) {
          const orderId = `order-${merchant.slug}-${monthKey}-${region.id.replace(
            "region-",
            ""
          )}-${String(regionalOrderIndex + 1).padStart(2, "0")}`;
          const customerPool = merchantCustomers.filter(
            (customer) => customer.regionId === region.id
          );
          const customer =
            customerPool[
              (regionalOrderIndex + month + regionIndex) % customerPool.length
            ];
          const productA =
            merchantProducts[
              (sequence + regionalOrderIndex + regionIndex) %
                merchantProducts.length
            ];
          const productB =
            merchantProducts[
              (sequence + regionalOrderIndex + regionIndex + 3) %
                merchantProducts.length
            ];
          const day = (regionalOrderIndex % 28) + 1;
          const quantityA = 1 + ((regionalOrderIndex + regionIndex) % 3);
          const hasSecondLine = (regionalOrderIndex + month + regionIndex) % 2 === 0;
          const quantityB = hasSecondLine ? 1 + ((month + regionIndex) % 2) : 0;
          const unitPriceA = centsWithSeasonality(productA.priceCents, month);
          const unitPriceB = centsWithSeasonality(productB.priceCents, month);
          const lineA = {
            id: `${orderId}-line-1`,
            orderId,
            productId: productA.id,
            quantity: quantityA,
            unitPriceCents: unitPriceA,
            unitCostCents: productA.unitCostCents,
            lineRevenueCents: unitPriceA * quantityA,
            lineCostCents: productA.unitCostCents * quantityA
          };
          const lines = [lineA];

          if (hasSecondLine) {
            lines.push({
              id: `${orderId}-line-2`,
              orderId,
              productId: productB.id,
              quantity: quantityB,
              unitPriceCents: unitPriceB,
              unitCostCents: productB.unitCostCents,
              lineRevenueCents: unitPriceB * quantityB,
              lineCostCents: productB.unitCostCents * quantityB
            });
          }

          const totalRevenueCents = lines.reduce(
            (total, line) => total + line.lineRevenueCents,
            0
          );
          const totalCostCents = lines.reduce(
            (total, line) => total + line.lineCostCents,
            0
          );

          orders.push({
            id: orderId,
            merchantId: merchant.id,
            customerId: customer.id,
            regionId: region.id,
            orderNumber: `${merchant.slug.toUpperCase()}-${String(sequence).padStart(
              5,
              "0"
            )}`,
            orderedAt: new Date(
              Date.UTC(year, month - 1, day, 12 + (regionalOrderIndex % 8), 0, 0)
            ).toISOString(),
            status: "paid",
            totalRevenueCents,
            totalCostCents
          });
          orderLines.push(...lines);
          sequence += 1;
        }
      });
    }
  }

  return { orders, orderLines };
}

function resetSeedData(database) {
  database.exec(`
    DELETE FROM "AnalysisRun";
    DELETE FROM "Session";
    DELETE FROM "OrderLine";
    DELETE FROM "Order";
    DELETE FROM "Customer";
    DELETE FROM "Product";
    DELETE FROM "User";
    DELETE FROM "Region";
    DELETE FROM "Merchant";
  `);
}

function insertRows(database, tableName, rows) {
  if (rows.length === 0) {
    return;
  }

  const columns = Object.keys(rows[0]);
  const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const statement = database.prepare(
    `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})`
  );

  for (const row of rows) {
    statement.run(...columns.map((column) => toSqliteValue(row[column])));
  }
}

function toSqliteValue(value) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value;
}

function countRows(database, tableName) {
  const row = database.prepare(`SELECT COUNT(*) AS count FROM "${tableName}"`).get();
  return Number(row.count);
}

function countByMerchant(database, tableName, merchants) {
  const statement = database.prepare(
    `SELECT COUNT(*) AS count FROM "${tableName}" WHERE "merchantId" = ?`
  );
  const entries = merchants.map((merchant) => [
    merchant.id,
    Number(statement.get(merchant.id).count)
  ]);
  return Object.fromEntries(entries);
}

export function seedDatabase(database) {
  const merchants = buildMerchants();
  const users = buildUsers();
  const products = buildProducts(merchants);
  const customers = buildCustomers(merchants);
  const { orders, orderLines } = buildOrdersAndLines(
    merchants,
    products,
    customers
  );

  database.exec("PRAGMA foreign_keys = ON");
  database.exec("BEGIN");
  try {
    resetSeedData(database);
    insertRows(database, "Region", REGIONS);
    insertRows(database, "Merchant", merchants);
    insertRows(database, "User", users);
    insertRows(database, "Product", products);
    insertRows(database, "Customer", customers);
    insertRows(database, "Order", orders);
    insertRows(database, "OrderLine", orderLines);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    console.error("Failed to seed deterministic demo data.", error);
    throw error;
  }

  return {
    credentials: DEMO_CREDENTIALS,
    cardinalities: {
      merchants: countRows(database, "Merchant"),
      users: countRows(database, "User"),
      regions: countRows(database, "Region"),
      products: countRows(database, "Product"),
      customers: countRows(database, "Customer"),
      orders: countRows(database, "Order"),
      orderLines: countRows(database, "OrderLine"),
      productsByMerchant: countByMerchant(database, "Product", merchants),
      customersByMerchant: countByMerchant(database, "Customer", merchants),
      ordersByMerchant: countByMerchant(database, "Order", merchants)
    }
  };
}
