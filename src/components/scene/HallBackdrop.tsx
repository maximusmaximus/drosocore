/** Viewport-centered hall. vmin units, so a tall phone does not crop to a black floor. */

export function HallBackdrop() {
  return (
    <div
      data-hall-backdrop="on"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ background: "#12161b" }}
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-[46%] h-[90vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "linear-gradient(#2a3038, #14181d)",
          clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
        }}
      />
      <div
        className="absolute left-1/2 top-[40%] size-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(94,234,212,0.42), transparent 68%)" }}
      />
      <div
        data-hall-torus="outer"
        className="absolute left-1/2 top-[40%] h-[32vmin] w-[78vmin] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{ border: "5.5vmin solid #5eead4", boxShadow: "0 0 4vmin #5eead4" }}
      />
      <div
        data-hall-torus="inner"
        className="absolute left-1/2 top-[39%] h-[16vmin] w-[40vmin] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{ border: "2.2vmin solid #7cf0d8" }}
      />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        return (
          <div
            key={i}
            className="absolute left-1/2 top-[40%] h-[10vmin] w-[2.2vmin] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#c5ccd3]"
            style={{ transform: `translate(-50%, -50%) rotate(${(a * 180) / Math.PI}deg) translateY(-16vmin)` }}
          />
        );
      })}
      <div className="absolute left-[38%] top-[36%] size-[1.6vmin] rounded-full bg-[#c45c4a]" />
      <div className="absolute left-[58%] top-[44%] size-[1.3vmin] rounded-full bg-[#c45c4a]" />
      <div className="absolute left-[8%] top-[18%] h-[8vmin] w-[14vmin] rounded-md border-2 border-accent bg-[#2a3138]" />
      <div className="absolute right-[8%] top-[20%] h-[8vmin] w-[14vmin] rounded-md border-2 border-[#8aa4c4] bg-[#2a3138]" />
    </div>
  );
}
