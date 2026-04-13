"use client";

import { useCards, useTrades, formatPrice, kanaMatch } from "@/lib/hooks";

function formatAxisPrice(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}万`;
  return v.toLocaleString("ja-JP");
}
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const cards = useCards();
  const trades = useTrades();

  const totalValue = cards.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);
  const uniqueCards = cards.length;

  const top10 = [...cards]
    .sort((a, b) => b.unitPrice * b.quantity - a.unitPrice * a.quantity)
    .slice(0, 10);

  const top10Chart = top10.map((c) => ({
    name: c.name.length > 8 ? c.name.slice(0, 8) + "..." : c.name,
    value: c.unitPrice * c.quantity,
  }));

  const recentTrades = trades.slice(0, 5);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">ダッシュボード</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <p className="text-muted text-sm">総資産額</p>
          <p className="text-3xl font-bold text-primary mt-1">&yen;{formatPrice(totalValue)}</p>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <p className="text-muted text-sm">総カード枚数</p>
          <p className="text-3xl font-bold mt-1">{totalCards}<span className="text-base text-muted ml-1">枚</span></p>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <p className="text-muted text-sm">カード種類数</p>
          <p className="text-3xl font-bold mt-1">{uniqueCards}<span className="text-base text-muted ml-1">種</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h3 className="text-lg font-bold mb-4">高額カード TOP10</h3>
          {top10Chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10Chart} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `¥${formatAxisPrice(v)}`} />
                <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                <Tooltip formatter={(v) => [`¥${formatPrice(Number(v))}`, "金額"]} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-center py-8">データがありません</p>
          )}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h3 className="text-lg font-bold mb-4">最近の売買記録</h3>
          {recentTrades.length > 0 ? (
            <div className="space-y-3">
              {recentTrades.map((t) => (
                <TradeItem key={t.id} trade={t} cards={cards} />
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-8">売買記録がありません</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeItem({ trade, cards }: { trade: { cardId: number; type: string; price: number; quantity: number; date: Date }; cards: { id?: number; name: string }[] }) {
  const card = cards.find((c) => c.id === trade.cardId);
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div>
        <p className="font-medium">{card?.name ?? "不明"}</p>
        <p className="text-xs text-muted">
          {new Date(trade.date).toLocaleDateString("ja-JP")} / {trade.quantity}枚
        </p>
      </div>
      <span
        className={`text-sm font-bold px-3 py-1 rounded-full ${
          trade.type === "buy"
            ? "bg-blue-100 text-blue-700"
            : "bg-green-100 text-green-700"
        }`}
      >
        {trade.type === "buy" ? "購入" : "売却"} &yen;{formatPrice(trade.price * trade.quantity)}
      </span>
    </div>
  );
}
