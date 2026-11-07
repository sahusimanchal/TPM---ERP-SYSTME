"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCustomers, getBills, createBill } from "@/lib/storage";
import { Customer, BillCategory, Bill } from "@/lib/types";
import { formatCurrency, getTodayDateString, generateBillNumber } from "@/lib/utils";
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function CreateBillPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [category, setCategory] = useState<BillCategory>("cement");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [billDate, setBillDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState("");
  const [successBill, setSuccessBill] = useState<Bill | null>(null);

  // Cement Fields
  const [cementType, setCementType] = useState("LNT");
  const [cementBags, setCementBags] = useState("10");
  const [cementRate, setCementRate] = useState("330");

  // Rod Fields
  const [rodSize, setRodSize] = useState("10mm");
  const [rodKg, setRodKg] = useState("100");
  const [rodRate, setRodRate] = useState("68");

  // Daily Electrical Items
  const [dailyItems, setDailyItems] = useState([
    { name: "Electrical Wire / Switches", qty: 1, rate: 500, amount: 500 }
  ]);

  useEffect(() => {
    const list = getCustomers();
    setCustomers(list);
    if (list.length > 0) {
      setSelectedCustomerId(list[0].id);
    }
  }, []);

  // Compute Totals
  const cementTotal = (parseFloat(cementBags) || 0) * (parseFloat(cementRate) || 0);
  const rodTotal = (parseFloat(rodKg) || 0) * (parseFloat(rodRate) || 0);
  const dailyTotal = dailyItems.reduce((acc, it) => acc + (it.amount || 0), 0);

  const currentTotal = category === "cement" ? cementTotal : category === "rod" ? rodTotal : dailyTotal;

  const handleAddDailyItem = () => {
    setDailyItems([...dailyItems, { name: "", qty: 1, rate: 0, amount: 0 }]);
  };

  const handleDailyItemChange = (index: number, field: string, value: any) => {
    const updated = [...dailyItems];
    (updated[index] as any)[field] = value;
    if (field === "qty" || field === "rate") {
      updated[index].amount = (parseFloat(updated[index].qty as any) || 0) * (parseFloat(updated[index].rate as any) || 0);
    }
    setDailyItems(updated);
  };

  const handleRemoveDailyItem = (index: number) => {
    if (dailyItems.length > 1) {
      setDailyItems(dailyItems.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;

    const existingBills = getBills().filter(b => b.bill_category === category);
    const billNumber = generateBillNumber(category, existingBills.length);

    let items = [];
    let cement_details = undefined;
    let rod_details = undefined;
    let daily_details = undefined;

    if (category === "cement") {
      items.push({
        id: `item-${Date.now()}-1`,
        bill_id: "",
        item_name: `${cementType} Cement`,
        item_category: "cement",
        quantity: parseFloat(cementBags) || 0,
        unit: "BAGS",
        unit_price: parseFloat(cementRate) || 0,
        total_amount: cementTotal
      });
      cement_details = {
        cement_type: cementType,
        qty_bags: parseFloat(cementBags) || 0,
        unit_rate: parseFloat(cementRate) || 0,
        amount: cementTotal,
        legacy_paid_flag: "NO" as const
      };
    } else if (category === "rod") {
      items.push({
        id: `item-${Date.now()}-1`,
        bill_id: "",
        item_name: `TMT Steel Rod ${rodSize}`,
        item_category: "rod",
        quantity: parseFloat(rodKg) || 0,
        unit: "KG",
        unit_price: parseFloat(rodRate) || 0,
        total_amount: rodTotal
      });
      rod_details = {
        rod_size: rodSize,
        qty_kg: parseFloat(rodKg) || 0,
        rate_per_kg: parseFloat(rodRate) || 0,
        amount: rodTotal
      };
    } else {
      items = dailyItems.map((it, idx) => ({
        id: `item-${Date.now()}-${idx+1}`,
        bill_id: "",
        item_name: it.name || "Electrical Items",
        item_category: "daily",
        quantity: it.qty,
        unit: "UNIT",
        unit_price: it.rate,
        total_amount: it.amount
      }));
      daily_details = {
        item_type: "ELECTRIC",
        amount: dailyTotal
      };
    }

    const created = createBill({
      bill_number: billNumber,
      bill_category: category,
      bill_date: billDate,
      customer_id: cust.id,
      customer_name: cust.name,
      subtotal: currentTotal,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: currentTotal,
      payment_status: "unpaid",
      status: "posted",
      notes: notes.trim(),
      is_imported: false,
      items,
      cement_details,
      rod_details,
      daily_details
    });

    setSuccessBill(created);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/sales"
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create New Sales Bill</h1>
            <p className="text-xs text-slate-500">Generate customer invoice and post to financial ledger</p>
          </div>
        </div>
      </div>

      {successBill ? (
        <div className="bg-white rounded-2xl p-8 border border-emerald-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Bill #{successBill.bill_number} Created Successfully!
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Total amount of {formatCurrency(successBill.total_amount)} has been billed to {successBill.customer_name} and updated in their customer ledger.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setSuccessBill(null);
                setNotes("");
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Create Another Bill
            </button>
            <Link
              href="/sales"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              View Sales Register
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Category Selector Tabs */}
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Product Category
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "cement", label: "Cement Sales", desc: "Bags & Brand rates" },
                { id: "rod", label: "Rod / Steel Sales", desc: "Kg decimals & rates" },
                { id: "daily", label: "Electrical / Daily", desc: "Line items & hardware" },
              ].map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategory(c.id as BillCategory)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    category === c.id
                      ? "bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-sm"
                      : "bg-white/50 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className={`font-bold text-xs ${category === c.id ? "text-blue-600" : "text-slate-800"}`}>
                    {c.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Customer & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer / Party Name *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.is_unidentified ? "(Over-the-Counter Retail)" : ""} • Due: {formatCurrency(c.current_balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bill Date *
                </label>
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category Form Details */}
            {category === "cement" && (
              <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-4">
                <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Cement Specifications
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Cement Brand</label>
                    <select
                      value={cementType}
                      onChange={(e) => setCementType(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      {["LNT", "SUPPER", "SHREE", "MARBAL", "ROOFON", "PRIMIUM", "DSP", "CON. SPECIAL"].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Quantity (Bags)</label>
                    <input
                      type="number"
                      min="1"
                      value={cementBags}
                      onChange={(e) => setCementBags(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Unit Rate per Bag (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={cementRate}
                      onChange={(e) => setCementRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {category === "rod" && (
              <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 space-y-4">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Rod / Steel Specifications
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Rod Size</label>
                    <select
                      value={rodSize}
                      onChange={(e) => setRodSize(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      {["8mm", "10mm", "12mm", "16mm", "20mm", "25mm", "Binding Wire"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Quantity (Kg)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={rodKg}
                      onChange={(e) => setRodKg(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Rate per Kg (₹)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={rodRate}
                      onChange={(e) => setRodRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {category === "daily" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Electrical & Hardware Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddDailyItem}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {dailyItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Item Description"
                          value={item.name}
                          onChange={(e) => handleDailyItemChange(idx, "name", e.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-slate-200 bg-white"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleDailyItemChange(idx, "qty", e.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-slate-200 bg-white text-center"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          placeholder="Rate (₹)"
                          value={item.rate}
                          onChange={(e) => handleDailyItemChange(idx, "rate", e.target.value)}
                          className="w-full px-3 py-1.5 rounded border border-slate-200 bg-white text-right"
                        />
                      </div>
                      <div className="w-28 text-right font-bold text-slate-900 pr-2">
                        {formatCurrency(item.amount)}
                      </div>
                      {dailyItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDailyItem(idx)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Display */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Invoice Value</span>
                <div className="text-2xl font-black text-blue-700">
                  {formatCurrency(currentTotal)}
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href="/sales"
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={currentTotal <= 0}
                  className="flex items-center gap-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Post Bill & Save</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
