import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

export function useVoiceMemoPlayer(uri: string | undefined) {
  const player = useAudioPlayer(uri || null);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (!uri) return;
    if (status.playing) {
      player.pause();
    } else {
      if (status.currentTime >= status.duration && status.duration > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return { isPlaying: status.playing, toggle, currentTime: status.currentTime };
}
