// ============================================
// Nepali Racer - Device Detection
// ============================================

export const device = {
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ),
  isTablet: /iPad|Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent),
  isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ),
  isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
  isAndroid: /Android/i.test(navigator.userAgent),
  isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,

  getOrientation() {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  },

  isLandscape() {
    return this.getOrientation() === 'landscape';
  },

  isPortrait() {
    return this.getOrientation() === 'portrait';
  },

  getScreenSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
};

export function isTouchDevice() {
  return device.isTouch;
}

export function isMobileDevice() {
  return device.isMobile;
}

export default device;
