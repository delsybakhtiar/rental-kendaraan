'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Map, 
  Crown, 
  Navigation, 
  Shield, 
  Bell, 
  Power,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface UpgradePromptProps {
  variant?: 'map' | 'sidebar' | 'banner';
  className?: string;
}

const premiumFeatures = [
  { icon: Navigation, text: 'Real-time GPS Tracking' },
  { icon: Shield, text: 'Geofencing Alerts' },
  { icon: Bell, text: 'Notifikasi Keluar Pulau' },
  { icon: Power, text: 'Engine Kill Remote' },
];

export default function UpgradePrompt({ variant = 'map', className = '' }: UpgradePromptProps) {
  if (variant === 'banner') {
    return (
      <Card className={`border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <Crown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-800">Akun Standard</p>
                <p className="text-sm text-amber-600">Upgrade ke Premium untuk fitur lengkap</p>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'sidebar') {
    return (
      <Card className={`border-amber-200 bg-amber-50 ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-700">
            <Crown className="h-5 w-5" />
            Fitur Premium
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-amber-600">
            Unlock fitur tracking lengkap dengan upgrade ke akun Premium.
          </p>
          
          <div className="space-y-2">
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-amber-700">
                <feature.icon className="h-4 w-4 text-amber-500" />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

          <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white mt-4">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Premium
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Map variant (default)
  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Map className="h-5 w-5" />
          Peta Real-time
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-60px)]">
        <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
          {/* Lock Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="h-10 w-10 text-white" />
            </div>
            <Badge className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2">
              PREMIUM
            </Badge>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Upgrade ke Premium
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Untuk mengaktifkan fitur GPS Tracking Real-time dan keamanan kendaraan
          </p>

          {/* Features List */}
          <div className="grid grid-cols-2 gap-3 mb-6 w-full max-w-xs">
            {premiumFeatures.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border text-xs"
              >
                <feature.icon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Upgrade ke Premium
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>

          {/* Info */}
          <p className="text-xs text-gray-400 mt-4">
            Hubungi admin untuk upgrade akun
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
