export interface DeviceInfo {
  browser: string
  os: string
  screen: string
  cores: number | null
}

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent
  const ver = (re: RegExp) => ua.match(re)?.[1] ?? ''

  let browser = 'Brauzer'
  if (/Edg\//.test(ua)) browser = `Edge ${ver(/Edg\/(\d+)/)}`
  else if (/OPR\//.test(ua)) browser = `Opera ${ver(/OPR\/(\d+)/)}`
  else if (/SamsungBrowser\//.test(ua)) browser = `Samsung Internet ${ver(/SamsungBrowser\/(\d+)/)}`
  else if (/Firefox\/|FxiOS\//.test(ua)) browser = `Firefox ${ver(/(?:Firefox|FxiOS)\/(\d+)/)}`
  else if (/CriOS\/|Chrome\//.test(ua)) browser = `Chrome ${ver(/(?:CriOS|Chrome)\/(\d+)/)}`
  else if (/Safari\//.test(ua)) browser = `Safari ${ver(/Version\/(\d+)/)}`

  let os = 'Noma’lum OS'
  if (/Windows/.test(ua)) os = 'Windows'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPod/.test(ua)) os = 'iOS'
  else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) os = 'iPadOS'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/CrOS/.test(ua)) os = 'ChromeOS'
  else if (/Linux/.test(ua)) os = 'Linux'

  return {
    browser: browser.trim(),
    os,
    screen: `${window.screen.width}×${window.screen.height}`,
    cores: navigator.hardwareConcurrency || null,
  }
}
