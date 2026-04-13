"use client";

import { useState } from "react";
import { useCards, usePriceHistory, updateCard, formatPrice, kanaMatch } from "@/lib/hooks";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Search, Download, Loader2, Check, X, Undo2, AlertTriangle } from "lucide-react";

const WORKER_URL = "https://pokeka-price-proxy.hiro-0221-s-l.workers.dev";

interface FetchedPrice {
  name: string;
  price: number;
  rarity: string;
  pack: string;
  modelNumber: string;
}

interface MatchedPrice {
  cardId: number;
  cardName: string;
  currentPrice: number;
  fetchedPrice: number;
  fetchedName: string;
  rarity: string;
  selected: boolean;
}

export default function PricesPage() {
  const cards = useCards();
  const allHistory = usePriceHistory();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkPrices, setBulkPrices] = useState<Record<number, string>>({});

  // Fetch state
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [matchedPrices, setMatchedPrices] = useState<MatchedPrice[]>([]);
  const [showFetchResults, setShowFetchResults] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Undo state
  const [undoData, setUndoData] = useState<MatchedPrice[] | null>(null);
  const [showUndoBar, setShowUndoBar] = useState(false);

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

  const fetchFromCardRush = async () => {
    setFetching(true);
    setFetchError("");
    setMatchedPrices([]);

    try {
      const results: FetchedPrice[] = [];

      // Search for each unique card name
      const uniqueNames = [...new Set(cards.map((c) => {
        // Remove suffixes like (2) for search
        return c.name.replace(/\([\d]+\)$/, "").trim();
      }))];

      // Batch fetch - search each card name
      for (const name of uniqueNames) {
        try {
          const res = await fetch(`${WORKER_URL}?name=${encodeURIComponent(name)}&limit=5`);
          if (res.ok) {
            const data = await res.json();
            if (data.results) results.push(...data.results);
          }
        } catch {
          // Skip individual failures
        }
        // Small delay to be polite
        await new Promise((r) => setTimeout(r, 200));
      }

      // Match fetched prices to our cards - exact name match only
      const matched: MatchedPrice[] = [];
      for (const card of cards) {
        const searchName = card.name.replace(/\([\d]+\)$/, "").trim();
        const match = results.find((r) => r.name === searchName);

        if (match && match.price !== card.unitPrice) {
          matched.push({
            cardId: card.id!,
            cardName: card.name,
            currentPrice: card.unitPrice,
            fetchedPrice: match.price,
            fetchedName: match.name,
            rarity: match.rarity,
            selected: true,
          });
        }
      }

      setMatchedPrices(matched);
      setShowFetchResults(true);

      if (matched.length === 0) {
        setFetchError("価格変動が見つかりませんでした（全カードが最新価格です）");
      }
    } catch (e) {
      setFetchError(
        "買取価格の取得に失敗しました。Cloudflare Workerが設定されていない可能性があります。\n" +
        "設定方法: worker/ フォルダの wrangler.toml を使って `npx wrangler deploy` を実行してください。"
      );
    } finally {
      setFetching(false);
    }
  };

  const applyFetchedPrices = async () => {
    const selected = matchedPrices.filter((m) => m.selected);
    // Save undo data (swap current/fetched for reversal)
    setUndoData(selected.map((m) => ({ ...m, fetchedPrice: m.currentPrice, currentPrice: m.fetchedPrice })));
    for (const m of selected) {
      await updateCard(m.cardId, { unitPrice: m.fetchedPrice });
    }
    setShowFetchResults(false);
    setShowConfirm(false);
    setMatchedPrices([]);
    setShowUndoBar(true);
  };

  const undoApply = async () => {
    if (!undoData) return;
    for (const m of undoData) {
      await updateCard(m.cardId, { unitPrice: m.fetchedPrice });
    }
    setUndoData(null);
    setShowUndoBar(false);
  };

  const toggleMatch = (cardId: number) => {
    setMatchedPrices((prev) =>
      prev.map((m) => (m.cardId === cardId ? { ...m, selected: !m.selected } : m))
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold">価格トラッキング</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchFromCardRush}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {fetching ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {fetching ? "取得中..." : "カードラッシュから取得"}
          </button>
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`px-3 py-2 rounded-lg transition-colors text-sm ${
              bulkMode ? "bg-accent text-white" : "border border-border hover:bg-gray-50"
            }`}
          >
            {bulkMode ? "一括更新 ON" : "手動一括更新"}
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm whitespace-pre-line">
          {fetchError}
        </div>
      )}

      {/* Fetch results panel */}
      {showFetchResults && matchedPrices.length > 0 && (
        <div className="mb-6 bg-card rounded-xl border-2 border-green-200 shadow-sm overflow-hidden">
          <div className="bg-green-50 px-4 py-3 flex items-center justify-between">
            <h3 className="font-bold text-green-800 text-sm">
              カードラッシュ買取価格 - {matchedPrices.length}件の価格変動
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFetchResults(false)}
                className="text-xs text-muted hover:text-foreground px-2 py-1"
              >
                閉じる
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
              >
                <Check size={12} /> {matchedPrices.filter((m) => m.selected).length}件を適用
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {matchedPrices.map((m) => {
              const diff = m.fetchedPrice - m.currentPrice;
              const diffRate = m.currentPrice > 0 ? (diff / m.currentPrice) * 100 : 0;
              return (
                <div
                  key={m.cardId}
                  className={`flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 ${
                    m.selected ? "bg-white" : "bg-gray-50 opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={m.selected}
                    onChange={() => toggleMatch(m.cardId)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.cardName}</p>
                    <p className="text-xs text-muted truncate">CR: {m.fetchedName} ({m.rarity})</p>
                  </div>
                  <div className="text-right text-sm flex-shrink-0">
                    <p className="text-muted line-through">&yen;{formatPrice(m.currentPrice)}</p>
                    <p className="font-bold">&yen;{formatPrice(m.fetchedPrice)}</p>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${diff > 0 ? "text-success" : "text-danger"}`}>
                    {diff > 0 ? "+" : ""}{diffRate.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                <YAxis tickFormatter={(v) => `¥${formatPrice(v)}`} />
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
          placeholder="カード名で検索（ひらがな/カタカナ対応）..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-card rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 sm:hidden" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">価格更新の確認</h3>
                  <p className="text-sm text-muted">以下のカードの価格を更新します</p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto mb-4 border border-border rounded-lg">
                {matchedPrices.filter((m) => m.selected).map((m) => {
                  const diff = m.fetchedPrice - m.currentPrice;
                  return (
                    <div key={m.cardId} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
                      <span className="font-medium">{m.cardName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted">&yen;{formatPrice(m.currentPrice)}</span>
                        <span className="text-muted">&rarr;</span>
                        <span className="font-bold">&yen;{formatPrice(m.fetchedPrice)}</span>
                        <span className={`text-xs font-bold ${diff > 0 ? "text-success" : "text-danger"}`}>
                          {diff > 0 ? "+" : ""}{formatPrice(diff)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-muted mb-4">
                合計 {matchedPrices.filter((m) => m.selected).length}件を更新します。更新後も「元に戻す」ボタンで復元できます。
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-border hover:bg-gray-50 font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={applyFetchedPrices}
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 font-medium"
                >
                  更新する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo bar */}
      {showUndoBar && undoData && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-sidebar text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-4 text-sm">
          <span>{undoData.length}件の価格を更新しました</span>
          <button
            onClick={undoApply}
            className="flex items-center gap-1.5 bg-white text-sidebar px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100"
          >
            <Undo2 size={14} /> 元に戻す
          </button>
          <button onClick={() => { setShowUndoBar(false); setUndoData(null); }} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
