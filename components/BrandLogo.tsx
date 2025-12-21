import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-20 h-auto',
    md: 'w-40 h-auto',
    lg: 'w-72 h-auto',
    xl: 'w-96 h-auto'
  };

  const dimensions = sizeClasses[size];

  // Imperial Grade Asian Fretwork (Leiwen)
  // 36 segments (10 degrees per unit) for the background coin
  const leiwenSegments = Array.from({ length: 36 }).map((_, i) => {
    const angle = i * 10;
    return (
      <g key={i} transform={`rotate(${angle})`}>
        <path
          d="M -40 -340 H 40 V -280 H -30 V -330 H 20 V -290 H -10 V -310 H 5"
          fill="none"
          stroke="url(#goldMetallicPremium)"
          strokeWidth="4.0"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
        <path
          d="M -40 -340 H 40 V -280 H -30 V -330 H 20 V -290 H -10 V -310 H 5"
          fill="none"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="0.8"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
      </g>
    );
  });

  return (
    <div className={`${dimensions} ${className} relative flex items-center justify-center select-none transition-all duration-1000 ease-in-out hover:scale-[1.03] active:scale-95 group`}>
      <svg 
        viewBox="0 0 1024 1024" 
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldMetallicPremium" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3d280a" />
            <stop offset="15%" stopColor="#b8860b" />
            <stop offset="30%" stopColor="#fbf5b7" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#d4af37" />
            <stop offset="85%" stopColor="#8b6508" />
            <stop offset="100%" stopColor="#3d280a" />
          </linearGradient>

          <radialGradient id="imperialRedGradient" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ff1a1a" />
            <stop offset="45%" stopColor="#800000" />
            <stop offset="85%" stopColor="#2a0000" />
            <stop offset="100%" stopColor="#150000" />
          </radialGradient>

          <linearGradient id="goldRimGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4d2600" />
            <stop offset="20%" stopColor="#d4af37" />
            <stop offset="50%" stopColor="#fffaf0" />
            <stop offset="80%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#4d2600" />
          </linearGradient>

          <filter id="gold3DBevelPremium" x="-200%" y="-200%" width="500%" height="500%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur" />
            <feSpecularLighting in="blur" surfaceScale="32" specularConstant="2.8" specularExponent="80" lightingColor="#ffffff" result="spec1">
              <fePointLight x="-2000" y="-2000" z="4000" />
            </feSpecularLighting>
            <feComposite in="spec1" in2="SourceAlpha" operator="in" result="bevel1" />
            <feSpecularLighting in="blur" surfaceScale="22" specularConstant="2.2" specularExponent="45" lightingColor="#fffaf0" result="spec2">
              <fePointLight x="2000" y="2000" z="3000" />
            </feSpecularLighting>
            <feComposite in="spec2" in2="SourceAlpha" operator="in" result="bevel2" />
            <feComposite in="SourceGraphic" in2="bevel1" operator="arithmetic" k1="0" k2="1" k3="1.6" k4="0" result="lit1" />
            <feComposite in="lit1" in2="bevel2" operator="arithmetic" k1="0" k2="1" k3="1.1" k4="0" result="final" />
          </filter>

          <filter id="goldBloomPremium" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="tightBlur" />
            <feFlood floodColor="#fffde7" floodOpacity="0.4" result="coreColor" />
            <feComposite in="coreColor" in2="tightBlur" operator="in" result="coreGlow" />
            <feMerge>
              <feMergeNode in="coreGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g style={{ filter: `drop-shadow(0 120px 240px rgba(0, 0, 0, 1)) drop-shadow(0 0 100px rgba(234, 179, 8, 0.1))` }}>
          
          {/* MINTED IMPERIAL COIN ASSEMBLY */}
          <g transform="translate(512, 340)">
             <circle r="345" fill="url(#goldRimGradient)" filter="url(#gold3DBevelPremium)" />
             <circle r="335" fill="url(#imperialRedGradient)" />
             <g filter="url(#gold3DBevelPremium)">
               {leiwenSegments}
             </g>
             <circle 
                r="270" 
                fill="none" 
                stroke="url(#goldRimGradient)" 
                strokeWidth="10" 
                filter="url(#gold3DBevelPremium)" 
             />
          </g>

          {/* Central Spade & 13 Logo Assembly */}
          <g transform="translate(0, 60)">
            <g filter="url(#gold3DBevelPremium)">
              <path 
                fill="url(#goldMetallicPremium)" 
                filter="url(#goldBloomPremium)"
                fillRule="evenodd"
                d="M 498.431 76.294 C 491.319 83.056, 478.949 94.644, 470.942 102.044 C 462.935 102.044, 447.635 123.595, 436.942 133.488 C 426.249 143.381, 409.921 158.906, 400.659 167.988 C 391.396 177.070, 379.094 189.748, 373.321 196.163 C 367.549 202.577, 359.448 212.027, 355.321 217.163 C 351.194 222.298, 344.303 231.782, 340.008 238.237 C 335.713 244.693, 329.905 254.440, 327.102 259.897 C 324.298 265.355, 320.449 274.473, 318.548 280.160 C 316.647 285.847, 314.396 294.496, 313.546 299.381 C 312.696 304.266, 312.001 311.691, 312.001 315.881 C 312.002 320.071, 312.675 327.325, 313.497 332 C 314.319 336.675, 315.929 343.425, 317.075 347 C 318.221 350.575, 320.871 356.935, 322.964 361.134 C 325.056 365.333, 328.711 371.633, 331.086 375.134 C 333.461 378.635, 339.250 385.369, 343.952 390.097 C 348.653 394.826, 355.875 400.950, 360 403.708 C 364.125 406.465, 370.208 410.087, 373.517 411.757 C 376.826 413.427, 383.351 415.954, 388.017 417.373 C 392.683 418.792, 399.650 420.404, 403.500 420.956 C 407.350 421.509, 414.100 421.966, 418.500 421.973 C 422.900 421.979, 429.425 421.520, 433 420.953 C 436.575 420.385, 443.208 418.800, 447.740 417.431 C 452.272 416.062, 459.247 413.422, 463.240 411.565 C 467.233 409.708, 473.747 405.895, 477.715 403.093 C 481.683 400.290, 487.815 395.298, 491.342 391.999 C 494.869 388.699, 497.955 386, 498.199 386 C 498.443 386, 498.302 388.813, 497.886 392.250 C 497.470 395.688, 496.398 402.029, 495.505 406.341 C 494.612 410.654, 492.608 418.079, 491.051 422.841 C 489.494 427.604, 486.396 435.325, 484.165 440 C 481.934 444.675, 477.021 453.225, 473.247 459 C 469.247 465.120, 462.655 473.296, 457.442 478.600 C 452.524 483.606, 446.507 489.343, 444.070 491.350 L 439.640 495 L 512.410 495 L 585.180 495 L 579.840 490.800 C 576.903 488.490, 571.125 483.175, 567 478.990 C 562.875 474.804, 556.885 467.717, 553.688 463.242 C 550.492 458.766, 545.453 450.463, 542.490 444.790 C 539.528 439.118, 535.453 429.543, 533.436 423.514 C 531.418 417.484, 528.919 407.850, 527.884 402.106 C 526.848 396.361, 526 390.290, 526 388.615 C 526 385.568, 526 385.568, 531.250 390.694 C 534.138 393.513, 540.100 398.384, 544.500 401.519 C 548.900 404.653, 555.425 408.685, 559 410.478 C 562.575 412.271, 569.100 414.974, 573.500 416.485 C 577.900 417.995, 585.325 419.852, 590 420.612 C 594.675 421.371, 602.100 421.991, 606.500 421.989 C 610.900 421.987, 617.425 421.517, 621 420.945 C 624.575 420.373, 630.650 418.980, 634.500 417.851 C 638.350 416.721, 644.662 414.343, 648.527 412.566 C 652.392 410.789, 658.917 407.126, 663.027 404.424 C 667.137 401.723, 673.993 396.182, 678.263 392.112 C 682.532 388.041, 688.228 381.738, 690.921 378.105 C 693.613 374.472, 697.612 368.125, 699.807 364 C 702.002 359.875, 705.002 352.954, 706.472 348.621 C 707.943 344.287, 709.788 337.385, 710.573 333.283 C 711.358 329.181, 712 321.476, 712 316.162 C 712 310.848, 711.314 302.919, 710.477 298.543 C 709.640 294.166, 708.318 288.444, 707.541 285.826 C 706.764 283.209, 704.460 276.890, 702.423 271.784 C 700.385 266.678, 696.461 258.450, 693.703 253.500 C 690.946 248.550, 685.798 240.317, 682.265 235.205 C 678.731 230.093, 672.684 221.993, 668.827 217.205 C 664.970 212.417, 656.718 202.875, 650.488 196 C 644.259 189.125, 631.588 176.039, 622.331 166.921 C 613.074 157.802, 589.300 135.340, 569.500 117.006 C 549.700 98.672, 528.853 79.245, 523.172 73.836 C 517.492 68.426, 512.511 64, 512.103 64 C 511.696 64, 505.543 69.532, 498.431 76.294 M 446.500 197.765 C 445.400 197.993, 437.191 202.302, 428.258 207.340 L 412.016 216.500 412.008 231.250 C 412.004 239.363, 412.320 246, 412.712 246 C 413.104 246, 418.978 242.799, 425.765 238.887 C 432.553 234.974, 438.298 231.965, 438.533 232.199 C 438.767 232.434, 438.985 251.947, 439.017 275.563 L 439.017 318.500 430.787 318.666 C 426.229 318.757, 420.700 318.869, 418.500 318.915 C 414.500 319, 414.500 319, 414.689 332.250 L 414.877 345.500 455.439 345.761 L 496 346.022 496 332.511 L 496 319 484.113 319 L 472.226 319 471.495 303.889 C 471.092 295.578, 470.929 268.274, 471.131 243.212 L 471.500 197.646 460 197.498 C 453.675 197.416, 447.600 197.536, 446.500 197.765 M 519.250 197.788 L 510 198.075 510 211.538 L 510 225 540.250 225.001 L 570.500 225.001 552.234 242.751 C 542.187 252.513, 533.975 260.940, 533.984 261.478 C 533.993 262.015, 535.913 266.867, 538.250 272.259 C 542.453 281.954, 542.533 282.055, 545.500 281.478 C 547.150 281.157, 551.425 280.642, 555 280.332 C 558.670 280.014, 563.330 280.266, 565.705 280.911 C 568.017 281.539, 571.296 283.219, 572.990 284.645 C 574.685 286.071, 576.817 288.647, 577.728 290.369 C 578.815 292.422, 579.385 295.910, 579.385 300.500 C 579.385 305.009, 578.814 308.568, 577.782 310.500 C 576.900 312.150, 574.901 314.683, 573.339 316.129 C 571.778 317.576, 568.771 319.311, 566.659 319.987 C 564.514 320.673, 559.876 321.036, 556.159 320.809 C 552.496 320.586, 547.772 319.567, 545.661 318.545 C 543.549 317.524, 540.726 315.032, 539.387 313.008 C 538.048 310.985, 536.613 307.342, 536.199 304.914 L 535.447 300.500 519.723 300.225 L 504 299.949 504 304.265 C 504 306.638, 504.680 311.190, 505.511 314.380 C 506.342 317.571, 508.240 322.278, 509.730 324.840 C 511.219 327.403, 514.714 331.792, 517.496 334.593 C 520.439 337.556, 525.308 340.999, 529.138 342.827 C 532.758 344.555, 538.963 346.651, 542.926 347.484 C 546.888 348.318, 553.672 349, 558 349 C 562.328 349, 569.161 348.320, 573.185 347.488 C 577.208 346.657, 583.200 344.584, 586.500 342.882 C 589.800 341.180, 594.475 338.179, 596.888 336.213 C 599.302 334.248, 602.993 329.983, 605.091 326.737 C 607.189 323.491, 609.648 318.285, 610.554 315.168 C 611.789 310.923, 612.092 306.864, 611.760 299 C 611.425 291.074, 610.739 287.052, 608.959 282.592 C 607.508 278.956, 604.537 274.454, 601.235 270.887 C 597.918 267.305, 593.554 263.934, 589.810 262.063 C 586.479 260.398, 581.558 258.745, 578.876 258.389 C 576.194 258.033, 574 257.435, 574 257.058 C 574 256.682, 581.425 249.265, 590.500 240.575 L 607 224.776 607 211.091 L 607 197.406 567.750 197.453 C 546.163 197.479, 524.337 197.629, 519.250 197.788" 
              />
            </g>

            {/* Main Brand Title */}
            <text 
              x="512" 
              y="850" 
              textAnchor="middle" 
              fontSize="140" 
              fontWeight="900" 
              textLength="840"
              lengthAdjust="spacing"
              fontFamily="'Cinzel', serif"
              fill="url(#goldMetallicPremium)"
              filter="url(#goldBloomPremium)"
              stroke="#000000"
              strokeWidth="0.5"
              style={{ textTransform: 'uppercase', paintOrder: 'stroke fill', letterSpacing: '0.15em' }}
            >
              THIRTEEN
            </text>

            {/* MAJESTIC EXTENDED IMPERIAL DIVIDER WITH LEIWEN END CAPS */}
            <g transform="translate(512, 905)">
              {/* Extended Thick Gold Horizontal Line - Now 954 units wide */}
              <rect 
                x="-477" 
                y="-4" 
                width="954" 
                height="8" 
                fill="url(#goldMetallicPremium)" 
                opacity="0.9"
                filter="url(#gold3DBevelPremium)"
              />
              
              {/* Left Leiwen (Square Meander) Motif */}
              <g transform="translate(-495, 0)">
                <path
                  d="M 18 -18 H -18 V 18 H 12 V -12 H -6 V 6"
                  fill="none"
                  stroke="url(#goldMetallicPremium)"
                  strokeWidth="4"
                  strokeLinejoin="miter"
                  strokeLinecap="square"
                  filter="url(#gold3DBevelPremium)"
                />
              </g>

              {/* Right Leiwen (Square Meander) Motif - Mirrored */}
              <g transform="translate(495, 0) scale(-1, 1)">
                <path
                  d="M 18 -18 H -18 V 18 H 12 V -12 H -6 V 6"
                  fill="none"
                  stroke="url(#goldMetallicPremium)"
                  strokeWidth="4"
                  strokeLinejoin="miter"
                  strokeLinecap="square"
                  filter="url(#gold3DBevelPremium)"
                />
              </g>
            </g>

            {/* Subtitle - Increased Font Size */}
            <text 
              x="512" 
              y="972" 
              textAnchor="middle" 
              fontSize="42" 
              fontWeight="700" 
              fontFamily="'Cinzel', serif"
              fill="url(#goldMetallicPremium)"
              filter="url(#goldBloomPremium)"
              textLength="680"
              lengthAdjust="spacing"
              style={{ 
                textTransform: 'uppercase', 
                paintOrder: 'stroke fill', 
                opacity: 0.9, 
                letterSpacing: '0.6em' 
              }}
            >
              FIRST TO ZERO WINS
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};
