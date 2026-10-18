import React, { useState } from 'react';

export default function Admin() {
    const [selectedKelompok, setSelectedKelompok] = useState('');
    const [modalAmount, setModalAmount] = useState('');
    
    const daftarKelompok = [
        { id: 1, nama_kelompok: 'Kelompok 1', saldo: 500000 },
        { id: 2, nama_kelompok: 'Kelompok 2', saldo: 750000 }
    ];

    const handleDistribusiModal = (e) => {
        e.preventDefault();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard Admin (BPA)</h1>
                    <p className="text-gray-500">Selamat datang, Admin BPA</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Distribusi Modal (Endowment)</h2>
                        <form onSubmit={handleDistribusiModal} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kelompok</label>
                                <select className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" value={selectedKelompok} onChange={(e) => setSelectedKelompok(e.target.value)} required>
                                    <option value="">-- Pilih Kelompok --</option>
                                    {daftarKelompok.map((klp) => (
                                        <option key={klp.id} value={klp.id}>{klp.nama_kelompok}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Modal</label>
                                <input type="number" value={modalAmount} onChange={(e) => setModalAmount(e.target.value)} className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500" required />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">Kirim Modal</button>
                        </form>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Monitoring Kelompok</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="p-3 border-b">Nama Kelompok</th>
                                        <th className="p-3 border-b">Total Saldo</th>
                                        <th className="p-3 border-b">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {daftarKelompok.map((klp) => (
                                        <tr key={klp.id} className="hover:bg-gray-50">
                                            <td className="p-3 border-b">{klp.nama_kelompok}</td>
                                            <td className="p-3 border-b font-medium text-emerald-600">Rp {klp.saldo.toLocaleString('id-ID')}</td>
                                            <td className="p-3 border-b"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Aktif</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}