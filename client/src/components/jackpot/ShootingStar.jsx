import React from 'react';
import { Box } from '@mui/material';
import { styled, keyframes } from '@mui/system';

const shootingStar = keyframes`
  0% {
    transform: translateX(0) translateY(0) rotate(45deg) scale(0);
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: translateX(300px) translateY(300px) rotate(45deg) scale(1);
    opacity: 0;
  }
`;

const Star = styled(Box)(({ top, left, duration, delay, color }) => ({
  position: 'absolute',
  top: `${top}%`,
  left: `${left}%`,
  width: '3px',
  height: '3px',
  background: color,
  borderRadius: '50%',
  opacity: 0,
  filter: `drop-shadow(0 0 8px ${color})`,
  animation: `${shootingStar} ${duration}s linear infinite`,
  animationDelay: `${delay}s`,
  pointerEvents: 'none',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '180px',
    height: '2px',
    background: `linear-gradient(90deg, ${color}, transparent)`,
    transformOrigin: 'left center',
    transform: 'rotate(180deg) translateY(-50%)',
    borderRadius: '100%',
    opacity: 0.6,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '10px',
    height: '10px',
    background: color,
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    filter: 'blur(4px)',
    opacity: 0.8,
  }
}));

const ShootingStar = ({ color = '#FFF', count = 5 }) => {
  const stars = Array.from({ length: count }).map((_, i) => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 5,
  }));

  return (
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {stars.map((star, i) => (
        <Star
          key={i}
          top={star.top}
          left={star.left}
          duration={star.duration}
          delay={star.delay}
          color={color}
        />
      ))}
    </Box>
  );
};

export default ShootingStar;
