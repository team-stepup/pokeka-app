"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Card, type PriceHistory, type Trade } from "./db";
import { initialCards } from "./initialData";

export function useCards() {
  return useLiveQuery(() => db.cards.toArray()) ?? [];
}

export function useCard(id: number | undefined) {
  return useLiveQuery(() => (id ? db.cards.get(id) : undefined), [id]);
}

export function usePriceHistory(cardId?: number) {
  return (
    useLiveQuery(
      () =>
        cardId
          ? db.priceHistory.where("cardId").equals(cardId).sortBy("date")
          : db.priceHistory.toArray(),
      [cardId]
    ) ?? []
  );
}

export function useTrades() {
  return useLiveQuery(() => db.trades.orderBy("date").reverse().toArray()) ?? [];
}

export async function addCard(card: Omit<Card, "id" | "createdAt" | "updatedAt">) {
  const now = new Date();
  const id = await db.cards.add({ ...card, createdAt: now, updatedAt: now }) as number;
  await db.priceHistory.add({ cardId: id, price: card.unitPrice, date: now });
  return id;
}

export async function updateCard(id: number, updates: Partial<Card>) {
  const existing = await db.cards.get(id);
  if (!existing) return;
  const now = new Date();
  await db.cards.update(id, { ...updates, updatedAt: now });
  if (updates.unitPrice !== undefined && updates.unitPrice !== existing.unitPrice) {
    await db.priceHistory.add({ cardId: id, price: updates.unitPrice, date: now });
  }
}

export async function deleteCard(id: number) {
  await db.cards.delete(id);
  await db.priceHistory.where("cardId").equals(id).delete();
  await db.trades.where("cardId").equals(id).delete();
}

export async function addTrade(trade: Omit<Trade, "id">) {
  const id = await db.trades.add(trade);
  const card = await db.cards.get(trade.cardId);
  if (card) {
    const qtyChange = trade.type === "buy" ? trade.quantity : -trade.quantity;
    await db.cards.update(trade.cardId, {
      quantity: Math.max(0, card.quantity + qtyChange),
      updatedAt: new Date(),
    });
  }
  return id;
}

export async function deleteTrade(id: number) {
  await db.trades.delete(id);
}

export async function seedInitialData() {
  const count = await db.cards.count();
  if (count > 0) return;
  const now = new Date();
  const cards = initialCards.map((c) => ({
    ...c,
    createdAt: now,
    updatedAt: now,
  }));
  const ids = await db.cards.bulkAdd(cards, { allKeys: true });
  const priceEntries: PriceHistory[] = ids.map((cardId, i) => ({
    cardId: cardId as number,
    price: initialCards[i].unitPrice,
    date: now,
  }));
  await db.priceHistory.bulkAdd(priceEntries);
}

export function formatPrice(price: number): string {
  return price.toLocaleString("ja-JP");
}

function toKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function toHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

export function kanaMatch(target: string, query: string): boolean {
  const t = target.toLowerCase();
  const q = query.toLowerCase();
  return (
    t.includes(q) ||
    toKatakana(t).includes(toKatakana(q)) ||
    toHiragana(t).includes(toHiragana(q))
  );
}
