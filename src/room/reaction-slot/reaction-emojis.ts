// Emoji set offered in the reaction picker. The label is used for
// aria-labels ("React with thumbs up"). The backend accepts any emoji
// string; this list only controls what the picker offers.
export interface IReactionEmoji {
  emoji: string;
  label: string;
}

export const REACTION_EMOJIS: IReactionEmoji[] = [
  { emoji: '👍', label: 'thumbs up' },
  { emoji: '👎', label: 'thumbs down' },
  { emoji: '😂', label: 'laughing' },
  { emoji: '🤔', label: 'thinking' },
  { emoji: '🎉', label: 'party' },
  { emoji: '😬', label: 'grimace' },
  { emoji: '☕', label: 'coffee' },
  { emoji: '🔥', label: 'fire' },
];

// The server always stamps missiles with this emoji, regardless of what
// the client sends.
export const MISSILE_EMOJI = '💥';
