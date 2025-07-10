import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Lock,
  Palette,
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  LogOut,
  Eye,
  EyeOff,
  Volume2,
  Mic,
  MicOff,
  Speaker,
  Smartphone,
  Play,
  Square,
  Info,
  Download,
  Monitor,
  CheckCircle,
  Key
} from 'lucide-react';

interface UserSettings {
  id: number;
  theme: 'light' | 'dark' | 'system';
  status: string;
  statusMessage: string;
  language: string;
  notifications: {
    push: boolean;
    sound: boolean;
    vibration: boolean;
    calls: boolean;
    messages: boolean;
    groups: boolean;
  };
  privacy: {
    showOnline: boolean;
    showLastSeen: boolean;
    readReceipts: boolean;
    profilePhoto: boolean;
    allowGroups: boolean;
  };
  security: {
    twoFactor: boolean;
    sessionTimeout: number;
    autoLock: boolean;
    biometric: boolean;
  };
  network: {
    autoDownload: boolean;
    dataUsage: 'low' | 'medium' | 'high';
    wifiOnly: boolean;
  };
}

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const { toast } = useToast();
  const { isInstallable, showManualPrompt, isStandalone, installPWA } = usePWA();

  // Audio test states
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [audioTestMode, setAudioTestMode] = useState<'speaker' | 'loudspeaker' | null>(null);
  const [testAudioElement, setTestAudioElement] = useState<any>(null);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  // Get user from auth
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  }) as { data: any };

  // Form state
  const [settings, setSettings] = useState<UserSettings>({
    id: 0,
    theme: 'dark',
    status: 'Available',
    statusMessage: '',
    language: 'id',
    notifications: {
      push: true,
      sound: true,
      vibration: true,
      calls: true,
      messages: true,
      groups: true,
    },
    privacy: {
      showOnline: true,
      showLastSeen: true,
      readReceipts: true,
      profilePhoto: true,
      allowGroups: true,
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
      autoLock: false,
      biometric: false,
    },
    network: {
      autoDownload: true,
      dataUsage: 'medium',
      wifiOnly: false,
    },
  });

  const [activeTab, setActiveTab] = useState('profile');

  // Fetch user settings
  const { data: userSettings, isLoading } = useQuery({
    queryKey: ['/api/user-settings'],
    retry: false,
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (updatedSettings: Partial<UserSettings>) =>
      apiRequest('/api/user-settings', 'PUT', updatedSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-settings'] });
      toast({
        title: "Pengaturan Disimpan",
        description: "Pengaturan berhasil diperbarui",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan",
        variant: "destructive",
      });
    },
  });

  // Audio test functions
  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
      setAudioDevices(audioOutputDevices);
      if (audioOutputDevices.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioOutputDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to load audio devices:', error);
    }
  };

  const startAudioTest = async (mode: 'speaker' | 'loudspeaker') => {
    try {
      setIsTestingAudio(true);
      setAudioTestMode(mode);
      
      // Stop any existing audio
      if (testAudioElement) {
        if (typeof testAudioElement.stop === 'function') {
          testAudioElement.stop();
        }
      }
      
      // Use HTML Audio element with different audio files for mobile compatibility
      const audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      
      // Configure different test tones for each mode
      if (mode === 'speaker') {
        // Medium frequency for normal speaker
        audio.src = generateTestTone(1000, 1); // Medium pitch
        audio.volume = 0.6; // Medium volume
        
        toast({
          title: "Speaker Test", 
          description: "Nada menengah 1000Hz - Volume sedang untuk speaker normal.",
        });
        
      } else if (mode === 'loudspeaker') {
        // Low frequency bass tone for loudspeaker
        audio.src = generateTestTone(300, 1); // Lower bass frequency
        audio.volume = 0.9; // Higher volume
        
        toast({
          title: "Loudspeaker Test",
          description: "Nada bass 300Hz - Volume tinggi untuk speaker eksternal/loudspeaker.",
        });
      }
      
      // Mobile-specific audio setup
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      
      // Ensure audio plays on mobile by requiring user interaction
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`Audio test started for ${mode}`);
        }).catch((error) => {
          console.error('Audio play failed:', error);
          toast({
            title: "Audio Play Error",
            description: "Gagal memutar audio. Coba sentuh layar terlebih dahulu.",
            variant: "destructive",
          });
          setIsTestingAudio(false);
          return;
        });
      }
      
      setTestAudioElement(audio);
      
    } catch (error) {
      console.error('Failed to start audio test:', error);
      toast({
        title: "Audio Test Error",
        description: "Gagal memulai test audio. Pastikan browser mendukung audio output.",
        variant: "destructive",
      });
      setIsTestingAudio(false);
    }
  };

  const stopAudioTest = () => {
    if (testAudioElement) {
      try {
        // Stop oscillator if it's an oscillator node
        if (typeof testAudioElement.stop === 'function') {
          testAudioElement.stop();
        } else {
          // Stop audio element if it's an HTML audio element
          testAudioElement.pause();
          testAudioElement.currentTime = 0;
          testAudioElement.src = '';
        }
      } catch (error) {
        console.log('Audio test stopped');
      }
    }
    setIsTestingAudio(false);
    setAudioTestMode(null);
    setTestAudioElement(null);
  };

  const startMicTest = async () => {
    try {
      setIsMicTesting(true);
      setMicLevel(0);
      
      // Request microphone access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1
        }
      });
      
      setMicStream(stream);
      
      // Create audio context for microphone level monitoring
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      // Configure analyser for better sensitivity
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -10;
      
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let isRunning = true;
      
      const updateMicLevel = () => {
        if (!isRunning || !isMicTesting) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS (root mean square) for more accurate level detection
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        const level = Math.min(Math.round((rms / 128) * 100), 100);
        
        setMicLevel(level);
        requestAnimationFrame(updateMicLevel);
      };
      
      // Store the stop function
      (window as any).stopMicTest = () => {
        isRunning = false;
      };
      
      updateMicLevel();
      
      toast({
        title: "Microphone Test",
        description: "Berbicara atau buat suara untuk melihat level microphone. Level akan bergerak jika mic aktif.",
      });
      
    } catch (error) {
      console.error('Failed to start microphone test:', error);
      let errorMessage = "Gagal mengakses microphone.";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Izin microphone ditolak. Mohon izinkan akses microphone di browser.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Microphone tidak ditemukan. Pastikan microphone terhubung.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Microphone sedang digunakan aplikasi lain.";
      }
      
      toast({
        title: "Microphone Test Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsMicTesting(false);
    }
  };

  const stopMicTest = () => {
    // Stop the mic level monitoring
    if ((window as any).stopMicTest) {
      (window as any).stopMicTest();
    }
    
    // Stop all media tracks
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    
    setIsMicTesting(false);
    setMicLevel(0);
    
    toast({
      title: "Microphone Test Stopped",
      description: "Test microphone telah dihentikan.",
    });
  };

  const generateTestTone = (frequency: number, duration: number): string => {
    const sampleRate = 44100;
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    
    // Generate sine wave
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  // Load audio devices on component mount
  useEffect(() => {
    loadAudioDevices();
  }, []);

  // Load settings if available
  useEffect(() => {
    if (userSettings) {
      setSettings(prev => ({ ...prev, ...userSettings }));
    }
  }, [userSettings]);

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(settings);
  };

  const updateSettings = (key: string, value: any) => {
    setSettings(prev => {
      const keys = key.split('.');
      const newSettings = { ...prev };
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-700 bg-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mr-3 text-white hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center">
          <SettingsIcon className="w-6 h-6 mr-2 text-green-500" />
          <h1 className="text-xl font-semibold">Pengaturan</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-7 bg-gray-800 border-b border-gray-700">
            <TabsTrigger value="profile" className="data-[state=active]:bg-green-600">
              <User className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-green-600">
              <Shield className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-green-600">
              <Palette className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-green-600">
              <Bell className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-green-600">
              <Lock className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="app" className="data-[state=active]:bg-green-600">
              <Smartphone className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="audio" className="data-[state=active]:bg-green-600">
              <Volume2 className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <User className="w-5 h-5 mr-2 text-green-500" />
                    Profil & Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Profile Picture */}
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={(user as any)?.profileImageUrl ?? ''} />
                      <AvatarFallback className="bg-green-600 text-white text-xl">
                        {(user as any)?.callsign?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{(user as any)?.callsign || 'Unknown'}</h3>
                      <p className="text-sm text-gray-400">{(user as any)?.nrp || 'No NRP'}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Ubah Foto
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Status Settings */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Status</Label>
                      <Select value={settings.status} onValueChange={(value) => updateSettings('status', value)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="Available">🟢 Available</SelectItem>
                          <SelectItem value="Busy">🔴 Busy</SelectItem>
                          <SelectItem value="Away">🟡 Away</SelectItem>
                          <SelectItem value="Offline">⚫ Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Status Message</Label>
                      <Textarea
                        placeholder="Tulis status message..."
                        value={settings.statusMessage}
                        onChange={(e) => updateSettings('statusMessage', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Shield className="w-5 h-5 mr-2 text-green-500" />
                    Privasi
                  </CardTitle>
                  <CardDescription>
                    Kontrol siapa yang dapat melihat informasi Anda
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Tampilkan Status Online</Label>
                        <p className="text-sm text-gray-400">Biarkan orang lain melihat saat Anda online</p>
                      </div>
                      <Switch
                        checked={settings.privacy.showOnline}
                        onCheckedChange={(checked) => updateSettings('privacy.showOnline', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Terakhir Dilihat</Label>
                        <p className="text-sm text-gray-400">Tampilkan kapan terakhir kali online</p>
                      </div>
                      <Switch
                        checked={settings.privacy.showLastSeen}
                        onCheckedChange={(checked) => updateSettings('privacy.showLastSeen', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Tanda Baca Pesan</Label>
                        <p className="text-sm text-gray-400">Tampilkan centang biru saat pesan dibaca</p>
                      </div>
                      <Switch
                        checked={settings.privacy.readReceipts}
                        onCheckedChange={(checked) => updateSettings('privacy.readReceipts', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Foto Profil</Label>
                        <p className="text-sm text-gray-400">Siapa yang dapat melihat foto profil Anda</p>
                      </div>
                      <Switch
                        checked={settings.privacy.profilePhoto}
                        onCheckedChange={(checked) => updateSettings('privacy.profilePhoto', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Undangan Grup</Label>
                        <p className="text-sm text-gray-400">Izinkan orang lain menambahkan ke grup</p>
                      </div>
                      <Switch
                        checked={settings.privacy.allowGroups}
                        onCheckedChange={(checked) => updateSettings('privacy.allowGroups', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Palette className="w-5 h-5 mr-2 text-green-500" />
                    Tampilan
                  </CardTitle>
                  <CardDescription>
                    Sesuaikan tampilan aplikasi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white">Tema</Label>
                      <Select value={settings.theme} onValueChange={(value) => updateSettings('theme', value)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="light">Terang</SelectItem>
                          <SelectItem value="dark">Gelap</SelectItem>
                          <SelectItem value="system">Sistem</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Bahasa</Label>
                      <Select value={settings.language} onValueChange={(value) => updateSettings('language', value)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="id">Bahasa Indonesia</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Bell className="w-5 h-5 mr-2 text-green-500" />
                    Notifikasi
                  </CardTitle>
                  <CardDescription>
                    Atur bagaimana Anda menerima notifikasi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Push Notifications</Label>
                        <p className="text-sm text-gray-400">Terima notifikasi push</p>
                      </div>
                      <Switch
                        checked={settings.notifications.push}
                        onCheckedChange={(checked) => updateSettings('notifications.push', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Suara</Label>
                        <p className="text-sm text-gray-400">Mainkan suara notifikasi</p>
                      </div>
                      <Switch
                        checked={settings.notifications.sound}
                        onCheckedChange={(checked) => updateSettings('notifications.sound', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Getaran</Label>
                        <p className="text-sm text-gray-400">Getar saat menerima notifikasi</p>
                      </div>
                      <Switch
                        checked={settings.notifications.vibration}
                        onCheckedChange={(checked) => updateSettings('notifications.vibration', checked)}
                      />
                    </div>

                    <Separator className="bg-gray-700" />

                    <h4 className="font-semibold text-white">Notifikasi Khusus</h4>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Panggilan</Label>
                        <p className="text-sm text-gray-400">Notifikasi panggilan masuk</p>
                      </div>
                      <Switch
                        checked={settings.notifications.calls}
                        onCheckedChange={(checked) => updateSettings('notifications.calls', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Pesan</Label>
                        <p className="text-sm text-gray-400">Notifikasi pesan baru</p>
                      </div>
                      <Switch
                        checked={settings.notifications.messages}
                        onCheckedChange={(checked) => updateSettings('notifications.messages', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Grup</Label>
                        <p className="text-sm text-gray-400">Notifikasi aktivitas grup</p>
                      </div>
                      <Switch
                        checked={settings.notifications.groups}
                        onCheckedChange={(checked) => updateSettings('notifications.groups', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Lock className="w-5 h-5 mr-2 text-green-500" />
                    Keamanan
                  </CardTitle>
                  <CardDescription>
                    Lindungi akun dan data Anda
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-400">Tambahan keamanan dengan 2FA</p>
                      </div>
                      <Switch
                        checked={settings.security.twoFactor}
                        onCheckedChange={(checked) => updateSettings('security.twoFactor', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Kunci Otomatis</Label>
                        <p className="text-sm text-gray-400">Kunci aplikasi saat tidak digunakan</p>
                      </div>
                      <Switch
                        checked={settings.security.autoLock}
                        onCheckedChange={(checked) => updateSettings('security.autoLock', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Biometrik</Label>
                        <p className="text-sm text-gray-400">Gunakan sidik jari atau face ID</p>
                      </div>
                      <Switch
                        checked={settings.security.biometric}
                        onCheckedChange={(checked) => updateSettings('security.biometric', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Timeout Sesi (menit)</Label>
                      <Select
                        value={settings.security.sessionTimeout.toString()}
                        onValueChange={(value) => updateSettings('security.sessionTimeout', parseInt(value))}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="15">15 menit</SelectItem>
                          <SelectItem value="30">30 menit</SelectItem>
                          <SelectItem value="60">1 jam</SelectItem>
                          <SelectItem value="120">2 jam</SelectItem>
                          <SelectItem value="0">Tidak pernah</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* PWA Install Section */}
                  {(isInstallable || showManualPrompt) && !isStandalone && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white">Instalasi Aplikasi</h4>
                      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                        <div className="flex items-start space-x-3">
                          <Smartphone className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="text-white font-medium mb-2">Install PWA</h4>
                            <p className="text-sm text-gray-400 mb-3">
                              Install aplikasi NXZZ-VComm ke homescreen untuk pengalaman seperti aplikasi native
                            </p>
                            
                            {isInstallable ? (
                              <Button 
                                onClick={installPWA}
                                className="w-full bg-green-600 hover:bg-green-700"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Install Aplikasi
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                <div className="text-xs text-gray-500 space-y-1">
                                  <p><strong>Android:</strong> Menu browser → "Add to Home screen"</p>
                                  <p><strong>iOS:</strong> Share → "Add to Home Screen"</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="bg-gray-700" />
                    </div>
                  )}

                  {/* Change Password */}
                  <Button 
                    variant="outline" 
                    className="w-full mb-4 bg-gray-700 hover:bg-gray-600 border-gray-600"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Ubah Kata Sandi
                  </Button>

                  {/* Logout */}
                  <Button variant="destructive" className="w-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Keluar dari Akun
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* App Tab - PWA Installation */}
            <TabsContent value="app" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Smartphone className="w-5 h-5 mr-2 text-green-500" />
                    Instalasi Aplikasi (PWA)
                  </CardTitle>
                  <CardDescription>
                    Install aplikasi NXZZ-VComm ke homescreen HP untuk pengalaman seperti aplikasi native
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* PWA Status */}
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-start space-x-3">
                      <Monitor className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-2">Status PWA</h4>
                        {isStandalone ? (
                          <div className="flex items-center space-x-2 text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Aplikasi sudah terinstall sebagai PWA</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-300">
                              Aplikasi berjalan di browser. Install sebagai PWA untuk:
                            </p>
                            <ul className="text-sm text-gray-400 space-y-1 ml-4">
                              <li>• Akses cepat dari homescreen</li>
                              <li>• Mode fullscreen tanpa address bar</li>
                              <li>• Notifikasi push untuk panggilan</li>
                              <li>• Offline functionality</li>
                              <li>• Background sync</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PWA Install Button */}
                  {(isInstallable || showManualPrompt) && !isStandalone && (
                    <div className="space-y-4">
                      <Separator className="bg-gray-700" />
                      
                      {isInstallable && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-white">Install Otomatis</h4>
                          <Button 
                            onClick={() => {
                              installPWA();
                              toast({
                                title: "Installing PWA",
                                description: "Memproses instalasi aplikasi...",
                              });
                            }}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Install NXZZ-VComm ke Homescreen
                          </Button>
                          <p className="text-xs text-gray-400">
                            Klik tombol di atas untuk install langsung ke homescreen HP
                          </p>
                        </div>
                      )}

                      {showManualPrompt && !isInstallable && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-white">Install Manual</h4>
                          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                            <div className="space-y-3">
                              <p className="text-sm text-blue-200 font-medium">
                                Cara install ke homescreen:
                              </p>
                              
                              {/* Android Instructions */}
                              <div className="space-y-2">
                                <p className="text-xs text-blue-300 font-medium">📱 Android (Chrome/Edge):</p>
                                <ol className="text-xs text-blue-200 space-y-1 ml-4">
                                  <li>1. Tap menu (⋮) di sudut kanan atas browser</li>
                                  <li>2. Pilih "Add to Home screen" atau "Install app"</li>
                                  <li>3. Konfirmasi dengan tap "Install" atau "Add"</li>
                                  <li>4. Icon NXZZ-VComm akan muncul di homescreen</li>
                                </ol>
                              </div>
                              
                              {/* iOS Instructions */}
                              <div className="space-y-2">
                                <p className="text-xs text-blue-300 font-medium">📱 iOS (Safari):</p>
                                <ol className="text-xs text-blue-200 space-y-1 ml-4">
                                  <li>1. Tap Share button (□↗) di bottom bar</li>
                                  <li>2. Scroll ke bawah dan pilih "Add to Home Screen"</li>
                                  <li>3. Edit nama jika perlu, tap "Add"</li>
                                  <li>4. App akan muncul seperti aplikasi native</li>
                                </ol>
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => {
                              toast({
                                title: "PWA Installation",
                                description: "Ikuti langkah manual di atas untuk install aplikasi",
                                duration: 5000,
                              });
                            }}
                          >
                            <Info className="w-4 h-4 mr-2" />
                            Tampilkan Panduan Install
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PWA Features Info */}
                  <div className="space-y-3">
                    <Separator className="bg-gray-700" />
                    <h4 className="font-medium text-white">Fitur PWA</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-600">
                        <div className="flex items-center space-x-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-white">Offline Mode</span>
                        </div>
                        <p className="text-xs text-gray-400">Bekerja tanpa internet</p>
                      </div>
                      
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-600">
                        <div className="flex items-center space-x-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-white">Push Notifications</span>
                        </div>
                        <p className="text-xs text-gray-400">Alert panggilan masuk</p>
                      </div>
                      
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-600">
                        <div className="flex items-center space-x-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-white">Background Sync</span>
                        </div>
                        <p className="text-xs text-gray-400">Sync otomatis pesan</p>
                      </div>
                      
                      <div className="bg-gray-900/50 rounded p-3 border border-gray-600">
                        <div className="flex items-center space-x-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium text-white">Native Feel</span>
                        </div>
                        <p className="text-xs text-gray-400">Seperti app bawaan</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audio Test Tab */}
            <TabsContent value="audio" className="space-y-6">
              {/* Important Notice */}
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-blue-300 font-medium mb-2">Keterbatasan Browser Mobile</h4>
                    <p className="text-sm text-blue-200 mb-2">
                      Browser web pada HP tidak dapat mengontrol routing audio ke speaker telepon (earpiece). 
                      Semua audio akan keluar melalui speaker media HP.
                    </p>
                    <p className="text-sm text-blue-200">
                      <strong>Untuk test earpiece:</strong> Gunakan aplikasi panggilan suara biasa atau WhatsApp call.
                    </p>
                  </div>
                </div>
              </div>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Volume2 className="w-5 h-5 mr-2 text-green-500" />
                    Audio Test Mobile
                  </CardTitle>
                  <CardDescription>
                    Test audio output dan microphone melalui speaker media HP
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Audio Output Test */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white flex items-center">
                      <Speaker className="w-4 h-4 mr-2" />
                      Test Audio Output
                    </h4>

                    {/* Audio Device Selection */}
                    {audioDevices.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-white">Audio Device</Label>
                        <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                          <SelectTrigger className="bg-gray-700 border-gray-600">
                            <SelectValue placeholder="Pilih audio device" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {audioDevices.map((device) => (
                              <SelectItem key={device.deviceId} value={device.deviceId}>
                                {device.label || `Audio Device ${device.deviceId.slice(0, 8)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Audio Test Buttons */}
                    <div className="grid grid-cols-1 gap-3">
                      {/* Manual Earpiece Test Instructions */}
                      <div className="p-4 bg-gray-700 rounded-lg border border-orange-600">
                        <div className="flex items-center mb-3">
                          <Smartphone className="w-5 h-5 mr-2 text-orange-400" />
                          <span className="text-white font-medium">Test Earpiece (Speaker Telinga)</span>
                        </div>
                        <div className="bg-orange-900/20 border border-orange-600 rounded p-3">
                          <p className="text-sm text-orange-200 mb-2">
                            <strong>Cara Test Earpiece Manual:</strong>
                          </p>
                          <ol className="text-sm text-orange-200 ml-4 list-decimal space-y-1">
                            <li>Lakukan panggilan suara biasa ke teman</li>
                            <li>Pastikan HP dalam posisi normal (tidak speaker)</li>
                            <li>Dengarkan suara dari speaker telinga</li>
                            <li>Jika tidak terdengar jelas, earpiece bermasalah</li>
                          </ol>
                        </div>
                      </div>

                      {/* Speaker Test */}
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Volume2 className="w-5 h-5 mr-2 text-green-400" />
                            <span className="text-white font-medium">Speaker Normal</span>
                          </div>
                          <Badge variant={audioTestMode === 'speaker' && isTestingAudio ? 'default' : 'secondary'}>
                            {audioTestMode === 'speaker' && isTestingAudio ? 'Testing' : 'Ready'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">Test audio melalui speaker normal HP</p>
                        <Button
                          onClick={() => isTestingAudio ? stopAudioTest() : startAudioTest('speaker')}
                          className={`w-full ${
                            audioTestMode === 'speaker' && isTestingAudio 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {audioTestMode === 'speaker' && isTestingAudio ? (
                            <>
                              <Square className="w-4 h-4 mr-2" />
                              Stop Test
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Test Speaker
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Loudspeaker Test */}
                      <div className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Speaker className="w-5 h-5 mr-2 text-yellow-400" />
                            <span className="text-white font-medium">Loudspeaker</span>
                          </div>
                          <Badge variant={audioTestMode === 'loudspeaker' && isTestingAudio ? 'default' : 'secondary'}>
                            {audioTestMode === 'loudspeaker' && isTestingAudio ? 'Testing' : 'Ready'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">Test audio melalui loudspeaker HP</p>
                        <Button
                          onClick={() => isTestingAudio ? stopAudioTest() : startAudioTest('loudspeaker')}
                          className={`w-full ${
                            audioTestMode === 'loudspeaker' && isTestingAudio 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-yellow-600 hover:bg-yellow-700'
                          }`}
                        >
                          {audioTestMode === 'loudspeaker' && isTestingAudio ? (
                            <>
                              <Square className="w-4 h-4 mr-2" />
                              Stop Test
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Test Loudspeaker
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Microphone Test */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white flex items-center">
                      <Mic className="w-4 h-4 mr-2" />
                      Test Microphone
                    </h4>

                    <div className="p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Mic className="w-5 h-5 mr-2 text-purple-400" />
                          <span className="text-white font-medium">Microphone Level</span>
                        </div>
                        <Badge variant={isMicTesting ? 'default' : 'secondary'}>
                          {isMicTesting ? 'Recording' : 'Ready'}
                        </Badge>
                      </div>
                      
                      {/* Microphone Level Indicator */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                          <span>Level: {micLevel}%</span>
                          <span>{isMicTesting ? 'Berbicara untuk test' : 'Tekan Start untuk test'}</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-100 ${
                              micLevel > 70 ? 'bg-red-500' : 
                              micLevel > 40 ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${micLevel}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => isMicTesting ? stopMicTest() : startMicTest()}
                        className={`w-full ${
                          isMicTesting 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        {isMicTesting ? (
                          <>
                            <MicOff className="w-4 h-4 mr-2" />
                            Stop Mic Test
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 mr-2" />
                            Start Mic Test
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Audio Test Info */}
                  <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 mr-2 text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-blue-200 font-medium mb-1">Petunjuk Test Audio:</p>
                        <ul className="text-blue-300 space-y-1">
                          <li>• Earpiece: Audio keluar dari speaker telinga HP</li>
                          <li>• Speaker Normal: Audio keluar dari speaker bawah HP</li>
                          <li>• Loudspeaker: Audio keluar dengan volume maksimal</li>
                          <li>• Mic Test: Berbicara untuk melihat level microphone</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Save Button */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <Button
          onClick={handleSaveSettings}
          disabled={saveSettingsMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {saveSettingsMutation.isPending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}