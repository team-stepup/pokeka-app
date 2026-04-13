"use client";

import { useState } from "react";
import { useCards, usePriceHistory, updateCard, formatPrice, kanaMatch } from "@/lib/hooks";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Search } from "lucide-react";

export default function PricesPage() {
  const cards = useCards();
  const allHistory = usePriceHistory();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkPrices, setBulkPrices] = useState<Record<number, string>>({});

  const selectedHistory = selectedCardId
    ? allHistory
        .filter((h) => h.cardId === selectedCardId)
        .map((h) => ({
          date: new Date(h.date).toLocaleDateString("ja-JP"),
          price: h.price,
        }))
    : [];

  const selectedCard = cards.find((c) => c.id === selectedCardId);

  const cardsWithHistory = cards
    .filter((c) => kanaMatch(c.name, search))
    .map((card) => {
      const history = allHistory.filter((h) => h.cardId === card.id);
      const latest = history[history.length - 1]?.price ?? card.unitPrice;
      const prev = history.length > 1 ? history[history.length - 2]?.price : latest;
      const change = latest - prev;
      const changeRate = prev > 0 ? (change / prev) * 100 : 0;
      return { ...card, latest, change, changeRate };
    })
    .sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));

  const handleBulkUpdate = async () => {
    for (const [idStr, priceStr] of Object.entries(bulkPrices)) {
      const price = Number(priceStr);
      if (price > 0) await updateCard(Number(idStr), { unitPrice: price });
    }
    setBulkPrices({});
    setBulkMode(false);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">価格トラッキング</h2>
        <button
          onClick={() => setBulkMode(!bulkMode)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            bulkMode ? "bg-accent text-white" : "border border-border hover:bg-gray-50"
          }`}
        >
          {bulkMode ? "一括更新モード ON" : "価格一括更新"}
        </button>
      </div>

      {selectedCardId && selectedCard && (
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{selectedCard.name} の価格推移</h3>
            <button onClick={() => setSelectedCardId(null)} className="text-sm text-muted hover:text-foreground">
              閉じる
            </button>
          </div>
          {selectedHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={selectedHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`¥${formatPrice(Number(v))}`, "価格"]} />
                <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-center py-8">価格履歴が1件のみです。価格を更新すると推移が表示されます。</p>
          )}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
        <input
          type="text"
          placeholder="カード名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold">カード名</th>
              <th className="text-right px-4 py-3 font-semibold">現在価格</th>
              <th className="text-right px-4 py-3 font-semibold">変動</th>
              {bulkMode && <th className="text-right px-4 py-3 font-semibold">新価格</th>}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {cardsWithHistory.map((card) => (
              <tr key={card.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium">
                  {card.name}
                  {card.category && (
                    <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{card.category}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">&yen;{formatPrice(card.latest)}</td>
                <td className="px-4 py-3 text-right">
                  {card.change !== 0 && (
                    <span className={`flex items-center justify-end gap-1 ${card.change > 0 ? "text-success" : "text-danger"}`}>
                      {card.change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {card.change > 0 ? "+" : ""}{card.changeRate.toFixed(1)}%
                    </span>
                  )}
                </td>
                {bulkMode && (
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      placeholder={card.latest.toString()}
                      value={bulkPrices[card.id!] ?? ""}
                      onChange={(e) => setBulkPrices({ ...bulkPrices, [card.id!]: e.target.value })}
                      className="w-28 px-2 py-1 rounded border border-border text-right focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedCardId(card.id!)}
                    className="text-xs text-primary hover:underline"
                  >
                    推移
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bulkMode && Object.keys(bulkPrices).length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleBulkUpdate}
            className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark"
          >
            {Object.values(bulkPrices).filter(Boolean).length}件の価格を更新
          </button>
        </div>
      )}
    </div>
  );
}
