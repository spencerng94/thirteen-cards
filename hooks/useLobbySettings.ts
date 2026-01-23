import { useState } from 'react';

export const useLobbySettings = (initialTimer: number = 0, initialIsPublic: boolean = true) => {
  const [timer, setTimer] = useState(initialTimer);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  return { timer, setTimer, isPublic, setIsPublic };
};
