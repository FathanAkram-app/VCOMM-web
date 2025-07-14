import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { SwitchCamera, Camera } from 'lucide-react';

export default function CameraTest() {
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string>('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Get available cameras
    navigator.mediaDevices.enumerateDevices()
      .then(deviceList => {
        const cameras = deviceList.filter(device => device.kind === 'videoinput');
        setDevices(cameras);
        console.log('Available cameras:', cameras);
      })
      .catch(err => {
        console.error('Error enumerating devices:', err);
      });
  }, []);

  const startCamera = async (facingMode: 'user' | 'environment') => {
    try {
      setError('');
      
      // Stop current stream first
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }

      console.log(`Starting camera with facingMode: ${facingMode}`);
      
      // Try different constraint strategies
      const strategies = [
        // Strategy 1: Use exact facingMode with ideal constraints
        {
          video: {
            facingMode: { exact: facingMode },
            width: { ideal: 720 },
            height: { ideal: 1280 }
          }
        },
        // Strategy 2: Use preferred facingMode with basic constraints
        {
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        },
        // Strategy 3: Minimal constraints
        {
          video: {
            facingMode: facingMode
          }
        },
        // Strategy 4: Just video without facingMode
        {
          video: true
        }
      ];

      let newStream: MediaStream | null = null;
      let lastError: Error | null = null;

      for (const [index, constraints] of strategies.entries()) {
        try {
          console.log(`Trying strategy ${index + 1}:`, constraints);
          newStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log(`Strategy ${index + 1} successful!`);
          break;
        } catch (err) {
          console.log(`Strategy ${index + 1} failed:`, err);
          lastError = err as Error;
        }
      }

      if (!newStream) {
        throw lastError || new Error('All camera access strategies failed');
      }

      setCurrentStream(newStream);
      setCurrentFacingMode(facingMode);

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play();
      }

      // Log stream details
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('Camera settings:', settings);
      }

    } catch (err) {
      const error = err as Error;
      console.error('Camera error:', error);
      
      let errorMessage = 'Gagal mengakses kamera: ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Izin kamera diperlukan. Buka Pengaturan browser → Izin situs → Kamera → Izinkan.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += facingMode === 'environment' 
          ? 'Kamera belakang tidak ditemukan pada perangkat ini.'
          : 'Kamera depan tidak ditemukan pada perangkat ini.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Kamera sedang digunakan aplikasi lain.';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    }
  };

  const switchCamera = () => {
    const nextFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera(nextFacingMode);
  };

  const stopCamera = () => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setCurrentStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="bg-[#2a2a2a] p-4 text-white">
        <h2 className="text-lg font-bold">Test Kamera HP</h2>
        <p className="text-sm text-gray-300">
          Jumlah kamera tersedia: {devices.length}
        </p>
        {devices.map((device, index) => (
          <p key={device.deviceId} className="text-xs text-gray-400">
            {index + 1}. {device.label || `Camera ${index + 1}`}
          </p>
        ))}
      </div>

      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {!currentStream && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-center">
            <div>
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Tekan tombol untuk memulai kamera</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900 p-4 text-white">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-[#2a2a2a] p-4 flex justify-center space-x-4">
        <Button
          onClick={() => startCamera('user')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Kamera Depan
        </Button>
        
        <Button
          onClick={() => startCamera('environment')}
          className="bg-green-600 hover:bg-green-700"
        >
          Kamera Belakang
        </Button>
        
        {currentStream && (
          <Button
            onClick={switchCamera}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <SwitchCamera className="w-4 h-4 mr-2" />
            Switch
          </Button>
        )}
        
        <Button
          onClick={stopCamera}
          variant="destructive"
        >
          Stop
        </Button>
      </div>
    </div>
  );
}