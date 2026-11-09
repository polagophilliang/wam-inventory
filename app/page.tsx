"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// --- INISIALISASI SUPABASE (HARDCODE) ---
const supabaseUrl = "https://fhwsdlclewkndlqxdosf.supabase.co";
const supabaseKey = "sb_publishable_FZPM7W77qu85aYaia5GrFA_q5GSJmhd";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  // Navigasi
  const [activeTab, setActiveTab] = useState("entry");
  
  // Data Master & Pencarian
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Form & Loading
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mutation_type: "1",
    warehouse: "China 1",
    qty: "",
    price: "",
    description: ""
  });

  // 1. Ambil data barang dari Supabase saat pertama kali dibuka
  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*, categories(name)')
        .order('name', { ascending: true });
      
      if (!error && data) {
        setMasterItems(data);
      }
    };
    fetchItems();
  }, []);

  // 2. Logika Filter Pencarian
  const filteredItems = searchQuery === "" 
    ? [] 
    : masterItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10);

  // 3. Pilih Barang
  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setShowDropdown(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 4. Simpan Transaksi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return alert("Pilih barang dulu, Buddy!");
    
    setIsLoading(true);

    const { error } = await supabase
      .from('transactions')
      .insert([{ 
        mutation_type: parseInt(formData.mutation_type),
        qty: parseInt(formData.qty),
        price: parseInt(formData.price) || 0,
        description: `${selectedItem.sku} | ${formData.warehouse} | ${formData.description}`
      }]);

    setIsLoading(false);

    if (error) {
      alert("Gagal menyimpan: " + error.message);
    } else {
      alert("🎉 Transaksi Berhasil Disimpan ke Database!");
      setFormData({ ...formData, qty: "", price: "", description: "" });
      setSelectedItem(null);
      setSearchQuery("");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
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
        </nav>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* TAB DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Selamat Datang di WAM Inventory</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm">Total Barang</h3>
                <p className="text-3xl font-bold mt-2">{masterItems.length}</p>
              </div>
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

              {/* AUTOCOMPLETE SEARCH BOX */}
              <div className="col-span-2 relative">
                <label className="block text-sm font-medium mb-1">Nama Barang (Ketik untuk mencari)</label>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedItem(null); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Contoh: KIAN, REFLEKTIF, LAKBAN..." 
                  className="w-full p-2 border rounded-lg bg-white" 
                  required 
                />
                
                {/* Dropdown Hasil Pencarian */}
                {showDropdown && filteredItems.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {filteredItems.map((item) => (
                      <li 
                        key={item.sku} 
                        onClick={() => handleSelectItem(item)}
                        className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        <span className="font-bold text-sm">{item.name}</span>
                        <span className="text-xs text-gray-500 ml-2">({item.sku})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">CODE S/N</label>
                <input type="text" value={selectedItem?.sku || ""} readOnly className="w-full p-2 border rounded-lg bg-gray-100 text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">KATEGORI</label>
                <input type="text" value={selectedItem?.categories?.name || ""} readOnly className="w-full p-2 border rounded-lg bg-gray-100 text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">SATUAN</label>
                <input type="text" value={selectedItem?.unit || ""} readOnly className="w-full p-2 border rounded-lg bg-gray-100 text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gudang</label>
                <select name="warehouse" value={formData.warehouse} onChange={handleChange} className="w-full p-2 border rounded-lg">
                  <option>China 1</option>
                  <option>China 2</option>
                  <option>Cat</option>
                  <option>Sparepart & Tools</option>
                  <option>General 1</option>
                  <option>General 2</option>
                  <option>General 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Qty</label>
                <input type="number" name="qty" value={formData.qty} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="0" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Harga (Rp)</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="0" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Keterangan</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2 border rounded-lg" rows={3} placeholder="Catatan tambahan..."></textarea>
              </div>

              <div className="col-span-2 mt-4">
                <button type="submit" disabled={isLoading} className={`w-full font-bold py-3 rounded-lg text-white ${isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                  {isLoading ? "Menyimpan ke Database..." : "Simpan Transaksi"}
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
                    <th className="p-3 border-b">Unit</th>
                    <th className="p-3 border-b text-center bg-green-50 text-green-700">Masuk</th>
                    <th className="p-3 border-b text-center bg-red-50 text-red-700">Keluar</th>
                    <th className="p-3 border-b text-center bg-yellow-50 text-yellow-700">Rusak</th>
                    <th className="p-3 border-b text-center bg-blue-50 text-blue-700 font-bold">Tersedia</th>
                  </tr>
                </thead>
                <tbody>
                  {masterItems.map((item: any) => {
                    // Hitung manual sementara (karena belum nyambung ke View stok_barang)
                    // Nanti kita ganti pake data dari Supabase View
                    const masuk = 0; 
                    const keluar = 0; 
                    const rusak = 0;
                    const tersedia = masuk - keluar - rusak;

                    return (
                      <tr key={item.sku} className="hover:bg-gray-50">
                        <td className="p-3 border-b font-mono text-xs">{item.sku}</td>
                        <td className="p-3 border-b font-medium">{item.name}</td>
                        <td className="p-3 border-b">{item.categories?.name}</td>
                        <td className="p-3 border-b">{item.unit}</td>
                        <td className="p-3 border-b text-center text-green-600">{masuk}</td>
                        <td className="p-3 border-b text-center text-red-600">{keluar}</td>
                        <td className="p-3 border-b text-center text-yellow-600">{rusak}</td>
                        <td className="p-3 border-b text-center font-bold text-blue-700">{tersedia}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
