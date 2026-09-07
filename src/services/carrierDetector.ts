import { CarrierConfig, CarrierId } from '../types/tracking';

export const CARRIERS: Record<CarrierId, CarrierConfig> = {
  ghn: {
    id: 'ghn',
    name: 'Giao Hàng Nhanh (GHN)',
    shortName: 'GHN',
    logoColor: '#F26522',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    badgeText: 'text-orange-600',
    prefixHints: ['VNGH', 'GY', 'G8', 'NL', 'GHN'],
    trackingUrlPattern: 'https://donhang.ghn.vn/?order_code={CODE}',
    website: 'https://donhang.ghn.vn/'
  },
  spx: {
    id: 'spx',
    name: 'Shopee Express (SPX)',
    shortName: 'SPX',
    logoColor: '#EE4D2D',
    badgeBg: 'bg-red-50 text-red-700 border-red-200',
    badgeText: 'text-red-600',
    prefixHints: ['SPXVN', 'SPX', 'VNSPX', 'SPE', 'VNSP'],
    trackingUrlPattern: 'https://spx.vn/track?{CODE}',
    website: 'https://spx.vn/vi'
  },
  jt: {
    id: 'jt',
    name: 'J&T Express / J&T Cargo',
    shortName: 'J&T (Cargo)',
    logoColor: '#E60012',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'text-rose-600',
    prefixHints: ['86', '84', '530', '53', 'JT', 'JTE', 'JTT'],
    trackingUrlPattern: 'https://jtexpress.vn/vi/tracking?type=track&billcode={CODE}',
    website: 'https://jtexpress.vn/'
  },
  viettelpost: {
    id: 'viettelpost',
    name: 'Viettel Post',
    shortName: 'VTP',
    logoColor: '#EE0033',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-600',
    prefixHints: ['VT', 'VTP', '10', '11', '12', '13', '14', '15'],
    trackingUrlPattern: 'https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/?order_number={CODE}',
    website: 'https://viettelpost.com.vn/'
  },
  ninjavan: {
    id: 'ninjavan',
    name: 'Ninja Van',
    shortName: 'NinjaVan',
    logoColor: '#C41230',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeText: 'text-purple-600',
    prefixHints: ['NIVN', 'SHP', 'NLVN', 'NV'],
    trackingUrlPattern: 'https://www.ninjavan.co/vi-vn/tracking?id={CODE}',
    website: 'https://www.ninjavan.co/vi-vn/'
  },
  vnpost: {
    id: 'vnpost',
    name: 'Bưu điện Việt Nam (VNPost / EMS)',
    shortName: 'VNPost',
    logoColor: '#FFB600',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeText: 'text-amber-700',
    prefixHints: ['EVN', 'CVN', 'RVN', 'VNPOST', 'EMS'],
    trackingUrlPattern: 'http://www.vnpost.vn/vi-vn/dinh-vi/buu-pham?key={CODE}',
    website: 'http://www.vnpost.vn/'
  },
  best: {
    id: 'best',
    name: 'Best Express',
    shortName: 'Best Express',
    logoColor: '#0055A5',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'text-blue-600',
    prefixHints: ['61', '81', 'BEST'],
    trackingUrlPattern: 'https://best-inc.vn/track?bills={CODE}',
    website: 'https://best-inc.vn/'
  },
  unknown: {
    id: 'unknown',
    name: 'Chưa xác định hãng',
    shortName: 'Khác',
    logoColor: '#6B7280',
    badgeBg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    badgeText: 'text-zinc-500',
    prefixHints: [],
    trackingUrlPattern: 'https://www.google.com/search?q={CODE}',
    website: ''
  }
};

/**
 * Automatically detects carrier by tracking code format, prefixes, and optional channel hint
 */
