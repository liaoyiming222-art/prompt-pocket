from pathlib import Path
import wave
import numpy as np

rate = 48000
duration = 32
mix = np.zeros((rate * duration, 2))

def note(at, pitch, length, gain, pan=0, decay=1.2):
    time = np.arange(round(rate * length)) / rate
    phase = 2 * np.pi * 440 * 2 ** ((pitch - 69) / 12) * time
    envelope = (1 - np.exp(-time / .023)) * np.exp(-time / decay) * np.clip((length - time) / .16, 0, 1)
    tone = (np.sin(phase) + .17 * np.sin(2 * phase) + .046 * np.sin(3 * phase)) * envelope * gain
    start = round(rate * at)
    count = min(len(tone), len(mix) - start)
    mix[start:start + count] += tone[:count, None] * np.sqrt([(1 - pan) / 2, (1 + pan) / 2])

for offset, chord in [(0, (50, 57, 60, 65)), (5.5, (46, 53, 57, 62)), (11, (48, 55, 60, 64)), (17.5, (45, 52, 57, 60)), (22, (46, 53, 57, 62)), (27, (50, 57, 62, 65))]:
    note(offset, chord[0], 5.2, .12, decay=2.4)
    for index, scale in enumerate((0, 2, 1, 3, 2, 1)):
        note(offset + index * .67, chord[scale] + 12, 2.5, .063, (-1) ** index * .28)

for at, pitch, pan in [(4.36, 72, .44), (8.27, 77, .48), (8.74, 81, .48), (13.72, 76, .0), (14.53, 79, .49), (15.68, 84, .06), (18.2, 74, .4), (22.2, 81, -.1), (24.55, 77, .45), (28.0, 74, -.2), (28.43, 81, .19)]:
    note(at, pitch, .55, .07, pan, .21)

clock = np.arange(len(mix)) / rate
mix *= (np.minimum(clock / .46, 1) * np.minimum((duration - clock) / 2.14, 1))[:, None]
mix = np.tanh(mix * 1.72)
target = Path(__file__).parent / 'output' / 'score.wav'
with wave.open(str(target), 'wb') as score:
    score.setparams((2, 2, rate, 0, 'NONE', 'not compressed'))
    score.writeframes((mix * 32767).astype('<i2').tobytes())
