import { isValidProductUnit } from "@/lib/catalog/units";

export type ProductInference = {
  unit: string;
  categoryName: string;
  packageAmount: string;
  confidence: "high" | "medium" | "low";
};

type HintRule = {
  keywords: string[];
  categoryName: string;
  unit: string;
  packageAmount?: string;
};

const HINT_RULES: HintRule[] = [
  {
    keywords: [
      "arroz", "feijão", "feijao", "açúcar", "acucar", "farinha", "sal", "macarrão", "macarrao",
      "espaguete", "penne", "aveia", "granola", "milho", "canjica", "polenta", "fubá", "fuba",
      "amido", "fermento", "gelatina", "café", "cafe", "achocolatado", "nescau", "toddy",
    ],
    categoryName: "Mercearia",
    unit: "kg",
  },
  {
    keywords: [
      "óleo", "oleo", "azeite", "vinagre", "molho", "ketchup", "mostarda", "maionese",
      "shoyu", "extrato", "tempero", "caldo", "catchup",
    ],
    categoryName: "Molhos e Temperos",
    unit: "L",
    packageAmount: "1",
  },
  {
    keywords: ["leite", "iogurte", "requeijão", "requeijao", "nata", "creme de leite", "chantilly"],
    categoryName: "Laticínios",
    unit: "L",
    packageAmount: "1",
  },
  {
    keywords: ["queijo", "mussarela", "mozzarella", "parmesão", "parmesao", "ricota", "cream cheese"],
    categoryName: "Laticínios",
    unit: "kg",
  },
  {
    keywords: ["manteiga", "margarina"],
    categoryName: "Laticínios",
    unit: "g",
    packageAmount: "200",
  },
  {
    keywords: [
      "banana", "maçã", "maca", "laranja", "limão", "limao", "tomate", "batata", "cebola",
      "alface", "cenoura", "abobrinha", "berinjela", "pepino", "abacaxi", "mamão", "mamao",
      "uva", "melancia", "morango", "batata doce", "mandioca", "inhame", "couve", "repolho",
    ],
    categoryName: "Hortifrúti",
    unit: "kg",
  },
  {
    keywords: [
      "carne", "picanha", "alcatra", "contrafilé", "contrafile", "frango", "peito", "coxa",
      "sobrecoxa", "porco", "lombo", "bacon", "linguiça", "linguica", "salsicha", "hambúrguer",
      "hamburguer", "carne moída", "carne moida", "bife", "costela", "cupim",
    ],
    categoryName: "Açougue",
    unit: "kg",
  },
  {
    keywords: ["peixe", "salmão", "salmao", "tilápia", "tilapia", "sardinha", "atum", "camarão", "camarao"],
    categoryName: "Açougue",
    unit: "kg",
  },
  {
    keywords: ["pão", "pao", "baguete", "croissant", "bisnaguinha"],
    categoryName: "Padaria",
    unit: "kg",
  },
  {
    keywords: ["pão de forma", "pao de forma", "bisnaga", "torrada"],
    categoryName: "Padaria",
    unit: "un",
  },
  {
    keywords: ["presunto", "mortadela", "salame", "peito de peru", "apresuntado"],
    categoryName: "Frios",
    unit: "kg",
  },
  {
    keywords: [
      "refrigerante", "coca", "guaraná", "guarana", "suco", "água", "agua", "cerveja",
      "vinho", "energético", "energetico", "isotônico", "isotonico", "chá", "cha gelado",
    ],
    categoryName: "Bebidas",
    unit: "L",
    packageAmount: "2",
  },
  {
    keywords: ["detergente", "desinfetante", "água sanitária", "agua sanitaria", "amaciante", "alvejante", "lustra móveis"],
    categoryName: "Limpeza",
    unit: "un",
  },
  {
    keywords: ["sabonete", "shampoo", "condicionador", "papel higiênico", "papel higienico", "absorvente", "escova de dente", "pasta de dente", "desodorante"],
    categoryName: "Higiene",
    unit: "un",
  },
  {
    keywords: ["perfume", "colônia", "colonia", "hidratante", "batom", "maquiagem"],
    categoryName: "Perfumaria",
    unit: "un",
  },
  {
    keywords: ["chocolate", "biscoito", "bolacha", "salgadinho", "pipoca", "amendoim", "castanha", "doce", "balas", "pirulito"],
    categoryName: "Doces e Snacks",
    unit: "un",
  },
  {
    keywords: ["pizza", "lasanha", "hambúrguer congelado", "nuggets", "batata frita congelada", "sorvete"],
    categoryName: "Congelados",
    unit: "un",
  },
  {
    keywords: ["cereal", "matinal", "sucrilhos", "corn flakes", "granola matinal"],
    categoryName: "Cereais e Matinais",
    unit: "un",
  },
  {
    keywords: ["massa", "nhoque", "ravióli", "ravioli", "talharim"],
    categoryName: "Pães e Massas",
    unit: "kg",
  },
  {
    keywords: ["ração", "racao", "pet", "areia sanitária", "areia sanitaria"],
    categoryName: "Pet",
    unit: "kg",
  },
  {
    keywords: ["fralda", "lenço umedecido", "lenco umedecido", "mamadeira", "papinha"],
    categoryName: "Infantil",
    unit: "un",
  },
  {
    keywords: [
      "macarrão instantâneo", "macarrao instantaneo", "lámen", "lamen", "miojo", "cup noodles",
      "nissin", "maggi",
    ],
    categoryName: "Mercearia",
    unit: "un",
    packageAmount: "1",
  },
  {
    keywords: ["pilha", "lâmpada", "lampada", "vela", "isqueiro", "papel alumínio", "papel aluminio", "filme pvc"],
    categoryName: "Bazar",
    unit: "un",
  },
];

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Extrai embalagem do nome: "Arroz 5kg", "Leite 1L", "500g", etc. */
export function parsePackageFromName(name: string): { unit: string; packageAmount: string } | null {
  const text = name.trim();
  if (text.length < 2) return null;

  const match =
    text.match(/(\d+(?:[.,]\d+)?)\s*(kg|quilo|g|gr|gramas?|mg|ml|m[lL]|l|litro|litros|un|und|unid(?:ade)?s?)\b/i) ??
    text.match(/(\d+(?:[.,]\d+)?)(kg|g|mg|ml|l|un)\b/i);

  if (!match) return null;

  const amount = match[1].replace(",", ".");
  const rawUnit = match[2].toLowerCase();

  let unit: string;
  if (rawUnit === "kg" || rawUnit === "quilo") unit = "kg";
  else if (rawUnit === "g" || rawUnit === "gr" || rawUnit.startsWith("gram")) unit = "g";
  else if (rawUnit === "mg") unit = "mg";
  else if (rawUnit === "ml") unit = "ml";
  else if (rawUnit === "l" || rawUnit.startsWith("litro")) unit = "L";
  else unit = "un";

  if (!isValidProductUnit(unit)) return null;

  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) return null;

  const packageAmount = Number.isInteger(num) ? String(num) : String(num);

  return { unit, packageAmount };
}

