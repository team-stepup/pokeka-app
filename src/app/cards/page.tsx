"use client";

import { useState } from "react";
import { useCards, addCard, updateCard, deleteCard, formatPrice, kanaMatch } from "@/lib/hooks";
import { Plus, Search, Pencil, Trash2, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import type { Card } from "@/lib/db";

type SortKey = "name" | "unitPrice" | "quantity" | "total";
type SortDir = "asc" | "desc";

export default function CardsPage() {
  const cards = useCards();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const categories = [...new Set(cards.map((c) => c.category).filter(Boolean))];

  const filtered = cards
    .filter((c) => kanaMatch(c.name, search))
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

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null;
    return sortDir === "desc" ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
  };

  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/pokeka-app") ? "/pokeka-app" : "";

  return (
    <div className="relative">
      {/* Watermark background */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.15]"
        style={{
          backgroundImage: `url(${basePath}/watermark.png)`,
          backgroundSize: "320px",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-2xl font-bold">カード一覧</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
        >
          <Plus size={16} /> 追加
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            placeholder="カード名で検索（ひらがな/カタカナ対応）..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm"
        >
          <option value="">全カテゴリ</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Sort buttons - mobile friendly */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {([["total", "金額順"], ["unitPrice", "単価順"], ["quantity", "枚数順"], ["name", "名前順"]] as [SortKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={`flex items-center gap-0.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              sortKey === key ? "bg-primary text-white" : "bg-card border border-border text-foreground hover:bg-gray-100"
            }`}
          >
            {label} <SortIcon k={key} />
          </button>
        ))}
      </div>

      {/* Card list - mobile-first card layout */}
      <div className="space-y-2">
        {sorted.map((card, i) => (
          <CardItem
            key={card.id}
            card={card}
            index={i + 1}
            isEditing={editingId === card.id}
            onEdit={() => setEditingId(card.id!)}
            onCancel={() => setEditingId(null)}
            onSave={async (updates) => { await updateCard(card.id!, updates); setEditingId(null); }}
            onDelete={() => { if (confirm(`「${card.name}」を削除しますか？`)) deleteCard(card.id!); }}
          />
        ))}
      </div>

      {/* Footer total */}
      <div className="mt-4 bg-card rounded-xl border border-border p-4 flex items-center justify-between">
        <div className="text-sm text-muted">
          {filtered.length}種 / {totalQty}枚
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">合計金額</p>
          <p className="text-xl font-bold text-primary">&yen;{formatPrice(totalValue)}</p>
        </div>
      </div>

      {showAdd && <CardModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function CardItem({ card, index, isEditing, onEdit, onCancel, onSave, onDelete }: {
  card: Card; index: number; isEditing: boolean;
  onEdit: () => void; onCancel: () => void;
  onSave: (updates: Partial<Card>) => void; onDelete: () => void;
}) {
  const [name, setName] = useState(card.name);
  const [unitPrice, setUnitPrice] = useState(card.unitPrice.toString());
  const [quantity, setQuantity] = useState(card.quantity.toString());

  if (isEditing) {
    return (
      <div className="bg-card rounded-xl border-2 border-primary p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-primary">編集中</span>
          <div className="flex gap-2">
            <button onClick={onCancel} className="text-xs text-muted hover:text-foreground px-2 py-1 rounded">キャンセル</button>
            <button
              onClick={() => onSave({ name, unitPrice: Number(unitPrice), quantity: Number(quantity) })}
              className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary-dark"
            >
              <Check size={12} /> 保存
            </button>
          </div>
        </div>
        <div className="space-y-2.5">
          <div>
            <label className="text-xs text-muted mb-0.5 block">カード名</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-0.5 block">単価（円）</label>
              <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} min="0"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted mb-0.5 block">枚数</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const total = card.unitPrice * card.quantity;

  return (
    <div className="bg-card rounded-xl border border-border p-3.5 hover:shadow-md transition-shadow active:bg-gray-50">
      <div className="flex items-start gap-3">
        {/* Rank number */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-muted">
          {index}
        </div>

        {/* Card info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-sm truncate">{card.name}</h3>
            {card.category && (
              <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                {card.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>&yen;{formatPrice(card.unitPrice)} &times; {card.quantity}枚</span>
          </div>
        </div>

        {/* Total price */}
        <div className="flex-shrink-0 text-right">
          <p className="font-bold text-sm">&yen;{formatPrice(total)}</p>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex flex-col gap-1 ml-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-muted active:bg-gray-200">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-danger active:bg-red-100">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CardModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !unitPrice) return;
    await addCard({ name, unitPrice: Number(unitPrice), quantity: Number(quantity), category });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">カード追加</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">カード名</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">単価 (円)</label>
              <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required min="0"
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">枚数</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1"
                className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">カテゴリ</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="例: SR, AR, UR..."
              className="w-full px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark">
            追加する
          </button>
        </form>
      </div>
    </div>
  );
}
