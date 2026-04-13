import Dexie, { type EntityTable } from "dexie";

export interface Card {
  id?: number;
  name: string;
  unitPrice: number;
  quantity: number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceHistory {
  id?: number;
  cardId: number;
  price: number;
  date: Date;
}

export interface Trade {
  id?: number;
  cardId: number;
  type: "buy" | "sell";
  price: number;
  quantity: number;
  date: Date;
  note: string;
}

class PokekaDB extends Dexie {
  cards!: EntityTable<Card, "id">;
  priceHistory!: EntityTable<PriceHistory, "id">;
  trades!: EntityTable<Trade, "id">;

  constructor() {
    super("PokekaDB");
    this.version(1).stores({
      cards: "++id, name, unitPrice, category, createdAt",
      priceHistory: "++id, cardId, date",
      trades: "++id, cardId, type, date",
    });
  }
}

export const db = new PokekaDB();
