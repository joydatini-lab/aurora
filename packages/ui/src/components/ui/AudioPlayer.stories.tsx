/**
 * AudioPlayer.stories.tsx — Lecteur audio (cat. 2.1 Focus, 2.21 Artifacts).
 * La waveform est optionnelle ; ce composant ne la rend pas pour rester
 * léger (une classe `AudioWaveform` dédiée peut être ajoutée en complément).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AudioPlayer } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/AudioPlayer",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

// URL d'exemple publique (mp3 de démonstration)
const DEMO_SRC =
  "https://interactive-examples.mdn.mozilla.net/media/cc-audio-track.mp3";

export const LectureDeBase: Story = {
  render: () => (
    <div className="max-w-md">
      <AudioPlayer
        src={DEMO_SRC}
        title="Méditation guidée — 10 min"
        subtitle="Aurora Focus"
        showVolume
        showPlaybackRate
      />
    </div>
  ),
};

export const LectureOptionnele: Story = {
  render: () => (
    <div className="max-w-md">
      <AudioPlayer
        src={DEMO_SRC}
        showVolume={false}
        showSeekbar={false}
      />
    </div>
  ),
};
