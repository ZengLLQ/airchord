import type { CameraStatus } from '../types';

export class CameraService {
  private currentStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private status: CameraStatus = 'idle';
  private errorMessage: string | null = null;
  private onStatusChange?: (status: CameraStatus, error: string | null) => void;
  private boundDeviceChangeListener?: () => void;

  constructor(onStatusChange?: (status: CameraStatus, error: string | null) => void) {
    this.onStatusChange = onStatusChange;
    this.setupDeviceListener();
  }

  public getStatus(): CameraStatus {
    return this.status;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  private setStatus(status: CameraStatus, error: string | null = null): void {
    this.status = status;
    this.errorMessage = error;
    this.onStatusChange?.(status, error);
  }

  /**
   * Retrieves list of available video input devices.
   */
  public async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === 'videoinput');
    } catch (err) {
      console.warn('CameraService: Failed to enumerate devices', err);
      return [];
    }
  }

  /**
   * Starts camera capture with user consent.
   */
  public async startCamera(
    videoElement: HTMLVideoElement,
    deviceId?: string
  ): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setStatus('camera-error', 'Webcam access is not supported by your browser.');
      return false;
    }

    this.stopCamera();
    this.videoElement = videoElement;
    this.setStatus('requesting-permission');

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
    };

    try {
      this.setStatus('initializing');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;

      // Handle hardware disconnection via MediaStreamTrack onended
      for (const track of stream.getVideoTracks()) {
        track.onended = () => {
          this.setStatus('camera-error', 'Camera device was disconnected.');
          this.stopCamera();
        };
      }

      videoElement.srcObject = stream;
      videoElement.playsInline = true;
      videoElement.muted = true;

      // Ensure video playback starts even if metadata is already loaded
      if (videoElement.readyState >= 1) {
        await videoElement.play();
      } else {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Camera preview initialization timed out.'));
          }, 6000);

          videoElement.onloadedmetadata = () => {
            clearTimeout(timeout);
            videoElement
              .play()
              .then(() => resolve())
              .catch((err) => reject(err));
          };
          videoElement.onerror = (e) => {
            clearTimeout(timeout);
            reject(e);
          };
        });
      }

      this.setStatus('ready');
      return true;
    } catch (err: unknown) {
      this.stopCamera();
      let userFriendlyMsg = 'Failed to access camera.';

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          userFriendlyMsg = 'Camera permission was denied. Please allow camera access in browser permissions.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          userFriendlyMsg = 'No camera found. Please connect a webcam and try again.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          userFriendlyMsg = 'Camera is already in use by another application or tab.';
        } else if (err.name === 'OverconstrainedError') {
          userFriendlyMsg = 'Requested camera resolution is not supported by device.';
        }
      } else if (err instanceof Error) {
        userFriendlyMsg = err.message;
      }

      this.setStatus('camera-error', userFriendlyMsg);
      return false;
    }
  }

  /**
   * Stops video tracks and clears resources.
   */
  public stopCamera(): void {
    if (this.currentStream) {
      for (const track of this.currentStream.getTracks()) {
        track.onended = null;
        track.stop();
      }
      this.currentStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement.onloadedmetadata = null;
      this.videoElement.onerror = null;
      this.videoElement = null;
    }

    if (this.status !== 'camera-error' && this.status !== 'idle') {
      this.setStatus('stopped');
    }
  }

  private setupDeviceListener(): void {
    if (navigator.mediaDevices?.addEventListener) {
      this.boundDeviceChangeListener = () => {
        if (this.currentStream) {
          const videoTrack = this.currentStream.getVideoTracks()[0];
          if (videoTrack && videoTrack.readyState === 'ended') {
            this.setStatus('camera-error', 'Camera device was disconnected.');
            this.stopCamera();
          }
        }
      };
      navigator.mediaDevices.addEventListener('devicechange', this.boundDeviceChangeListener);
    }
  }

  public dispose(): void {
    this.stopCamera();
    if (navigator.mediaDevices?.removeEventListener && this.boundDeviceChangeListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.boundDeviceChangeListener);
    }
  }
}
