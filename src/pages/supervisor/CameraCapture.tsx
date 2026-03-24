// components/CameraCapture.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Camera, RefreshCw, Check, X, AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (photoFile: File) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  open,
  onOpenChange,
  onCapture,
  title = "Take Photo",
  description = "Take a photo for attendance verification",
  actionLabel = "Use Photo"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Stop all tracks in the stream
  const stopCameraTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!open) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setIsCameraReady(false);
      
      // Stop any existing stream first
      stopCameraTracks();
      
      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      console.log('Starting camera with facing mode:', facingMode);
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { exact: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('Video playing successfully');
                setIsCameraReady(true);
                setIsLoading(false);
              })
              .catch((err) => {
                console.error('Error playing video:', err);
                setError('Failed to start video playback');
                setIsLoading(false);
              });
          }
        };
        
        videoRef.current.onerror = () => {
          console.error('Video error');
          setError('Video error occurred');
          setIsLoading(false);
        };
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setIsLoading(false);
      setIsCameraReady(false);
      
      // Handle specific errors
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions and refresh the page.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is in use by another application.');
      } else if (err.name === 'OverconstrainedError') {
        // Try without facing mode constraint
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setIsCameraReady(true);
              setIsLoading(false);
            };
          }
          setError(null);
        } catch (fallbackErr) {
          setError('Unable to access camera. Please check your camera settings.');
        }
      } else {
        setError(`Camera error: ${err.message || 'Unknown error'}`);
      }
    }
  }, [open, facingMode, stopCameraTracks]);

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    // Camera will restart automatically due to useEffect
  }, [facingMode]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      toast.error('Camera not ready');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image as data URL with high quality
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(imageDataUrl);
      
      // Stop camera after capturing
      stopCameraTracks();
      setIsCameraReady(false);
    } else {
      toast.error('Failed to capture photo');
    }
  }, [isCameraReady, stopCameraTracks]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    // Restart camera
    startCamera();
  }, [startCamera]);

  // Use captured photo
  const usePhoto = useCallback(async () => {
    if (capturedImage) {
      try {
        // Convert base64 to blob
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], `attendance_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        handleClose();
      } catch (err) {
        console.error('Error converting photo:', err);
        toast.error('Failed to process photo');
      }
    }
  }, [capturedImage, onCapture]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    stopCameraTracks();
    setCapturedImage(null);
    setError(null);
    setIsLoading(true);
    setIsCameraReady(false);
    onOpenChange(false);
  }, [stopCameraTracks, onOpenChange]);

  // Start/stop camera when dialog opens/closes or facing mode changes
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      stopCameraTracks();
      setCapturedImage(null);
      setError(null);
      setIsLoading(true);
      setIsCameraReady(false);
    }
    
    return () => {
      stopCameraTracks();
    };
  }, [open, facingMode, startCamera, stopCameraTracks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, [stopCameraTracks]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          {isLoading && !capturedImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Starting camera...</p>
              </div>
            </div>
          )}
          
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
              
              {isCameraReady && !error && !isLoading && (
                <>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 text-black shadow-lg"
                    >
                      <Camera className="h-8 w-8" />
                    </Button>
                  </div>
                  
                  <div className="absolute top-4 right-4">
                    <Button
                      onClick={switchCamera}
                      variant="outline"
                      size="sm"
                      className="bg-black/50 text-white hover:bg-black/70 border-white/20"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Switch
                    </Button>
                  </div>
                </>
              )}
              
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-20">
                  <div className="text-center text-white p-6 max-w-sm">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                    <p className="mb-4 font-medium">{error}</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button onClick={startCamera} variant="outline" className="text-white border-white">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                      </Button>
                      <Button onClick={handleClose} variant="ghost" className="text-white">
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  size="lg"
                  className="rounded-full w-12 h-12 bg-white hover:bg-gray-100 shadow-lg"
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
                <Button
                  onClick={usePhoto}
                  size="lg"
                  className="rounded-full w-12 h-12 bg-green-600 hover:bg-green-700 shadow-lg"
                >
                  <Check className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          {capturedImage && (
            <Button onClick={usePhoto}>
              <Check className="mr-2 h-4 w-4" />
              {actionLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;