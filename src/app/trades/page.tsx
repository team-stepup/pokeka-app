"use client";

import { useState } from "react";
import { useCards, useTrades, addTrade, deleteTrade, formatPrice } from "@/lib/hooks";
import { Plus, Trash2, X } from "lucide-react";

export default function TradesPage() {
  const cards = useCards();
  const trades = useTrades();
  const [showAdd, setShowAdd] = useState(false);

  const totalBuy = trades.filter((t) => t.type === "buy").reduce((s, t) => s + t.price * t.quantity, 0);
  const totalSell = trades.filter((t) => t.type === "sell").reduce((s, t) => s + t.price * t.quantity, 0);
  const profit = totalSell - totalBuy;

  const monthlyData = trades.reduce((acc, t) => {
    const key = new Date(t.date).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
    if (!acc[key]) acc[key] = { buy: 0, sell: 0 };
    const amount = t.price * t.quantity;
    if (t.type === "buy") acc[key].buy += amount;
    else acc[key].sell += amount;
    return acc;
  }, {} as Record<string, { buy: number; sell: number }>);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">売買記録</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} /> 取引追加
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <p className="text-muted text-sm">総購入額</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">&yen;{formatPrice(totalBuy)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <p className="text-muted text-sm">総売却額</p>
          <p className="text-2xl font-bold text-green-600 mt-1">&yen;{formatPrice(totalSell)}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
          <p className="text-muted text-sm">損益</p>
          <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? "text-success" : "text-danger"}`}>
            {profit >= 0 ? "+" : ""}&yen;{formatPrice(Math.abs(profit))}
          </p>
        </div>
      </div>

      {Object.keys(monthlyData).length > 0 && (
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border mb-6">
          <h3 className="text-lg font-bold mb-3">月別サマリ</h3>
          <div className="space-y-2">
            {Object.entries(monthlyData).map(([month, data]) => (
              <div key={month} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="font-medium">{month}</span>
                <div className="flex gap-6 text-sm">
                  <span className="text-blue-600">購入: &yen;{formatPrice(data.buy)}</span>
                  <span className="text-green-600">売却: &yen;{formatPrice(data.sell)}</span>
                  <span className={data.sell - data.buy >= 0 ? "text-success font-bold" : "text-danger font-bold"}>
                    {data.sell - data.buy >= 0 ? "+" : ""}&yen;{formatPrice(Math.abs(data.sell - data.buy))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold">日付</th>
              <th className="text-left px-4 py-3 font-semibold">種別</th>
              <th className="text-left px-4 py-3 font-semibold">カード名</th>
              <th className="text-right px-4 py-3 font-semibold">単価</th>
              <th className="text-right px-4 py-3 font-semibold">枚数</th>
              <th className="text-right px-4 py-3 font-semibold">金額</th>
              <th className="text-left px-4 py-3 font-semibold">メモ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-muted">取引記録がありません</td></tr>
            ) : (
              trades.map((t) => {
                const card = cards.find((c) => c.id === t.cardId);
                return (
                  <tr key={t.id} className="border-b border-border hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(t.date).toLocaleDateString("ja-JP")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.type === "buy" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      }`}>
                        {t.type === "buy" ? "購入" : "売却"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{card?.name ?? "不明"}</td>
                    <td className="px-4 py-3 text-right">&yen;{formatPrice(t.price)}</td>
                    <td className="px-4 py-3 text-right">{t.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold">&yen;{formatPrice(t.price * t.quantity)}</td>
                    <td className="px-4 py-3 text-muted max-w-32 truncate">{t.note}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { if (confirm("この取引を削除しますか？")) deleteTrade(t.id!); }}
                        className="p-1.5 rounded hover:bg-red-100 text-danger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <TradeModal cards={cards} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function TradeModal({ cards, onClose }: { cards: { id?: number; name: string; unitPrice: number }[]; onClose: () => void }) {
  const [cardId, setCardId] = useState<string>("");
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  const selectedCard = cards.find((c) => c.id === Number(cardId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId || !price) return;
    await addTrade({
      cardId: Number(cardId),
      type,
      price: Number(price),
      quantity: Number(quantity),
      date: new Date(date),
      note,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">取引追加</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">カード</label>
            <select
              value={cardId}
              onChange={(e) => {
                setCardId(e.target.value);
                const c = cards.find((c) => c.id === Number(e.target.value));
                if (c) setPrice(c.unitPrice.toString());
              }}
              required
              className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">カードを選択...</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setType("buy")}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${type === "buy" ? "bg-blue-600 text-white" : "border border-border"}`}
            >購入</button>
            <button type="button" onClick={() => setType("sell")}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${type === "sell" ? "bg-green-600 text-white" : "border border-border"}`}
            >売却</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">単価 (円)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="0"
                className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">枚数</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1"
                className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">日付</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">メモ</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="任意"
              className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {selectedCard && (
            <p className="text-sm text-muted">
              合計: &yen;{formatPrice(Number(price || 0) * Number(quantity || 0))}
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-gray-50">キャンセル</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark">登録</button>
          </div>
        </form>
      </div>
    </div>
  );
}
