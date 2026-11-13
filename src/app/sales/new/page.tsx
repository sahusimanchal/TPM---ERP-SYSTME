"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  getCustomers, 
  getBills, 
  createBill, 
  createCustomer,
  getCementBrands,
  getRodSizes,
  getStoredUserRole
} from "@/lib/storage";
import { Customer, BillCategory, Bill, CementBrand, RodSize } from "@/lib/types";
import { formatCurrency, getTodayDateString, generateBillNumber } from "@/lib/utils";
import { getClientSession } from "@/lib/auth";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Zap, 
  X, 
  ChevronDown,
  Settings2
} from "lucide-react";
import Link from "next/link";
import { CementBrandManagerModal, RodSizeManagerModal } from "@/components/admin/MasterCatalogModals";

export default function CreateBillPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [category, setCategory] = useState<BillCategory>("cement");
  const [billDate, setBillDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState("");
  const [successBill, setSuccessBill] = useState<Bill | null>(null);

  // Cement Fields - Default to blank for manual entry
  const [cementType, setCementType] = useState("LNT");
  const [cementBags, setCementBags] = useState("");
  const [cementRate, setCementRate] = useState("");

  // Rod Fields - Default to blank for manual entry
  const [rodSize, setRodSize] = useState("10mm");
  const [rodKg, setRodKg] = useState("");
  const [rodRate, setRodRate] = useState("");

  // Dynamic Master Catalogs (Admin Configurable)
  const [cementBrands, setCementBrands] = useState<CementBrand[]>([]);
  const [rodSizes, setRodSizes] = useState<RodSize[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCementModal, setShowCementModal] = useState(false);
  const [showRodModal, setShowRodModal] = useState(false);

  // Daily Electrical Items - Default to blank item for manual entry
  const [dailyItems, setDailyItems] = useState([
    { name: "", qty: "" as any, rate: "" as any, amount: 0 }
  ]);

  useEffect(() => {
    const list = getCustomers();
    setCustomers(list);

    const loadCatalogs = () => {
      const bList = getCementBrands();
      const sList = getRodSizes();
      setCementBrands(bList);
      setRodSizes(sList);

      const activeB = bList.filter(b => b.isActive);
      if (activeB.length > 0 && !activeB.some(b => b.name === cementType)) {
        setCementType(activeB[0].name);
        if (activeB[0].defaultRate && !cementRate) {
          setCementRate(String(activeB[0].defaultRate));
        }
      }

      const activeS = sList.filter(s => s.isActive);
      if (activeS.length > 0 && !activeS.some(s => s.size === rodSize)) {
        setRodSize(activeS[0].size);
        if (activeS[0].defaultRate && !rodRate) {
          setRodRate(String(activeS[0].defaultRate));
        }
      }

      const session = getClientSession();
      const role = session?.user?.role || getStoredUserRole();
      setIsAdmin(role === "admin" || role === "owner");
    };

    loadCatalogs();
    window.addEventListener("tpm_data_updated", loadCatalogs);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get("category");
      if (catParam === "cement" || catParam === "rod" || catParam === "daily") {
        setCategory(catParam);
      }
    }

    return () => window.removeEventListener("tpm_data_updated", loadCatalogs);
  }, []);

  const handleCementBrandChange = (newBrandName: string) => {
    setCementType(newBrandName);
    const brand = cementBrands.find(b => b.name === newBrandName);
    if (brand && brand.defaultRate) {
      const currentNum = parseFloat(cementRate);
      if (!cementRate || currentNum === 0 || cementBrands.some(b => b.defaultRate === currentNum)) {
        setCementRate(String(brand.defaultRate));
      }
    }
  };

  const handleRodSizeChange = (newSizeName: string) => {
    setRodSize(newSizeName);
    const s = rodSizes.find(r => r.size === newSizeName);
    if (s && s.defaultRate) {
      const currentNum = parseFloat(rodRate);
      if (!rodRate || currentNum === 0 || rodSizes.some(r => r.defaultRate === currentNum)) {
        setRodRate(String(s.defaultRate));
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute Totals dynamically from user input
  const cementTotal = (parseFloat(cementBags) || 0) * (parseFloat(cementRate) || 0);
  const rodTotal = (parseFloat(rodKg) || 0) * (parseFloat(rodRate) || 0);
  const dailyTotal = dailyItems.reduce((acc, it) => acc + (it.amount || 0), 0);

  const currentTotal = category === "cement" ? cementTotal : category === "rod" ? rodTotal : dailyTotal;

  // Dynamic party search: if user types "S", all names starting with "S" appear first, then names containing "S"
  const matchingCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) {
      return customers.slice(0, 30);
    }

    const startsWith: Customer[] = [];
    const contains: Customer[] = [];

    for (const c of customers) {
      const name = c.name.toLowerCase();
      const phone = c.phone || "";
      const code = (c.code || "").toLowerCase();

      if (name.startsWith(q)) {
        startsWith.push(c);
      } else if (name.includes(q) || phone.includes(q) || code.includes(q)) {
        contains.push(c);
      }
    }

    return [...startsWith, ...contains].slice(0, 60);
  }, [customers, customerSearch]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerSearch(c.name);
    setIsDropdownOpen(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId("");
    setCustomerSearch("");
    setIsDropdownOpen(true);
  };

  const handleSelectUnknownCustomer = () => {
    let unknownCust = customers.find(c => c.is_unidentified || c.name.toUpperCase().includes("UNKNOWN"));
    if (!unknownCust) {
      unknownCust = createCustomer({
        name: "UNKNOWN (RETAIL CASH)",
        is_unidentified: true,
        address: "Over-the-Counter",
        phone: "+91 98610 10000"
      });
      setCustomers(getCustomers());
    }
    handleSelectCustomer(unknownCust);
  };

  const handleCreateNewParty = (partyName: string) => {
    if (!partyName.trim()) return;
    const newCust = createCustomer({
      name: partyName.trim().toUpperCase()
    });
    setCustomers(getCustomers());
    handleSelectCustomer(newCust);
  };

  const handleAddDailyItem = () => {
    setDailyItems([...dailyItems, { name: "", qty: "" as any, rate: "" as any, amount: 0 }]);
  };

  const handleDailyItemChange = (index: number, field: string, value: any) => {
    const updated = [...dailyItems];
    (updated[index] as any)[field] = value;
    if (field === "qty" || field === "rate") {
      const q = parseFloat(updated[index].qty as any) || 0;
      const r = parseFloat(updated[index].rate as any) || 0;
      updated[index].amount = q * r;
    }
    setDailyItems(updated);
  };

  const handleRemoveDailyItem = (index: number) => {
    if (dailyItems.length > 1) {
      setDailyItems(dailyItems.filter((_, i) => i !== index));
    }
  };

  const handleResetForm = () => {
    setSelectedCustomerId("");
    setCustomerSearch("");
    setIsDropdownOpen(false);
    setCementBags("");
    setCementRate("");
    setRodKg("");
    setRodRate("");
    setDailyItems([{ name: "", qty: "" as any, rate: "" as any, amount: 0 }]);
    setNotes("");
    setSuccessBill(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a customer / party name from the dropdown list.");
      return;
    }
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;

    if (currentTotal <= 0) {
      alert("Invoice total must be greater than zero. Please enter valid quantity and rate.");
      return;
    }

    const existingBills = getBills().filter(b => b.bill_category === category);
    const billNumber = generateBillNumber(category, existingBills.length);

    let items = [];
    let cement_details = undefined;
    let rod_details = undefined;
    let daily_details = undefined;

    if (category === "cement") {
      const bags = parseFloat(cementBags) || 0;
      const rate = parseFloat(cementRate) || 0;
      items.push({
        id: `item-${Date.now()}-1`,
        bill_id: "",
        item_name: `${cementType} Cement`,
        item_category: "cement",
        quantity: bags,
        unit: "BAGS",
        unit_price: rate,
        total_amount: cementTotal
      });
      cement_details = {
        cement_type: cementType,
        qty_bags: bags,
        unit_rate: rate,
        amount: cementTotal,
        legacy_paid_flag: "NO" as const
      };
    } else if (category === "rod") {
      const kg = parseFloat(rodKg) || 0;
      const rate = parseFloat(rodRate) || 0;
      items.push({
        id: `item-${Date.now()}-1`,
        bill_id: "",
        item_name: `TMT Steel Rod ${rodSize}`,
        item_category: "rod",
        quantity: kg,
        unit: "KG",
        unit_price: rate,
        total_amount: rodTotal
      });
      rod_details = {
        rod_size: rodSize,
        qty_kg: kg,
        rate_per_kg: rate,
        amount: rodTotal
      };
    } else {
      const validItems = dailyItems.filter(it => it.name.trim() || it.amount > 0);
      items = validItems.map((it, idx) => ({
        id: `item-${Date.now()}-${idx+1}`,
        bill_id: "",
        item_name: it.name || "Electrical Items",
        item_category: "daily",
        quantity: parseFloat(it.qty as any) || 1,
        unit: "UNIT",
        unit_price: parseFloat(it.rate as any) || 0,
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
            <p className="text-xs text-slate-500">Manual entry for customer invoice posting to financial ledger</p>
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
              onClick={handleResetForm}
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
              {/* Dynamic Searchable Combobox for Customer */}
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Customer / Party Name <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectUnknownCustomer}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    title="Select Walk-in / Cash Counter Retail Party"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Quick: Retail (UNKNOWN)</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={customerSearch}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSelectedCustomerId("");
                      setIsDropdownOpen(true);
                    }}
                    placeholder="Type name (e.g. type 'S' for Sahu, Shree, Saroj...)"
                    className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-lg border font-semibold bg-white transition-all focus:outline-none focus:ring-2 ${
                      selectedCustomerId
                        ? "border-emerald-400 ring-2 ring-emerald-500/20 text-slate-900"
                        : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800"
                    }`}
                  />

                  {customerSearch ? (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                      title="Clear customer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  )}
                </div>

                {/* Autocomplete Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl border border-slate-200 shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50 text-[11px] font-semibold text-slate-600 flex items-center justify-between border-b border-slate-200 sticky top-0">
                      <span>Matching Customers ({matchingCustomers.length})</span>
                      <span className="text-[10px] text-slate-400">Click any party to select</span>
                    </div>

                    {/* Quick Add Party if not exists */}
                    {customerSearch.trim() && !customers.some(c => c.name.toLowerCase() === customerSearch.trim().toLowerCase()) && (
                      <div className="p-2.5 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between gap-2">
                        <span className="text-xs text-blue-900 font-medium truncate">
                          Party not in list: <strong className="font-bold">&quot;{customerSearch.trim().toUpperCase()}&quot;</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCreateNewParty(customerSearch)}
                          className="shrink-0 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-xs transition-colors"
                        >
                          + Add New Party
                        </button>
                      </div>
                    )}

                    {matchingCustomers.length > 0 ? (
                      matchingCustomers.map((c) => {
                        const isMatchPrefix = customerSearch.trim() && c.name.toLowerCase().startsWith(customerSearch.trim().toLowerCase());
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className={`w-full text-left p-2.5 hover:bg-blue-50/80 transition-colors flex items-center justify-between text-xs ${
                              selectedCustomerId === c.id ? "bg-blue-50 font-bold" : ""
                            }`}
                          >
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span className={isMatchPrefix ? "text-blue-700 underline underline-offset-2" : ""}>
                                  {c.name}
                                </span>
                                {c.is_unidentified && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-normal">
                                    Retail Cash
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                {c.phone && <span>📞 {c.phone}</span>}
                                {c.address && <span>• {c.address}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <span className={`text-[11px] font-semibold ${c.current_balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                Due: {formatCurrency(c.current_balance)}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : customerSearch.trim() ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        <p>No customer found matching &quot;<strong>{customerSearch}</strong>&quot;.</p>
                        <button
                          type="button"
                          onClick={() => handleCreateNewParty(customerSearch)}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create &quot;{customerSearch.trim().toUpperCase()}&quot;</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        <p className="font-semibold text-slate-600">No party accounts yet.</p>
                        <p className="mt-1 text-[11px]">Type customer name to create on the fly, or click &quot;Quick: Retail (UNKNOWN)&quot;.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Confirmation Details Card */}
                {selectedCustomer && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-xs flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-emerald-950">{selectedCustomer.name}</div>
                        <div className="text-[11px] text-emerald-700">
                          {selectedCustomer.phone || selectedCustomer.code || "Registered Customer"}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-800 text-xs">
                      Ledger Due: {formatCurrency(selectedCustomer.current_balance)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bill Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Defaulted to today ({billDate})</p>
              </div>
            </div>

            {/* Category Form Details */}
            {category === "cement" && (
              <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Cement Specifications (Manual Entry)
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">Bags × Rate = Invoice Total</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Cement Brand <span className="text-rose-500">*</span>
                      </label>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowCementModal(true)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors"
                          title="Admin: Edit, Add or Remove Cement Brands"
                        >
                          <Settings2 className="w-3 h-3" />
                          <span>Manage Brands</span>
                        </button>
                      )}
                    </div>
                    <select
                      value={cementType}
                      onChange={(e) => handleCementBrandChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      {cementBrands
                        .filter((b) => b.isActive || b.name === cementType)
                        .map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name} {b.defaultRate ? `(₹${b.defaultRate}/bag)` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Quantity (Bags) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 50"
                      value={cementBags}
                      onChange={(e) => setCementBags(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Unit Rate per Bag (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      placeholder="e.g. 340"
                      value={cementRate}
                      onChange={(e) => setCementRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {category === "rod" && (
              <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Rod / Steel Specifications (Manual Entry)
                  </div>
                  <span className="text-[11px] text-amber-700 font-medium">Kg × Rate/Kg = Invoice Total</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Rod Size <span className="text-rose-500">*</span>
                      </label>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowRodModal(true)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition-colors"
                          title="Admin: Edit, Add or Remove Rod Sizes & Rates"
                        >
                          <Settings2 className="w-3 h-3" />
                          <span>Manage Sizes</span>
                        </button>
                      )}
                    </div>
                    <select
                      value={rodSize}
                      onChange={(e) => handleRodSizeChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      {rodSizes
                        .filter((s) => s.isActive || s.size === rodSize)
                        .map((s) => (
                          <option key={s.id} value={s.size}>
                            {s.size} {s.defaultRate ? `(₹${s.defaultRate}/kg)` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Quantity (Kg) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.1"
                      required
                      placeholder="e.g. 150.5"
                      value={rodKg}
                      onChange={(e) => setRodKg(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Rate per Kg (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      required
                      placeholder="e.g. 68.00"
                      value={rodRate}
                      onChange={(e) => setRodRate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {category === "daily" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Electrical & Hardware Line Items (Manual Entry)</span>
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
                          placeholder="Item Description (e.g. Anchor 16A Switch / 2.5mm Wire)"
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

            {/* Total Display & Actions */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Invoice Value</span>
                <div className="text-2xl font-black text-blue-700">
                  {formatCurrency(currentTotal)}
                </div>
                {!selectedCustomerId && (
                  <span className="text-[11px] text-amber-600 font-medium">⚠️ Select customer to enable posting</span>
                )}
                {selectedCustomerId && currentTotal <= 0 && (
                  <span className="text-[11px] text-slate-500">Enter quantity & unit rate to calculate total</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/sales"
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={!selectedCustomerId || currentTotal <= 0}
                  className="flex items-center gap-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Post Bill & Save</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Admin Master Catalog Modals */}
      <CementBrandManagerModal
        isOpen={showCementModal}
        onClose={() => setShowCementModal(false)}
        onBrandCreated={(b) => {
          setCementType(b.name);
          if (b.defaultRate) setCementRate(String(b.defaultRate));
        }}
      />
      <RodSizeManagerModal
        isOpen={showRodModal}
        onClose={() => setShowRodModal(false)}
        onSizeCreated={(s) => {
          setRodSize(s.size);
          if (s.defaultRate) setRodRate(String(s.defaultRate));
        }}
      />
    </div>
  );
}
