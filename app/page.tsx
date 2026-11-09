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
    // Ubah !inner jadi left join (default), biar data kosong tetep kebaca
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

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b border-slate-700">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-xl">W</div>
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
                        <ul className="space-y-3">
                          {itemsDiGudang.map((item, idx) => (
                            <li key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                              <div className="pr-2">
                                <p className="text-sm font-semibold text-slate-700 leading-tight line-clamp-2">{item.nama_barang}</p>
                                <p className="text-xs text-gray-500">{item.sku}</p>
                              </div>
                              <div className="text-right whitespace-nowrap">
                                <span className="font-bold text-blue-600">{item.qty_tersedia}</span>
                                <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
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
                <input type="text" value={selectedItem?.sku || ""} readOnly className="w-full p-2 border rounded-lg bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">KATEGORI</label>
                <input type="text" value={selectedItem?.categories?.name || ""} readOnly className="w-full p-2 border rounded-lg bg-gray-100" />
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
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b">SKU</th>
                    <th className="p-3 border-b">Nama Barang</th>
                    <th className="p-3 border-b">Kategori</th>
                    <th className="p-3 border-b text-center bg-green-50 text-green-700">Masuk</th>
                    <th className="p-3 border-b text-center bg-red-50 text-red-700">Keluar</th>
                    <th className="p-3 border-b text-center bg-yellow-50 text-yellow-700">Rusak</th>
                    <th className="p-3 border-b text-center bg-blue-50 text-blue-700">Tersedia</th>
                    <th className="p-3 border-b">Posisi Gudang</th>
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
                          <td className="p-3 border-b font-mono text-xs">{item.sku}</td>
                          <td className="p-3 border-b font-medium">{item.name}</td>
                          <td className="p-3 border-b">{item.kategori}</td>
                          <td className="p-3 border-b text-center text-green-600">{item.total_masuk}</td>
                          <td className="p-3 border-b text-center text-red-600">{item.total_keluar}</td>
                          <td className="p-3 border-b text-center text-yellow-600">{item.total_rusak}</td>
                          <td className="p-3 border-b text-center font-bold text-blue-700">{item.stok_tersedia}</td>
                          <td className="p-3 border-b text-xs">
                            {lokasi.length === 0 ? "-" : (
                              <div className="flex flex-col gap-1">
                                {lokasi.map((l, i) => (
                                  <span key={i} className="bg-slate-100 px-2 py-1 rounded inline-block w-max border border-slate-200">
                                    {l.nama_gudang}: <b>{l.qty_tersedia}</b>
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
              <button onClick={fetchReport} disabled={isLoadingReport} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 h-[42px]">
                {isLoadingReport ? "Memuat..." : "Tampilkan"}
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-3 border-b">Tanggal</th>
                    <th className="p-3 border-b">Vendor</th>
                    <th className="p-3 border-b">Barang</th>
                    <th className="p-3 border-b">Gudang</th>
                    <th className="p-3 border-b text-center">Mutasi</th>
                    <th className="p-3 border-b text-center">Qty</th>
                    <th className="p-3 border-b text-right">Total Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr><td colSpan={7} className="p-4 text-center text-gray-500">Belum ada data / Silakan klik Tampilkan.</td></tr>
                  ) : (
                    reportData.map((row: any) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="p-3 border-b">{row.created_at?.split('T')[0]}</td>
                        <td className="p-3 border-b font-medium">{row.vendors?.name}</td>
                        <td className="p-3 border-b">{row.items?.name}</td>
                        <td className="p-3 border-b">{row.warehouses?.name}</td>
                        <td className="p-3 border-b text-center">
                          {row.mutation_type === 1 ? <span className="text-green-600 font-bold">IN</span> : row.mutation_type === 2 ? <span className="text-red-600 font-bold">OUT</span> : <span className="text-yellow-600 font-bold">RUSAK</span>}
                        </td>
                        <td className="p-3 border-b text-center font-bold">{row.qty}</td>
                        <td className="p-3 border-b text-right">{row.price ? `Rp ${(row.price * row.qty).toLocaleString()}` : '-'}</td>
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
