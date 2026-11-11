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
  const [keteranganTerakhir, setKeteranganTerakhir] = useState<any[]>([]);
  
  // State Form Entry
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
  const [filterMutasi, setFilterMutasi] = useState("");
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // State Laporan Bulanan
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [laporanBulanan, setLaporanBulanan] = useState<any[]>([]);
  const [isLoadingBulanan, setIsLoadingBulanan] = useState(false);

  // State Master Search
  const [searchMaster, setSearchMaster] = useState("");
  const [filterKategori, setFilterKategori] = useState("");

  // State Form Tambah Barang Baru
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category_id: "",
    unit: "",
    prefix: ""
  });

  const fetchLaporanBulanan = async () => {
    setIsLoadingBulanan(true);
    const { data, error } = await supabase.rpc('laporan_stok_bulanan', { p_tahun: tahun, p_bulan: bulan });
    if (!error && data) setLaporanBulanan(data);
    else alert("Gagal ambil laporan bulanan: " + error?.message);
    setIsLoadingBulanan(false);
  };

  // 1. Ambil Semua Data
  const fetchAllData = async () => {
    const { data: items } = await supabase.from('items').select('*, categories(name)').order('name');
    if (items) setMasterItems(items);
    
    const { data: vendors } = await supabase.from('vendors').select('*').order('name');
    if (vendors) setMasterVendors(vendors);

    const { data: warehouses } = await supabase.from('warehouses').select('*, description').order('name');
    if (warehouses) setMasterWarehouses(warehouses);

    const { data: stok } = await supabase.from('stok_barang').select('*');
    if (stok) setStokData(stok);

    const { data: posisi } = await supabase.from('posisi_barang').select('*');
    if (posisi) setPosisiBarang(posisi);

    const { data: ket } = await supabase.from('keterangan_terakhir').select('*');
    if (ket) setKeteranganTerakhir(ket);
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
    
    if (formData.mutation_type === "1") {
      if (!formData.vendor_id) return alert("Pilih Vendor dulu!");
      if (!formData.warehouse_id) return alert("Pilih Gudang dulu!");
    } else {
      if (!formData.warehouse_id) return alert("Pilih Tujuan dulu!");
      if (!formData.description) return alert("Keterangan WAJIB diisi buat Barang Keluar/Rusak!");
    }
    
    setIsLoading(true);

    const { error } = await supabase
      .from('transactions')
      .insert([{ 
        date: formData.date,
        mutation_type: parseInt(formData.mutation_type),
        item_id: selectedItem.id,
        vendor_id: formData.mutation_type === "1" ? parseInt(formData.vendor_id) : null,
        warehouse_id: parseInt(formData.warehouse_id),
        qty: parseInt(formData.qty),
        price: formData.mutation_type === "1" ? (parseInt(formData.price) || 0) : 0,
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

  // 4. Batalkan Transaksi (Reversal)
  const handleCancelTransaction = async (row: any) => {
    if (!confirm(`Yakin mau batalkan transaksi ${row.items?.name} sebesar ${row.qty}? Stok akan dikembalikan.`)) return;
    
    setIsLoading(true);
    
    let reversalType = 1; 
    if (row.mutation_type === 1) reversalType = 2; 
    if (row.mutation_type === 2) reversalType = 1; 
    if (row.mutation_type === 3) reversalType = 1; 

    const { error } = await supabase
      .from('transactions')
      .insert([{ 
        date: new Date().toISOString().split('T')[0],
        mutation_type: reversalType,
        item_id: row.item_id,
        vendor_id: row.vendor_id || null,
        warehouse_id: row.warehouse_id,
        qty: row.qty,
        price: 0,
        description: `[BATAL] ${row.description || ''}`
      }]);

    setIsLoading(false);

    if (error) {
      alert("Gagal membatalkan: " + error.message);
    } else {
      alert("🎉 Transaksi Berhasil Dibatalkan! Stok sudah dikembalikan.");
      fetchReport(); 
      fetchAllData(); 
    }
  };

  // 5. Ambil Data Laporan
  const fetchReport = async () => {
    setIsLoadingReport(true);
    let query = supabase.from('transactions').select(`
      id, created_at, mutation_type, qty, price, description,
      item_id, items(name, sku),
      vendor_id, vendors(name),
      warehouse_id, warehouses(name)
    `);
    
    if (filterStart) query = query.gte('date', filterStart);
    if (filterEnd) query = query.lte('date', filterEnd);
    if (filterVendor) query = query.eq('vendor_id', filterVendor);
    if (filterMutasi) query = query.eq('mutation_type', parseInt(filterMutasi));

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setReportData(data);
    } else {
      console.error(error);
      alert("Gagal ambil laporan: " + error?.message);
    }
    setIsLoadingReport(false);
  };

  // 6. Fungsi Download Excel (CSV)
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

  // 7. Fungsi Tambah Barang Baru
  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.category_id || !newItem.unit || !newItem.prefix) {
      return alert("Lengkapi Nama, Kategori, Satuan, dan Prefix dulu, Buddy!");
    }
    setIsLoading(true);
    const prefix = newItem.prefix.toUpperCase();
    if (prefix.length !== 3) {
      setIsLoading(false);
      return alert("Prefix harus 3 huruf, contoh: CON, SPA, AKS.");
    }
    
    const { count } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('prefix', prefix);
    const urutan = (count || 0) + 1;
    const sequence = String(urutan).padStart(3, '0');
    const cleanName = newItem.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const sku = `${prefix}-${sequence}-${cleanName.slice(0, 7)}`;

    const { error } = await supabase.from('items').insert([{
      sku: sku,
      name: newItem.name.toUpperCase(),
      category_id: parseInt(newItem.category_id),
      unit: newItem.unit.toUpperCase(),
      prefix: prefix
    }]);

    setIsLoading(false);
    if (error) {
      alert("Gagal nambah barang: " + error.message);
    } else {
      alert(`🎉 Barang Baru Berhasil Ditambahkan!\n\nSKU: ${sku}`);
      setNewItem({ name: "", category_id: "", unit: "", prefix: "" });
      setShowAddItemForm(false);
      fetchAllData();
    }
  };