export function inferFromDictionary(name: string): ProductInference | null {
  const normalized = normalizeForMatch(name);
  if (normalized.length < 2) return null;

  const fromName = parsePackageFromName(name);

  let best: { rule: HintRule; score: number } | null = null;

  for (const rule of HINT_RULES) {
    for (const keyword of rule.keywords) {
      const kw = normalizeForMatch(keyword);
      if (normalized === kw || normalized.startsWith(`${kw} `) || normalized.includes(` ${kw}`) || normalized.includes(kw)) {
        const score = normalized === kw ? 100 : normalized.startsWith(kw) ? 80 : 60;
        if (!best || score > best.score) {
          best = { rule, score };
        }
      }
    }
  }

  if (!best && !fromName) return null;

  if (!best && fromName) {
    return {
      unit: fromName.unit,
      categoryName: "",
      packageAmount: fromName.packageAmount,
      confidence: "medium",
    };
  }

  const rule = best!.rule;
  const unit = fromName?.unit ?? (isValidProductUnit(rule.unit) ? rule.unit : "un");
  const packageAmount = fromName?.packageAmount ?? rule.packageAmount ?? "1";

  return {
    unit,
    categoryName: rule.categoryName,
    packageAmount,
    confidence: fromName ? "high" : best!.score >= 80 ? "high" : "medium",
  };
}

export function resolveCategoryId(
  categoryName: string | null | undefined,
  categories: { id: string; name: string }[]
): string | null {
  if (!categoryName) return null;
  const norm = normalizeForMatch(categoryName);
  const exact = categories.find((c) => normalizeForMatch(c.name) === norm);
  if (exact) return exact.id;
  const partial = categories.find(
    (c) => normalizeForMatch(c.name).includes(norm) || norm.includes(normalizeForMatch(c.name))
  );
  return partial?.id ?? null;
}
