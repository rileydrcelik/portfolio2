'use client';

import React from 'react';

const GlassTooltipLabel: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '0.5rem', // ~8px
        padding: '0.5rem 0.75rem', // 0.5rem top/bottom, 0.75rem left/right
        color: 'white',
        fontSize: '0.875rem', // text-sm
        fontWeight: 500,
        zIndex: 1,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '0.5rem',
          background: 'rgba(255,255,255,0.175)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: -1,
        }}
      />
      {text}
    </div>
  );
};

export default GlassTooltipLabel;
