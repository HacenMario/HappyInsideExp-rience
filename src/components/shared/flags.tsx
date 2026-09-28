export function AlgeriaFlag({ className = "h-4 w-6" }: { className?: string }) {
  /* نسخة طبق الأصل من علم الجزائر الرسمي — EXACT replica of the official flag
     of Algeria. The path data below is copied VERBATIM (no re-drawing, no
     re-derivation) from the authoritative source file "Flag_of_Algeria.svg"
     (official construction sheet, 900×600, ratio 2:3):
       - White field with green half on the hoist side (#063)
       - Red crescent (#D21034) built from two intersecting circles
         (outer R=150 centred on the flag, horns opening toward the fly)
       - Red five-pointed star nested in the crescent opening
     Any change to these numbers would break fidelity to the official flag. */
  return (
    <svg viewBox="0 0 900 600" className={className} aria-label="DZ" role="img">
      <path fill="#fff" d="M0 0h900v600H0z" />
      <path fill="#063" d="M0 0h450v600H0z" />
      <path
        fill="#d21034"
        d="M579.903811 225a150 150 0 1 0 0 150 120 120 0 1 1 0-150M585.676275 300 450 255.916106 533.852549 371.329239v-142.658277L450 344.083894z"
      />
    </svg>
  );
}

export function FranceFlag({ className = "h-4 w-6" }: { className?: string }) {
  /* Official flag of France: #0055A4, #FFFFFF, #EF4135 */
  return (
    <svg viewBox="0 0 60 40" className={className} aria-label="FR" role="img">
      <rect width="20" height="40" fill="#0055A4" />
      <rect x="20" width="20" height="40" fill="#FFFFFF" />
      <rect x="40" width="20" height="40" fill="#EF4135" />
    </svg>
  );
}
