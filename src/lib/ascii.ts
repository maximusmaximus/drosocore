export const FLY_SPEECH = [
  "⟨ψ|φ⟩",
  "∴∵∴",
  "λφΩ",
  "⟨⟨::⟩⟩",
  "⊕⊗⊕",
  "∞≈∞",
  "√√√",
  "∂∂∂",
  "|ψ⟩",
  "⟨q|",
  "※※※",
  "Ω-Ω",
  "λ.λ",
  "::=::",
  "⟨Δ|ψ⟩",
  "ΔΔΔ",
  "φφφ",
  "≈≈≈",
  "⟨⟨⟩⟩",
  "++::++",
  "::||::",
  "∇∇∇",
  "λ::λ",
  "ΩΩΩ",
];

export function randomSpeech(seed: number): string {
  const i = Math.abs((seed * 17 + 31) | 0) % FLY_SPEECH.length;
  return FLY_SPEECH[i];
}

export function speechAt(i: number): string {
  return FLY_SPEECH[i % FLY_SPEECH.length];
}
