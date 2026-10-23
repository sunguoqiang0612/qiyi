import { colorHex } from "@/lib/constants";

const backdrop = "#e7e1d6";

export function GarmentArt({
  category,
  color,
  className,
}: {
  category: string;
  color?: string;
  className?: string;
}) {
  const fill = colorHex(color ?? "");
  return (
    <svg viewBox="0 0 200 260" className={className} role="img" aria-hidden>
      <rect width="200" height="260" fill={backdrop} />
      {shape(category, fill)}
    </svg>
  );
}

function shape(category: string, fill: string) {
  if (category === "bottom") {
    return (
      <path
        fill={fill}
        d="M74 46h52l8 18 22 150h-32l-12-92-12 92H50L72 64l2-18z"
      />
    );
  }
  if (category === "dress") {
    return (
      <path
        fill={fill}
        d="M78 48h44l18 24-8 16-10-8v18l28 114H50L78 98V80l-10 8-8-16 18-24z"
      />
    );
  }
  if (category === "outerwear") {
    return (
      <path
        fill={fill}
        d="M62 52l38 18 38-18 28 28-16 16-8-8v122H58V88l-8 8-16-16 28-28zm38 28v108"
        stroke="#fff8ee"
        strokeWidth="3"
      />
    );
  }
  if (category === "shoes") {
    return (
      <path
        fill={fill}
        d="M46 150h78l28 10c10 4 16 12 16 22v8H42v-16c0-12 8-20 20-24l-16 0z"
      />
    );
  }
  if (category === "bag") {
    return (
      <path
        fill={fill}
        d="M70 78h60v14H70zm-8 14h76l8 120H54l8-120zm22-8c0-16 8-28 24-28s24 12 24 28"
        stroke={fill}
        strokeWidth="6"
        fillRule="evenodd"
      />
    );
  }
  if (category === "accessory") {
    return (
      <>
        <circle cx="100" cy="118" r="28" fill="none" stroke={fill} strokeWidth="8" />
        <path d="M100 146v28" stroke={fill} strokeWidth="6" />
        <circle cx="100" cy="182" r="7" fill={fill} />
      </>
    );
  }
  if (category === "other") {
    return (
      <path
        fill="none"
        stroke={fill}
        strokeWidth="8"
        strokeLinecap="round"
        d="M70 70h60M100 70v120M78 190h44"
      />
    );
  }
  return (
    <path
      fill={fill}
      d="M70 52l30 18 30-18 34 28-16 16-12-10v112H64V86L52 96 36 80l34-28z"
    />
  );
}