export function detectCarrier(code: string, channelHint: string = ''): CarrierId {
  const cleanCode = (code || '').trim().toUpperCase();
  const cleanChannel = (channelHint || '').trim().toUpperCase();

  // 1. PRIMARY RULE: Direct Tracking Number Prefix / Format Check
  if (
    cleanCode.startsWith('SPXVN') || 
    cleanCode.startsWith('SPX') || 
    cleanCode.startsWith('VNSPX') || 
    cleanCode.startsWith('SPE') ||
    cleanCode.startsWith('VNSP')
  ) {
    return 'spx';
  }

  if (
    cleanCode.startsWith('VNGH') ||
    cleanCode.startsWith('GY') || 
    cleanCode.startsWith('G8') || 
    cleanCode.startsWith('GHN') ||
    cleanCode.startsWith('NL_') ||
    (cleanCode.length === 8 && /^[A-Z0-9]{8}$/.test(cleanCode) && cleanCode.startsWith('G'))
  ) {
    return 'ghn';
  }

  if (
    cleanCode.startsWith('NIVN') || 
    cleanCode.startsWith('NLVN') || 
    cleanCode.startsWith('NV') ||
    (cleanCode.startsWith('SHP') && cleanCode.length > 10)
  ) {
    return 'ninjavan';
  }

  if (
    cleanCode.startsWith('VT') || 
    cleanCode.startsWith('VTP')
  ) {
    return 'viettelpost';
  }

  if (
    cleanCode.startsWith('EMS') || 
    cleanCode.startsWith('VNPOST') ||
    /^[ECR][A-Z0-9]{8,11}VN$/i.test(cleanCode)
  ) {
    return 'vnpost';
  }

  if (
    cleanCode.startsWith('BEST') ||
    ((cleanCode.startsWith('61') || cleanCode.startsWith('81')) && cleanCode.length === 12 && /^\d+$/.test(cleanCode))
  ) {
    return 'best';
  }

  if (
    cleanCode.startsWith('JT') || 
    cleanCode.startsWith('JTE') || 
    cleanCode.startsWith('JTT') || 
    cleanCode.startsWith('JNT') ||
    cleanCode.startsWith('530') ||
    ((cleanCode.startsWith('86') || cleanCode.startsWith('84') || cleanCode.startsWith('53')) && cleanCode.length === 12 && /^\d+$/.test(cleanCode))
  ) {
    return 'jt';
  }

  // 2. Fallback heuristics
  if (/^\d{12}$/.test(cleanCode)) {
    return 'jt';
  }

  if (/^\d{9,11}$/.test(cleanCode)) {
    return 'viettelpost';
  }

  // 3. SECONDARY RULE: Check channel hint
  if (cleanChannel) {
    if (cleanChannel.includes('GHN') || cleanChannel.includes('GIAOHANGNHANH') || cleanChannel.includes('GIAO HANG NHANH')) {
      return 'ghn';
    }
    if (cleanChannel.includes('SPX') || cleanChannel.includes('SHOPEE') || cleanChannel.includes('SPE')) {
      return 'spx';
    }
    if (
      cleanChannel.includes('J&T') || 
      cleanChannel.includes('JNT') || 
      cleanChannel.includes('JTEXPRESS') ||
      cleanChannel.includes('J&T CARGO')
    ) {
      return 'jt';
    }
    if (cleanChannel.includes('VIETTEL') || cleanChannel.includes('VTP')) {
      return 'viettelpost';
    }
    if (cleanChannel.includes('NINJA') || cleanChannel.includes('NIVN')) {
      return 'ninjavan';
    }
    if (cleanChannel.includes('VNPOST') || cleanChannel.includes('EMS') || cleanChannel.includes('BUUDIEN')) {
      return 'vnpost';
    }
    if (cleanChannel.includes('BEST')) {
      return 'best';
    }
  }

  return 'unknown';
}

/**
 * Generates direct tracking link to carrier's official website
 */
export function getDirectTrackingUrl(carrier: CarrierId, code: string, phone: string = ''): string {
  const config = CARRIERS[carrier] || CARRIERS.unknown;
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return config.website || 'https://spx.vn/vi';
  }
  if (carrier === 'spx' || cleanCode.startsWith('SPXVN') || cleanCode.startsWith('SPX')) {
    return `https://spx.vn/track?${encodeURIComponent(cleanCode)}`;
  }
  let url = config.trackingUrlPattern.replace('{CODE}', encodeURIComponent(cleanCode));
  if (carrier === 'jt') {
    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-4) : '8836';
    if (cleanPhone) {
      url += `&cellphone=${encodeURIComponent(cleanPhone)}`;
    }
  }
  return url;
}

export function getJNTMultiTrackingUrl(codes: string[], phone: string = '8836'): string {
  const cleanCodes = codes.map(c => c.trim().toUpperCase()).filter(Boolean).slice(0, 10);
  const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-4) : '8836';
  return `https://jtexpress.vn/vi/tracking?type=track&billcode=${encodeURIComponent(cleanCodes.join(','))}&cellphone=${encodeURIComponent(cleanPhone)}`;
}
