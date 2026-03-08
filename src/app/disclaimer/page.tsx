'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Shield, 
  Car, 
  MapPin, 
  Power, 
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-r from-amber-600/10 to-orange-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-gradient-to-r from-red-600/10 to-orange-600/10 rounded-full blur-[80px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 blur-lg opacity-50"></div>
                <div className="relative p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                  <Car className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Bintan Drive</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Disclaimer</p>
              </div>
            </Link>
            
            <Link href="/">
              <Button variant="outline" className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Beranda
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full mb-4 shadow-lg shadow-amber-500/25">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent mb-3">
              Disclaimer & Ketentuan Penggunaan
            </h1>
            <p className="text-white/50 text-sm">
              Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Main Disclaimer Card */}
          <Card className="bg-white/[0.02] border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="h-5 w-5 text-amber-400" />
                Tanggung Jawab Platform
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-white/70">
              <p>
                <strong className="text-white">Bintan Drive</strong> adalah platform manajemen armada kendaraan yang menyediakan 
                layanan pencatatan sewa, pemantauan GPS, dan fitur keamanan kendaraan. Dengan menggunakan platform ini, 
                pengguna dianggap telah menyetujui ketentuan berikut:
              </p>
            </CardContent>
          </Card>

          {/* Feature-specific Disclaimers */}
          <div className="grid gap-4 mb-6">
            {/* Remote Kill Engine */}
            <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-300">
                  <Power className="h-5 w-5" />
                  Remote Kill Engine - PERINGATAN KHUSUS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-white/70">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-300 font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Fitur Tanggung Jawab Penuh Admin Operasional
                  </p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-white">Penggunaan fitur Remote Kill Engine sepenuhnya menjadi tanggung jawab admin operasional.</strong> 
                      Bintan Drive tidak bertanggung jawab atas segala konsekuensi yang timbul dari penggunaan fitur ini.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-white">Tidak diperkenankan menggunakan fitur ini sewaktu kendaraan dalam keadaan bergerak.</strong> 
                      Pelanggaran terhadap ketentuan ini dapat mengakibatkan kecelakaan dan cedera serius.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-white">Aktivasi Engine Kill hanya diperbolehkan dalam keadaan darurat.</strong> 
                      Seperti pencurian kendaraan atau pelanggaran sewa yang terbukti.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-white">Admin wajib mendokumentasikan alasan aktivasi Engine Kill.</strong> 
                      Setiap tindakan akan tercatat dalam sistem log.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* GPS Tracking */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <MapPin className="h-5 w-5 text-blue-400" />
                  GPS Tracking & Geofencing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-white/70">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>
                      Data lokasi kendaraan bersifat rahasia dan hanya dapat diakses oleh admin yang berwenang.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>
                      Alert geofencing bersifat informasi dan memerlukan verifikasi manual sebelum tindakan lebih lanjut.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>
                      Ketepatan lokasi GPS dapat dipengaruhi oleh kondisi cuaca, bangunan tinggi, dan interferensi sinyal.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Data & Privacy */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Shield className="h-5 w-5 text-purple-400" />
                  Data & Privasi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-white/70">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>
                      Data penyewa dan kendaraan disimpan dengan enkripsi dan dilindungi sesuai standar keamanan.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>
                      Data tidak akan dibagikan ke pihak ketiga tanpa persetujuan tertulis, kecuali diwajibkan oleh hukum.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>
                      Riwayat tracking disimpan selama 90 hari dan akan diarsipkan secara otomatis.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Account Tiers */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Car className="h-5 w-5 text-amber-400" />
                  Tingkat Akun & Fitur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-white/70">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h4 className="font-semibold text-white mb-2">Akun Standard</h4>
                    <ul className="text-sm space-y-1 text-white/60">
                      <li>• Manajemen katalog kendaraan</li>
                      <li>• Pencatatan sewa</li>
                      <li>• Laporan dasar</li>
                    </ul>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-4 border border-amber-500/20">
                    <h4 className="font-semibold text-amber-300 mb-2">Akun Premium</h4>
                    <ul className="text-sm space-y-1 text-white/60">
                      <li>• Semua fitur Standard</li>
                      <li>• GPS Tracking real-time</li>
                      <li>• Geofencing & Alerts</li>
                      <li>• Remote Engine Kill</li>
                      <li>• Port Watch Monitoring</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liability Section */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
                Batasan Tanggung Jawab
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-white/70">
              <p>
                Bintan Drive, termasuk pengembang, pemilik, dan pihak terkait lainnya, <strong className="text-white">tidak bertanggung jawab</strong> atas:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Kerugian finansial, fisik, atau materi yang timbul dari penggunaan platform ini</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Kesalahan pengambilan keputusan berdasarkan data dari sistem</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Kerusakan kendaraan akibat penggunaan fitur Engine Kill</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Keterlambatan atau kegagalan sistem akibat force majeure</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Akses tidak sah yang dilakukan oleh pihak ketiga</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="bg-white/[0.02] border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                Pertanyaan & Kontak
              </CardTitle>
            </CardHeader>
            <CardContent className="text-white/70">
              <p>
                Jika Anda memiliki pertanyaan mengenai disclaimer ini atau ketentuan penggunaan platform, 
                silakan hubungi tim support Bintan Drive melalui email resmi.
              </p>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="text-center mt-8">
            <Link href="/">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Beranda
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
