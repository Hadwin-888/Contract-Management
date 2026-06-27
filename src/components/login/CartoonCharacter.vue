<script setup lang="ts">
import mascotE2 from '@/assets/login-mascot-e2.png'

defineProps<{
  state: 'idle' | 'looking' | 'peeking' | 'returning'
}>()
</script>

<template>
  <div class="character-wrapper" :class="state" aria-hidden="true">
    <div class="mascot-stage">
      <div class="mascot-aura"></div>
      <img class="mascot-image" :src="mascotE2" alt="" draggable="false" />
      <div class="gold-sparkle sparkle-one"></div>
      <div class="gold-sparkle sparkle-two"></div>
      <div class="gold-sparkle sparkle-three"></div>
      <div class="sea-breeze breeze-left"></div>
      <div class="sea-breeze breeze-right"></div>
    </div>
    <div class="mascot-shadow"></div>
  </div>
</template>

<style scoped>
.character-wrapper {
  width: 210px;
  height: 250px;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
  animation: mascot-enter 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.mascot-stage {
  width: 200px;
  height: 236px;
  position: relative;
  z-index: 2;
  transform-origin: 50% 82%;
  transition: transform 0.4s ease;
}

.mascot-aura {
  position: absolute;
  inset: 30px 20px 6px;
  border-radius: 44% 46% 42% 48%;
  background:
    radial-gradient(circle at 35% 28%, rgba(255, 242, 196, 0.55), transparent 36%),
    radial-gradient(circle at 64% 68%, rgba(130, 221, 212, 0.26), transparent 42%);
  filter: blur(10px);
  opacity: 0.8;
  transform: scale(0.96);
  pointer-events: none;
}

.mascot-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(0 16px 16px rgba(30, 94, 105, 0.16));
  transform-origin: 50% 82%;
  transition: filter 0.25s ease, transform 0.35s ease;
}

.mascot-shadow {
  position: absolute;
  left: 35px;
  right: 28px;
  bottom: 4px;
  height: 18px;
  border-radius: 50%;
  background: rgba(31, 111, 120, 0.14);
  filter: blur(4px);
  transform-origin: center;
  transition: transform 0.35s ease, opacity 0.35s ease;
}

.sea-breeze {
  position: absolute;
  width: 46px;
  height: 16px;
  border-top: 4px solid rgba(91, 190, 184, 0.42);
  border-radius: 50%;
  opacity: 0.7;
  pointer-events: none;
}

.sea-breeze::after {
  content: "";
  position: absolute;
  left: 10px;
  top: 8px;
  width: 28px;
  height: 10px;
  border-top: 3px solid rgba(91, 190, 184, 0.3);
  border-radius: 50%;
}

.breeze-left {
  left: -14px;
  top: 74px;
  transform: rotate(-14deg);
}

.breeze-right {
  right: -13px;
  top: 108px;
  transform: rotate(16deg);
}

.gold-sparkle {
  position: absolute;
  width: 9px;
  height: 9px;
  opacity: 0;
  pointer-events: none;
}

.gold-sparkle::before,
.gold-sparkle::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  background: rgba(229, 184, 90, 0.9);
  transform: translate(-50%, -50%);
}

.gold-sparkle::before {
  width: 2px;
  height: 9px;
}

.gold-sparkle::after {
  width: 9px;
  height: 2px;
}

.sparkle-one {
  left: 88px;
  top: 22px;
}

.sparkle-two {
  right: 33px;
  top: 112px;
}

.sparkle-three {
  left: 45px;
  bottom: 64px;
}

.character-wrapper.idle .mascot-stage {
  animation: mascot-float 3.8s ease-in-out infinite;
}

.character-wrapper.idle .mascot-image {
  animation: soft-breathe 3.8s ease-in-out infinite;
}

.character-wrapper.idle .mascot-aura {
  animation: aura-pulse 3.8s ease-in-out infinite;
}

.character-wrapper.idle .mascot-shadow {
  animation: shadow-breathe 3.8s ease-in-out infinite;
}

.character-wrapper.idle .sea-breeze {
  animation: breeze-drift 3.8s ease-in-out infinite;
}

.character-wrapper.idle .sparkle-one {
  animation: sparkle-twinkle 3.4s ease-in-out 0.2s infinite;
}

.character-wrapper.idle .sparkle-two {
  animation: sparkle-twinkle 3.8s ease-in-out 1.1s infinite;
}

.character-wrapper.idle .sparkle-three {
  animation: sparkle-twinkle 4s ease-in-out 2s infinite;
}

.character-wrapper.looking {
  transform: translateX(8px) rotate(2deg);
}

.character-wrapper.looking .mascot-stage {
  transform: rotate(2deg) translateY(-3px);
}

.character-wrapper.looking .mascot-image {
  transform: scale(1.01);
}

.character-wrapper.looking .breeze-right {
  transform: translateX(8px) rotate(16deg);
  opacity: 0.92;
}

.character-wrapper.peeking {
  transform: translateX(7px) rotate(1deg);
}

.character-wrapper.peeking .mascot-stage {
  transform: translateY(-2px) scale(1.015);
}

.character-wrapper.peeking .mascot-image {
  filter: drop-shadow(0 16px 16px rgba(30, 94, 105, 0.16)) saturate(0.96);
  transform: scale(1.01);
}

.character-wrapper.returning {
  transform: none;
}

@keyframes mascot-enter {
  0% {
    opacity: 0;
    transform: translateY(18px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes mascot-float {
  0%, 100% { transform: translateY(0) rotate(-0.4deg); }
  50% { transform: translateY(-7px) rotate(1.2deg); }
}

@keyframes soft-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.018); }
}

@keyframes aura-pulse {
  0%, 100% { opacity: 0.72; transform: scale(0.96); }
  50% { opacity: 0.95; transform: scale(1.03); }
}

@keyframes shadow-breathe {
  0%, 100% { transform: scaleX(1); opacity: 0.14; }
  50% { transform: scaleX(0.9); opacity: 0.09; }
}

@keyframes breeze-drift {
  0%, 100% { opacity: 0.68; transform: translateX(0) rotate(var(--breeze-rotate, 0deg)); }
  50% { opacity: 0.3; transform: translateX(10px) rotate(var(--breeze-rotate, 0deg)); }
}

.breeze-left {
  --breeze-rotate: -14deg;
}

.breeze-right {
  --breeze-rotate: 16deg;
}

@keyframes sparkle-twinkle {
  0%, 58%, 100% {
    opacity: 0;
    transform: scale(0.4) rotate(0deg);
  }
  68% {
    opacity: 0.95;
    transform: scale(1) rotate(90deg);
  }
  78% {
    opacity: 0;
    transform: scale(0.55) rotate(140deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .character-wrapper,
  .mascot-stage,
  .mascot-image,
  .mascot-aura,
  .mascot-shadow,
  .sea-breeze,
  .gold-sparkle {
    animation: none !important;
    transition: none !important;
  }
}
</style>
