import React, { useId, useMemo, useState } from 'react';
import * as d3 from 'd3';

export interface D3SparklineProps {
  /** Array of numeric values to plot */
  data?: number[];
  /** Width of the sparkline in pixels (default: 68) */
  width?: number;
  /** Height of the sparkline in pixels (default: 22) */
  height?: number;
  /** Explicit trend direction (true = bullish, false = bearish) */
  isPositive?: boolean;
  /** Custom stroke color (overrides default bullish/bearish color) */
  strokeColor?: string;
  /** Custom fill/gradient color (defaults to strokeColor) */
  fillColor?: string;
  /** Line stroke width (default: 1.5) */
  strokeWidth?: number;
  /** Whether to render a semi-transparent area gradient fill beneath the curve (default: true) */
  showArea?: boolean;
  /** Whether to render an institutional terminal dot on the latest price point (default: true) */
  showEndDot?: boolean;
  /** Enable interactive hover point (default: false) */
  interactive?: boolean;
  /** Accessible label */
  label?: string;
  /** Optional container class name */
  className?: string;
}

export const D3Sparkline: React.FC<D3SparklineProps> = React.memo(({
  data = [],
  width = 68,
  height = 22,
  isPositive,
  strokeColor,
  fillColor,
  strokeWidth = 1.5,
  showArea = true,
  showEndDot = true,
  interactive = false,
  label = 'Market price sparkline',
  className = '',
}) => {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Normalize points
  const points = useMemo(() => {
    if (!data || data.length === 0) return [10, 10];
    if (data.length === 1) return [data[0] * 0.9995, data[0]];
    return data;
  }, [data]);

  // Determine trend color
  const trendPositive = useMemo(() => {
    if (typeof isPositive === 'boolean') return isPositive;
    if (points.length >= 2) {
      return points[points.length - 1] >= points[0];
    }
    return true;
  }, [isPositive, points]);

  const activeColor = strokeColor || (trendPositive ? 'var(--bullish)' : 'var(--bearish)');
  const gradientColor = fillColor || activeColor;

  // D3 scale and path calculations
  const { linePath, areaPath, lastPoint, xCoords, yCoords } = useMemo(() => {
    const padTop = 3;
    const padBottom = 3;
    const padHorizontal = showEndDot ? 4 : 2;

    const effectiveWidth = Math.max(width, 24);
    const effectiveHeight = Math.max(height, 12);

    const minVal = d3.min(points) ?? 0;
    const maxVal = d3.max(points) ?? 1;
    const valRange = maxVal - minVal;

    const xScale = d3.scaleLinear()
      .domain([0, points.length - 1])
      .range([padHorizontal, effectiveWidth - padHorizontal]);

    // Invert y: higher prices are physically at lower SVG y
    const yScale = d3.scaleLinear()
      .domain(valRange === 0 ? [minVal - 1, maxVal + 1] : [minVal, maxVal])
      .range([effectiveHeight - padBottom, padTop]);

    const lineGenerator = d3.line<number>()
      .x((_, idx) => xScale(idx))
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX);

    const areaGenerator = d3.area<number>()
      .x((_, idx) => xScale(idx))
      .y0(effectiveHeight)
      .y1(d => yScale(d))
      .curve(d3.curveMonotoneX);

    const lPath = lineGenerator(points) || '';
    const aPath = areaGenerator(points) || '';

    const lastIdx = points.length - 1;
    const lastX = xScale(lastIdx);
    const lastY = yScale(points[lastIdx]);

    const xPoints = points.map((_, idx) => xScale(idx));
    const yPoints = points.map(d => yScale(d));

    return {
      linePath: lPath,
      areaPath: aPath,
      lastPoint: { x: lastX, y: lastY, val: points[lastIdx] },
      xCoords: xPoints,
      yCoords: yPoints,
    };
  }, [points, width, height, showEndDot]);

  // Interactive mouse handlers
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    // Find closest index
    let closestIdx = 0;
    let minDiff = Infinity;
    xCoords.forEach((x, idx) => {
      const diff = Math.abs(x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    if (interactive) setHoverIndex(null);
  };

  return (
    <div className={`relative inline-flex items-center shrink-0 select-none ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible block"
        role="img"
        aria-label={label}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={`sparkline-grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientColor} stopOpacity="0.32" />
            <stop offset="65%" stopColor={gradientColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={gradientColor} stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Shaded Area under the D3 curve */}
        {showArea && areaPath && (
          <path
            d={areaPath}
            fill={`url(#sparkline-grad-${gradientId})`}
            className="transition-opacity duration-300"
          />
        )}

        {/* D3 Monotone Spline Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
        )}

        {/* End dot for latest price point */}
        {showEndDot && lastPoint && (
          <g transform={`translate(${lastPoint.x}, ${lastPoint.y})`}>
            {/* Subtle outer pulse glow */}
            <circle
              r="3.2"
              fill={activeColor}
              opacity="0.25"
              className="animate-pulse"
            />
            {/* Crisp center dot */}
            <circle
              r="1.6"
              fill={activeColor}
            />
          </g>
        )}

        {/* Interactive hover indicator */}
        {interactive && hoverIndex !== null && (
          <g transform={`translate(${xCoords[hoverIndex]}, ${yCoords[hoverIndex]})`}>
            <circle
              r="3.5"
              fill="var(--bg-canvas, #0b0f17)"
              stroke={activeColor}
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>
    </div>
  );
});

D3Sparkline.displayName = 'D3Sparkline';
