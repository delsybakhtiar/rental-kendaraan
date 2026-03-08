'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  Sparkles
} from 'lucide-react';

export default function HomePage() {
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

          {/* Stats Section */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: '5+', label: 'Kendaraan', icon: Car },
                { value: '24/7', label: 'Monitoring', icon: Navigation },
                { value: '100%', label: 'Aman', icon: Shield },
                { value: '2', label: 'Tiers', icon: Crown },
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
