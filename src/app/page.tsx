'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createPackageInquiryMessage, createWhatsAppUrl, PRICING_CONSULTATION_MESSAGE } from '@/lib/contact';
import {
  Map,
  Car,
  Shield,
  Crown,
  ArrowRight,
  Users,
  Settings,
  Navigation,
  Bell,
  Star,
  CheckCircle2,
  Sparkles,
  Building2,
  Rocket,
  Waypoints,
  ArrowUpRight,
  Check
} from 'lucide-react';

const pricingPackages = [
  {
    name: 'Paket 1',
    title: 'Operasional Dasar',
    subtitle: 'Cocok untuk rental kecil-menengah yang baru mulai rapi digital.',
    description:
      'Pondasi paling efisien untuk merapikan operasional harian tanpa menambah kompleksitas yang belum diperlukan.',
    setup: 'Rp 1.800.000',
    monthly: 'Rp 400.000',
    badge: 'Mulai Cepat',
    accent: 'from-blue-500 to-cyan-500',
    border: 'border-blue-500/20',
    featureBullet: 'text-blue-300',
    features: [
      'Dashboard admin dasar',
      'Manajemen kendaraan',
      'Data pemesanan dan penyewaan',
      'Unduh laporan dasar',
      'Tampilan mobile-friendly',
    ],
  },
  {
    name: 'Paket 2',
    title: 'Operasional Lanjutan',
    subtitle: 'Cocok untuk rental yang sudah berkembang dan ingin kontrol operasional lebih baik.',
    description:
      'Pilihan paling seimbang untuk bisnis yang sudah aktif dan butuh dashboard yang lebih informatif serta struktur siap naik ke monitoring armada.',
    setup: 'Rp 2.500.000',
    monthly: 'Rp 500.000',
    badge: 'Paling Populer',
    accent: 'from-amber-500 to-orange-500',
    border: 'border-amber-500/25',
    featureBullet: 'text-amber-300',
    features: [
      'Semua fitur Paket 1',
      'Dashboard premium',
      'Laporan lebih lengkap',
      'Ringkasan operasional',
      'Struktur siap integrasi GPS',
    ],
  },
  {
    name: 'Paket 3',
    title: 'Fleet Security + GPS',
    subtitle: 'Cocok untuk armada besar yang ingin kontrol keamanan dan monitoring kendaraan kuat.',
    description:
      'Dirancang untuk perusahaan rental yang menjadikan keamanan armada, tracking, dan kontrol device sebagai kebutuhan inti operasional.',
    setup: 'Rp 4.000.000',
    monthly: 'Rp 700.000',
    badge: 'Fleet Security',
    accent: 'from-purple-500 to-fuchsia-500',
    border: 'border-purple-500/25',
    featureBullet: 'text-purple-300',
    features: [
      'Semua fitur Paket 2',
      'Dashboard tracking armada',
      'Status GPS online, stale, offline',
      'Fleet Security panel dan workflow keamanan',
      'Provisioning device dan fondasi geofence',
    ],
  },
] as const;

const pricingNarrative = [
  'Struktur paket Otomas disusun bertahap supaya calon klien tidak membeli kompleksitas yang belum dibutuhkan. Paket 1 fokus pada kerapian operasional dasar, Paket 2 menambah visibilitas operasional dan kesiapan naik kelas, sedangkan Paket 3 menutup kebutuhan keamanan armada dan integrasi GPS yang lebih serius.',
  'Biaya setup awal diposisikan untuk implementasi, penyesuaian awal, dan kesiapan sistem agar bisa langsung dipakai tim operasional. Langganan bulanan menjaga sistem tetap aktif, terawat, dan siap berkembang tanpa membebani bisnis dengan investasi besar di depan.',
  'Rental kecil yang baru digitalisasi akan paling cepat merasakan manfaat dari Paket 1. Rental yang sudah berkembang biasanya lebih cocok ke Paket 2 karena butuh dashboard yang lebih informatif. Untuk perusahaan yang concern pada keamanan armada dan monitoring kendaraan, Paket 3 adalah positioning yang paling relevan.',
] as const;

