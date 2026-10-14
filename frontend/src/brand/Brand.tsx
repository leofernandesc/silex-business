import type { CSSProperties } from "react";

export type BrandVariant = "logo" | "symbol" | "app-icon";
export type BrandAppearance = "light" | "dark";

export type BrandProps = {
  variant?: BrandVariant;
  appearance?: BrandAppearance;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  alt?: string;
  decorative?: boolean;
  className?: string;
};

const assets = {
  logoLight: "/assets/brand/silex-business-logo-fundo-claro-refinado.svg",
  logoDark: "/assets/brand/silex-business-logo-fundo-escuro-transparente.svg",
  symbolLight: "/assets/brand/silex-business-simbolo-refinado.svg",
  appIcon: "/assets/brand/silex-business-app-icon-refinado.svg",
} as const;

/**
 * Apresenta os ativos oficiais da Silex Business sem reconstruir o símbolo.
 * Em fundo escuro, o símbolo usa o app icon oficial, que inclui o fundo azul.
 */
export function Brand({
  variant = "logo",
  appearance = "light",
  width,
  height,
  alt,
  decorative = false,
  className,
}: BrandProps) {
  const src =
    variant === "app-icon"
      ? assets.appIcon
      : variant === "symbol"
        ? appearance === "dark"
          ? assets.appIcon
          : assets.symbolLight
        : appearance === "dark"
          ? assets.logoDark
          : assets.logoLight;
  const fallbackAlt =
    variant === "logo" ? "Silex Business" : "Símbolo da Silex Business";
  const defaultWidth = variant === "logo" ? 176 : 44;
  const defaultHeight = variant === "logo" ? "auto" : 44;

  return (
    <img
      src={src}
      alt={decorative ? "" : (alt ?? fallbackAlt)}
      aria-hidden={decorative || undefined}
      className={className}
      width={typeof width === "number" ? width : undefined}
      height={typeof height === "number" ? height : undefined}
      style={{
        display: "block",
        objectFit: "contain",
        width: width ?? defaultWidth,
        height: height ?? defaultHeight,
      }}
    />
  );
}

export default Brand;
