declare module "*.mjs" {
  export type SeedCredential = {
    merchantId: string;
    merchantName: string;
    email: string;
    password: string;
  };

  export type SeedSummary = {
    credentials: SeedCredential[];
    cardinalities: {
      merchants: number;
      users: number;
      regions: number;
      products: number;
      customers: number;
      orders: number;
      orderLines: number;
      productsByMerchant: Record<string, number>;
      customersByMerchant: Record<string, number>;
      ordersByMerchant: Record<string, number>;
    };
  };

  export const DEMO_CREDENTIALS: SeedCredential[];
  export const SEED_MONTHS: string[];

  export function hashPassword(password: string, salt?: string): string;
  export function seedDatabase(database: {
    exec(sql: string): void;
    prepare(sql: string): {
      run(...values: unknown[]): unknown;
      get(...values: unknown[]): Record<string, unknown> | undefined;
    };
  }): SeedSummary;
}
