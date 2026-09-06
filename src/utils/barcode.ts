/**
 * Bộ tạo mã vạch Code 128 (Subset B) dạng SVG sắc nét, tương thích 100% với máy in nhiệt 100x150mm
 */

// Bảng mẫu mã hóa Code 128 (107 patterns, mỗi pattern gồm 6 số biểu thị độ rộng xen kẽ Bar/Space)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (104=StartB, 106=Stop)
];

const START_B = 104;
const STOP = 106;

export interface BarcodeBar {
  x: number;
  width: number;
}

/**
 * Mã hóa chuỗi text sang danh sách thanh đen của mã vạch Code 128B
 */
export function encodeCode128B(text: string): { bars: BarcodeBar[]; totalWidth: number } {
  if (!text) return { bars: [], totalWidth: 0 };

  // Lọc lấy các ký tự ASCII in được từ 32 đến 126
  const cleanText = text.replace(/[^\x20-\x7E]/g, '');
  if (!cleanText) return { bars: [], totalWidth: 0 };

  const codes: number[] = [START_B];
  let checkSum = START_B;

  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i) - 32;
    codes.push(code);
    checkSum += code * (i + 1);
  }

  const checkDigit = checkSum % 103;
  codes.push(checkDigit);
  codes.push(STOP);

  const bars: BarcodeBar[] = [];
  let currentX = 0;

  codes.forEach((code) => {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) return;

    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      if (isBar) {
        bars.push({ x: currentX, width });
      }
      currentX += width;
      isBar = !isBar;
    }
  });

  return { bars, totalWidth: currentX };
}
