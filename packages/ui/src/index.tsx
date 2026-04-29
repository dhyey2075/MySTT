export function BrandMark(props: { title?: string; className?: string; size?: number }) {
  const size = props.size ?? 28
  return (
    <img
      src="/logo.png"
      alt="MySTT"
      title={props.title}
      width={size}
      height={size}
      className={props.className ?? 'brand-mark-img'}
    />
  )
}
