import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

export default function Mahasiswa() {
    const [amount, setAmount] = useState('');
    const [qrUrl, setQrUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateQR = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setQrUrl('');
        try {
            const response = await axios.post('/api/qris/generate', { amount: amount });
            if (response.data.status === 'success') {
                setQrUrl(response.data.qr_url);
            }
        } catch (err) {
            setError('Gagal membuat QRIS.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Kelompok: Demo Kelompok</h1>
                        <p className="text-gray-500">Halo, Mahasiswa</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Saldo Tersedia</p>
                        <p className="text-3xl font-bold text-emerald-600">Rp 0</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Terima Pembayaran (QRIS)</h2>
                    <form onSubmit={handleGenerateQR} className="flex gap-4 mb-6">
                        <div className="flex-1">
                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required min="1000" />
                        </div>
                        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:bg-blue-300">{loading ? 'Memproses...' : 'Generate QR'}</button>
                    </form>
                    {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-md">{error}</div>}
                    {qrUrl && (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                            <p className="mb-4 text-gray-600 font-medium">Scan QRIS di bawah ini:</p>
                            <div className="p-4 bg-white shadow-sm rounded-xl">
                                <QRCodeSVG value={qrUrl} size={250} level="H" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}