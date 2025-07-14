import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { SwitchCamera, Camera, X } from 'lucide-react';

interface CameraTestSimpleProps {
  onClose: () => void;
}

export default function CameraTestSimple({ onClose }: CameraTestSimpleProps) {
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [testing, setTesting] = useState<'front' | 'back' | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Get available cameras
    navigator.mediaDevices.enumerateDevices()
      .then(deviceList => {
        const cameras = deviceList.filter(device => device.kind === 'videoinput');
        setDevices(cameras);
        console.log('CameraTest: Available cameras:', cameras.map(d => ({ label: d.label, id: d.deviceId.slice(0, 8) })));
      })
      .catch(err => {
        console.error('CameraTest: Error enumerating devices:', err);
      });
  }, []);

  const testCamera = async (mode: 'front' | 'back') => {
    try {
      setError('');
      setTesting(mode);
      
      // Stop current stream first
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }

      const facingMode = mode === 'front' ? 'user' : 'environment';
      console.log(`CameraTest: Testing ${mode} camera with facingMode: ${facingMode}`);
      
      // Try 4 different strategies with increasing fallback
      const strategies = [
        // Strategy 1: Exact facingMode with high quality
        {
          video: {
            facingMode: { exact: facingMode },
            width: { ideal: 720 },
            height: { ideal: 1280 }
          }
        },
        // Strategy 2: Preferred facingMode with medium quality
        {
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        },
        // Strategy 3: Just facingMode
        {
          video: {
            facingMode: facingMode
          }
        },
        // Strategy 4: Any video (last resort)
        {
          video: true
        }
      ];

      let newStream: MediaStream | null = null;
      let lastError: Error | null = null;

      for (const [index, constraints] of strategies.entries()) {
        try {
          console.log(`CameraTest: Trying strategy ${index + 1}:`, constraints);
          newStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log(`CameraTest: Strategy ${index + 1} SUCCESS!`);
          break;
        } catch (err) {
          console.log(`CameraTest: Strategy ${index + 1} failed:`, err);
          lastError = err as Error;
        }
      }

      if (!newStream) {
        throw lastError || new Error('Semua strategi kamera gagal');
      }

      setCurrentStream(newStream);

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play();
      }

      // Log stream details for debugging
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log(`CameraTest: ${mode} camera settings:`, {
          deviceId: settings.deviceId?.slice(0, 8),
          facingMode: settings.facingMode,
          width: settings.width,
          height: settings.height
        });
      }

    } catch (err) {
      const error = err as Error;
      console.error(`CameraTest: ${mode} camera error:`, error);
      
      let errorMessage = `Gagal mengakses kamera ${mode === 'front' ? 'depan' : 'belakang'}: `;
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Izin kamera diperlukan. Coba refresh halaman dan izinkan akses kamera.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += mode === 'back' 
          ? 'Kamera belakang tidak ditemukan. HP ini mungkin hanya memiliki kamera depan.'
          : 'Kamera depan tidak ditemukan.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi kamera lain dan coba lagi.';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    } finally {
      setTesting(null);
    }
  };

  const stopTest = () => {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setCurrentStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setError('');
    setTesting(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-[#2a2a2a] p-4 text-white flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Test Kamera HP</h2>
          <p className="text-sm text-gray-300">
            Tersedia: {devices.length} kamera
          </p>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-700"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative bg-gray-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {!currentStream && !testing && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-center">
            <div>
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Test Kamera</p>
              <p className="text-sm text-gray-300">Pilih kamera untuk memulai test</p>
            </div>
          </div>
        )}

        {testing && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="bg-black/50 p-4 rounded-lg">
              <p>Testing kamera {testing === 'front' ? 'depan' : 'belakang'}...</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900 p-4 text-white">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="bg-[#2a2a2a] p-4 flex justify-center space-x-3">
        <Button
          onClick={() => testCamera('front')}
          disabled={testing === 'front'}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {testing === 'front' ? 'Testing...' : 'Kamera Depan'}
        </Button>
        
        <Button
          onClick={() => testCamera('back')}
          disabled={testing === 'back'}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {testing === 'back' ? 'Testing...' : 'Kamera Belakang'}
        </Button>
        
        {currentStream && (
          <Button
            onClick={stopTest}
            className="bg-red-600 hover:bg-red-700"
          >
            Stop Test
          </Button>
        )}
      </div>

      {/* Device Info */}
      {devices.length > 0 && (
        <div className="bg-gray-800 p-3 text-white text-xs">
          <p className="mb-1"><strong>Kamera tersedia:</strong></p>
          {devices.map((device, index) => (
            <p key={device.deviceId} className="text-gray-400">
              {index + 1}. {device.label || `Camera ${index + 1}`}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}