export default function HomePage() {
  const pricingConsultationUrl = createWhatsAppUrl(PRICING_CONSULTATION_MESSAGE);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-amber-600/15 to-orange-600/15 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-full blur-[150px]"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        
        {/* Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a0f_70%)]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-lg opacity-50"></div>
                <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
                  <Map className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Bintan Island
                </h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Rental System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link href="/katalog">
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/5">
                  Katalog
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-amber-500/25">
                  Admin Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="container mx-auto px-6 pt-20 pb-16">
          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto mb-20">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-white/70">GPS Tracking & Geofencing System</span>
            </div>
            
            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                Rental Mobil
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Terpercaya
              </span>
              <span className="text-white/60"> di </span>
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Bintan
              </span>
            </h1>
            
            {/* Description */}
            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
              Platform rental mobil dengan teknologi GPS tracking real-time, geofencing alerts, dan engine kill remote untuk keamanan kendaraan maksimal.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/katalog" className="group w-full sm:w-auto">
                <button className="relative w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-lg overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 transition-all duration-300 group-hover:scale-105"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <span className="relative flex items-center justify-center gap-3 text-white">
                    <Car className="h-5 w-5" />
                    Masuk sebagai Penyewa
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </Link>
              
              <Link href="/admin/login" className="group w-full sm:w-auto">
                <button className="relative w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-lg overflow-hidden border border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <span className="relative flex items-center justify-center gap-3 text-white">
                    <Shield className="h-5 w-5" />
                    Masuk sebagai Admin
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </Link>
            </div>
          </div>

          {/* Features Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
            {[
              {
                icon: Navigation,
                title: 'GPS Tracking',
                description: 'Pantau posisi kendaraan secara real-time dengan peta interaktif',
                gradient: 'from-blue-500 to-cyan-500',
                shadow: 'shadow-blue-500/20'
              },
              {
                icon: Bell,
                title: 'Smart Alerts',
                description: 'Notifikasi otomatis saat kendaraan keluar dari zona geofencing',
                gradient: 'from-amber-500 to-orange-500',
                shadow: 'shadow-amber-500/20'
              },
              {
                icon: Crown,
                title: 'Premium Features',
                description: 'Engine kill remote untuk keamanan kendaraan maksimal',
                gradient: 'from-purple-500 to-pink-500',
                shadow: 'shadow-purple-500/20'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative p-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-transparent"
              >
                <div className="relative h-full bg-[#0f0f15] rounded-2xl p-6 overflow-hidden">
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity blur-2xl`}></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} mb-4 shadow-lg ${feature.shadow}`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Section */}
          <section className="max-w-6xl mx-auto mb-20" id="pricing">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
                <Building2 className="h-4 w-4 text-cyan-300" />
                <span className="text-sm text-white/70">Pricing Otomas</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                  Paket yang jelas untuk
                </span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  operasional sampai fleet security
                </span>
              </h2>
              <p className="text-base md:text-lg text-white/50 leading-relaxed">
                Otomas dirancang untuk membantu bisnis rental bergerak dari pengelolaan dasar yang rapi hingga monitoring armada yang siap untuk integrasi GPS nyata.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {pricingPackages.map((pkg) => (
                <div
                  key={pkg.name}
                  className={`relative overflow-hidden rounded-3xl border ${pkg.border} bg-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm`}
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${pkg.accent}`} />
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">{pkg.name}</div>
                      <h3 className="mt-2 text-2xl font-semibold text-white">{pkg.title}</h3>
                    </div>
                    <div className={`rounded-full bg-gradient-to-r ${pkg.accent} px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white`}>
                      {pkg.badge}
                    </div>
                  </div>

                  <p className="min-h-[72px] text-sm leading-6 text-white/60">{pkg.subtitle}</p>
                  <p className="mt-3 text-sm leading-6 text-white/45">{pkg.description}</p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Setup Awal</div>
                      <div className="mt-2 text-xl font-semibold text-white">{pkg.setup}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">Bulanan</div>
                      <div className="mt-2 text-xl font-semibold text-white">{pkg.monthly}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 text-sm font-medium text-white/75">Fitur utama</div>
                    <ul className="space-y-3">
                      {pkg.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-white/65">
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${pkg.featureBullet}`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 flex flex-col gap-3">
                    <a
                      href={createWhatsAppUrl(createPackageInquiryMessage(`${pkg.name} – ${pkg.title}`))}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${pkg.accent} px-4 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01]`}
                    >
                      Konsultasi Paket Ini
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <Link
                      href="/admin/login"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Lihat Demo Dashboard
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
                <div className="mb-4 flex items-center gap-3">
                  <Rocket className="h-5 w-5 text-amber-300" />
                  <h3 className="text-xl font-semibold text-white">Mengapa struktur harga ini masuk akal</h3>
                </div>
                <div className="space-y-4 text-sm leading-7 text-white/60">
                  {pricingNarrative.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.04] to-transparent p-6 md:p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/45">
                  <Waypoints className="h-3.5 w-3.5 text-cyan-300" />
                  Konsultasi Paket
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">Butuh arahan paket yang paling pas?</h3>
                <p className="mt-3 text-sm leading-7 text-white/60">
                  Ceritakan jumlah armada, alur operasional, dan target monitoring Anda. Kami bantu arahkan apakah lebih tepat mulai dari Paket 1, langsung ke Paket 2, atau menyiapkan Paket 3 untuk kebutuhan keamanan armada.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <a
                    href={pricingConsultationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
                  >
                    Konsultasi via WhatsApp
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <Link
                    href="/katalog"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Lihat Tampilan Website
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: '5+', label: 'Kendaraan', icon: Car },
                { value: '24/7', label: 'Monitoring', icon: Navigation },
                { value: '100%', label: 'Aman', icon: Shield },
                { value: '3', label: 'Paket', icon: Crown },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative text-center p-4 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                    <stat.icon className="h-5 w-5 text-white/30 mx-auto mb-2" />
                    <div className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="border-t border-white/5 bg-gradient-to-b from-transparent to-black/20">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 border-2 border-[#0a0a0f] flex items-center justify-center"
                    >
                      <Star className="h-3 w-3 text-white" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-sm text-white/70">Trusted by many customers</div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-white/40">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  GPS Tracking
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  Geofencing
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  24/7 Support
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
            <p>© 2024 Bintan Island Rental. All rights reserved.</p>
            <div className="flex items-center gap-1">
              <span>Powered by</span>
              <span className="text-white/50">GPS Tracking Technology</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
