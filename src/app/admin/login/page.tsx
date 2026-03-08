'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Map,
  Crown,
  Shield,
  Navigation,
  Bell,
  Power,
  CheckCircle2,
  Loader2,
  User,
  Lock,
  Sparkles,
  Car,
  ArrowLeft,
  Star
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if already logged in and seed demo users
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/admin/dashboard');
      return;
    }

    // Seed demo users if they don't exist
    const seedDemoUsers = async () => {
      try {
        await fetch('/api/seed', { method: 'POST' });
      } catch (err) {
        console.error('Failed to seed demo users:', err);
      }
    };
    seedDemoUsers();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        router.push('/admin/dashboard');
      } else {
        setError(data.message || 'Login gagal');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login for demo accounts
  const handleQuickLogin = async (type: 'standard' | 'premium') => {
    setIsLoading(true);
    setError('');

    const credentials = type === 'standard'
      ? { email: 'admin_kecil@rental.com', password: 'admin123' }
      : { email: 'admin_premium@rental.com', password: 'admin123' };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        router.push('/admin/dashboard');
      } else {
        setError(data.message || 'Login gagal. Pastikan akun demo sudah dibuat.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-r from-amber-600/15 to-orange-600/15 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a0f_70%)]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 blur-lg opacity-50"></div>
                <div className="relative p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                  <Map className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Bintan Island
                </h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Admin Portal</p>
              </div>
            </Link>
            
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/5 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-start">
          
          {/* Left - Login Form */}
          <div className="order-2 lg:order-1">
            <Card className="bg-white/[0.02] border-white/10 backdrop-blur-xl">
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Login Admin</CardTitle>
                    <CardDescription className="text-white/40">
                      Masuk ke dashboard untuk mengelola rental
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/70">Email</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@rental.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-500/50 focus:ring-amber-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/70">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-500/50 focus:ring-amber-500/20"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Masuk Dashboard
                      </>
                    )}
                  </Button>
                </form>

                {/* Demo Accounts */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-white/40 text-center mb-4">
                    Demo Account (klik untuk login cepat)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleQuickLogin('standard')}
                      disabled={isLoading}
                      className="flex flex-col items-center gap-1 h-auto py-4 bg-white/5 border-white/10 hover:bg-white/10 text-white"
                    >
                      <Car className="h-5 w-5 text-slate-400" />
                      <span className="text-sm font-medium">Standard</span>
                      <span className="text-[10px] text-white/40">admin_kecil</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleQuickLogin('premium')}
                      disabled={isLoading}
                      className="flex flex-col items-center gap-1 h-auto py-4 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-white"
                    >
                      <Crown className="h-5 w-5 text-amber-400" />
                      <span className="text-sm font-medium">Premium</span>
                      <span className="text-[10px] text-white/40">admin_premium</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right - Feature Comparison */}
          <div className="order-1 lg:order-2 space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-300">Account Tiering System</span>
            </div>

            {/* Feature Comparison Card */}
            <Card className="bg-white/[0.02] border-white/10 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-400" />
                  Perbandingan Fitur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 font-medium text-white/60">Fitur</th>
                        <th className="text-center py-3 font-medium">
                          <Badge variant="secondary" className="bg-white/10 text-white/70">Standard</Badge>
                        </th>
                        <th className="text-center py-3 font-medium">
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                            <Crown className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'Daftar Kendaraan', standard: true, premium: true },
                        { name: 'Statistik Pendapatan', standard: true, premium: true },
                        { name: 'Manajemen Pesanan', standard: true, premium: true },
                        { name: 'GPS Tracking Real-time', standard: false, premium: true },
                        { name: 'Geofencing Alerts', standard: false, premium: true },
                        { name: 'Notifikasi Keluar Pulau', standard: false, premium: true },
                        { name: 'Engine Kill Remote', standard: false, premium: true },
                        { name: 'Port Watch Monitoring', standard: false, premium: true },
                      ].map((feature, index) => (
                        <tr key={index} className="border-b border-white/5 last:border-0">
                          <td className="py-3 text-white/50">{feature.name}</td>
                          <td className="text-center py-3">
                            {feature.standard ? (
                              <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                            ) : (
                              <span className="text-white/20">-</span>
                            )}
                          </td>
                          <td className="text-center py-3">
                            {feature.premium ? (
                              <CheckCircle2 className="h-4 w-4 text-amber-400 mx-auto" />
                            ) : (
                              <span className="text-white/20">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Premium Features Highlight */}
            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-300">
                  <Crown className="h-5 w-5" />
                  Keunggulan Premium
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Navigation, text: 'Real-time GPS Tracking' },
                    { icon: Shield, text: 'Geofencing Alerts' },
                    { icon: Bell, text: 'Port Watch Monitoring' },
                    { icon: Power, text: 'Remote Engine Kill' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <item.icon className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-amber-200/70">{item.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trust Badge */}
            <div className="flex items-center justify-center gap-3 text-sm text-white/40">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span>Trusted Admin Platform</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
