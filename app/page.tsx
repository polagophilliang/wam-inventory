'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- INISIALISASI SUPABASE ---
// Ganti 2 baris di atas dengan ini:
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- DUMMY DATA BARANG ---
const dummyItems = [
  {
    sku: 'CON-164-REFLECTI',
    name: 'REFLECTIVE SILVER GELAP 27 X 33',
    category: 'CONSUMABLE',
    unit: 'LEMBAR',
  },
  {
    sku: 'AKS-001-PALLET',
    name: 'PALLET BOARD MBR',
    category: 'AKSESORIS',
    unit: 'UNIT',
  },
  {
    sku: 'SPA-015-LAMBAN',
    name: 'LAMBAN BENSIN 4 INCH',
    category: 'SPAREPART',
    unit: 'ROLL',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('entry'); // Default ke form input
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // State untuk nampung inputan
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mutation_type: '1',
    warehouse: 'China 1',
    qty: '',
    price: '',
    description: '',
  });

  const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const item = dummyItems.find((i) => i.sku === e.target.value);
    setSelectedItem(item || null);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return alert('Pilih barang dulu, Buddy!');

    setIsLoading(true);

    const { error } = await supabase.from('transactions').insert([
      {
        mutation_type: parseInt(formData.mutation_type),
        qty: parseInt(formData.qty),
        price: parseInt(formData.price) || 0,
        description: `${selectedItem.sku} - ${formData.description}`,
      },
    ]);

    setIsLoading(false);

    if (error) {
      alert('Gagal menyimpan: ' + error.message);
    } else {
      alert('🎉 Transaksi Berhasil Disimpan ke Database!');
      setFormData({ ...formData, qty: '', price: '', description: '' });
      setSelectedItem(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b border-slate-700">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-xl">
            W
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">WAM Inventory</h1>
            <p className="text-xs text-slate-400">Stockist System</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`block w-full text-left px-4 py-2 rounded-lg ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-blue-400'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('entry')}
            className={`block w-full text-left px-4 py-2 rounded-lg ${
              activeTab === 'entry'
                ? 'bg-slate-800 text-blue-400'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Data Entry
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={`block w-full text-left px-4 py-2 rounded-lg ${
              activeTab === 'master'
                ? 'bg-slate-800 text-blue-400'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Master Barang
          </button>
        </nav>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* TAB DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              Selamat Datang di WAM Inventory
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm">Total Barang</h3>
                <p className="text-3xl font-bold mt-2">1,245</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm">Stok Masuk</h3>
                <p className="text-3xl font-bold mt-2 text-green-600">+320</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 text-sm">Stok Keluar</h3>
                <p className="text-3xl font-bold mt-2 text-red-600">-150</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB DATA ENTRY */}
        {activeTab === 'entry' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              Input Transaksi Gudang
            </h2>
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Kode Mutasi
                </label>
                <select
                  name="mutation_type"
                  value={formData.mutation_type}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="1">1 - Barang Masuk (IN)</option>
                  <option value="2">2 - Barang Keluar (OUT)</option>
                  <option value="3">3 - Rusak / Reject</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Nama Barang
                </label>
                <select
                  onChange={handleItemChange}
                  className="w-full p-2 border rounded-lg bg-gray-50"
                  required
                >
                  <option value="">-- Ketik / Pilih Barang --</option>
                  {dummyItems.map((item) => (
                    <option key={item.sku} value={item.sku}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">
                  CODE S/N
                </label>
                <input
                  type="text"
                  value={selectedItem?.sku || ''}
                  readOnly
                  className="w-full p-2 border rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">
                  KATEGORI
                </label>
                <input
                  type="text"
                  value={selectedItem?.category || ''}
                  readOnly
                  className="w-full p-2 border rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">
                  SATUAN
                </label>
                <input
                  type="text"
                  value={selectedItem?.unit || ''}
                  readOnly
                  className="w-full p-2 border rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gudang</label>
                <select
                  name="warehouse"
                  value={formData.warehouse}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg"
                >
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
                <input
                  type="number"
                  name="qty"
                  value={formData.qty}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Harga (Rp)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg"
                  placeholder="0"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Keterangan
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  placeholder="Catatan tambahan..."
                ></textarea>
              </div>

              <div className="col-span-2 mt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full font-bold py-3 rounded-lg transition-colors text-white ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? 'Menyimpan ke Database...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB MASTER BARANG */}
        {activeTab === 'master' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              Master Barang
            </h2>
            <p className="text-gray-500">
              Halaman ini masih dalam pengembangan.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
