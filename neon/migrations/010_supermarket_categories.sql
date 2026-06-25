-- Categorias adicionais de supermercado
insert into public.categories (name, icon, display_order)
select v.name, v.icon, v.display_order
from (values
  ('Bazar', '🏠', 11),
  ('Pet', '🐾', 12),
  ('Infantil', '🍼', 13),
  ('Perfumaria', '💄', 14),
  ('Doces e Snacks', '🍫', 15),
  ('Molhos e Temperos', '🧂', 16),
  ('Cereais e Matinais', '🥣', 17),
  ('Pães e Massas', '🍝', 18)
) as v(name, icon, display_order)
where not exists (
  select 1 from public.categories c where c.name = v.name
);
