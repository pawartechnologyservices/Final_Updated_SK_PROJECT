// components/AttendanceCamera.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, RefreshCw, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AttendanceCameraProps {
  onPhotoCapture: (file: File) => void;
  onCancel: () => void;
  isCapturing: boolean;
  title?: string;
}

export const AttendanceCamera: React.FC<AttendanceCameraProps> = ({
  onPhotoCapture,
  onCancel,
  isCapturing,
  title = 'Take a Photo'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setPermissionDenied(false);
      
      console.log('Requesting camera access with facing mode:', facingMode);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
          console.log('Camera is ready');
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      
      // Try with default camera if specific facing mode fails
      if (err.name === 'OverconstrainedError') {
        console.log('Facing mode not available, trying default camera');
        try {
          const defaultStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          setStream(defaultStream);
          if (videoRef.current) {
            videoRef.current.srcObject = defaultStream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setIsCameraReady(true);
            };
          }
          return;
        } catch (defaultErr) {
          console.error('Default camera also failed:', defaultErr);
        }
      }
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setError('Camera permission denied. Please allow camera access in your browser settings and refresh the page.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on your device. Please ensure you have a camera connected.');
      } else {
        setError(`Unable to access camera: ${err.message}`);
      }
      
      toast.error('Camera access failed. Please check your camera permissions.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped camera track:', track.label);
      });
      setStream(null);
      setIsCameraReady(false);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      toast.error('Camera not ready');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to JPEG with compression
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(photoDataUrl);
      
      // Convert data URL to File
      fetch(photoDataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `attendance-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onPhotoCapture(file);
        })
        .catch(err => {
          console.error('Error creating file:', err);
          toast.error('Error processing photo');
        });
    }
  }, [isCameraReady, onPhotoCapture]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    // Restart camera
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 100);
  }, [stopCamera, startCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 100);
  }, [stopCamera, startCamera]);

  const handleCancel = useCallback(() => {
    stopCamera();
    onCancel();
  }, [stopCamera, onCancel]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  if (permissionDenied) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Camera Access Denied</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>How to enable camera access:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 text-left list-disc list-inside">
              <li>Click the camera icon in your browser's address bar</li>
              <li>Select "Allow" for camera access</li>
              <li>Refresh the page and try again</li>
            </ul>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => {
              setPermissionDenied(false);
              startCamera();
            }} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={onCancel} variant="secondary">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={startCamera} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={onCancel} variant="secondary">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-black">
          {!capturedPhoto ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[400px] object-cover"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              {!isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <span className="ml-2 text-white text-sm">Starting camera...</span>
                </div>
              )}
            </>
          ) : (
            <img
              src={capturedPhoto}
              alt="Captured"
              className="w-full h-auto max-h-[400px] object-cover"
            />
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-semibold text-center mb-4">{title}</h3>
          
          <div className="flex gap-3 justify-center flex-wrap">
            {!capturedPhoto ? (
              <>
                <Button
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                  className="flex-1"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Capture
                </Button>
                <Button
                  onClick={switchCamera}
                  variant="outline"
                  size="lg"
                  disabled={!isCameraReady}
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                  disabled={isCapturing}
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={handleCancel}
                  className="flex-1"
                  size="lg"
                  disabled={isCapturing}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Done
                </Button>
              </>
            )}
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="lg"
              disabled={isCapturing}
            >
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
          
          {isCapturing && (
            <div className="mt-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
              <span className="text-sm text-muted-foreground">Uploading photo...</span>
            </div>
          )}
          
          {!capturedPhoto && isCameraReady && (
            <p className="text-xs text-center text-muted-foreground mt-3">
              Position your face clearly in frame and click Capture
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};