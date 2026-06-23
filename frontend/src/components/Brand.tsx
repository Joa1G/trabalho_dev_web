import logoHorizontal from "@/assets/ifam-logo-horizontal.png";

/**
 * Marca institucional do IFAM — versão horizontal (assinatura para uso em headers,
 * conforme o Manual de Aplicação da Marca, Portaria SETEC/MEC nº 31/2015).
 *
 * Regras respeitadas:
 *  - usa o asset oficial sem distorção, recoloração ou enquadramento;
 *  - mantém proporções via `width: auto` + `height` controlada;
 *  - tamanho mínimo (sm) acima dos 30px exigidos pelo manual;
 *  - "reserva de integridade" garantida pelo padding do container pai;
 *  - sistema é nomeado como TEXTO separado, nunca como logo concorrente.
 */
const ALTURAS = {
  sm: 36, // header
  md: 56, // tela de login
  lg: 80, // splash/landing
} as const;

interface BrandProps {
  size?: keyof typeof ALTURAS;
}

export function Brand({ size = "md" }: BrandProps) {
  return (
    <img
      src={logoHorizontal}
      alt="Instituto Federal do Amazonas"
      height={ALTURAS[size]}
      style={{ height: ALTURAS[size], width: "auto" }}
      className="select-none"
    />
  );
}
