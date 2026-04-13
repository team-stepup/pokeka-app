"use client";

import { useState, useRef } from "react";
import { useCards, usePriceHistory, useTrades, formatPrice } from "@/lib/hooks";
import { db } from "@/lib/db";
import { initialCards } from "@/lib/initialData";
import { Upload, Download, RotateCcw, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

export default function SettingsPage() {
  const cards = useCards();
  const priceHistory = usePriceHistory();
  const trades = useTrades();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

      let headerRow = -1;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as string[];
        if (row?.some((c) => typeof c === "string" && c.includes("カード名"))) {
          headerRow = i;
          break;
        }
      }
      if (headerRow === -1) { showMessage("error", "ヘッダー行が見つかりません"); return; }

      const now = new Date();
      let imported = 0;
      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i] as (string | number | undefined)[];
        if (!row || !row[1]) continue;
        const name = String(row[1]).trim();
        const unitPrice = Number(row[2]) || 0;
        const quantity = Number(row[3]) || 1;
        if (!name || unitPrice === 0) continue;

        const existing = await db.cards.where("name").equals(name).first();
        if (existing) {
          await db.cards.update(existing.id!, { unitPrice, quantity, updatedAt: now });
          if (existing.unitPrice !== unitPrice) {
            await db.priceHistory.add({ cardId: existing.id!, price: unitPrice, date: now });
          }
        } else {
          const id = await db.cards.add({ name, unitPrice, quantity, category: "", createdAt: now, updatedAt: now });
          await db.priceHistory.add({ cardId: id as number, price: unitPrice, date: now });
        }
        imported++;
      }
      showMessage("success", `${imported}件のカードをインポートしました`);
    } catch (err) {
      showMessage("error", "Excelファイルの読み込みに失敗しました");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleExcelExport = () => {
    const data = cards.map((c, i) => ({
      "No.": i + 1,
      "カード名": c.name,
      "単価": c.unitPrice,
      "枚数": c.quantity,
      "買取金額": c.unitPrice * c.quantity,
      "カテゴリ": c.category,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ポケカ一覧");
    XLSX.writeFile(wb, `ポケカ一覧_${new Date().toISOString().split("T")[0]}.xlsx`);
    showMessage("success", "Excelファイルをエクスポートしました");
  };

  const handleJsonExport = () => {
    const backup = { cards, priceHistory, trades, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pokeka_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage("success", "バックアップを保存しました");
  };

  const handleJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.cards) { showMessage("error", "無効なバックアップファイルです"); return; }

      await db.cards.clear();
      await db.priceHistory.clear();
      await db.trades.clear();

      if (data.cards?.length) await db.cards.bulkAdd(data.cards.map((c: Record<string, unknown>) => {
        const { id, ...rest } = c; return { ...rest, createdAt: new Date(rest.createdAt as string), updatedAt: new Date(rest.updatedAt as string) };
      }));
      if (data.priceHistory?.length) await db.priceHistory.bulkAdd(data.priceHistory.map((p: Record<string, unknown>) => {
        const { id, ...rest } = p; return { ...rest, date: new Date(rest.date as string) };
      }));
      if (data.trades?.length) await db.trades.bulkAdd(data.trades.map((t: Record<string, unknown>) => {
        const { id, ...rest } = t; return { ...rest, date: new Date(rest.date as string) };
      }));
      showMessage("success", "バックアップを復元しました");
    } catch {
      showMessage("error", "バックアップの読み込みに失敗しました");
    }
  };

  const handleReset = async () => {
    if (!confirm("全データを初期状態に戻しますか？\n現在のデータは失われます。")) return;
    await db.cards.clear();
    await db.priceHistory.clear();
    await db.trades.clear();
    const now = new Date();
    const newCards = initialCards.map((c) => ({ ...c, createdAt: now, updatedAt: now }));
    const ids = await db.cards.bulkAdd(newCards, { allKeys: true });
    await db.priceHistory.bulkAdd(
      ids.map((cardId, i) => ({ cardId: cardId as number, price: initialCards[i].unitPrice, date: now }))
    );
    showMessage("success", "データを初期状態に戻しました");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">設定</h2>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg ${
          message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><FileSpreadsheet size={20} /> Excelインポート</h3>
          <p className="text-sm text-muted mb-4">ポケカ.xlsx形式のExcelファイルからカードデータを読み込みます。同名カードは上書き更新されます。</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-gray-50"
          >
            <Upload size={16} /> Excelファイルを選択
          </button>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Download size={20} /> Excelエクスポート</h3>
          <p className="text-sm text-muted mb-4">現在のカードデータをExcelファイルとしてダウンロードします。</p>
          <button
            onClick={handleExcelExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-gray-50"
          >
            <Download size={16} /> Excelダウンロード
          </button>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Upload size={20} /> データバックアップ</h3>
          <p className="text-sm text-muted mb-4">全データ（カード、価格履歴、売買記録）をJSONとしてバックアップ/復元します。</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleJsonExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-gray-50"
            >
              <Download size={16} /> バックアップ保存
            </button>
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-gray-50 cursor-pointer">
              <Upload size={16} /> バックアップ復元
              <input type="file" accept=".json" onChange={handleJsonImport} className="hidden" />
            </label>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><RotateCcw size={20} /> データリセット</h3>
          <p className="text-sm text-muted mb-4">全データを削除し、初期データ（92件のカード）を再読み込みします。</p>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-danger text-danger hover:bg-red-50"
          >
            <RotateCcw size={16} /> 初期データに戻す
          </button>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <h3 className="text-lg font-bold mb-3">データ統計</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted">カード種類</p>
              <p className="text-xl font-bold">{cards.length}</p>
            </div>
            <div>
              <p className="text-muted">総枚数</p>
              <p className="text-xl font-bold">{cards.reduce((s, c) => s + c.quantity, 0)}</p>
            </div>
            <div>
              <p className="text-muted">価格履歴</p>
              <p className="text-xl font-bold">{priceHistory.length}件</p>
            </div>
            <div>
              <p className="text-muted">売買記録</p>
              <p className="text-xl font-bold">{trades.length}件</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
