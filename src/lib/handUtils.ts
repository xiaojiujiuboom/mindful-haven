export function isHandClosed(landmarks: any) {
  const distance3D = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
  const palmBase = landmarks[0];
  
  const thumbTip = landmarks[4];
  const indexFingerTip = landmarks[8];
  const middleFingerTip = landmarks[12];
  const ringFingerTip = landmarks[16];
  const pinkyTip = landmarks[20];
  
  const distThumb = distance3D(thumbTip, palmBase);
  const distIndex = distance3D(indexFingerTip, palmBase);
  const distMiddle = distance3D(middleFingerTip, palmBase);
  const distRing = distance3D(ringFingerTip, palmBase);
  const distPinky = distance3D(pinkyTip, palmBase);

  const indexPIP = landmarks[6];
  const middlePIP = landmarks[10];
  const ringPIP = landmarks[14];
  const pinkyPIP = landmarks[18];

  const distIndexPIP = distance3D(indexPIP, palmBase);
  const distMiddlePIP = distance3D(middlePIP, palmBase);
  const distRingPIP = distance3D(ringPIP, palmBase);
  const distPinkyPIP = distance3D(pinkyPIP, palmBase);

  const isIndexBent = distIndex < distIndexPIP * 1.1;
  const isMiddleBent = distMiddle < distMiddlePIP * 1.1;
  const isRingBent = distRing < distRingPIP * 1.1;
  const isPinkyBent = distPinky < distPinkyPIP * 1.1;

  const bentFingers = [isIndexBent, isMiddleBent, isRingBent, isPinkyBent].filter(Boolean).length;
  return bentFingers >= 3;
}
