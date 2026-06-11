export type Developer = {
  name: string;
  email: string;
};

export const TEAM_DEVELOPERS: Developer[] = [
  { name: "André Meliunas", email: "andre.meliunas@macro.com.br" },
  { name: "André Nascimento", email: "andre.nascimento@macro.com.br" },
  { name: "Benilson", email: "benilson.sanches@macro.com.br" },
  { name: "Davi Jacob", email: "davi.jacob@macro.com.br" },
  { name: "Guilherme Quites", email: "guilherme.quites@macro.com.br" },
  { name: "Leandro Viegas", email: "leandro.viegas@macro.com.br" },
  { name: "Leandro Machado", email: "leandro.machado@macro.com.br" },
  { name: "Leandro Jesus", email: "leandro.jesus@macro.com.br" },
  { name: "Jeoston Junior", email: "jeoston.junior@macro.com.br" },
  { name: "João Victor Oliveira", email: "joao.oliveira@macro.com.br" },
  { name: "João Meneses", email: "joao.meneses@macro.com.br" },
  { name: "Mariana de Oliveira", email: "mariana.oliveira@macro.com.br" },
  { name: "Mariana Lemos", email: "mariana.lemos@macro.com.br" },
  { name: "Silvinha", email: "silvia.vitorio@macro.com.br" },
  { name: "Vitor Aguiar", email: "vitor.aguiar@macro.com.br" },
];

export function findDeveloperByEmail(email: string): Developer | undefined {
  const normalized = email.trim().toLowerCase();
  return TEAM_DEVELOPERS.find((d) => d.email.toLowerCase() === normalized);
}

export function findDeveloperByName(name: string): Developer | undefined {
  const normalized = name.trim().toLowerCase();
  return TEAM_DEVELOPERS.find(
    (d) =>
      d.name.toLowerCase() === normalized ||
      d.name.toLowerCase().includes(normalized) ||
      normalized.includes(d.name.toLowerCase()),
  );
}
