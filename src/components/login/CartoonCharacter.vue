<script setup lang="ts">
defineProps<{
  state: 'idle' | 'looking' | 'peeking' | 'returning'
}>()
</script>

<template>
  <div class="character-wrapper" :class="state">
    <svg viewBox="0 0 200 200" class="character-svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Antenna -->
      <line x1="100" y1="40" x2="100" y2="15" stroke="#ccc" stroke-width="2" class="antenna" />
      <circle cx="100" cy="15" r="5" fill="#007AFF" class="antenna-ball" />

      <!-- Body -->
      <circle cx="100" cy="100" r="60" fill="white" stroke="#e5e5e5" stroke-width="2" />

      <!-- Eyes -->
      <g class="eyes">
        <circle cx="78" cy="88" r="8" fill="#1d1d1f" class="eye-left" />
        <circle cx="122" cy="88" r="8" fill="#1d1d1f" class="eye-right" />
        <!-- Eye shine -->
        <circle cx="81" cy="85" r="3" fill="white" class="shine-left" />
        <circle cx="125" cy="85" r="3" fill="white" class="shine-right" />
      </g>

      <!-- Blush -->
      <ellipse cx="68" cy="105" rx="8" ry="4" fill="#ffd1dc" opacity="0.5" />
      <ellipse cx="132" cy="105" rx="8" ry="4" fill="#ffd1dc" opacity="0.5" />

      <!-- Mouth -->
      <path d="M 88 112 Q 100 122 112 112" fill="none" stroke="#1d1d1f" stroke-width="2" stroke-linecap="round" class="mouth" />

      <!-- Hands (peeking state) -->
      <g class="hands">
        <path d="M 50 75 Q 60 65 70 75" fill="none" stroke="#e5e5e5" stroke-width="3" stroke-linecap="round" class="hand-left" />
        <path d="M 150 75 Q 140 65 130 75" fill="none" stroke="#e5e5e5" stroke-width="3" stroke-linecap="round" class="hand-right" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.character-wrapper {
  width: 160px;
  height: 160px;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.character-svg {
  width: 100%;
  height: 100%;
}

/* Idle animations */
.character-wrapper.idle {
  animation: breathe 3s ease-in-out infinite;
}

.character-wrapper.idle .eye-left,
.character-wrapper.idle .eye-right {
  animation: blink 4s ease-in-out infinite;
}

.antenna-ball {
  animation: bounce 2s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

@keyframes blink {
  0%, 95%, 100% { opacity: 1; }
  97% { opacity: 0; }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* Looking state */
.character-wrapper.looking {
  transform: rotate(8deg) translateX(5px);
}

.character-wrapper.looking .eye-left {
  transform: translateX(3px);
}

.character-wrapper.looking .eye-right {
  transform: translateX(3px);
}

/* Peeking state */
.character-wrapper.peeking {
  transform: rotate(12deg) translateX(8px) scale(1.05);
}

.character-wrapper.peeking .eye-left {
  transform: translateX(4px) scaleY(1.2);
}

.character-wrapper.peeking .eye-right {
  transform: translateX(4px) scaleY(1.2);
}

.character-wrapper.peeking .hands {
  opacity: 1;
}

.character-wrapper.peeking .hand-left {
  transform: translate(5px, -5px);
}

.character-wrapper.peeking .hand-right {
  transform: translate(-5px, -5px);
}

/* Returning state */
.character-wrapper.returning {
  transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.hands {
  opacity: 0;
  transition: all 0.4s ease;
}

.hand-left,
.hand-right {
  transition: all 0.4s ease;
}
</style>
