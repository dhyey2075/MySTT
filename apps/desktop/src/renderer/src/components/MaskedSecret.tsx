/** Masked placeholder — no raw key leaves main process. */
export function MaskedSecret(props: { configured: boolean }) {
  if (!props.configured) {
    return <div className="masked-secret">No API key saved</div>
  }
  return <div className="masked-secret">sk••••••••••••••••</div>
}
