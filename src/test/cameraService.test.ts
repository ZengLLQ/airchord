import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraService } from '../camera/CameraService';

describe('CameraService - Lifecycle, Error Handling, and Device Management', () => {
  let mockTrack: {
    stop: ReturnType<typeof vi.fn>;
    readyState: string;
    onended: (() => void) | null;
  };
  let mockStream: {
    getTracks: () => unknown[];
    getVideoTracks: () => unknown[];
  };
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    mockTrack = {
      stop: vi.fn(),
      readyState: 'live',
      onended: null,
    };

    mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
    };

    mockVideo = {
      srcObject: null,
      playsInline: false,
      muted: false,
      readyState: 2, // HAVE_CURRENT_DATA
      play: vi.fn().mockResolvedValue(undefined),
      onloadedmetadata: null,
      onerror: null,
    } as unknown as HTMLVideoElement;

    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam-builtin', label: 'Built-in WebCam' },
          { kind: 'audioinput', deviceId: 'mic-builtin', label: 'Built-in Mic' },
          { kind: 'videoinput', deviceId: 'cam-usb', label: 'USB HD Camera' },
        ]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enumerates video devices and filters out non-video inputs', async () => {
    const service = new CameraService();
    const cameras = await service.getAvailableCameras();

    expect(cameras).toHaveLength(2);
    expect(cameras[0].deviceId).toBe('cam-builtin');
    expect(cameras[1].deviceId).toBe('cam-usb');
    service.dispose();
  });

  it('transitions state through initializing to ready upon successful camera start', async () => {
    const statusChanges: string[] = [];
    const service = new CameraService((status) => statusChanges.push(status));

    const success = await service.startCamera(mockVideo);

    expect(success).toBe(true);
    expect(service.getStatus()).toBe('ready');
    expect(mockVideo.srcObject).toBe(mockStream);
    expect(mockVideo.muted).toBe(true);
    expect(mockVideo.playsInline).toBe(true);
    expect(mockVideo.play).toHaveBeenCalled();
    expect(statusChanges).toContain('requesting-permission');
    expect(statusChanges).toContain('initializing');
    expect(statusChanges).toContain('ready');

    service.dispose();
  });

  it('handles permission denied (NotAllowedError) with clear user advice', async () => {
    const permError = new DOMException('Permission denied', 'NotAllowedError');
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(permError);

    const service = new CameraService();
    const success = await service.startCamera(mockVideo);

    expect(success).toBe(false);
    expect(service.getStatus()).toBe('camera-error');
    expect(service.getErrorMessage()).toContain('Camera permission was denied');

    service.dispose();
  });

  it('handles hardware camera in use (NotReadableError)', async () => {
    const busyError = new DOMException('Device in use', 'NotReadableError');
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(busyError);

    const service = new CameraService();
    const success = await service.startCamera(mockVideo);

    expect(success).toBe(false);
    expect(service.getStatus()).toBe('camera-error');
    expect(service.getErrorMessage()).toContain('already in use');

    service.dispose();
  });

  it('handles device disconnection via MediaStreamTrack onended event', async () => {
    const service = new CameraService();
    await service.startCamera(mockVideo);
    expect(service.getStatus()).toBe('ready');

    // Simulate camera unplug / stream termination
    if (mockTrack.onended) {
      mockTrack.onended();
    }

    expect(service.getStatus()).toBe('camera-error');
    expect(service.getErrorMessage()).toContain('Camera device was disconnected');

    service.dispose();
  });

  it('stops camera cleanly without lingering callbacks or stream locks', async () => {
    const service = new CameraService();
    await service.startCamera(mockVideo);

    service.stopCamera();

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(mockTrack.onended).toBeNull();
    expect(mockVideo.srcObject).toBeNull();
    expect(service.getStatus()).toBe('stopped');

    service.dispose();
  });
});
