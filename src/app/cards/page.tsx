"use client";

import { useState } from "react";
import { useCards, addCard, updateCard, deleteCard, formatPrice } from "@/lib/hooks";
import { Plus, Search, Pencil, Trash2, X, ArrowUpDown } from "lucide-react";
import type { Card } from "@/lib/db";

type SortKey = "name" | "unitPrice" | "quantity" | "total";
type SortDir = "asc" | "desc";

export default function CardsPage() {
  const cards = useCards();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const categories = [...new Set(cards.map((c) => c.category).filter(Boolean))];

  const filtered = cards
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => !categoryFilter || c.category === categoryFilter);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name": cmp = a.name.localeCompare(b.name, "ja"); break;
      case "unitPrice": cmp = a.unitPrice - b.unitPrice; break;
      case "quantity": cmp = a.quantity - b.quantity; break;
      case "total": cmp = a.unitPrice * a.quantity - b.unitPrice * b.quantity; break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const totalValue = filtered.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const totalQty = filtered.reduce((s, c) => s + c.quantity, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">カード一覧</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} /> カード追加
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            placeholder="カード名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-border bg-card"
        >
          <option value="">全カテゴリ</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold">No.</th>
              <SortHeader label="カード名" sortKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <th className="text-left px-4 py-3 font-semibold">カテゴリ</th>
              <SortHeader label="単価" sortKey="unitPrice" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="枚数" sortKey="quantity" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="買取金額" sortKey="total" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((card, i) => (
              <tr key={card.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-muted">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{card.name}</td>
                <td className="px-4 py-3">
                  {card.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{card.category}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">&yen;{formatPrice(card.unitPrice)}</td>
                <td className="px-4 py-3 text-right">{card.quantity}</td>
                <td className="px-4 py-3 text-right font-semibold">&yen;{formatPrice(card.unitPrice * card.quantity)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setEditCard(card)} className="p-1.5 rounded hover:bg-gray-200 text-muted">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`「${card.name}」を削除しますか？`)) deleteCard(card.id!); }}
                      className="p-1.5 rounded hover:bg-red-100 text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td className="px-4 py-3" colSpan={4}>合計</td>
              <td className="px-4 py-3 text-right">{totalQty}</td>
              <td className="px-4 py-3 text-right">&yen;{formatPrice(totalValue)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {showAdd && <CardModal onClose={() => setShowAdd(false)} />}
      {editCard && <CardModal card={editCard} onClose={() => setEditCard(null)} />}
    </div>
  );
}

function SortHeader({ label, sortKey, current, dir, onClick }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  return (
    <th
      className="text-left px-4 py-3 font-semibold cursor-pointer hover:text-primary select-none"
      onClick={() => onClick(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={current === sortKey ? "text-primary" : "text-gray-300"} />
      </span>
    </th>
  );
}

function CardModal({ card, onClose }: { card?: Card; onClose: () => void }) {
  const [name, setName] = useState(card?.name ?? "");
  const [unitPrice, setUnitPrice] = useState(card?.unitPrice?.toString() ?? "");
  const [quantity, setQuantity] = useState(card?.quantity?.toString() ?? "1");
  const [category, setCategory] = useState(card?.category ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !unitPrice) return;
    if (card?.id) {
      await updateCard(card.id, { name, unitPrice: Number(unitPrice), quantity: Number(quantity), category });
    } else {
      await addCard({ name, unitPrice: Number(unitPrice), quantity: Number(quantity), category });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{card ? "カード編集" : "カード追加"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">カード名</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">単価 (円)</label>
              <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required min="0"
                className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">枚数</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1"
                className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">カテゴリ</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="例: SR, AR, UR..."
              className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-gray-50">キャンセル</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark">{card ? "更新" : "追加"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
