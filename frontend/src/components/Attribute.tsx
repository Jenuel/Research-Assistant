

function Attribute(logo: string, description: string) {
  return (
    <div className="flex items-center gap-2">
        {logo} <span>{description}</span>
    </div>
  )
}

export default Attribute