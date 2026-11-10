"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fhwsdlclewkndlqxdosf.supabase.co";
const supabaseKey = "sb_publishable_FZPM7W77qu85aYaia5GrFA_q5GSJmhd";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // State Master
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [masterVendors, setMasterVendors] = useState<any[]>([]);
  const [masterWarehouses, setMasterWarehouses] = useState<any[]>([]);
  const [stokData, setStokData] = useState<any[]>([]);
  const [posisiBarang, setPosisiBarang] = useState<any[]>([]);
  
  // State Form
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mutation_type: "1",
    warehouse_id: "",
    vendor_id: "",
    qty: "",
    price: "",
    description: ""
  });

    // State Laporan
  const [reportData, setReportData] = useState<any[]>([]);
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // --- TAMBAHAN BARU UNTUK LAPORAN BULANAN ---
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [laporanBulanan, setLaporanBulanan] = useState<any[]>([]);
  const [isLoadingBulanan, setIsLoadingBulanan] = useState(false);

  const fetchLaporanBulanan = async () => {
    setIsLoadingBulanan(true);
    const { data, error } = await supabase.rpc('laporan_stok_bulanan', { p_tahun: tahun, p_bulan: bulan });
    if (!error && data) setLaporanBulanan(data);
    else alert("Gagal ambil laporan bulanan: " + error?.message);
    setIsLoadingBulanan(false);
  };
  // ------------------------------------------

  // 1. Ambil Semua Data
  const fetchAllData = async () => {
    const { data: items } = await supabase.from('items').select('*, categories(name)').order('name');
    if (items) setMasterItems(items);
    
    const { data: vendors } = await supabase.from('vendors').select('*').order('name');
    if (vendors) setMasterVendors(vendors);

    const { data: warehouses } = await supabase.from('warehouses').select('*').order('name');
    if (warehouses) setMasterWarehouses(warehouses);

    const { data: stok } = await supabase.from('stok_barang').select('*');
    if (stok) setStokData(stok);

    const { data: posisi } = await supabase.from('posisi_barang').select('*');
    if (posisi) setPosisiBarang(posisi);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 2. Logika Pencarian Barang
  const filteredItems = searchQuery === "" 
    ? [] 
    : masterItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10);

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setShowDropdown(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Simpan Transaksi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return alert("Pilih barang dulu, Buddy!");
    if (!formData.vendor_id) return alert("Pilih Vendor dulu!");
    if (!formData.warehouse_id) return alert("Pilih Gudang dulu!");
    
    setIsLoading(true);

    const { error } = await supabase
      .from('transactions')
      .insert([{ 
        mutation_type: parseInt(formData.mutation_type),
        item_id: selectedItem.id,
        vendor_id: parseInt(formData.vendor_id),
        warehouse_id: parseInt(formData.warehouse_id),
        qty: parseInt(formData.qty),
        price: parseInt(formData.price) || 0,
        description: formData.description
      }]);

    setIsLoading(false);

    if (error) {
      alert("Gagal menyimpan: " + error.message);
    } else {
      alert("🎉 Transaksi Berhasil Disimpan!");
      setFormData({ ...formData, qty: "", price: "", description: "", vendor_id: "", warehouse_id: "" });
      setSelectedItem(null);
      setSearchQuery("");
      fetchAllData(); 
    }
  };

  // 4. Ambil Data Laporan
  const fetchReport = async () => {
    setIsLoadingReport(true);
    let query = supabase.from('transactions').select(`
      id, created_at, mutation_type, qty, price,
      item_id, items(name, sku),
      vendor_id, vendors(name),
      warehouse_id, warehouses(name)
    `);
    
    if (filterStart) query = query.gte('date', filterStart);
    if (filterEnd) query = query.lte('date', filterEnd);
    if (filterVendor) query = query.eq('vendor_id', filterVendor);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setReportData(data);
    } else {
      console.error(error);
      alert("Gagal ambil laporan: " + error?.message);
    }
    setIsLoadingReport(false);
  };

  // 5. Fungsi Download Excel (CSV) - Rapi pakai titik koma
  const downloadCSV = () => {
    if (reportData.length === 0) return alert("Tidak ada data untuk didownload.");
    
    const headers = ["Tanggal", "Vendor", "Barang", "Gudang", "Kode Mutasi", "Qty", "Harga Satuan", "Total Harga"];
    
    const rows = reportData.map((row: any) => {
      const total = row.price ? row.price * row.qty : 0;
      return [
        row.created_at?.split('T')[0] || "-",
        row.vendors?.name || "-",
        row.items?.name || "-",
        row.warehouses?.name || "-",
        row.mutation_type, 
        row.qty,
        row.price || 0,
        total
      ];
    });

    const csvContent = [headers, ...rows]
      .map(e => e.map(item => String(item).replace(/;/g, ',')).join(";")) 
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Laporan_WAM_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b border-slate-700">
          <img 
            src="data:image/jpeg;base64,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" 
            alt="WAM Logo" 
            className="w-10 h-10 object-contain rounded-full bg-white" 
          />
          <div>
            <h1 className="font-bold text-lg leading-tight">WAM Inventory</h1>
            <p className="text-xs text-slate-400">Stockist System</p>
          </div>
        </div>
                <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={`block w-full text-left px-4 py-2 rounded-lg ${activeTab === 'dashboard' ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800'}`}>Dashboard</button>
          <button onClick={() => setActiveTab("entry")} className={`block w-full text-left px-4 py-2 rounded-lg ${activeTab === 'entry' ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800'}`}>Data Entry</button>
          <button onClick={() => setActiveTab("master")} className={`block w-full text-left px-4 py-2 rounded-lg ${activeTab === 'master' ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800'}`}>Master Barang</button>
          <button onClick={() => setActiveTab("report")} className={`block w-full text-left px-4 py-2 rounded-lg ${activeTab === 'report' ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800'}`}>Laporan</button>
          
          {/* TAMBAHAN BARU: Tombol Lap. Bulanan */}
          <button onClick={() => setActiveTab("lap_bulanan")} className={`block w-full text-left px-4 py-2 rounded-lg ${activeTab === 'lap_bulanan' ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800'}`}>Lap. Bulanan</button>

        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        
        {/* TAB DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Dashboard Inventory</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium">Total Master Barang</h3>
                <p className="text-4xl font-bold mt-2 text-slate-800">{masterItems.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium">Total Stok Tersedia</h3>
                <p className="text-4xl font-bold mt-2 text-green-600">{stokData.reduce((acc, curr) => acc + (curr.stok_tersedia || 0), 0).toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm font-medium">Total Vendor Terdaftar</h3>
                <p className="text-4xl font-bold mt-2 text-blue-600">{masterVendors.length}</p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-4 text-slate-800">Posisi Stok per Gudang</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {masterWarehouses.map((wh) => {
                const itemsDiGudang = posisiBarang.filter(r => r.nama_gudang === wh.name);
                return (
                  <div key={wh.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-slate-800 text-white p-3 font-bold text-sm flex justify-between">
                      <span>{wh.name}</span>
                      <span className="bg-slate-700 px-2 rounded">{itemsDiGudang.length} Items</span>
                    </div>
                    <div className="p-4 max-h-60 overflow-y-auto">
                      {itemsDiGudang.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">Belum ada stok</p>
                      ) : (
                        <ul className="space-y-2">
                          {itemsDiGudang.map((item, idx) => (
                            <li key={idx} className="flex justify-between items-start border-b border-gray-100 pb-2 last:border-0 text-sm">
                              <div className="pr-2 flex gap-1.5">
                                <span className="text-slate-400 text-xs mt-0.5">-</span>
                                <div>
                                  <p className="text-[12px] font-normal text-slate-700 leading-tight line-clamp-2">{item.nama_barang}</p>
                                  <p className="text-[10px] text-gray-500 font-mono">{item.sku}</p>
                                </div>
                              </div>
                              <div className="text-right whitespace-nowrap">
                                <span className="font-semibold text-blue-600 text-sm">{item.qty_tersedia}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB DATA ENTRY */}
        {activeTab === "entry" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Input Transaksi Gudang</h2>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-2 gap-4">
              
              <div>
                <label className="block text-sm font-medium mb-1">Tanggal</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kode Mutasi</label>
                <select name="mutation_type" value={formData.mutation_type} onChange={handleChange} className="w-full p-2 border rounded-lg">
                  <option value="1">1 - Barang Masuk (IN)</option>
                  <option value="2">2 - Barang Keluar (OUT)</option>
                  <option value="3">3 - Rusak / Reject</option>
                </select>
              </div>

              <div className="col-span-2 relative">
                <label className="block text-sm font-medium mb-1">Nama Barang</label>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedItem(null); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Ketik nama atau SKU barang..." 
                  className="w-full p-2 border rounded-lg bg-white" 
                  required 
                />
                {showDropdown && filteredItems.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {filteredItems.map((item) => (
                      <li key={item.sku} onClick={() => handleSelectItem(item)} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0">
                        <span className="font-bold text-sm">{item.name}</span>
                        <span className="text-xs text-gray-500 ml-2">({item.sku})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">CODE S/N</label>
                <input type="text" value={selectedItem?.sku || ""} readOnly className="w-full p-2 border rounded-lg bg-gray-100 font-mono text-xs" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">KATEGORI</label>
                <input type="text" value={selectedItem?.categories?.name || ""} readOnly className="w-full p-2 border rounded-lg bg-gray-100 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vendor / Supplier</label>
                <select name="vendor_id" value={formData.vendor_id} onChange={handleChange} className="w-full p-2 border rounded-lg" required>
                  <option value="">-- Pilih Vendor --</option>
                  {masterVendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gudang</label>
                <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} className="w-full p-2 border rounded-lg" required>
                  <option value="">-- Pilih Gudang --</option>
                  {masterWarehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Qty</label>
                <input type="number" name="qty" value={formData.qty} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Harga (Rp)</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full p-2 border rounded-lg" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Keterangan Tambahan</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border rounded-lg" rows={2}></textarea>
              </div>

              <div className="col-span-2 mt-4">
                <button type="submit" disabled={isLoading} className={`w-full font-bold py-3 rounded-lg text-white ${isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                  {isLoading ? "Menyimpan..." : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB MASTER BARANG */}
        {activeTab === "master" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Master Barang & Stok</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs"> {/* Ukuran font tabel diperkecil */}
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-semibold">
                    <th className="p-2 border-b">SKU</th>
                    <th className="p-2 border-b">Nama Barang</th>
                    <th className="p-2 border-b">Kategori</th>
                    <th className="p-2 border-b text-center bg-green-50 text-green-700">Masuk</th>
                    <th className="p-2 border-b text-center bg-red-50 text-red-700">Keluar</th>
                    <th className="p-2 border-b text-center bg-yellow-50 text-yellow-700">Rusak</th>
                    <th className="p-2 border-b text-center bg-blue-50 text-blue-700">Tersedia</th>
                    <th className="p-2 border-b">Posisi Gudang</th>
                  </tr>
                </thead>
                <tbody>
                  {stokData.length === 0 ? (
                    <tr><td colSpan={8} className="p-4 text-center text-gray-500">Memuat data / Belum ada data.</td></tr>
                  ) : (
                    stokData.map((item) => {
                      const lokasi = posisiBarang.filter(p => p.sku === item.sku);
                      return (
                        <tr key={item.sku} className="hover:bg-gray-50">
                          {/* SKU font mono tapi ukuran kecil, nggak tebal banget */}
                          <td className="p-2 border-b font-mono text-[11px] text-slate-700">{item.sku}</td>
                          <td className="p-2 border-b font-medium text-slate-800">{item.name}</td>
                          <td className="p-2 border-b text-gray-600">{item.kategori}</td>
                          <td className="p-2 border-b text-center text-green-600 font-medium">{item.total_masuk}</td>
                          <td className="p-2 border-b text-center text-red-600 font-medium">{item.total_keluar}</td>
                          <td className="p-2 border-b text-center text-yellow-600 font-medium">{item.total_rusak}</td>
                          <td className="p-2 border-b text-center font-semibold text-blue-700">{item.stok_tersedia}</td>
                          <td className="p-2 border-b text-[10px]">
                            {lokasi.length === 0 ? "-" : (
                              <div className="flex flex-col gap-1">
                                {lokasi.map((l, i) => (
                                  <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded inline-block w-max border border-slate-200 text-slate-600">
                                    {l.nama_gudang}: <span className="font-semibold text-slate-800">{l.qty_tersedia}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB LAPORAN */}
        {activeTab === "report" && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Laporan Transaksi</h2>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4 items-end flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-1">Dari Tanggal</label>
                <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sampai Tanggal</label>
                <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vendor</label>
                <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} className="p-2 border rounded-lg min-w-[200px]">
                  <option value="">Semua Vendor</option>
                  {masterVendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2">
                <button onClick={fetchReport} disabled={isLoadingReport} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 h-[42px]">
                  {isLoadingReport ? "Memuat..." : "Tampilkan"}
                </button>
                <button onClick={downloadCSV} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 h-[42px] flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Excel
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-semibold">
                    <th className="p-2 border-b">Tanggal</th>
                    <th className="p-2 border-b">Vendor</th>
                    <th className="p-2 border-b">Barang</th>
                    <th className="p-2 border-b">Gudang</th>
                    <th className="p-2 border-b text-center">Kode Mutasi</th>
                    <th className="p-2 border-b text-center">Qty</th>
                    <th className="p-2 border-b text-right">Total Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr><td colSpan={7} className="p-4 text-center text-gray-500">Belum ada data / Silakan klik Tampilkan.</td></tr>
                  ) : (
                    reportData.map((row: any) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="p-2 border-b text-gray-600">{row.created_at?.split('T')[0]}</td>
                        <td className="p-2 border-b font-medium text-slate-800">{row.vendors?.name}</td>
                        <td className="p-2 border-b">
                          <div className="font-medium text-slate-800">{row.items?.name}</div>
                          <div className="font-mono text-[10px] text-gray-500">{row.items?.sku}</div>
                        </td>
                        <td className="p-2 border-b text-gray-600">{row.warehouses?.name}</td>
                        {/* KODE MUTASI HANYA ANGKA */}
                        <td className="p-2 border-b text-center font-semibold text-slate-700">{row.mutation_type}</td>
                        <td className="p-2 border-b text-center font-semibold text-slate-800">{row.qty}</td>
                        <td className="p-2 border-b text-right text-gray-700">{row.price ? `Rp ${(row.price * row.qty).toLocaleString()}` : '-'}</td>
                      </tr>
                    ))
                  )}
                
                </tbody>
              </table>
            </div>
          </div>
        )}
                {/* TAB LAPORAN BULANAN */}
        {activeTab === "lap_bulanan" && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Laporan Stok Bulanan (Cut Off)</h2>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4 items-end flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-1">Bulan</label>
                <select value={bulan} onChange={e => setBulan(parseInt(e.target.value))} className="p-2 border rounded-lg">
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tahun</label>
                <input type="number" value={tahun} onChange={e => setTahun(parseInt(e.target.value))} className="p-2 border rounded-lg w-24" />
              </div>
              <button onClick={fetchLaporanBulanan} disabled={isLoadingBulanan} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 h-[42px]">
                {isLoadingBulanan ? "Memuat..." : "Tampilkan"}
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-semibold">
                    <th className="p-2 border-b">SKU</th>
                    <th className="p-2 border-b">Nama Barang</th>
                    <th className="p-2 border-b">Gudang</th>
                    <th className="p-2 border-b text-center bg-slate-200">Stok Awal</th>
                    <th className="p-2 border-b text-center bg-green-50 text-green-700">Masuk</th>
                    <th className="p-2 border-b text-center bg-red-50 text-red-700">Keluar</th>
                    <th className="p-2 border-b text-center bg-yellow-50 text-yellow-700">Rusak</th>
                    <th className="p-2 border-b text-center bg-blue-100 text-blue-800">Stok Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {laporanBulanan.length === 0 ? (
                    <tr><td colSpan={8} className="p-4 text-center text-gray-500">Belum ada data untuk bulan ini.</td></tr>
                  ) : (
                    laporanBulanan.map((row: any, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-2 border-b font-mono text-[11px] text-slate-700">{row.sku}</td>
                        <td className="p-2 border-b font-medium text-slate-800">{row.nama_barang}</td>
                        <td className="p-2 border-b text-gray-600">{row.nama_gudang}</td>
                        <td className="p-2 border-b text-center bg-slate-50">{row.stok_awal}</td>
                        <td className="p-2 border-b text-center text-green-600">{row.total_masuk}</td>
                        <td className="p-2 border-b text-center text-red-600">{row.total_keluar}</td>
                        <td className="p-2 border-b text-center text-yellow-600">{row.total_rusak}</td>
                        <td className="p-2 border-b text-center font-bold text-blue-700">{row.stok_akhir}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

