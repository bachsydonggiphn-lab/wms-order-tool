import React from 'react';
import { encodeCode128B } from '../utils/barcode';

interface BarcodeViewProps {
  value: string;
  height?: number;
  barWidth?: number;
  showText?: boolean;
  className?: string;
}

export const BarcodeView: React.FC<BarcodeViewProps> = ({
  value,
  height = 36,
  barWidth = 1.6,
  showText = false,
  className = '',
}) => {
  const { bars, totalWidth } = encodeCode128B(value);

  if (!bars.length) {
    return null;
  }

  const svgWidth = totalWidth * barWidth;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        preserveAspectRatio="none"
        className="shape-rendering-crispEdges block"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill="#000000"
          />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[10px] font-bold text-black tracking-wider mt-0.5">
          {value}
        </span>
      )}
    </div>
  );
};
